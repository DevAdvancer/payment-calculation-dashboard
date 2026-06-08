"use client";
import { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import useDashboardStore, {
  fmtMoneyC,
  fmtDate,
  currencyOf,
  currencySymbol,
  MONTH_NAMES,
} from "@/lib/use-store";
import DateInput from "@/app/components/DateInput";
import MoneyStack from "@/app/components/MoneyStack";

const STATUS_OPTIONS = ["Pending", "Paid", "Reimbursed", "Cancelled"];
const DEFAULT_CATEGORIES = ["Salaries", "Rent", "Utilities", "Software", "Marketing", "Travel", "Office", "Tax", "Misc"];
const PAYMENT_METHODS    = ["Bank Transfer", "Credit Card", "Cash", "Cheque", "Wire", "Other"];

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

function normalizeExpenseStatus(status) {
  const raw = String(status || "").trim();
  const options = ["Pending", "Paid", "Reimbursed", "Cancelled"];
  return options.includes(raw) ? raw : "Pending";
}

export default function ExpensePage() {
  const { expenses, createExpense, updateExpense, deleteExpense, bulkDeleteExpenses, showToast, loading } =
    useDashboardStore();

  const [search, setSearch]   = useState("");
  const [filters, setFilters] = useState({ category: "", status: "", month: "", year: "", currency: "" });
  const [showModal, setShowModal] = useState(false);
  const [draft, setDraft]     = useState(emptyDraft());
  const [editingId, setEditingId] = useState(null);
  const fileRef = useRef();

  function emptyDraft() {
    return {
      expenseDate: "",
      category: "Misc",
      vendor: "",
      description: "",
      amount: "",
      paid: "",
      currency: "USD",
      status: "Pending",
      paymentMethod: "Bank Transfer",
      reference: "",
      notes: "",
    };
  }

  /* ── Datalist values: defaults + every unique already-saved value */
  const categoryOptions = useMemo(() => {
    const seen = new Set(DEFAULT_CATEGORIES.map(s => s.toLowerCase()));
    const extras = [];
    for (const e of expenses) {
      const v = (e.category || "").trim();
      if (v && !seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); extras.push(v); }
    }
    extras.sort((a, b) => a.localeCompare(b));
    return [...DEFAULT_CATEGORIES, ...extras];
  }, [expenses]);

  /* ── Filter options derived from data */
  const years = useMemo(
    () => [...new Set(expenses.map(e => e.year).filter(Boolean))].sort((a, b) => +b - +a),
    [expenses]
  );

  /* ── Filter rows */
  const filtered = useMemo(() => {
    let rows = expenses;
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter(e =>
      (e.vendor || "").toLowerCase().includes(q) ||
      (e.description || "").toLowerCase().includes(q) ||
      (e.category || "").toLowerCase().includes(q)
    );
    if (filters.category) rows = rows.filter(e => e.category === filters.category);
    if (filters.status)   rows = rows.filter(e => e.status   === filters.status);
    if (filters.month)    rows = rows.filter(e => e.month    === filters.month);
    if (filters.year)     rows = rows.filter(e => String(e.year) === String(filters.year));
    if (filters.currency) rows = rows.filter(e => (e.currency || "USD") === filters.currency);
    return rows;
  }, [expenses, search, filters]);

  /* ── KPI totals split by currency for stacked display */
  const totals = useMemo(() => {
    const out = {
      amount: { USD: 0, GBP: 0 },
      paid:   { USD: 0, GBP: 0 },
      due:    { USD: 0, GBP: 0 },
    };
    for (const e of filtered) {
      const cur = (e.currency || "USD") === "GBP" ? "GBP" : "USD";
      out.amount[cur] += parseFloat(e.amount) || 0;
      out.paid[cur]   += parseFloat(e.paid)   || 0;
      out.due[cur]    += (parseFloat(e.amount) || 0) - (parseFloat(e.paid) || 0);
    }
    return out;
  }, [filtered]);

  /* ── Sorted descending by date */
  const sorted = useMemo(() => {
    const dms = (s) => {
      const m = String(s||"").match(/^(\d{2})-(\d{2})-(\d{4})$/);
      return m ? new Date(+m[3], +m[1]-1, +m[2]).getTime() : 0;
    };
    return [...filtered].sort((a, b) => dms(b.expenseDate) - dms(a.expenseDate));
  }, [filtered]);

  /* ── Handlers ── */
  const openCreate = () => { setDraft(emptyDraft()); setEditingId(null); setShowModal(true); };
  const openEdit = (row) => {
    setDraft({
      expenseDate:   row.expenseDate || "",
      category:      row.category    || "Misc",
      vendor:        row.vendor      || "",
      description:   row.description || "",
      amount:        String(row.amount || ""),
      paid:          String(row.paid   || ""),
      currency:      row.currency     || "USD",
      status:        row.status       || "Pending",
      paymentMethod: row.paymentMethod || "Bank Transfer",
      reference:     row.reference    || "",
      notes:         row.notes        || "",
    });
    setEditingId(row.id);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!draft.amount) { showToast("Amount is required"); return; }
    if (!draft.expenseDate) { showToast("Expense Date is required"); return; }

    const m = draft.expenseDate.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    const monthIdx = m ? parseInt(m[1], 10) - 1 : null;
    const year     = m ? m[3] : null;
    const month    = monthIdx != null ? MONTH_NAMES[monthIdx] : null;

    const amount = parseFloat(draft.amount) || 0;
    const paid   = parseFloat(draft.paid)   || 0;
    const due    = Math.max(0, amount - paid);

    const payload = {
      ...draft,
      amount, paid, due,
      month, year,
    };

    if (editingId) {
      const ok = await updateExpense(editingId, payload);
      if (ok !== false) setShowModal(false);
    } else {
      const created = await createExpense(payload);
      if (created) setShowModal(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this expense?")) return;
    await deleteExpense(id);
  };

  const handleExport = () => {
    const rows = sorted.map((e, i) => ({
      "#":           i + 1,
      Date:          e.expenseDate,
      Month:         e.month,
      Year:          e.year,
      Category:      e.category,
      Vendor:        e.vendor,
      Description:   e.description,
      Amount:        e.amount,
      Paid:          e.paid,
      Due:           Math.max(0, (parseFloat(e.amount)||0) - (parseFloat(e.paid)||0)),
      Currency:      e.currency,
      Status:        e.status,
      "Payment Method": e.paymentMethod,
      Reference:     e.reference,
      Notes:         e.notes,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, `Expenses_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const mapped = rows.map((r, i) => {
          const dateVal = r.Date || r["Date"] || "";
          const dateStr = normalizeDateCell(dateVal, XLSX.utils);
          let month = r.Month || null;
          let year = r.Year ? String(r.Year) : null;
          if (dateStr) {
            const m = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
            if (m) {
              month = MONTH_NAMES[parseInt(m[1], 10) - 1];
              year = m[3];
            }
          }
          const amount = parseFloat(r.Amount) || 0;
          const paid   = parseFloat(r.Paid)   || 0;
          return {
            id:            String(Date.now() + i),
            expenseDate:   dateStr || null,
            month, year,
            category:      r.Category    || null,
            vendor:        r.Vendor      || null,
            description:   r.Description || null,
            amount, paid,
            due:           Math.max(0, amount - paid),
            currency:      r.Currency    || "USD",
            status:        normalizeExpenseStatus(r.Status),
            paymentMethod: r["Payment Method"] || null,
            reference:     r.Reference   || null,
            notes:         r.Notes       || null,
          };
        }).filter(x => x.amount > 0 && x.expenseDate);
        for (const m of mapped) await createExpense(m);
        showToast(`Imported ${mapped.length} expenses`);
      } catch (err) {
        console.error(err);
        showToast("Import failed — invalid file format");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  if (loading) return <div className="page-inner"><div style={{ padding: 40, color: "var(--text-muted)" }}>Loading…</div></div>;

  return (
    <div className="page-inner">
      <datalist id="exp-category-options">
        {categoryOptions.map(o => <option key={o} value={o} />)}
      </datalist>

      <div className="page-header">
        <h1 className="page-title">Expense <span>Management</span></h1>
        <p className="page-subtitle">Track every outgoing payment — vendors, salaries, rent, software, taxes, anything.</p>
      </div>

      {/* KPI strip */}
      <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Records",   value: <>{filtered.length}</>,                                                color: "var(--text)" },
          { label: "Spend",     value: <MoneyStack usd={totals.amount.USD} gbp={totals.amount.GBP} decimals={0} />, color: "#ef4444" },
          { label: "Paid Out",  value: <MoneyStack usd={totals.paid.USD}   gbp={totals.paid.GBP}   decimals={0} />, color: "#16a34a" },
          { label: "Owed",      value: <MoneyStack usd={totals.due.USD}    gbp={totals.due.GBP}    decimals={0} />, color: "#d97706" },
        ].map((k) => (
          <div key={k.label} className="kpi-card" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px" }}>
            <div className="kpi-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)", marginBottom: 4 }}>{k.label}</div>
            <div className="kpi-value" style={{ fontSize: 22, fontWeight: 700, color: k.color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <button className="btn-primary" onClick={openCreate}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Expense
        </button>
        <div className="search-wrap" style={{ position: "relative" }}>
          <svg className="search-icon" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input className="search-input" placeholder="Search vendor, description, category…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <label className="btn-icon" style={{ cursor: "pointer" }}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Import Excel
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleImport} />
        </label>
        <button className="btn-icon" onClick={handleExport}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Excel
        </button>
      </div>

      {/* Filter bar */}
      <div className="filter-bar" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <SelectChip label="Category" value={filters.category} onChange={v => setFilters(f => ({ ...f, category: v }))}>
          <option value="">All</option>
          {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </SelectChip>
        <SelectChip label="Status" value={filters.status} onChange={v => setFilters(f => ({ ...f, status: v }))}>
          <option value="">All</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </SelectChip>
        <SelectChip label="Month" value={filters.month} onChange={v => setFilters(f => ({ ...f, month: v }))}>
          <option value="">All</option>
          {MONTH_NAMES.map(m => <option key={m} value={m}>{m}</option>)}
        </SelectChip>
        <SelectChip label="Year" value={filters.year} onChange={v => setFilters(f => ({ ...f, year: v }))}>
          <option value="">All</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </SelectChip>
        <SelectChip label="Currency" value={filters.currency} onChange={v => setFilters(f => ({ ...f, currency: v }))}>
          <option value="">Both</option>
          <option value="USD">USD</option>
          <option value="GBP">GBP</option>
        </SelectChip>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="empty-state" style={{ padding: 40, textAlign: "center" }}>
          <div className="empty-icon" style={{ fontSize: 28 }}>💸</div>
          <div className="empty-title" style={{ fontWeight: 700, marginTop: 6 }}>No expenses recorded</div>
          <div className="empty-sub" style={{ color: "var(--text-muted)", marginTop: 4 }}>Click <strong>New Expense</strong> to log your first one.</div>
        </div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>Date</th>
                <th>Category</th>
                <th>Vendor</th>
                <th>Description</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th style={{ textAlign: "right" }}>Paid</th>
                <th style={{ textAlign: "right" }}>Due</th>
                <th>Status</th>
                <th>Method</th>
                <th>Notes</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e, idx) => {
                const due = Math.max(0, (parseFloat(e.amount)||0) - (parseFloat(e.paid)||0));
                const cur = (e.currency || "USD") === "GBP" ? "GBP" : "USD";
                return (
                  <tr key={e.id}>
                    <td style={{ color: "var(--text-dim)", fontSize: 11 }}>{idx + 1}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDate(e.expenseDate)}</td>
                    <td>{e.category || "—"}</td>
                    <td style={{ fontWeight: 600 }}>{e.vendor || "—"}</td>
                    <td style={{ color: "var(--text-muted)", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description || "—"}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#ef4444", fontWeight: 600 }}>{fmtMoneyC(e.amount, cur, 2)}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#16a34a" }}>{fmtMoneyC(e.paid, cur, 2)}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: due > 0 ? "#d97706" : "var(--text-dim)" }}>{fmtMoneyC(due, cur, 2)}</td>
                    <td>
                      <select
                        className="tbl-select"
                        value={e.status}
                        onChange={ev => updateExpense(e.id, { status: ev.target.value })}
                        style={{ fontSize: 11 }}
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{e.paymentMethod || "—"}</td>
                    <td style={{ fontSize: 12, color: "var(--text-dim)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.notes || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => openEdit(e)} title="Edit" style={iconBtn("#2563eb")}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => handleDelete(e.id)} title="Delete" style={iconBtn("#ef4444")}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={ev => ev.target === ev.currentTarget && setShowModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1100, paddingTop: 40, paddingBottom: 40, overflowY: "auto" }}>
          <div style={{ background: "var(--color-surface, #fff)", borderRadius: 14, width: "100%", maxWidth: 620, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{editingId ? "Edit Expense" : "New Expense"}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: 22, cursor: "pointer", lineHeight: 1, color: "var(--text-muted)" }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Expense Date" required>
                <DateInput value={draft.expenseDate} onChange={v => setDraft(d => ({ ...d, expenseDate: v }))} style={inputStyle} />
              </Field>
              <Field label="Category">
                <input list="exp-category-options" value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} style={inputStyle} placeholder="Pick or type…" />
              </Field>
              <Field label="Vendor / Payee">
                <input value={draft.vendor} onChange={e => setDraft(d => ({ ...d, vendor: e.target.value }))} style={inputStyle} placeholder="e.g. AWS, Office Landlord" />
              </Field>
              <Field label="Currency">
                <select value={draft.currency} onChange={e => setDraft(d => ({ ...d, currency: e.target.value }))} style={inputStyle}>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </Field>
              <Field label={`Amount (${currencySymbol(draft.currency)})`} required>
                <input type="number" value={draft.amount} onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))} style={inputStyle} placeholder="0.00" />
              </Field>
              <Field label={`Paid (${currencySymbol(draft.currency)})`}>
                <input type="number" value={draft.paid} onChange={e => setDraft(d => ({ ...d, paid: e.target.value }))} style={inputStyle} placeholder="0.00" />
              </Field>
              <Field label="Status">
                <select value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value }))} style={inputStyle}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Payment Method">
                <select value={draft.paymentMethod} onChange={e => setDraft(d => ({ ...d, paymentMethod: e.target.value }))} style={inputStyle}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Reference / Receipt #" style={{ gridColumn: "1 / -1" }}>
                <input value={draft.reference} onChange={e => setDraft(d => ({ ...d, reference: e.target.value }))} style={inputStyle} placeholder="Receipt, invoice, txn id" />
              </Field>
              <Field label="Description / Notes" style={{ gridColumn: "1 / -1" }}>
                <textarea value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} placeholder="Anything useful for context" />
              </Field>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
              <button onClick={() => setShowModal(false)} style={btnGhost}>Cancel</button>
              <button onClick={handleSubmit} style={btnPrimary}>{editingId ? "Save Changes" : "Add Expense"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, children, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function SelectChip({ label, value, onChange, children }) {
  return (
    <label className="filter-select" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", border: "1px solid var(--border-md, #e5e7eb)", borderRadius: 8, background: "var(--surface, #fff)", fontSize: 12 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", fontWeight: 600, color: "var(--text)", cursor: "pointer", minWidth: 70 }}>
        {children}
      </select>
    </label>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 10px",
  border: "1px solid var(--border-md, #e5e7eb)", borderRadius: 8,
  fontSize: 13, fontFamily: "inherit",
  background: "var(--surface, #fff)", color: "var(--text, #111827)",
  outline: "none", boxSizing: "border-box",
};
const btnPrimary = { padding: "8px 16px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer" };
const btnGhost   = { padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border-md, #e5e7eb)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" };
const iconBtn = (color) => ({
  background: "transparent", border: "none", cursor: "pointer",
  color, padding: "4px 6px", borderRadius: 4,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
});
