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

  // const currentMonth = MONTH_NAMES[today.getMonth()];
  const currentYear = String(today.getFullYear());
  const { getActive, loading } = useDashboardStore();
  const entries = getActive();

  // const [filters, setFilters] = useState({ year: "", month: "", company: "" });
  const [filters, setFilters] = useState({
    year: currentYear,
    // month: currentMonth,
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
  const toUsdAmount = (amount, currency) => (currency === "GBP" ? amount * gbpToUsd : amount);

  
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
    // if (filters.month)   rows = rows.filter(e => e.month === filters.month);
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

  const companyPendingReceived = useMemo(() => {
    const map = new Map();

    for (const e of filtered) {
      const company = e.company?.trim() || "Unknown";
      let bucket = map.get(company);
      if (!bucket) {
        bucket = {
          company,
          pending: 0,
          received: 0,
          total: 0,
        };
        map.set(company, bucket);
      }

      const cur = currencyOf(e);
      const amount = parseFloat(e.amount) || 0;
      const paid = parseFloat(e.paid) || 0;
      const usdAmount = toUsdAmount(e.status === RECEIVED_STATUS ? paid : amount, cur);

      if (e.status === RECEIVED_STATUS) {
        bucket.received += usdAmount;
      } else {
        bucket.pending += usdAmount;
      }
      bucket.total += usdAmount;
    }

    return [...map.values()]
      .sort((a, b) => b.total - a.total || a.company.localeCompare(b.company))
      .slice(0, 8);
  }, [filtered, gbpToUsd]);

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

  const companyPlacement = useMemo(() => {
    const map = new Map();

    for (const e of filtered) {
      if (e.status !== RECEIVED_STATUS) continue;

      const type = normalizeServiceTypeValue(e.serviceType);
      if (!type) continue;

      const company = e.company?.trim() || "Unknown";
      let bucket = map.get(company);
      if (!bucket) {
        bucket = {
          company,
          placement: 0,
          newPlacement: 0,
          total: 0,
        };
        map.set(company, bucket);
      }

      const cur = currencyOf(e);
      const amount = parseFloat(e.amount) || 0;
      const usdAmount = toUsdAmount(amount, cur);

      if (type === "Placement") {
        bucket.placement += usdAmount;
      } else if (type === "New Placement") {
        bucket.newPlacement += usdAmount;
      }
      bucket.total += usdAmount;
    }

    return [...map.values()]
      .sort((a, b) => b.total - a.total || a.company.localeCompare(b.company))
      .slice(0, 8);
  }, [filtered, gbpToUsd]);

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
    <div className="page-inner" style={{ padding: "12px 20px 12px 20px", display: "flex", flexDirection: "column", height: "100vh", boxSizing: "border-box", overflow: "hidden" }}>
      {/* Header and Filter Row combined to save height */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0, fontSize: 18, lineHeight: 1.2 }}><span>Summary</span></h1>
          <p className="page-subtitle" style={{ margin: 0, fontSize: 10 }}>Pivot of Pending vs Received per month</p>
        </div>

        {/* Filter row */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <FilterSelect label="Year" value={filters.year} onChange={v => setFilters(f => ({ ...f, year: v }))}>
            <option value="">All</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </FilterSelect>
          <FilterSelect label="Company" value={filters.company} onChange={v => setFilters(f => ({ ...f, company: v }))}>
            <option value="">All</option>
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
          </FilterSelect>
          {(filters.year || filters.company) && (
            <button onClick={() => setFilters({ year: "", company: "" })}
              style={{ padding: "6px 12px", fontSize: 11, fontWeight: 600, border: "1px solid var(--border-md)", borderRadius: 8, background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font)" }}>
              Clear
            </button>
          )}
          <button className="btn-icon" onClick={handleExport}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Excel
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginBottom: 8 }}>
        <SummaryCard label="Pending" color="#f59e0b" amountUsd={toUsd(totalPending)} />
        <SummaryCard label="Received" color="#4ade80" amountUsd={toUsd(totalReceived)} />
        <SummaryCard label="New Placement" color="#14b8a6" amountUsd={toUsd(totalNewPlacement)} />
        <SummaryCard label="Placement" color="#6366f1" amountUsd={toUsd(totalPlacement)} />
      </div>

      {pivot.length === 0 ? (
        <div className="empty-state" style={{ flex: 1 }}>
          <div className="empty-icon">📊</div>
          <div className="empty-title">No entries match these filters</div>
          <div className="empty-sub">Adjust Year, Month, or Company to see summary rows</div>
        </div>
      ) : (
        <>
          <style>{`
            @media (max-width: 1024px) {
              .summary-charts-container {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
          <div className="summary-charts-container" style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12, marginBottom: 8 }}>
            <div className="summary-chart-panel" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", padding: "10px 14px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Company-wise Pending vs Received</div>
              <PieChart rows={companyPendingReceived} />
            </div>
            <div className="summary-chart-panel" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", padding: "10px 14px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Company-wise Placement vs New Placement</div>
              <BarChart
                rows={companyPlacement}
                series={[
                  { key: "placement", label: "Placement", color: "#6366f1" },
                  { key: "newPlacement", label: "New Placement", color: "#14b8a6" },
                ]}
              />
              <div style={{ display: "flex", gap: 12, fontSize: 10, color: "var(--text-muted)", marginTop: 4, justifyContent: "flex-start", flexWrap: "wrap" }}>
                <Legend color="#6366f1" label="Placement" />
                <Legend color="#14b8a6" label="New Placement" />
              </div>
            </div>
          </div>

          <div className="tbl-wrap summary-table-panel" style={{ flex: "1 1 0%", overflowY: "auto", minHeight: 0, border: "1px solid var(--border)", borderRadius: "var(--r-xl)", background: "var(--surface)" }}>
            <table className="tbl" style={{ fontSize: 11 }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--surface)", zIndex: 1 }}>
                <tr>
                  <th style={{ padding: "6px 12px" }}>Months</th>
                  <th style={{ padding: "6px 12px" }}>Pending</th>
                  <th style={{ padding: "6px 12px" }}>Received</th>
                  <th style={{ padding: "6px 12px" }}>Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {monthMergedPivot.map(r => (
                  <tr key={r.month}>
                    <td style={{ fontWeight: 600, color: "var(--mint)", padding: "5px 12px" }}>{r.month}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums", padding: "5px 12px" }}>
                      {(r.pending.USD || r.pending.GBP)
                        ? <MoneyStack usd={r.pending.USD} gbp={r.pending.GBP} decimals={2} />
                        : <span style={{ color: "var(--text-dim)" }}>—</span>}
                    </td>
                    <td style={{ fontVariantNumeric: "tabular-nums", color: "#4ade80", padding: "5px 12px" }}>
                      {(r.received.USD || r.received.GBP)
                        ? <MoneyStack usd={r.received.USD} gbp={r.received.GBP} decimals={2} />
                        : <span style={{ color: "var(--text-dim)" }}>—</span>}
                    </td>
                    <td style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, padding: "5px 12px" }}>
                      <MoneyStack usd={r.total.USD} gbp={r.total.GBP} decimals={2} />
                    </td>
                  </tr>
                ))}
                <tr style={{ background: "rgba(125,226,209,0.06)", borderTop: "2px solid var(--border-md)", position: "sticky", bottom: 0, zIndex: 1 }}>
                  <td style={{ fontWeight: 800, padding: "5px 12px" }}>Grand Total</td>
                  <td style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", padding: "5px 12px" }}>
                    <MoneyStack usd={grand.pending.USD} gbp={grand.pending.GBP} decimals={2} />
                  </td>
                  <td style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "#4ade80", padding: "5px 12px" }}>
                    <MoneyStack usd={grand.received.USD} gbp={grand.received.GBP} decimals={2} />
                  </td>
                  <td style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", padding: "5px 12px" }}>
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
    <div className="kpi-card" style={{ minHeight: 64, padding: 10, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
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

function LineChart({ rows, series }) {
  if (!rows.length) {
    return (
      <div style={{ height: 140, display: "grid", placeItems: "center", color: "var(--text-muted)", fontSize: 12 }}>
        No company data
      </div>
    );
  }

  const maxValue = Math.max(
    ...rows.flatMap((row) => series.map((item) => row[item.key] || 0)),
    1
  );

  const height = 180;
  const padding = 20;
  const chartHeight = height - padding * 2;
  const leftPadding = 80;
  const rightPadding = 40;
  const chartWidth = 1000 - leftPadding - rightPadding;

  const linesPoints = series.map((item) => {
    return rows.map((row, i) => {
      const value = row[item.key] || 0;
      const x = rows.length > 1 ? leftPadding + (i / (rows.length - 1)) * chartWidth : leftPadding + chartWidth / 2;
      const y = padding + chartHeight - (value / maxValue) * chartHeight;
      return { x, y, value, company: row.company, label: item.label };
    });
  });

  const formatAxisValue = (val) => {
    if (val === 0) return "$0";
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
    return `$${Math.round(val)}`;
  };

  return (
    <div style={{ width: "100%", paddingBottom: 4 }}>
      <svg width="100%" height={height} viewBox="0 0 1000 180" style={{ display: "block" }}>
        {/* Horizontal grid lines and Y-axis text */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding + chartHeight - ratio * chartHeight;
          const val = maxValue * ratio;
          return (
            <g key={ratio}>
              <line
                x1={leftPadding}
                y1={y}
                x2={1000 - rightPadding}
                y2={y}
                stroke="var(--color-border-light)"
                strokeDasharray="4 4"
              />
              <text
                x={leftPadding - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fontWeight="600"
                fill="var(--text-muted)"
              >
                {formatAxisValue(val)}
              </text>
            </g>
          );
        })}

        {/* Solid Axes lines */}
        <line
          x1={leftPadding}
          y1={padding}
          x2={leftPadding}
          y2={padding + chartHeight}
          stroke="var(--color-border)"
          strokeWidth="1.5"
        />
        <line
          x1={leftPadding}
          y1={padding + chartHeight}
          x2={1000 - rightPadding}
          y2={padding + chartHeight}
          stroke="var(--color-border)"
          strokeWidth="1.5"
        />

        {/* Lines */}
        {linesPoints.map((points, seriesIdx) => {
          const pointsStr = points.map((p) => `${p.x},${p.y}`).join(" ");
          const color = series[seriesIdx].color;
          return (
            <polyline
              key={seriesIdx}
              points={pointsStr}
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Intersect circles */}
        {linesPoints.map((points, seriesIdx) => {
          const color = series[seriesIdx].color;
          return points.map((p, i) => (
            <circle
              key={`${seriesIdx}-${i}`}
              cx={p.x}
              cy={p.y}
              r="5"
              fill={color}
              stroke="var(--surface)"
              strokeWidth="2"
              title={`${p.company} ${p.label}: ${fmtMoneyC(p.value, "USD", 2)}`}
              style={{ cursor: "pointer" }}
            />
          ));
        })}
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "8%", paddingRight: "4%", marginTop: 8 }}>
        {rows.map((row) => (
          <div key={row.company} style={{ width: 0, flex: "0 0 0", overflow: "visible", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 120, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", lineHeight: 1.15, minHeight: 26 }} title={row.company}>
                {row.company}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {fmtMoneyC(row.total, "USD", 2)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10, color: "var(--text-muted)", width: "100%" }}>
                {series.map((item) => (
                  <span key={`${row.company}-${item.label}`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, whiteSpace: "nowrap" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, display: "inline-block" }} />
                    {fmtMoneyC(row[item.key] || 0, "USD", 2)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const PIE_COLORS = [
  "#6366f1", // Indigo
  "#14b8a6", // Teal
  "#f59e0b", // Amber
  "#4ade80", // Green
  "#ec4899", // Pink
  "#3b82f6", // Blue
  "#a855f7", // Purple
  "#ef4444", // Red
];

function CompanyPieChart({ row }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const { company, pending, received, total } = row;

  if (total <= 0) {
    return (
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 10.5, fontWeight: "bold", marginBottom: 6, height: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }} title={company}>
          {company}
        </div>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: "var(--color-border-light)", display: "grid", placeItems: "center", fontSize: 10, color: "var(--text-muted)" }}>
          No data
        </div>
      </div>
    );
  }

  const slices = [
    { key: "pending", label: "Pending", value: pending, color: "#f59e0b" },
    { key: "received", label: "Received", value: received, color: "#4ade80" }
  ].filter(s => s.value > 0);

  const totalVal = slices.reduce((sum, s) => sum + s.value, 0);

  let startAngle = 0;
  const segments = slices.map((slice, idx) => {
    const percentage = totalVal > 0 ? slice.value / totalVal : 0;
    const angle = percentage * 360;
    const endAngle = startAngle + angle;

    const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
      const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians)
      };
    };

    const describePieSlice = (x, y, innerRadius, outerRadius, startAngle, endAngle) => {
      if (endAngle - startAngle >= 359.99) {
        return `
          M ${x} ${y - outerRadius}
          A ${outerRadius} ${outerRadius} 0 1 1 ${x - 0.01} ${y - outerRadius}
          Z
          M ${x} ${y - innerRadius}
          A ${innerRadius} ${innerRadius} 0 1 0 ${x + 0.01} ${y - innerRadius}
          Z
        `;
      }
      const startOuter = polarToCartesian(x, y, outerRadius, startAngle);
      const endOuter = polarToCartesian(x, y, outerRadius, endAngle);
      const startInner = polarToCartesian(x, y, innerRadius, startAngle);
      const endInner = polarToCartesian(x, y, innerRadius, endAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

      return [
        "M", startOuter.x, startOuter.y,
        "A", outerRadius, outerRadius, 0, largeArcFlag, 1, endOuter.x, endOuter.y,
        "L", endInner.x, endInner.y,
        "A", innerRadius, innerRadius, 0, largeArcFlag, 0, startInner.x, startInner.y,
        "Z"
      ].join(" ");
    };

    const currentStart = startAngle;
    startAngle = endAngle;

    return {
      ...slice,
      percentage,
      path: describePieSlice(60, 60, 26, 42, currentStart, endAngle),
      hoverPath: describePieSlice(60, 60, 26, 45, currentStart, endAngle)
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", width: "100%" }}>
      <div style={{ fontSize: 12.5, fontWeight: "bold", marginBottom: 6, textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={company}>
        {company}
      </div>

      <svg width="200" height="200" viewBox="0 0 120 120" style={{ display: "block" }}>
        <g>
          {segments.map((seg, idx) => (
            <path
              key={idx}
              d={hoveredIdx === idx ? seg.hoverPath : seg.path}
              fill={seg.color}
              stroke="var(--surface)"
              strokeWidth="1.5"
              style={{ cursor: "pointer", transition: "all 0.15s ease" }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </g>

        <circle cx="60" cy="60" r="24" fill="var(--surface)" />

        {hoveredIdx !== null ? (
          <g>
            <text x="60" y="58" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="var(--text-muted)">
              {segments[hoveredIdx].label.toUpperCase()}
            </text>
            <text x="60" y="69" textAnchor="middle" fontSize="9" fontWeight="800" fill={segments[hoveredIdx].color}>
              {fmtMoneyC(segments[hoveredIdx].value, "USD", 0)}
            </text>
          </g>
        ) : (
          <g>
            <text x="60" y="58" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="var(--text-muted)">
              TOTAL
            </text>
            <text x="60" y="69" textAnchor="middle" fontSize="9" fontWeight="800" fill="var(--text)">
              {fmtMoneyC(totalVal, "USD", 0)}
            </text>
          </g>
        )}
      </svg>

      <div style={{ display: "flex", gap: 6, fontSize: 9, marginTop: 4 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
          <span>P: {Math.round((pending / total) * 100) || 0}%</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
          <span>R: {Math.round((received / total) * 100) || 0}%</span>
        </span>
      </div>
    </div>
  );
}

function PieChart({ rows }) {
  if (!rows.length) {
    return (
      <div style={{ height: 180, display: "grid", placeItems: "center", color: "var(--text-muted)", fontSize: 12 }}>
        No company data
      </div>
    );
  }

  const top4 = rows.slice(0, 4);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, width: "100%", padding: "4px 0" }}>
      {top4.map((row, idx) => (
        <CompanyPieChart key={row.company || idx} row={row} />
      ))}
    </div>
  );
}

function BarChart({ rows, series }) {
  const [hoveredBar, setHoveredBar] = useState(null);

  if (!rows.length) {
    return (
      <div style={{ height: 180, display: "grid", placeItems: "center", color: "var(--text-muted)", fontSize: 12 }}>
        No company data
      </div>
    );
  }

  const maxValue = Math.max(
    ...rows.flatMap((row) => series.map((item) => row[item.key] || 0)),
    1
  );

  const height = 180;
  const padding = 20;
  const chartHeight = height - padding * 2;
  const leftPadding = 60;
  const rightPadding = 20;
  const chartWidth = 720 - leftPadding - rightPadding;

  const formatAxisValue = (val) => {
    if (val === 0) return "$0";
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
    return `$${Math.round(val)}`;
  };

  const numRows = rows.length;
  const groupWidth = chartWidth / numRows;
  const barWidth = (groupWidth * 0.6) / series.length;
  const groupGap = groupWidth * 0.4;

  return (
    <div style={{ width: "100%", paddingBottom: 4, position: "relative" }}>
      <svg width="100%" height={height} viewBox="0 0 720 180" style={{ display: "block" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding + chartHeight - ratio * chartHeight;
          const val = maxValue * ratio;
          return (
            <g key={ratio}>
              <line
                x1={leftPadding}
                y1={y}
                x2={720 - rightPadding}
                y2={y}
                stroke="var(--color-border-light)"
                strokeDasharray="4 4"
              />
              <text
                x={leftPadding - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="9"
                fontWeight="600"
                fill="var(--text-muted)"
              >
                {formatAxisValue(val)}
              </text>
            </g>
          );
        })}

        <line
          x1={leftPadding}
          y1={padding}
          x2={leftPadding}
          y2={padding + chartHeight}
          stroke="var(--color-border)"
          strokeWidth="1.5"
        />
        <line
          x1={leftPadding}
          y1={padding + chartHeight}
          x2={720 - rightPadding}
          y2={padding + chartHeight}
          stroke="var(--color-border)"
          strokeWidth="1.5"
        />

        {rows.map((row, rowIdx) => {
          const groupStartX = leftPadding + rowIdx * groupWidth + groupGap / 2;
          return series.map((item, seriesIdx) => {
            const val = row[item.key] || 0;
            const barHeight = (val / maxValue) * chartHeight;
            const x = groupStartX + seriesIdx * barWidth;
            const y = padding + chartHeight - barHeight;
            const isHovered = hoveredBar && hoveredBar.rowIdx === rowIdx && hoveredBar.seriesIdx === seriesIdx;

            return (
              <rect
                key={`${rowIdx}-${seriesIdx}`}
                x={x}
                y={y}
                width={barWidth - 2}
                height={Math.max(barHeight, 2)}
                rx="3"
                ry="3"
                fill={item.color}
                opacity={isHovered ? 0.95 : 0.8}
                style={{ cursor: "pointer", transition: "all 0.15s ease" }}
                onMouseEnter={() => setHoveredBar({ rowIdx, seriesIdx, x, y, value: val, label: item.label, company: row.company })}
                onMouseLeave={() => setHoveredBar(null)}
              />
            );
          });
        })}
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "60px", paddingRight: "20px", marginTop: 8 }}>
        {rows.map((row) => (
          <div key={row.company} style={{ flex: 1, textAlign: "center", overflow: "hidden" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.company}>
              {row.company}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              {fmtMoneyC(row.total, "USD", 0)}
            </div>
          </div>
        ))}
      </div>

      {hoveredBar && (
        <div style={{
          position: "absolute",
          top: hoveredBar.y - 45,
          left: hoveredBar.x + 25,
          transform: "translateX(-50%)",
          background: "rgba(15, 23, 42, 0.95)",
          color: "#fff",
          padding: "5px 8px",
          borderRadius: "5px",
          fontSize: "11px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          pointerEvents: "none",
          zIndex: 10,
          whiteSpace: "nowrap",
          border: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          <strong>{hoveredBar.company}</strong>
          <div>{hoveredBar.label}: {fmtMoneyC(hoveredBar.value, "USD", 2)}</div>
        </div>
      )}
    </div>
  );
}
