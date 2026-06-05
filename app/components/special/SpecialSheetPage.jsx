"use client";
import { useState, useMemo, useRef } from "react";
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

const DEFAULTER_IMPORT_HEADERS = [
  "Company", "Name of the Candidate", "Date", "Month", "Year", "Instance of Payment",
  "USD", "Type of Service", "Status", "Type",
];
const LAID_OFF_IMPORT_HEADERS = [...DEFAULTER_IMPORT_HEADERS, "Remarks"];

function cleanHeader(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getCell(row, aliases) {
  const wanted = aliases.map(cleanHeader);
  for (const [key, value] of Object.entries(row || {})) {
    if (wanted.includes(cleanHeader(key))) return value;
  }
  return "";
}

function parseMoney(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  return parseFloat(cleaned) || 0;
}

function normalizeCompanyName(value) {
  const raw = String(value || "").trim();
  const key = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (key === "sst" || key === "silverspace" || key === "silverspaceinc") return "SilverSpace Inc";
  if (key === "vizva" || key === "vizvainc") return "Vizva Inc";
  if (key === "vizvauk" || key === "vizvaukltd") return "Vizva UK Ltd";
  if (key === "flawless" || key === "flawlessed") return "Flawless-ED";
  return raw;
}

function toMMDDYYYY(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${d.getFullYear()}`;
}

function normalizeDateCell(value, xlsxUtils) {
  if (value == null || value === "") return "";
  if (value instanceof Date && !isNaN(value.getTime())) return toMMDDYYYY(value);
  if (typeof value === "number" && xlsxUtils?.SSF?.parse_date_code) {
    const parsed = xlsxUtils.SSF.parse_date_code(value);
    if (parsed) return toMMDDYYYY(new Date(parsed.y, parsed.m - 1, parsed.d));
  }
  const raw = String(value).trim();
  const mdy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy) return `${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}-${mdy[3]}`;
  const ymd = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) return `${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}-${ymd[1]}`;
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? raw : toMMDDYYYY(parsed);
}

function dateParts(poDate) {
  const m = String(poDate || "").match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return { month: "", year: "", instance: "First Half" };
  const d = new Date(+m[3], +m[1] - 1, +m[2]);
  return {
    month: MONTH_NAMES[d.getMonth()] || "",
    year: String(d.getFullYear()),
    instance: d.getDate() <= 15 ? "First Half" : "Second Half",
  };
}

function normalizeSheetStatus(status, isLaidOff) {
  const raw = String(status || "").trim();
  if (isLaidOff) return LAIDOFF_STATUSES.includes(raw) ? raw : "Laid Off";
  return raw === "Default" ? "Default" : "Default";
}

function normalizeInstance(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "second half" || raw === "second" || raw === "2nd half" || raw === "2") return "Second Half";
  return "First Half";
}

function mapSpecialImportRow(row, index, isLaidOff, xlsxUtils) {
  const candidate = String(getCell(row, ["Name of the Candidate", "Candidate", "Name", "candidate"]) || "").trim();
  if (!candidate) return null;

  const amount = parseMoney(getCell(row, ["USD", "Amount", "amount"]));
  const poDate = normalizeDateCell(getCell(row, ["Date", "PO Date", "poDate"]), xlsxUtils);
  const parts = dateParts(poDate);
  const status = normalizeSheetStatus(getCell(row, ["Status", "status"]), isLaidOff);

  return {
    id: String(Date.now() + index),
    company: normalizeCompanyName(getCell(row, ["Company", "company"])),
    candidate,
    poDate,
    month: String(getCell(row, ["Month", "month"]) || parts.month || "").trim(),
    year: String(getCell(row, ["Year", "year"]) || parts.year || "").trim(),
    instance: normalizeInstance(getCell(row, ["Instance of Payment", "Instance", "instance"]) || parts.instance),
    amount,
    paid: 0,
    due: amount,
    serviceType: String(getCell(row, ["Type of Service", "Service Type", "serviceType"]) || "").trim(),
    status,
    type: String(getCell(row, ["Type", "type"]) || "").trim(),
    notes: isLaidOff ? String(getCell(row, ["Remarks", "Notes", "notes"]) || "").trim() : "",
    sheetScope: isLaidOff ? "laidoff" : "defaulter",
  };
}

function parseClipboardTable(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map(line => line.split("\t").map(cell => cell.trim()))
    .filter(cells => cells.some(Boolean));
}

function clipboardRowsToObjects(text, isLaidOff) {
  const table = parseClipboardTable(text);
  if (!table.length) return [];

  const defaultHeaders = isLaidOff ? LAID_OFF_IMPORT_HEADERS : DEFAULTER_IMPORT_HEADERS;
  const first = table[0].map(cleanHeader);
  const known = defaultHeaders.map(cleanHeader);
  const hasHeader = first.some(h => known.includes(h) || h === "candidate" || h === "nameofcandidate");
  const headers = hasHeader ? table[0] : defaultHeaders;
  const rows = hasHeader ? table.slice(1) : table;

  return rows.map(cells => {
    const row = {};
    headers.forEach((header, i) => { row[header] = cells[i] ?? ""; });
    return row;
  });
}

export default function SpecialSheetPage({ type = "laidoff" }) {
  const { getLaidOff, getDefaulters, updateEntry, updateStatus, deleteEntry, importEntries, showToast, loading } = useDashboardStore();

  const isLaidOff = type === "laidoff";
  const rawEntries = isLaidOff ? getLaidOff() : getDefaulters();
  const fileRef = useRef();
  const pasteTargetRef = useRef();

  const [filters, setFilters] = useState({ company: "", month: "", year: "" });
  const [pasteImport, setPasteImport] = useState(null);

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

  const importMappedRows = async (mapped, label = "Imported") => {
    const valid = mapped.filter(Boolean);
    if (!valid.length) {
      showToast(`No valid ${isLaidOff ? "laid off" : "defaulter"} rows found`);
      return false;
    }
    const ok = await importEntries(valid);
    if (ok !== false) showToast(`${label} ${valid.length} ${isLaidOff ? "laid off" : "defaulter"} row${valid.length === 1 ? "" : "s"}`);
    return ok;
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const mapped = rows.map((row, i) => mapSpecialImportRow(row, i, isLaidOff, XLSX.utils));
        importMappedRows(mapped);
      } catch {
        showToast("Import failed - invalid Excel file");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handlePasteRows = (e) => {
    const target = e.target;
    if (target?.closest?.("input, textarea, select, [contenteditable='true']")) return;

    const text = e.clipboardData?.getData("text/plain") || "";
    if (!text.trim() || !text.includes("\t")) return;

    const rowObjects = clipboardRowsToObjects(text, isLaidOff);
    const mapped = rowObjects.map((row, i) => mapSpecialImportRow(row, i, isLaidOff)).filter(Boolean);
    if (mapped.length) {
      e.preventDefault();
      setPasteImport({ rows: mapped });
    } else if (rowObjects.length) {
      e.preventDefault();
      showToast(`No valid ${isLaidOff ? "laid off" : "defaulter"} rows found in clipboard`);
    }
  };

  const confirmPasteImport = async () => {
    if (!pasteImport?.rows?.length) return;
    const rowsToImport = pasteImport.rows;
    setPasteImport(null);
    await importMappedRows(rowsToImport, "Pasted");
  };

  const handleDelete = async (entry) => {
    const ok = await deleteEntry(entry.id);
    if (ok !== false) showToast(`Deleted ${entry.candidate || "entry"}`);
  };

  const title = isLaidOff ? "Laid Off Sheet" : "Defaulter Sheet";
  const icon = isLaidOff ? "🔴" : "⚠️";
  const infoStatuses = isLaidOff ? "Laid Off, Offer Revoke, No Offer, Resigned" : "Default";

  if (loading) return (
    <div className="page-inner" ref={pasteTargetRef} onPaste={handlePasteRows} tabIndex={0} style={{ outline: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-muted)", padding: "40px 0" }}>
        <div style={{ width: 18, height: 18, border: "2px solid var(--teal)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        Loading…
      </div>
    </div>
  );

  return (
    <div className="page-inner" ref={pasteTargetRef} onPaste={handlePasteRows} tabIndex={0} style={{ outline: "none" }}>
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
        <label className="btn-icon" style={{ cursor: "pointer" }}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Import Excel
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleImport} />
        </label>
        <button className="btn-icon" onClick={() => { pasteTargetRef.current?.focus(); showToast(`Paste copied Excel rows into ${isLaidOff ? "Laid Off" : "Defaulter"} sheet`); }}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 12h6" /><path d="M9 16h6" /><path d="M9 8h1" />
            <path d="M5 4h9l5 5v11a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
            <path d="M14 4v5h5" />
          </svg>
          Paste Rows
        </button>
        <button className="btn-icon" onClick={handleExport}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Excel
        </button>
      </div>

      {pasteImport && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setPasteImport(null)}>
          <div style={{ background:"var(--color-surface)", borderRadius:"var(--r-lg)", width:"100%", maxWidth:620, boxShadow:"0 24px 70px rgba(0,0,0,.22)", overflow:"hidden", border:"1px solid var(--color-border)" }}>
            <div style={{ padding:"18px 22px", borderBottom:"1px solid var(--color-border)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:"var(--color-ink)" }}>Paste {isLaidOff ? "Laid Off" : "Defaulter"} Rows</div>
                <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:3 }}>
                  {pasteImport.rows.length} copied row{pasteImport.rows.length === 1 ? "" : "s"} will be imported into the {isLaidOff ? "Laid Off" : "Defaulter"} sheet.
                </div>
              </div>
              <button className="modal-close" onClick={() => setPasteImport(null)} style={{ fontSize:20, lineHeight:1 }}>x</button>
            </div>
            <div style={{ padding:22 }}>
              <div style={{ maxHeight:260, overflow:"auto", border:"1px solid var(--color-border)", borderRadius:"var(--r-md)" }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Company</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pasteImport.rows.slice(0, 8).map((row, i) => (
                      <tr key={`${row.id}-${i}`}>
                        <td style={{ fontWeight:600 }}>{row.candidate || "-"}</td>
                        <td>{row.company || "-"}</td>
                        <td>{row.poDate || "-"}</td>
                        <td><span className={statusBadgeClass(row.status)}>{row.status}</span></td>
                        <td style={{ fontWeight:600 }}>{fmtMoneyC(row.amount, currencyOf(row), 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pasteImport.rows.length > 8 && (
                <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:8 }}>
                  Showing first 8 rows. All {pasteImport.rows.length} copied rows will be pasted.
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:18 }}>
                <button className="btn-ghost" onClick={() => setPasteImport(null)} style={{ padding:"8px 14px" }}>
                  Cancel
                </button>
                <button className="btn-icon" onClick={confirmPasteImport} style={{ padding:"8px 14px" }}>
                  Paste {pasteImport.rows.length} Row{pasteImport.rows.length === 1 ? "" : "s"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{isLaidOff ? "🔴" : "⚠️"}</div>
          <div className="empty-title">No {isLaidOff ? "laid off" : "defaulter"} entries</div>
          <div className="empty-sub">
            {Object.values(filters).some(Boolean)
              ? "Try clearing filters"
              : `Entries with status "${infoStatuses}" will appear here automatically, or import/paste Excel rows here.`}
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
                <th style={{ width: 42 }}></th>
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
                  <td>
                    <button
                      onClick={() => handleDelete(entry)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-dim)",
                        cursor: "pointer",
                        fontSize: 16,
                        lineHeight: 1,
                        padding: "4px 6px",
                        borderRadius: 4,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(248,113,113,0.1)"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "var(--text-dim)"; e.currentTarget.style.background = "transparent"; }}
                      title="Delete entry"
                    >
                      ×
                    </button>
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
