"use client";
import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import useDashboardStore, {
  ALL_STATUSES,
  INSTANCE_OPTIONS,
  LAIDOFF_STATUSES,
  MONTH_NAMES,
  fmtMoney,
  fmtMoneyC,
  currencyOf,
} from "@/lib/use-store";
import DateInput from "@/app/components/DateInput";
import MoneyStack from "@/app/components/MoneyStack";

function statusBadgeClass(status) {
  if (status === "Paid") return "badge-paid";
  if (status === "Pending") return "badge-pending";
  if (status === "Laid Off") return "badge-laidoff";
  if (status === "Default") return "badge-defaulter";
  if (["Offer Revoke", "No Offer", "Resigned"].includes(status)) return "badge-laidoff";
  return "badge-gray";
}

export default function SpecialSheetPage({ type = "laidoff" }) {
  const { getLaidOff, getDefaulters, updateEntry, updateStatus, loading } = useDashboardStore();

  const isLaidOff = type === "laidoff";
  const rawEntries = isLaidOff ? getLaidOff() : getDefaulters();

  const [filters, setFilters] = useState({ company: "", month: "", year: "" });

  /* ── Filter options ── */
  const companies = [...new Set(rawEntries.map(e => e.company).filter(Boolean))].sort();
  const years = [...new Set(rawEntries.map(e => e.year).filter(Boolean))].sort((a, b) => b - a);

  /* ── Filtered entries ── */
  const entries = useMemo(() => {
    let rows = rawEntries;
    if (filters.company) rows = rows.filter(e => e.company === filters.company);
    if (filters.month) rows = rows.filter(e => e.month === filters.month);
    if (filters.year) rows = rows.filter(e => String(e.year) === String(filters.year));
    return rows;
  }, [rawEntries, filters]);

  /* ── KPI data — totals split by currency for stacked display */
  const sumSplit = (rows) => {
    const t = { USD: 0, GBP: 0 };
    for (const e of rows) t[currencyOf(e)] += parseFloat(e.amount) || 0;
    return t;
  };
  const kpiData = useMemo(() => {
    if (isLaidOff) {
      return LAIDOFF_STATUSES.map(status => {
        const rows = entries.filter(e => e.status === status);
        return { label: status, count: rows.length, sum: sumSplit(rows) };
      });
    }
    return [{ label: "Defaulters", count: entries.length, sum: sumSplit(entries) }];
  }, [entries, isLaidOff]);

  /* ── Export ── */
  const handleExport = () => {
    const rows = entries.map((e, i) => ({
      "#": i + 1,
      Company: e.company,
      Candidate: e.candidate,
      Date: e.poDate,
      Month: e.month,
      Year: e.year,
      Instance: e.instance,
      USD: parseFloat(e.amount) || 0,
      "Service Type": e.serviceType,
      Status: e.status,
      Type: e.type,
      Remarks: e.notes,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isLaidOff ? "Laid Off" : "Defaulters");
    XLSX.writeFile(wb, `${isLaidOff ? "LaidOff" : "Defaulters"}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const title = isLaidOff ? "Laid Off Sheet" : "Defaulter Sheet";
  const icon = isLaidOff ? "🔴" : "⚠️";
  const infoStatuses = isLaidOff ? "Laid Off, Offer Revoke, No Offer, Resigned" : "Default";

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
        <h1 className="page-title">{icon} {title.split(" ")[0]} <span>{title.split(" ").slice(1).join(" ")}</span></h1>
        <p className="page-subtitle">Entries routed here automatically when status is set to {infoStatuses}</p>
      </div>

      {/* Info Banner */}
      <div style={{
        background: isLaidOff ? "rgba(251,146,60,0.08)" : "rgba(248,113,113,0.08)",
        border: `1px solid ${isLaidOff ? "rgba(251,146,60,0.25)" : "rgba(248,113,113,0.25)"}`,
        borderRadius: "var(--r-lg)",
        padding: "10px 16px",
        fontSize: 13,
        color: isLaidOff ? "#fb923c" : "#f87171",
        marginBottom: 20,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <span style={{ fontSize: 15 }}>{isLaidOff ? "ℹ️" : "⚠️"}</span>
        Entries appear here automatically when status is set to <strong>{infoStatuses}</strong>.
        Change status to a non-routed value to move them back to the active sheet.
      </div>

      {/* KPI Strip */}
      <div className="kpi-strip">
        {kpiData.map(kpi => (
          <div className="kpi-card" key={kpi.label}>
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value">{kpi.count}</div>
            <div className="kpi-sub" style={{ color: isLaidOff ? "#fb923c" : "#f87171" }}><MoneyStack usd={kpi.sum.USD} gbp={kpi.sum.GBP} decimals={0} /></div>
          </div>
        ))}
      </div>

      {/* Filters + Export */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="filter-bar" style={{ flex: 1, marginBottom: 0 }}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <select className="filter-select" value={filters.company} onChange={e => setFilters(f => ({ ...f, company: e.target.value }))}>
            <option value="">All Companies</option>
            {companies.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="filter-select" value={filters.month} onChange={e => setFilters(f => ({ ...f, month: e.target.value }))}>
            <option value="">All Months</option>
            {MONTH_NAMES.map(m => <option key={m}>{m}</option>)}
          </select>
          <select className="filter-select" value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}>
            <option value="">All Years</option>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
          {Object.values(filters).some(Boolean) && (
            <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setFilters({ company: "", month: "", year: "" })}>Clear</button>
          )}
        </div>
        <button className="btn-icon" onClick={handleExport}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Excel
        </button>
      </div>

      {/* Table */}
      {entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{isLaidOff ? "🔴" : "⚠️"}</div>
          <div className="empty-title">No {isLaidOff ? "laid off" : "defaulter"} entries</div>
          <div className="empty-sub">
            {Object.values(filters).some(Boolean)
              ? "Try clearing filters"
              : `Entries with status "${infoStatuses}" will appear here automatically`}
          </div>
        </div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>Company</th>
                <th>Candidate</th>
                <th>Date</th>
                <th>Month</th>
                <th>Year</th>
                <th>Instance</th>
                <th>USD</th>
                <th>Service Type</th>
                <th>Status</th>
                <th>Type</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={entry.id}>
                  <td style={{ color: "var(--text-dim)", fontSize: 11 }}>{idx + 1}</td>
                  <td style={{ fontWeight: 500 }}>{entry.company || "—"}</td>
                  <td style={{ fontWeight: 600, color: "var(--mint)" }}>{entry.candidate || "—"}</td>
                  <td>
                    <DateInput
                      value={entry.poDate}
                      onChange={v => updateEntry(entry.id, { poDate: v })}
                      className="tbl-input"
                      style={{ minWidth: 132 }}
                    />
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{entry.month}</td>
                  <td style={{ color: "var(--text-muted)" }}>{entry.year}</td>
                  <td>
                    <select
                      className="tbl-select"
                      value={entry.instance || "First Half"}
                      onChange={e => updateEntry(entry.id, { instance: e.target.value })}
                    >
                      {INSTANCE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--mint)", fontVariantNumeric: "tabular-nums" }}>
                    {fmtMoneyC(entry.amount, currencyOf(entry), 0)}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{entry.serviceType}</td>
                  <td>
                    <select
                      className="tbl-select"
                      value={entry.status}
                      onChange={e => updateStatus(entry.id, e.target.value)}
                      style={{ fontSize: 11 }}
                    >
                      {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ color: "var(--text-dim)", fontSize: 12 }}>{entry.type || "—"}</td>
                  <td>
                    <input
                      className="tbl-input"
                      style={{ minWidth: 100, maxWidth: 180 }}
                      defaultValue={entry.notes || ""}
                      placeholder="Add note…"
                      onBlur={e => {
                        if (e.target.value !== (entry.notes || ""))
                          updateEntry(entry.id, { notes: e.target.value });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
