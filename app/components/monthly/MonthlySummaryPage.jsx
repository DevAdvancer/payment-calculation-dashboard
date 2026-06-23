"use client";
import { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import useDashboardStore, { MONTH_NAMES, fmtMoneyC, currencyOf } from "@/lib/use-store";
import MoneyStack from "@/app/components/MoneyStack";

const MONTH_IDX = Object.fromEntries(MONTH_NAMES.map((m, i) => [m, i]));

const yyShort = (year) => String(year).slice(-2);
const monthYearKey = (m, y) => `${m}-${yyShort(y)}`;          // "Jan-26"

const RECEIVED_STATUS = "Received";

export default function SummaryPage() {
  const today = new Date();

  const currentMonth = MONTH_NAMES[today.getMonth()];
  const currentYear = String(today.getFullYear());
  const { getActive, loading } = useDashboardStore();
  const entries = getActive();

  // const [filters, setFilters] = useState({ year: "", month: "", company: "" });
  const [filters, setFilters] = useState({
    year: currentYear,
    month: currentMonth,
    company: "",
  });
  const [gbpToUsd, setGbpToUsd] = useState(1.35);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch("/api/exchange");
        if (!res.ok) throw new Error("Rate fetch failed");
        const data = await res.json();
        const rate = parseFloat(data?.rate);
        if (!isNaN(rate) && rate > 0) setGbpToUsd(rate);
      } catch (err) {
        console.warn("Failed to load GBP to USD rate", err);
      }
    };
    fetchRate();
  }, []);

  const toUsd = (money) => (money?.USD || 0) + (money?.GBP || 0) * gbpToUsd;

  
  /* ── Filter option sets, derived from current data ── */
  const years = useMemo(
    () => [...new Set(entries.map(e => e.year).filter(Boolean))].sort((a, b) => +b - +a),
    [entries]
  );
  const companies = useMemo(
    () => [...new Set(entries.map(e => e.company).filter(Boolean))].sort(),
    [entries]
  );

  /* ── Apply the three top filters ── */
  const filtered = useMemo(() => {
    let rows = entries;
    if (filters.year)    rows = rows.filter(e => String(e.year) === String(filters.year));
    if (filters.month)   rows = rows.filter(e => e.month === filters.month);
    if (filters.company) rows = rows.filter(e => e.company === filters.company);
    return rows;
  }, [entries, filters]);

  /* ── Build pivot rows: one row per (year, month) bucket sorted chronologically.
       Each row carries Pending (= due) and Received (= paid) split by currency. */
  const pivot = useMemo(() => {
    const map = new Map();
    for (const e of filtered) {
      if (!e.month || !e.year) continue;
      const key = monthYearKey(e.month, e.year);
      let bucket = map.get(key);
      if (!bucket) {
        bucket = {
          key, month: e.month, year: e.year,
          pending: { USD: 0, GBP: 0 },
          received: { USD: 0, GBP: 0 },
          total: { USD: 0, GBP: 0 },
        };
        map.set(key, bucket);
      }
      const cur = currencyOf(e);
      const amt = parseFloat(e.amount) || 0;
      const paid = parseFloat(e.paid) || 0;
      if (e.status === RECEIVED_STATUS) {
        bucket.received[cur] += paid;
      } else {
        bucket.pending[cur] += amt;
      }
      bucket.total[cur] += (e.status === RECEIVED_STATUS) ? paid : amt;
    }
    return [...map.values()].sort((a, b) => {
      if (+a.year !== +b.year) return +a.year - +b.year;
      return (MONTH_IDX[a.month] ?? 0) - (MONTH_IDX[b.month] ?? 0);
    });
  }, [filtered]);

  /* ── Grand Total row, summed across the visible pivot ── */
  const grand = useMemo(() => {
    const acc = {
      pending: { USD: 0, GBP: 0 },
      received: { USD: 0, GBP: 0 },
      total: { USD: 0, GBP: 0 },
    };
    for (const r of pivot) {
      for (const c of ["USD", "GBP"]) {
        acc.pending[c]  += r.pending[c];
        acc.received[c] += r.received[c];
        acc.total[c]    += r.total[c];
      }
    }
    return acc;
  }, [pivot]);

  /* ── Table rows merged by month name (combine duplicate months across years) ── */
  const monthMergedPivot = useMemo(() => {
    const map = new Map();
    for (const r of pivot) {
      let bucket = map.get(r.month);
      if (!bucket) {
        bucket = {
          month: r.month,
          pending: { USD: 0, GBP: 0 },
          received: { USD: 0, GBP: 0 },
          total: { USD: 0, GBP: 0 },
        };
        map.set(r.month, bucket);
      }
      bucket.pending.USD += r.pending.USD;
      bucket.pending.GBP += r.pending.GBP;
      bucket.received.USD += r.received.USD;
      bucket.received.GBP += r.received.GBP;
      bucket.total.USD += r.total.USD;
      bucket.total.GBP += r.total.GBP;
    }
    return MONTH_NAMES.filter((m) => map.has(m)).map((m) => map.get(m));
  }, [pivot]);

  const totalPending = useMemo(() => {
    let sum = { USD: 0, GBP: 0 };
    for (const r of pivot) {
      sum.USD += r.pending.USD;
      sum.GBP += r.pending.GBP;
    }
    return sum;
  }, [pivot]);

  const totalReceived = useMemo(() => {
    let sum = { USD: 0, GBP: 0 };
    for (const r of pivot) {
      sum.USD += r.received.USD;
      sum.GBP += r.received.GBP;
    }
    return sum;
  }, [pivot]);

  function normalizeServiceTypeValue(value) {
    if (!value) return "";

    const normalized = String(value)
      .trim()
      .toLowerCase();

    if (
      normalized.includes("new") &&
      normalized.includes("placement")
    ) {
      return "New Placement";
    }

    if (normalized.includes("placement")) {
      return "Placement";
    }

    return "";
  }

  const placementPivot = useMemo(() => {
    const map = new Map();
    for (const e of filtered) {
      if (!e.month || !e.year) continue;
      const key = monthYearKey(e.month, e.year);
      let bucket = map.get(key);
      if (!bucket) {
        bucket = {
          key, month: e.month, year: e.year,
          placement: { USD: 0, GBP: 0 },
          newPlacement: { USD: 0, GBP: 0 },
        };
        map.set(key, bucket);
      }
      if (e.status === RECEIVED_STATUS) {
        const cur = currencyOf(e);
        const amt = parseFloat(e.amount) || 0;
        const type = normalizeServiceTypeValue(e.serviceType);
        if (type === "Placement") bucket.placement[cur] += amt;
        if (type === "New Placement") bucket.newPlacement[cur] += amt;
      }
    }
    return [...map.values()].sort((a, b) => {
      if (+a.year !== +b.year) return +a.year - +b.year;
      return (MONTH_IDX[a.month] ?? 0) - (MONTH_IDX[b.month] ?? 0);
    });
  }, [filtered]);

  const totalPlacement = useMemo(() => {
    let sum = { USD: 0, GBP: 0 };
    for (const r of placementPivot) {
      sum.USD += r.placement.USD;
      sum.GBP += r.placement.GBP;
    }
    return sum;
  }, [placementPivot]);

  const totalNewPlacement = useMemo(() => {
    let sum = { USD: 0, GBP: 0 };
    for (const r of placementPivot) {
      sum.USD += r.newPlacement.USD;
      sum.GBP += r.newPlacement.GBP;
    }
    return sum;
  }, [placementPivot]);

  const pendingReceivedPie = useMemo(() => ([
    { label: "Pending", color: "#f59e0b", value: toUsd(totalPending) },
    { label: "Received", color: "#4ade80", value: toUsd(totalReceived) },
  ]), [totalPending, totalReceived, gbpToUsd]);

  const placementPie = useMemo(() => ([
    { label: "Placement", color: "#6366f1", value: toUsd(totalPlacement) },
    { label: "New Placement", color: "#14b8a6", value: toUsd(totalNewPlacement) },
  ]), [totalPlacement, totalNewPlacement, gbpToUsd]);

  /* ── Excel export ── */
  const handleExport = () => {
    const rows = pivot.map(r => ({
      "Month-Year":      r.key,
      "Pending (USD)":   r.pending.USD,
      "Pending (GBP)":   r.pending.GBP,
      "Received (USD)":  r.received.USD,
      "Received (GBP)":  r.received.GBP,
      "Grand Total USD": r.total.USD,
      "Grand Total GBP": r.total.GBP,
    }));
    rows.push({
      "Month-Year": "Grand Total",
      "Pending (USD)":   grand.pending.USD,
      "Pending (GBP)":   grand.pending.GBP,
      "Received (USD)":  grand.received.USD,
      "Received (GBP)":  grand.received.GBP,
      "Grand Total USD": grand.total.USD,
      "Grand Total GBP": grand.total.GBP,
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary");
    XLSX.writeFile(wb, `Summary_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) return (
    <div className="page-inner" style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-muted)", padding: "40px 0" }}>
        <div style={{ width: 18, height: 18, border: "2px solid var(--teal)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        Loading…
      </div>
    </div>
  );

  return (
    <div className="page-inner" style={{ padding: "16px 20px" }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 10 }}>
        <h1 className="page-title"><span>Summary</span></h1>
        <p className="page-subtitle">Pivot of Pending vs Received per month, filterable by year, month, and company</p>
      </div>

      {/* Filter row */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <FilterSelect label="Year" value={filters.year} onChange={v => setFilters(f => ({ ...f, year: v }))}>
          <option value="">All</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </FilterSelect>
        <FilterSelect label="Month" value={filters.month} onChange={v => setFilters(f => ({ ...f, month: v }))}>
          <option value="">All</option>
          {MONTH_NAMES.map(m => <option key={m} value={m}>{m}</option>)}
        </FilterSelect>
        <FilterSelect label="Company" value={filters.company} onChange={v => setFilters(f => ({ ...f, company: v }))}>
          <option value="">All</option>
          {companies.map(c => <option key={c} value={c}>{c}</option>)}
        </FilterSelect>
        {(filters.year || filters.month || filters.company) && (
          <button onClick={() => setFilters({ year: "", month: "", company: "" })}
            style={{ padding: "6px 12px", fontSize: 11, fontWeight: 600, border: "1px solid var(--border-md)", borderRadius: 8, background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font)" }}>
            Clear
          </button>
        )}
        <button className="btn-icon" onClick={handleExport} style={{ marginLeft: "auto" }}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Excel
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
        <SummaryCard label="Pending" color="#f59e0b" amountUsd={toUsd(totalPending)} />
        <SummaryCard label="Received" color="#4ade80" amountUsd={toUsd(totalReceived)} />
        <SummaryCard label="New Placement" color="#14b8a6" amountUsd={toUsd(totalNewPlacement)} />
        <SummaryCard label="Placement" color="#6366f1" amountUsd={toUsd(totalPlacement)} />
      </div>

      {pivot.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <div className="empty-title">No entries match these filters</div>
          <div className="empty-sub">Adjust Year, Month, or Company to see summary rows</div>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginBottom: 12 }}>
            <div className="summary-chart-panel" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Pending vs Received</div>
              <PieChart slices={pendingReceivedPie} />
              <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)", marginTop: 8, justifyContent: "flex-start" }}>
                <Legend color="#f59e0b" label="Pending" />
                <Legend color="#4ade80" label="Received" />
              </div>
            </div>
            <div className="summary-chart-panel" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>New vs Placement</div>
              <PieChart slices={placementPie} />
              <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)", marginTop: 8, justifyContent: "flex-start" }}>
                <Legend color="#6366f1" label="Placement" />
                <Legend color="#14b8a6" label="New Placement" />
              </div>
            </div>
          </div>

          <div className="tbl-wrap summary-table-panel">
            <table className="tbl" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ padding: "7px 12px" }}>Months</th>
                  <th style={{ padding: "7px 12px" }}>Pending</th>
                  <th style={{ padding: "7px 12px" }}>Received</th>
                  <th style={{ padding: "7px 12px" }}>Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {monthMergedPivot.map(r => (
                  <tr key={r.month}>
                    <td style={{ fontWeight: 600, color: "var(--mint)", padding: "6px 12px" }}>{r.month}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums", padding: "6px 12px" }}>
                      {(r.pending.USD || r.pending.GBP)
                        ? <MoneyStack usd={r.pending.USD} gbp={r.pending.GBP} decimals={2} />
                        : <span style={{ color: "var(--text-dim)" }}>—</span>}
                    </td>
                    <td style={{ fontVariantNumeric: "tabular-nums", color: "#4ade80", padding: "6px 12px" }}>
                      {(r.received.USD || r.received.GBP)
                        ? <MoneyStack usd={r.received.USD} gbp={r.received.GBP} decimals={2} />
                        : <span style={{ color: "var(--text-dim)" }}>—</span>}
                    </td>
                    <td style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, padding: "6px 12px" }}>
                      <MoneyStack usd={r.total.USD} gbp={r.total.GBP} decimals={2} />
                    </td>
                  </tr>
                ))}
                <tr style={{ background: "rgba(125,226,209,0.06)", borderTop: "2px solid var(--border-md)" }}>
                  <td style={{ fontWeight: 800, padding: "6px 12px" }}>Grand Total</td>
                  <td style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", padding: "6px 12px" }}>
                    <MoneyStack usd={grand.pending.USD} gbp={grand.pending.GBP} decimals={2} />
                  </td>
                  <td style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "#4ade80", padding: "6px 12px" }}>
                    <MoneyStack usd={grand.received.USD} gbp={grand.received.GBP} decimals={2} />
                  </td>
                  <td style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", padding: "6px 12px" }}>
                    <MoneyStack usd={grand.total.USD} gbp={grand.total.GBP} decimals={2} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────── helpers ─────────────── */

function FilterSelect({ label, value, onChange, children }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", border: "1px solid var(--border-md)", borderRadius: 8, background: "var(--surface)", fontSize: 12 }}>
      <span style={{ fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", fontSize: 10 }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ background: "transparent", border: "none", outline: "none", color: "var(--text)", fontFamily: "var(--font)", fontSize: 12, fontWeight: 600, cursor: "pointer", minWidth: 80 }}>
        {children}
      </select>
    </label>
  );
}

function SummaryCard({ label, color, amountUsd }) {
  return (
    <div className="kpi-card" style={{ minHeight: 88, padding: 12, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{fmtMoneyC(amountUsd, "USD", 2)}</div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

function polar(cx, cy, r, angle) {
  const rad = (angle - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polar(cx, cy, r, endAngle);
  const end = polar(cx, cy, r, startAngle);
  const large = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`;
}

function PieChart({ slices }) {
  const W = 360;
  const H = 140;
  const cx = 180;
  const cy = 70;
  const radius = 52;
  const total = slices.reduce((sum, s) => sum + (s.value || 0), 0);

  if (!total) {
    return (
      <div style={{ height: 140, display: "grid", placeItems: "center", color: "var(--text-muted)", fontSize: 12 }}>
        No data
      </div>
    );
  }

  let start = 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="140" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      {slices.map((slice) => {
        const sweep = (slice.value / total) * 360;
        const end = start + sweep;
        const path = arcPath(cx, cy, radius, start, end);
        const currentStart = start;
        start = end;
        return (
          <path key={`${slice.label}-${currentStart}`} d={path} fill={slice.color}>
            <title>{slice.label}: {fmtMoneyC(slice.value, "USD", 2)}</title>
          </path>
        );
      })}
      <circle cx={cx} cy={cy} r="24" fill="var(--surface)" />
    </svg>
  );
}
