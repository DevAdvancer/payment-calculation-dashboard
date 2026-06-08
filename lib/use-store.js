"use client";
import { create } from "zustand";

/* ── Status routing ───────────────────────────────────── */
export const ROUTED_STATUSES    = ["Laid Off", "Offer Revoke", "No Offer", "Resigned", "Contract End", "BGV Fail", "Default"];
export const LAIDOFF_STATUSES   = ["Laid Off", "Offer Revoke", "No Offer", "Resigned", "Contract End", "BGV Fail"];
export const ALL_STATUSES       = ["Received", "Pending", "Laid Off", "Offer Revoke", "No Offer", "Resigned", "Contract End", "BGV Fail", "Default"];
export const INSTANCE_OPTIONS   = ["First Half", "Second Half"];
export const MONTH_NAMES        = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sept","Oct","Nov","Dec"];
export const FULL_MONTH_NAMES   = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/* ── Internal: parse MM-DD-YYYY → Date (returns null on failure) ── */
function _parseDateMMDDYYYY(val) {
  if (!val) return null;
  const m = String(val).match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return new Date(+m[3], +m[1] - 1, +m[2]);
  // Also handle YYYY-MM-DD (from date inputs)
  const iso = String(val).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/* ── Helpers ──────────────────────────────────────────── */
export function computePaidDue(entry) {
  const amount = parseFloat(entry.amount) || 0;
  if (entry.status === "Received")    return { ...entry, paid: amount, due: 0 };
  if (entry.status === "Pending") return { ...entry, paid: 0,      due: amount };
  return entry;
}

export function deriveSets(entries) {
  const active     = entries.filter(e => !ROUTED_STATUSES.includes(e.status));
  const laidOff    = entries.filter(e => LAIDOFF_STATUSES.includes(e.status));
  const defaulters = entries.filter(e => e.status === "Default");
  return { active, laidOff, defaulters };
}

export function fmtMoney(v, decimals = 2) {
  return "$" + parseFloat(v || 0).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/* ── Currency helpers ──────────────────────────────────
 * Resolves to "USD" or "GBP".
 *   - Prefers an explicit entry.currency if present (used for custom
 *     companies created via the Payment Calc Create-Entry modal).
 *   - Falls back to deriving from the company name: Vizva-UK / Vizva UK
 *     Ltd → GBP, everything else → USD. */
export function currencyOf(entryOrCompany) {
  if (entryOrCompany && typeof entryOrCompany === "object") {
    if (entryOrCompany.currency === "USD" || entryOrCompany.currency === "GBP") {
      return entryOrCompany.currency;
    }
    return currencyOfCompanyName(entryOrCompany.company);
  }
  return currencyOfCompanyName(entryOrCompany);
}

function currencyOfCompanyName(company) {
  const c = String(company || "").trim().toLowerCase();
  if (c === "vizva-uk" || c === "vizva uk ltd") return "GBP";
  return "USD";
}

export function currencySymbol(currency) {
  return currency === "GBP" ? "£" : "$";
}

export function fmtMoneyC(v, currency = "USD", decimals = 2) {
  return currencySymbol(currency)
    + parseFloat(v || 0).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
}

/* Sum a numeric field across a collection, bucketed by currency.
   Reads entry.currency first, falls back to company-based mapping. */
export function sumByCurrency(entries, field) {
  const totals = { USD: 0, GBP: 0 };
  for (const e of entries) {
    totals[currencyOf(e)] += parseFloat(e[field]) || 0;
  }
  return totals;
}

/* Convert stored MM-DD-YYYY (or YYYY-MM-DD) to "Mon DD, YYYY" for the email preview */
export function fmtEmailDate(val) {
  if (!val) return "";
  const s = String(val).trim();
  let mo, d, y;
  const mdy = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (mdy)      { mo = +mdy[1]; d = +mdy[2]; y = +mdy[3]; }
  else if (ymd) { y = +ymd[1]; mo = +ymd[2]; d = +ymd[3]; }
  else return s;
  return `${MONTH_NAMES[mo - 1]} ${d}, ${y}`;
}

/* Convert stored MM-DD-YYYY to MM/DD/YYYY for display */
export function fmtDate(val) {
  if (!val) return "—";
  const s = String(val).trim();
  // MM-DD-YYYY → MM/DD/YYYY
  const mdy = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mdy) return `${mdy[1].padStart(2,"0")}/${mdy[2].padStart(2,"0")}/${mdy[3]}`;
  // already MM/DD/YYYY or other — return as-is
  return s;
}

export function dateInputToMMDDYYYY(val) {
  if (!val) return "";
  const m = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[2]}-${m[3]}-${m[1]}`;
  return val;
}

export function toDateInputValue(val) {
  if (!val) return "";
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const mdy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (mdy) {
    const [, mo, d, y] = mdy;
    return `${y}-${mo.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  const p = new Date(s);
  if (!isNaN(p.getTime()))
    return `${p.getFullYear()}-${String(p.getMonth()+1).padStart(2,"0")}-${String(p.getDate()).padStart(2,"0")}`;
  return "";
}

/* ── Zustand Store ────────────────────────────────────── */
const useDashboardStore = create((set, get) => ({
  /* ── State ── */
  entries:      [],          // all payment_entries from DB
  loading:      true,
  dbError:      null,
  currentPage:  "po-details",  // po-details | payment | laidoff | defaulter | history | monthly | placement
  toast:        null,

  /* Admin/NOC settings cache */
  nocSettings:  null,

  /* Last submitted placement dashboard data */
  lastDashboard: null,

  /* Mobile drawer (sidebar) open/close */
  sidebarOpen:    false,
  setSidebarOpen: (v) => set({ sidebarOpen: !!v }),

  /* ── Derived getters ── */
  getActive:    ()  => get().entries.filter(e =>
    !ROUTED_STATUSES.includes(e.status) && (!e.sheetScope || e.sheetScope === "payment")
  ),
  getLaidOff:   ()  => get().entries.filter(e =>
    LAIDOFF_STATUSES.includes(e.status) && (!e.sheetScope || e.sheetScope === "laidoff")
  ),
  getDefaulters:()  => get().entries.filter(e =>
    e.status === "Default" && (!e.sheetScope || e.sheetScope === "defaulter")
  ),

  getByCandidate: (name) => get().entries.filter(e =>
    (e.candidate || "").trim().toLowerCase() === name.toLowerCase()
  ),

  getCandidateNames: () => [...new Set(
    get().entries.map(e => e.candidate).filter(n => n && n !== "—")
  )].sort((a,b) => a.localeCompare(b)),

  /* ── Toast ── */
  showToast: (msg, duration = 3000) => {
    if (msg == null) {
      set({ toast: null });
      return;
    }
    const text = String(msg);
    const sticky = duration === 0 || /failed|error|invalid|could not|network|validation|import failed|save failed|update failed|delete failed/i.test(text);
    set({ toast: { message: text, sticky } });
    if (!sticky) setTimeout(() => set({ toast: null }), duration);
  },

  /* ── Navigation ── */
  navigate: (page) => set({ currentPage: page }),

  /* ── Store last placement dashboard ── */
  setLastDashboard: (data) => set({ lastDashboard: data }),

  /* ── Load from DB ── */
  loadFromDB: async () => {
    set({ loading: true, dbError: null });
    try {
      const [entriesRes, expensesRes] = await Promise.all([
        fetch("/api/entries", { cache: "no-store" }),
        fetch("/api/expenses", { cache: "no-store" }),
      ]);
      if (!entriesRes.ok) throw new Error(await entriesRes.text());
      const { entries } = await entriesRes.json();
      const expenses = expensesRes.ok ? (await expensesRes.json()).expenses : [];
      set({ entries: entries || [], expenses: expenses || [], loading: false });
    } catch (e) {
      set({ loading: false, dbError: e.message });
      get().showToast("⚠ Could not load from database — working offline");
    }
  },

  /* ── Expenses ── */
  expenses: [],
  createExpense: async (data) => {
    const expense = { ...data, id: data.id || String(Date.now()) };
    const prev = get().expenses;
    set({ expenses: [...prev, expense] });
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expense),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        set({ expenses: prev });
        get().showToast(`✕ Save failed — ${err.details || err.error || `HTTP ${res.status}`}`);
        return null;
      }
      const { expense: saved } = await res.json();
      if (saved) {
        set(s => ({ expenses: s.expenses.map(x => String(x.id) === String(saved.id) ? saved : x) }));
      }
      get().showToast("✓ Expense added");
      return saved || expense;
    } catch {
      set({ expenses: prev });
      get().showToast("✕ Failed to save — network error");
      return null;
    }
  },
  updateExpense: async (id, patch) => {
    const prev = get().expenses;
    set({ expenses: prev.map(x => String(x.id) === String(id) ? { ...x, ...patch } : x) });
    try {
      const res = await fetch(`/api/expenses/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        set({ expenses: prev });
        get().showToast(`✕ Update failed — ${err.details || err.error || `HTTP ${res.status}`}`);
        return false;
      }
      return true;
    } catch {
      set({ expenses: prev });
      get().showToast("✕ Failed to update — network error");
      return false;
    }
  },
  deleteExpense: async (id) => {
    const prev = get().expenses;
    set({ expenses: prev.filter(x => String(x.id) !== String(id)) });
    try {
      const res = await fetch(`/api/expenses/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        set({ expenses: prev });
        get().showToast(`✕ Delete failed — HTTP ${res.status}`);
        return false;
      }
      get().showToast("✓ Expense deleted");
      return true;
    } catch {
      set({ expenses: prev });
      get().showToast("✕ Failed to delete — network error");
      return false;
    }
  },
  bulkDeleteExpenses: async (ids) => {
    const idSet = new Set(ids.map(String));
    if (!idSet.size) return true;
    const prev = get().expenses;
    set({ expenses: prev.filter(x => !idSet.has(String(x.id))) });
    try {
      const res = await fetch("/api/expenses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(idSet) }),
      });
      if (!res.ok) {
        set({ expenses: prev });
        get().showToast(`✕ Bulk delete failed — HTTP ${res.status}`);
        return false;
      }
      return true;
    } catch {
      set({ expenses: prev });
      get().showToast("✕ Bulk delete failed — network error");
      return false;
    }
  },

  /* ── Create entry ── */
  createEntry: async (data) => {
    const entry = { ...data, id: data.id || String(Date.now()) };
    if (entry.poDate && !entry.instance) {
      const d = _parseDateMMDDYYYY(entry.poDate);
      if (d) {
        entry.instance = d.getDate() <= 15 ? "First Half" : "Second Half";
        if (!entry.month) entry.month = MONTH_NAMES[d.getMonth()];
        if (!entry.year)  entry.year  = String(d.getFullYear());
      }
    }
    const prev = get().entries;
    set({ entries: [...prev, entry] });
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        set({ entries: prev });
        const msg = err.details || err.error || `HTTP ${res.status}`;
        get().showToast(`✕ Save failed — ${msg}`);
        console.error("createEntry failed:", err);
        return null;
      }
      const { entry: saved } = await res.json();
      if (saved) {
        set(s => ({ entries: s.entries.map(e => String(e.id) === String(saved.id) ? saved : e) }));
      }
      get().showToast("✓ Entry created");
      return saved || entry;
    } catch (e) {
      set({ entries: prev });
      get().showToast("✕ Failed to save entry — network error");
      console.error("createEntry network error:", e);
      return null;
    }
  },

  /* ── Bulk create (e.g. placement installments) ── */
  bulkCreate: async (newEntries) => {
    const withIds = newEntries.map((e, i) => ({
      ...e,
      id: e.id || String(Date.now() + i),
    }));
    const prev = get().entries;
    set({ entries: [...prev, ...withIds] });
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withIds),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        set({ entries: prev });
        const msg = err.details || err.error || `HTTP ${res.status}`;
        get().showToast(`✕ Save failed — ${msg}`);
        console.error("bulkCreate failed:", err);
        return false;
      }
      const { entries: saved } = await res.json();
      if (Array.isArray(saved) && saved.length) {
        const savedById = new Map(saved.map(e => [String(e.id), e]));
        set(s => ({
          entries: s.entries.map(e => savedById.get(String(e.id)) || e),
        }));
      }
      get().showToast(`✓ ${withIds.length} entries saved`);
      return true;
    } catch (e) {
      set({ entries: prev });
      get().showToast("✕ Failed to save entries — network error");
      console.error("bulkCreate network error:", e);
      return false;
    }
  },

  /* ── Update single field ── */
  updateEntry: async (id, patch) => {
    if (patch.poDate) {
      const d = _parseDateMMDDYYYY(patch.poDate);
      if (d) {
        patch = { ...patch, instance: d.getDate() <= 15 ? "First Half" : "Second Half",
          month: MONTH_NAMES[d.getMonth()], year: String(d.getFullYear()) };
      }
    }
    const prev = get().entries;
    set({ entries: prev.map(e => String(e.id) === String(id) ? { ...e, ...patch } : e) });
    try {
      const res = await fetch(`/api/entries/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        set({ entries: prev });
        const msg = err.details || err.error || `HTTP ${res.status}`;
        get().showToast(`✕ Update failed — ${msg}`);
        console.error("updateEntry failed:", err);
        return false;
      }
      return true;
    } catch (e) {
      set({ entries: prev });
      get().showToast("✕ Failed to update — network error");
      console.error("updateEntry network error:", e);
      return false;
    }
  },

  /* ── Update status (also recomputes paid/due) ──
   * For the 5 terminal statuses (Laid Off, Offer Revoke, No Offer, Resigned,
   * Default), cascade the same status to every entry of the same candidate
   * whose poDate is on/after the changed entry's date — except entries
   * already marked "Paid", which are protected.
   *
   * The cascade uses a single optimistic state update + single bulk upsert
   * to the DB, so it's atomic: either all affected rows commit together,
   * or all roll back together on failure.
   */
  updateStatus: async (id, status) => {
    const TERMINAL = ["Laid Off", "Offer Revoke", "No Offer", "Resigned", "Default"];
    const entry = get().entries.find(e => String(e.id) === String(id));
    if (!entry) return;

    // Non-terminal statuses: single-row update via existing path.
    if (!TERMINAL.includes(status)) {
      const amount = parseFloat(entry.amount) || 0;
      const patch  = {
        status,
        paid: status === "Received" ? amount : 0,
        due:  status === "Received" ? 0      : amount,
      };
      const ok = await get().updateEntry(id, patch);
      if (ok !== false) get().showToast(`✓ Status → ${status}`);
      return;
    }

    // Terminal status: gather all entries to cascade.
    const candidate = (entry.candidate || "").trim().toLowerCase();
    const thisDate  = _parseDateMMDDYYYY(entry.poDate);
    const prev      = get().entries;
    const affected  = [];

    for (const e of prev) {
      if ((e.candidate || "").trim().toLowerCase() !== candidate) continue;
      if (String(e.id) === String(id)) { affected.push(e); continue; }
      if (e.status === "Received") continue;            // never override Received rows
      const d = _parseDateMMDDYYYY(e.poDate);
      if (!d || !thisDate || d < thisDate) continue; // must be on or after trigger date
      affected.push(e);
    }

    // Build cascaded versions: same status, paid=0, due=amount.
    const affectedIds = new Set(affected.map(e => String(e.id)));
    const cascaded = prev.map(e => {
      if (!affectedIds.has(String(e.id))) return e;
      const amt = parseFloat(e.amount) || 0;
      return { ...e, status, paid: 0, due: amt };
    });

    // Optimistic update: one set() for all affected rows together.
    set({ entries: cascaded });

    const toSend = cascaded.filter(e => affectedIds.has(String(e.id)));
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSend),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        set({ entries: prev });                    // atomic rollback
        const msg = err.details || err.error || `HTTP ${res.status}`;
        get().showToast(`✕ Status cascade failed — ${msg}`);
        console.error("updateStatus cascade failed:", err);
        return;
      }
      const { entries: saved } = await res.json();
      if (Array.isArray(saved) && saved.length) {
        const savedById = new Map(saved.map(e => [String(e.id), e]));
        set(s => ({ entries: s.entries.map(e => savedById.get(String(e.id)) || e) }));
      }
      const cascadeCount = affected.length - 1;     // exclude the trigger row
      if (LAIDOFF_STATUSES.includes(status)) {
        get().showToast(`🔴 ${status} — ${cascadeCount > 0 ? cascadeCount + " future entries also updated" : "moved to Laid Off sheet"}`);
      } else {
        get().showToast(`⚠️ Default — ${cascadeCount > 0 ? cascadeCount + " future entries also updated" : "moved to Defaulter sheet"}`);
      }
    } catch (e) {
      set({ entries: prev });
      get().showToast("✕ Status cascade failed — network error");
      console.error("updateStatus cascade network error:", e);
    }
  },


  /* ── Delete entry ── */
  deleteEntry: async (id) => {
    const prev = get().entries;
    set({ entries: prev.filter(e => String(e.id) !== String(id)) });
    try {
      const res = await fetch(`/api/entries/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        set({ entries: prev });
        const msg = err.error || `HTTP ${res.status}`;
        get().showToast(`✕ Delete failed — ${msg}`);
        console.error("deleteEntry failed:", err);
        return false;
      }
      get().showToast("✓ Entry deleted");
      return true;
    } catch (e) {
      set({ entries: prev });
      get().showToast("✕ Failed to delete — network error");
      console.error("deleteEntry network error:", e);
      return false;
    }
  },

  /* ── Bulk delete — chunks requests into batches of 500 to avoid timeouts ── */
  bulkDelete: async (ids) => {
    const idSet = new Set(ids.map(String));
    if (!idSet.size) return true;
    const allIds = Array.from(idSet);
    const prev = get().entries;
    // Optimistically remove from UI immediately
    set({ entries: prev.filter(e => !idSet.has(String(e.id))) });
    try {
      const CHUNK = 500;
      for (let i = 0; i < allIds.length; i += CHUNK) {
        const chunk = allIds.slice(i, i + CHUNK);
        const res = await fetch("/api/entries", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: chunk }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          set({ entries: prev });
          const msg = err.error || `HTTP ${res.status}`;
          get().showToast(`✕ Bulk delete failed — ${msg}`);
          console.error("bulkDelete failed:", err);
          return false;
        }
      }
      return true;
    } catch (e) {
      set({ entries: prev });
      get().showToast("✕ Bulk delete failed — network error");
      console.error("bulkDelete network error:", e);
      return false;
    }
  },

  /* ── Bulk import ── */
  importEntries: async (newEntries) => {
    const withIds = newEntries.map((e, i) => ({ ...e, id: e.id || String(Date.now() + i) }));
    const prev = get().entries;
    const existingIds = new Set(prev.map(e => String(e.id)));
    const fresh = withIds.filter(e => !existingIds.has(String(e.id)));
    set({ entries: [...prev, ...fresh] });
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withIds),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        set({ entries: prev });
        const msg = err.details || err.error || `HTTP ${res.status}`;
        get().showToast(`✕ Import failed — ${msg}`);
        console.error("importEntries failed:", err);
        return false;
      }
      const { entries: saved } = await res.json();
      if (Array.isArray(saved) && saved.length) {
        const savedById = new Map(saved.map(e => [String(e.id), e]));
        set(s => ({
          entries: s.entries.map(e => savedById.get(String(e.id)) || e),
        }));
      }
      get().showToast(`✓ Imported ${fresh.length} entries`);
      return true;
    } catch (e) {
      set({ entries: prev });
      get().showToast("✕ Import save failed — network error");
      console.error("importEntries network error:", e);
      return false;
    }
  },

  /* ── Load NOC/admin settings (always fetches fresh) ── */
  loadNOCSettings: async () => {
    try {
      const res = await fetch(`/api/admin/settings?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { settings } = await res.json();
      set({ nocSettings: settings });
      return settings;
    } catch (e) {
      console.error("loadNOCSettings error:", e);
      return get().nocSettings || {};
    }
  },
}));

export default useDashboardStore;
