"use client";
import { useState, useMemo } from "react";
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

  /* ── Chart values (USD-equivalent: USD + GBP just for the bar height ranking) ── */
  const chartMax = useMemo(() => {
    let m = 0;
    for (const r of pivot) {
      const t = r.total.USD + r.total.GBP;
      if (t > m) m = t;
    }
    return m || 1;
  }, [pivot]);

  const placementChartMax = useMemo(() => {
    let m = 0;
    for (const r of placementPivot) {
      const t = r.placement.USD + r.placement.GBP + r.newPlacement.USD + r.newPlacement.GBP;
      if (t > m) m = t;
    }
    return m || 1;
  }, [placementPivot]);

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
    <div className="page-inner">
      <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-muted)", padding: "40px 0" }}>
        <div style={{ width: 18, height: 18, border: "2px solid var(--teal)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        Loading…
      </div>
    </div>
  );

  return (
    <div className="page-inner">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title"><span>Summary</span></h1>
        <p className="page-subtitle">Pivot of Pending vs Received per month, filterable by year, month, and company</p>
      </div>

      {/* Filter row */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
        <SummaryCard label="Pending" color="#f59e0b" amount={totalPending} />
        <SummaryCard label="Received" color="#4ade80" amount={totalReceived} />
        <SummaryCard label="New Placement" color="#14b8a6" amount={totalNewPlacement} />
        <SummaryCard label="Placement" color="#6366f1" amount={totalPlacement} />
      </div>

      {pivot.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <div className="empty-title">No entries match these filters</div>
          <div className="empty-sub">Adjust Year, Month, or Company to see summary rows</div>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16, marginBottom: 28 }}>
            <div className="summary-chart-panel" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Pending vs Received</div>
              <BarChart pivot={pivot} max={chartMax} pendingColor="#f59e0b" receivedColor="#4ade80" pendingLabel="Pending" receivedLabel="Received" />
              <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--text-muted)", marginTop: 14, justifyContent: "flex-start" }}>
                <Legend color="#f59e0b" label="Pending" />
                <Legend color="#4ade80" label="Received" />
              </div>
            </div>
            <div className="summary-chart-panel" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>New vs Placement</div>
              <BarChart pivot={placementPivot} max={placementChartMax} pendingColor="#6366f1" receivedColor="#14b8a6" pendingLabel="Placement" receivedLabel="New Placement" getPending={r => r.placement} getReceived={r => r.newPlacement} />
              <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--text-muted)", marginTop: 14, justifyContent: "flex-start" }}>
                <Legend color="#6366f1" label="Placement" />
                <Legend color="#14b8a6" label="New Placement" />
              </div>
            </div>
          </div>

          <div className="tbl-wrap summary-table-panel">
            <table className="tbl" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Months</th>
                  <th>Pending</th>
                  <th>Received</th>
                  <th>Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {pivot.map(r => (
                  <tr key={r.key}>
                    <td style={{ fontWeight: 600, color: "var(--mint)" }}>{(r.key).split("-")[0]}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>
                      {(r.pending.USD || r.pending.GBP)
                        ? <MoneyStack usd={r.pending.USD} gbp={r.pending.GBP} decimals={2} />
                        : <span style={{ color: "var(--text-dim)" }}>—</span>}
                    </td>
                    <td style={{ fontVariantNumeric: "tabular-nums", color: "#4ade80" }}>
                      {(r.received.USD || r.received.GBP)
                        ? <MoneyStack usd={r.received.USD} gbp={r.received.GBP} decimals={2} />
                        : <span style={{ color: "var(--text-dim)" }}>—</span>}
                    </td>
                    <td style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
                      <MoneyStack usd={r.total.USD} gbp={r.total.GBP} decimals={2} />
                    </td>
                  </tr>
                ))}
                <tr style={{ background: "rgba(125,226,209,0.06)", borderTop: "2px solid var(--border-md)" }}>
                  <td style={{ fontWeight: 800 }}>Grand Total</td>
                  <td style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                    <MoneyStack usd={grand.pending.USD} gbp={grand.pending.GBP} decimals={2} />
                  </td>
                  <td style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "#4ade80" }}>
                    <MoneyStack usd={grand.received.USD} gbp={grand.received.GBP} decimals={2} />
                  </td>
                  <td style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
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

function SummaryCard({ label, color, amount }) {
  const total = (amount.USD || 0) + (amount.GBP || 0);
  return (
    <div className="kpi-card" style={{ minHeight: 118, padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{fmtMoneyC(total, "USD", 2)}</div>
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

/* SVG bar chart: paired Pending (amber) + Received (green) bars per month bucket. */
function BarChart({ pivot, max, pendingColor = "#fbbf24", receivedColor = "#4ade80", pendingLabel = "Pending", receivedLabel = "Received", getPending = r => r.pending, getReceived = r => r.received }) {
  const W = 380, H = 180, padL = 36, padR = 8, padT = 8, padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const groupW = innerW / Math.max(1, pivot.length);
  const barW   = Math.max(4, (groupW - 6) / 2);
  const yFor   = (v) => padT + innerH - (v / max) * innerH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = padT + innerH * (1 - t);
        const lbl = max * t;
        const compact = lbl >= 1000 ? `${Math.round(lbl / 1000)}k` : Math.round(lbl);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--border)" strokeWidth="1" />
            <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="9" fill="var(--text-muted)" fontFamily="ui-monospace, monospace">{compact}</text>
          </g>
        );
      })}

      {pivot.map((r, i) => {
        const x0 = padL + groupW * i + 3;
        const pendV = (() => {
          const p = getPending(r);
          return (p.USD || 0) + (p.GBP || 0);
        })();
        const recvV = (() => {
          const v = getReceived(r);
          return (v.USD || 0) + (v.GBP || 0);
        })();
        return (
          <g key={r.key}>
            {pendV > 0 && (
              <rect x={x0} y={yFor(pendV)} width={barW} height={padT + innerH - yFor(pendV)} fill={pendingColor} rx="1.5">
                <title>{r.key} · {pendingLabel}</title>
              </rect>
            )}
            {recvV > 0 && (
              <rect x={x0 + barW + 2} y={yFor(recvV)} width={barW} height={padT + innerH - yFor(recvV)} fill={receivedColor} rx="1.5">
                <title>{r.key} · {receivedLabel}</title>
              </rect>
            )}
            <text x={x0 + barW} y={H - padB + 11} textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontFamily="ui-monospace, monospace">
              {r.key}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
