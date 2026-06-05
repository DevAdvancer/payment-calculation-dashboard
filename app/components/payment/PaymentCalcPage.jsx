"use client";
import { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import useDashboardStore, {
  ALL_STATUSES,
  INSTANCE_OPTIONS,
  fmtMoney,
  fmtMoneyC,
  currencyOf,
  sumByCurrency,
} from "@/lib/use-store";
import FilterBar from "./FilterBar";
import DateInput from "@/app/components/DateInput";
import MoneyStack from "@/app/components/MoneyStack";
import QuickEntryModal from "./QuickEntryModal";

const PAYMENT_IMPORT_HEADERS = [
  "Company", "Name of the Candidate", "Date", "Month", "Year", "Instance of Payment",
  "USD", "Type of Service", "Status", "Type", "Remarks", "Client", "PO#",
];

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
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sept","Oct","Nov","Dec"];
  return {
    month: months[d.getMonth()] || "",
    year: String(d.getFullYear()),
    instance: d.getDate() <= 15 ? "First Half" : "Second Half",
  };
}

function normalizeStatus(value) {
  const raw = String(value || "").trim();
  return ALL_STATUSES.includes(raw) ? raw : "Pending";
}

function normalizeInstance(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "second half" || raw === "second" || raw === "2nd half" || raw === "2") return "Second Half";
  return "First Half";
}

function mapPaymentImportRow(row, index, xlsxUtils) {
  const candidate = String(getCell(row, ["Name of the Candidate", "Candidate", "Name", "candidate"]) || "").trim();
  if (!candidate) return null;

  const poDate = normalizeDateCell(getCell(row, ["Date", "PO Date", "poDate"]), xlsxUtils);
  const parts = dateParts(poDate);
  const amount = parseMoney(getCell(row, ["USD", "Amount", "amount"]));
  const paid = parseMoney(getCell(row, ["Paid", "paid"]));
  const due = parseMoney(getCell(row, ["Due", "due"])) || (normalizeStatus(getCell(row, ["Status", "status"])) === "Paid" ? 0 : amount);

  return {
    id: String(Date.now() + index),
    candidate,
    company: normalizeCompanyName(getCell(row, ["Company", "company"])),
    client: String(getCell(row, ["Client", "client"]) || "").trim(),
    poDate,
    month: String(getCell(row, ["Month", "month"]) || parts.month || "").trim(),
    year: String(getCell(row, ["Year", "year"]) || parts.year || new Date().getFullYear()).trim(),
    instance: normalizeInstance(getCell(row, ["Instance of Payment", "Instance", "instance"]) || parts.instance),
    amount,
    paid,
    due,
    serviceType: String(getCell(row, ["Type of Service", "Service Type", "serviceType"]) || "Placement").trim(),
    status: normalizeStatus(getCell(row, ["Status", "status"])),
    type: String(getCell(row, ["Type", "type"]) || "").trim(),
    notes: String(getCell(row, ["Remarks", "Notes", "notes"]) || "").trim(),
    poNum: String(getCell(row, ["PO#", "PO Num", "poNum"]) || "").trim(),
    sheetScope: "payment",
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

function clipboardRowsToObjects(text) {
  const table = parseClipboardTable(text);
  if (!table.length) return [];

  const first = table[0].map(cleanHeader);
  const known = PAYMENT_IMPORT_HEADERS.map(cleanHeader);
  const hasHeader = first.some(h => known.includes(h) || h === "candidate" || h === "nameofcandidate");
  const headers = hasHeader ? table[0] : PAYMENT_IMPORT_HEADERS;
  const rows = hasHeader ? table.slice(1) : table;

  return rows.map(cells => {
    const row = {};
    headers.forEach((header, i) => { row[header] = cells[i] ?? ""; });
    return row;
  });
}

export default function PaymentCalcPage() {
  const { getActive, getCandidateNames, updateEntry, updateStatus, deleteEntry, importEntries, showToast, loading, navigate } =
    useDashboardStore();

  const entries       = getActive();
  const allNames      = getCandidateNames();

  const [searchTerm, setSearchTerm]     = useState("");
  const [selectedName, setSelectedName] = useState(null);   // exact-match lock when user picks from dropdown
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [filters, setFilters]           = useState({ company: "", month: "", year: "", instance: "", status: "" });
  const [sortKey, setSortKey]           = useState("poDate");
  const [sortDir, setSortDir]           = useState("asc");
  const [fadingIds, setFadingIds]       = useState(new Set());
  const [editingUSD, setEditingUSD]     = useState(null);
  const [usdDraft, setUSDDraft]         = useState("");
  const [pasteImport, setPasteImport]   = useState(null);
  const importRef = useRef();
  const searchRef = useRef();
  const pasteTargetRef = useRef();

  /* ── Autocomplete suggestions ── */
  const suggestions = useMemo(() => {
    if (selectedName) return [];                                          // selection locked → no suggestions
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return allNames.filter(n => n.toLowerCase().includes(q)).slice(0, 8);
  }, [searchTerm, selectedName, allNames]);

  /* ── Type-of-Service datalist options.
   * Combines the two built-in values with every unique serviceType already
   * stored in any entry, so anything a user has typed before is available
   * as a suggestion for the next row. Order: defaults first, then alphabetical. */
  const serviceTypeOptions = useMemo(() => {
    const defaults = ["Placement", "Payment Collection"];
    const fromData = entries
      .map(e => (e.serviceType || "").trim())
      .filter(Boolean);
    const seen = new Set(defaults.map(s => s.toLowerCase()));
    const extras = [];
    for (const v of fromData) {
      const k = v.toLowerCase();
      if (!seen.has(k)) { seen.add(k); extras.push(v); }
    }
    extras.sort((a, b) => a.localeCompare(b));
    return [...defaults, ...extras];
  }, [entries]);

  /* ── Per-candidate summary strip — shown when:
   *   • a name was picked from the dropdown (exact lock), or
   *   • the typed search happens to equal exactly one candidate name */
  const exactMatch = useMemo(() => {
    if (selectedName) return selectedName;
    const q = searchTerm.trim().toLowerCase();
    if (!q) return null;
    return allNames.find(n => n.toLowerCase() === q) || null;
  }, [searchTerm, selectedName, allNames]);

  const candidateSummary = useMemo(() => {
    if (!exactMatch) return null;
    const rows = entries.filter(e => (e.candidate || "").trim().toLowerCase() === exactMatch.toLowerCase());
    const totalValue = rows.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const totalPaid  = rows.reduce((s, e) => s + (parseFloat(e.paid)   || 0), 0);
    const totalDue   = rows.reduce((s, e) => s + (parseFloat(e.due)    || 0), 0);
    const currency   = currencyOf(rows[0]);                             // candidate → single currency
    return { count: rows.length, totalValue, totalPaid, totalDue, currency };
  }, [exactMatch, entries]);

  /* ── Filtering ──
   *   • If a name was selected from the dropdown → exact-match only.
   *   • Otherwise typed search does substring (`includes`) matching. */
  const filtered = useMemo(() => {
    let rows = entries;
    if (selectedName) {
      const sel = selectedName.toLowerCase();
      rows = rows.filter(e => (e.candidate || "").trim().toLowerCase() === sel);
    } else {
      const q = searchTerm.trim().toLowerCase();
      if (q) rows = rows.filter(e => (e.candidate || "").toLowerCase().includes(q));
    }
    if (filters.status)   rows = rows.filter(e => e.status === filters.status);
    if (filters.month)    rows = rows.filter(e => e.month === filters.month);
    if (filters.year)     rows = rows.filter(e => String(e.year) === String(filters.year));
    if (filters.instance) rows = rows.filter(e => e.instance === filters.instance);
    if (filters.company)  rows = rows.filter(e => e.company === filters.company);
    return rows;
  }, [entries, searchTerm, selectedName, filters]);

  /* ── Sorting ── */
  const sorted = useMemo(() => {
    const toDate = (s) => {
      const m = String(s || "").match(/^(\d{2})-(\d{2})-(\d{4})$/);
      return m ? new Date(+m[3], +m[1] - 1, +m[2]).getTime() : 0;
    };
    return [...filtered].sort((a, b) => {
      let av = a[sortKey] ?? "", bv = b[sortKey] ?? "";
      if (["amount", "paid", "due"].includes(sortKey)) {
        av = parseFloat(av) || 0; bv = parseFloat(bv) || 0;
      } else if (sortKey === "poDate") {
        av = toDate(av); bv = toDate(bv);
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };
  const sortIcon = (key) => sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  /* ── KPIs (reflect active filters) — split by currency for stacked display */
  const totalValueByCur = sumByCurrency(filtered, "amount");
  const totalPaidByCur  = sumByCurrency(filtered, "paid");
  const totalDueByCur   = sumByCurrency(filtered, "due");
  const totalValue      = totalValueByCur.USD + totalValueByCur.GBP;
  const totalPaid       = totalPaidByCur.USD  + totalPaidByCur.GBP;

  /* ── Delete with fade ── */
  const handleDelete = (id) => {
    setFadingIds(prev => new Set([...prev, id]));
    setTimeout(() => {
      deleteEntry(id);
      setFadingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }, 200);
  };

  /* ── Excel Import ── */
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb   = XLSX.read(evt.target.result, { type: "array" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const mapped = rows.map(r => ({
          candidate:   r["Name of the Candidate"] || r["Candidate"] || r["candidate"] || "",
          company:     normalizeCompanyName(r["Company"] || r["company"] || ""),
          client:      r["Client"]       || r["client"]       || "",
          poDate:      r["Date"]         || r["poDate"]       || r["PO Date"] || "",
          month:       r["Month"]        || r["month"]        || "",
          year:        parseInt(r["Year"] || r["year"]) || new Date().getFullYear(),
          instance:    r["Instance of Payment"] || r["Instance"] || r["instance"] || "First Half",
          amount:      parseFloat(r["USD"] || r["Amount"] || r["amount"]) || 0,
          paid:        parseFloat(r["Paid"] || r["paid"]) || 0,
          due:         parseFloat(r["Due"]  || r["due"])  || 0,
          serviceType: r["Type of Service"] || r["Service Type"] || r["serviceType"] || "Placement",
          status:      r["Status"]  || r["status"]  || "Pending",
          type:        r["Type"]    || r["type"]    || "",
          notes:       r["Remarks"] || r["Notes"]   || r["notes"] || "",
          poNum:       r["PO#"]     || r["poNum"]   || "",
          sheetScope:   "payment",
        }));
        importEntries(mapped);
        showToast(`Imported ${mapped.length} entries`);
      } catch {
        showToast("Import failed — invalid file format");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  /* ── Excel Export ── */
  const importMappedRows = async (mapped, label = "Imported") => {
    const valid = mapped.filter(Boolean);
    if (!valid.length) {
      showToast("No valid payment rows found");
      return false;
    }
    const ok = await importEntries(valid);
    if (ok !== false) showToast(`${label} ${valid.length} payment row${valid.length === 1 ? "" : "s"}`);
    return ok;
  };

  const handlePasteRows = (e) => {
    const target = e.target;
    if (target?.closest?.("input, textarea, select, [contenteditable='true']")) return;

    const text = e.clipboardData?.getData("text/plain") || "";
    if (!text.trim() || !text.includes("\t")) return;

    const rowObjects = clipboardRowsToObjects(text);
    const mapped = rowObjects.map((row, i) => mapPaymentImportRow(row, i)).filter(Boolean);
    if (mapped.length) {
      e.preventDefault();
      setPasteImport({ rows: mapped });
    } else if (rowObjects.length) {
      e.preventDefault();
      showToast("No valid payment rows found in clipboard");
    }
  };

  const confirmPasteImport = async () => {
    if (!pasteImport?.rows?.length) return;
    const rowsToImport = pasteImport.rows;
    setPasteImport(null);
    await importMappedRows(rowsToImport, "Pasted");
  };

  const handleExport = () => {
    const rows = sorted.map((e, i) => ({
      "#":                    i + 1,
      Company:                e.company,
      "Name of the Candidate": e.candidate,
      Date:                   e.poDate,
      Month:                  e.month,
      Year:                   e.year,
      "Instance of Payment":  e.instance,
      USD:                    parseFloat(e.amount) || 0,
      "Type of Service":      e.serviceType,
      Status:                 e.status,
      Type:                   e.type,
      Remarks:                e.notes,
      Client:                 e.client,
      "PO#":                  e.poNum,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payment Calc");
    XLSX.writeFile(wb, `Payment_Calc_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleUSDClick = (entry) => {
    setEditingUSD(entry.id);
    setUSDDraft(String(entry.amount || ""));
  };

  const handleUSDBlur = async (entry) => {
    const val = parseFloat(usdDraft);
    if (!isNaN(val) && val !== entry.amount) {
      await updateEntry(entry.id, {
        amount: val,
        paid: entry.status === "Paid" ? val : (parseFloat(entry.paid) || 0),
        due:  entry.status === "Paid" ? 0 : entry.status === "Pending" ? val : (parseFloat(entry.due) || 0),
      });
    }
    setEditingUSD(null);
  };

  if (loading) return (
    <div className="page-inner" ref={pasteTargetRef} onPaste={handlePasteRows} tabIndex={0} style={{ outline: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-muted)", padding: "40px 0" }}>
        <div style={{ width: 18, height: 18, border: "2px solid var(--teal)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        Loading entries…
      </div>
    </div>
  );

  return (
    <div className="page-inner">
      {/* Shared datalist for the editable Type-of-Service column.
          Any value typed once becomes available to every row's input. */}
      <datalist id="svc-type-options">
        {serviceTypeOptions.map(o => <option key={o} value={o} />)}
      </datalist>

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Payment <span>Calculation</span></h1>
        <p className="page-subtitle">Active payment entries — non-routed statuses only</p>
      </div>

      {/* KPI Strip — reflects active filters */}
      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-label">Entries</div>
          <div className="kpi-value">{filtered.length}</div>
          <div className="kpi-sub">of {entries.length} total</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Value</div>
          <div className="kpi-value" style={{ color: "var(--mint)" }}><MoneyStack usd={totalValueByCur.USD} gbp={totalValueByCur.GBP} decimals={0} /></div>
          <div className="kpi-sub">across {filtered.length} {filtered.length === 1 ? "entry" : "entries"}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Paid</div>
          <div className="kpi-value" style={{ color: "#4ade80" }}><MoneyStack usd={totalPaidByCur.USD} gbp={totalPaidByCur.GBP} decimals={0} /></div>
          <div className="kpi-sub">{totalValue > 0 ? Math.round((totalPaid / totalValue) * 100) : 0}% collected</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Outstanding</div>
          <div className="kpi-value" style={{ color: "#fbbf24" }}><MoneyStack usd={totalDueByCur.USD} gbp={totalDueByCur.GBP} decimals={0} /></div>
          <div className="kpi-sub">pending collection</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn-primary" onClick={() => setShowQuickEntry(true)}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Entry
          </button>

          {/* Autocomplete search */}
          <div style={{ position: "relative" }} ref={searchRef}>
            <div className="search-wrap">
              <svg className="search-icon" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="search-input"
                placeholder={selectedName ? "" : "Search candidate…"}
                value={searchTerm}
                style={selectedName ? { fontWeight: 700, color: "var(--mint)" } : undefined}
                onChange={e => {
                  /* Typing breaks the exact-match lock — back to substring filter + suggestions */
                  setSearchTerm(e.target.value);
                  setSelectedName(null);
                  setShowSuggestions(true);
                }}
                onFocus={() => { if (!selectedName) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              {(searchTerm || selectedName) && (
                <button
                  onClick={() => { setSearchTerm(""); setSelectedName(null); setShowSuggestions(false); }}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 16, lineHeight: 1, padding: 0 }}
                  title="Clear selection"
                >×</button>
              )}
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 200,
                background: "var(--surface-1)", border: "1px solid var(--border)",
                borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                minWidth: 220, overflow: "hidden",
              }}>
                {suggestions.map(name => (
                  <div
                    key={name}
                    onMouseDown={() => {
                      /* Lock to this exact candidate */
                      setSelectedName(name);
                      setSearchTerm(name);
                      setShowSuggestions(false);
                    }}
                    style={{
                      padding: "9px 14px", fontSize: 13, cursor: "pointer",
                      color: "var(--text-main)", transition: "background 0.1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="toolbar-right">
          <label className="btn-icon" style={{ cursor: "pointer" }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import Excel
            <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleImport} />
          </label>
          <button className="btn-icon" onClick={() => { pasteTargetRef.current?.focus(); showToast("Paste copied Excel rows into Payment Calculation"); }}>
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
      </div>

      {/* Per-candidate summary strip */}
      {candidateSummary && (
        <div style={{
          display: "flex", alignItems: "center", gap: 20, padding: "12px 20px",
          background: "rgba(99,179,237,0.08)", border: "1px solid rgba(99,179,237,0.25)",
          borderRadius: 10, flexWrap: "wrap",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--teal)", flexShrink: 0 }}>
            {exactMatch}
          </div>
          <div style={{ height: 16, width: 1, background: "rgba(99,179,237,0.3)", flexShrink: 0 }} />
          {[
            ["Entries",      String(candidateSummary.count)],
            ["Total Value",  fmtMoneyC(candidateSummary.totalValue, candidateSummary.currency, 0)],
            ["Paid",         fmtMoneyC(candidateSummary.totalPaid,  candidateSummary.currency, 0)],
            ["Outstanding",  fmtMoneyC(candidateSummary.totalDue,   candidateSummary.currency, 0)],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em" }}>{k}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)", fontVariantNumeric: "tabular-nums" }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar entries={entries} onFilterChange={setFilters} />

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">No entries found</div>
          <div className="empty-sub">
            {searchTerm || Object.values(filters).some(Boolean)
              ? "Try adjusting your search or filters"
              : "Create your first payment entry to get started"}
          </div>
        </div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th onClick={() => toggleSort("company")}>Company{sortIcon("company")}</th>
                <th onClick={() => toggleSort("candidate")}>Name of the Candidate{sortIcon("candidate")}</th>
                <th onClick={() => toggleSort("poDate")}>Date{sortIcon("poDate")}</th>
                <th onClick={() => toggleSort("month")}>Month{sortIcon("month")}</th>
                <th onClick={() => toggleSort("year")}>Year{sortIcon("year")}</th>
                <th onClick={() => toggleSort("instance")}>Instance of Payment{sortIcon("instance")}</th>
                <th onClick={() => toggleSort("amount")}>USD{sortIcon("amount")}</th>
                <th onClick={() => toggleSort("serviceType")}>Type of Service{sortIcon("serviceType")}</th>
                <th onClick={() => toggleSort("status")}>Status{sortIcon("status")}</th>
                <th onClick={() => toggleSort("type")}>Type{sortIcon("type")}</th>
                <th>Remarks</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry, idx) => (
                <tr
                  key={entry.id}
                  style={{
                    opacity: fadingIds.has(entry.id) ? 0 : 1,
                    transition: "opacity 0.2s ease",
                  }}
                >
                  <td style={{ color: "var(--text-dim)", fontSize: 11 }}>{idx + 1}</td>
                  <td style={{ fontWeight: 500, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {entry.company || "—"}
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--mint)" }}>{entry.candidate || "—"}</td>
                  <td>
                    <DateInput
                      value={entry.poDate}
                      onChange={v => { if (v !== entry.poDate) updateEntry(entry.id, { poDate: v }); }}
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
                  <td>
                    {editingUSD === entry.id ? (
                      <input
                        type="number"
                        className="tbl-input"
                        style={{ minWidth: 80 }}
                        value={usdDraft}
                        onChange={e => setUSDDraft(e.target.value)}
                        onBlur={() => handleUSDBlur(entry)}
                        onKeyDown={e => e.key === "Enter" && handleUSDBlur(entry)}
                        autoFocus
                      />
                    ) : (
                      <span
                        onClick={() => handleUSDClick(entry)}
                        style={{
                          cursor: "text",
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 600,
                          color: "var(--mint)",
                          display: "inline-block",
                          padding: "3px 6px",
                          borderRadius: 4,
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--surface-3)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        title="Click to edit"
                      >
                        {fmtMoneyC(entry.amount, currencyOf(entry), 0)}
                      </span>
                    )}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    <input
                      list="svc-type-options"
                      className="tbl-input"
                      style={{ minWidth: 130 }}
                      defaultValue={entry.serviceType || ""}
                      placeholder="Type or pick…"
                      onBlur={e => {
                        const next = e.target.value.trim();
                        if (next !== (entry.serviceType || ""))
                          updateEntry(entry.id, { serviceType: next });
                      }}
                    />
                  </td>
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
                  <td style={{ color: "var(--text-dim)", fontSize: 12, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {entry.type || "—"}
                  </td>
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
                      onClick={() => handleDelete(entry.id)}
                      style={{
                        background: "transparent", border: "none",
                        color: "var(--text-dim)", cursor: "pointer",
                        fontSize: 16, lineHeight: 1, padding: "4px 6px",
                        borderRadius: 4, transition: "all 0.15s",
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

      {pasteImport && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setPasteImport(null)}>
          <div style={{ background:"var(--color-surface)", borderRadius:"var(--r-lg)", width:"100%", maxWidth:640, boxShadow:"0 24px 70px rgba(0,0,0,.22)", overflow:"hidden", border:"1px solid var(--color-border)" }}>
            <div style={{ padding:"18px 22px", borderBottom:"1px solid var(--color-border)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:"var(--color-ink)" }}>Paste Payment Rows</div>
                <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:3 }}>
                  {pasteImport.rows.length} copied row{pasteImport.rows.length === 1 ? "" : "s"} will be imported into Payment Calculation.
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
                        <td>{row.status || "-"}</td>
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

      {showQuickEntry && <QuickEntryModal onClose={() => setShowQuickEntry(false)} />}
    </div>
  );
}
