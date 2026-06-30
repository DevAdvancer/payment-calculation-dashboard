"use client";
import { useState, useRef, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import useDashboardStore, {
  ALL_STATUSES,
  LAIDOFF_STATUSES,
  INSTANCE_OPTIONS,
  MONTH_NAMES,
  fmtMoney,
  fmtMoneyC,
  currencyOf,
  sumByCurrency,
} from "@/lib/use-store";
import { entryMatchesPeriod } from "@/lib/period-utils";
import FilterBar from "./FilterBar";
import DateInput from "@/app/components/DateInput";
import MoneyStack from "@/app/components/MoneyStack";
import QuickEntryModal from "./QuickEntryModal";
import PaginationControls from "@/app/components/PaginationControls";
import DeleteConfirmModal from "@/app/components/DeleteConfirmModal";
import { normalizeCompanyName } from "@/lib/company-utils";
import { normalizePaymentImportAmounts } from "@/lib/payment-import-utils";
import { normalizePaymentStatus } from "@/lib/status-utils";

const PAYMENT_IMPORT_HEADERS = [
  "Company", "Name of the Candidate", "Date", "Month", "Year", "Instance of Payment",
  "USD", "Actual", "Type of Service", "Status", "Type", "Remarks", "Client", "PO#",
];

const PAYMENT_STATUS_OPTIONS = ["Received", "Pending", "Move", "Laid Off", "Default"];

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

function toMMDDYYYY(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${d.getFullYear()}`;
}

function parseMMDDYYYY(value) {
  if (!value) return null;
  const m = String(value).match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  return new Date(+m[3], +m[1] - 1, +m[2]);
}

function toISODate(value) {
  const d = parseMMDDYYYY(value);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fromISODate(iso) {
  if (!iso) return null;
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}

function addDays(date, offset) {
  const d = new Date(date);
  d.setDate(d.getDate() + offset);
  return d;
}

function addMonths(date, offset) {
  const src = date instanceof Date ? new Date(date) : new Date(date);

  const originalDay = src.getDate();
  const originalWasMonthEnd =
    originalDay ===
    new Date(src.getFullYear(), src.getMonth() + 1, 0).getDate();

  // Move to first day before changing month to avoid overflow
  const target = new Date(src);
  target.setDate(1);
  target.setMonth(target.getMonth() + offset);

  // Last day of target month
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0
  ).getDate();

  // Preserve end-of-month behaviour
  target.setDate(
    originalWasMonthEnd
      ? lastDay
      : Math.min(originalDay, lastDay)
  );

  // Preserve time
  target.setHours(
    src.getHours(),
    src.getMinutes(),
    src.getSeconds(),
    src.getMilliseconds()
  );

  return target;
}

function normalizeServiceTypeValue(value) {
  if (value == null) return "";
  const raw = String(value).trim();
  return raw.toLowerCase() === "payment collection" ? "New Placement" : raw;
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

function normalizeInstance(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "second half" || raw === "second" || raw === "2nd half" || raw === "2") return "Second Half";
  return "First Half";
}

function parseClipboardTable(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map(line => line.split("\t").map(cell => cell.trim()))
    .filter(cells => cells.some(Boolean));
}

function mapPaymentImportRow(row, index, xlsxUtils) {
  const candidate = String(getCell(row, ["Name of the Candidate", "Candidate Name", "CandidateName", "Candidate", "Name", "candidate"]) || "").trim();
  if (!candidate) return null;

  const poDate = normalizeDateCell(getCell(row, ["Date", "PO Date", "poDate", "DOJ", "Date of Joining", "doj", "dateofjoining"]), xlsxUtils);
  const parts = dateParts(poDate);
  const amount = parseMoney(getCell(row, ["USD", "Amount", "amount", "Salary", "salary", "Total", "total", "Value", "value"]));
  const actualRaw = getCell(row, ["Actual", "actual"]);
  const actual = actualRaw === "" || actualRaw == null ? 0 : parseMoney(actualRaw);
  const status = normalizePaymentStatus(getCell(row, ["Status", "status"]));
  const amounts = normalizePaymentImportAmounts({
    amount,
    paid: parseMoney(getCell(row, ["Paid", "paid"])),
    due: parseMoney(getCell(row, ["Due", "due"])),
    status,
  });

  return {
    actual,
    id: String(Date.now() + index),
    candidate,
    company: normalizeCompanyName(getCell(row, ["Company", "company"])),
    client: String(getCell(row, ["Client", "client"]) || "").trim(),
    poDate,
    month: String(getCell(row, ["Month", "month"]) || parts.month || "").trim(),
    year: String(getCell(row, ["Year", "year"]) || parts.year || new Date().getFullYear()).trim(),
    instance: normalizeInstance(getCell(row, ["Instance of Payment", "Instance", "instance"]) || parts.instance),
    amount,
    paid: amounts.paid,
    due: amounts.due,
    serviceType: normalizeServiceTypeValue(getCell(row, ["Type of Service", "Service Type", "serviceType"]) || "Placement"),
    status,
    type: String(getCell(row, ["Type", "type"]) || "").trim(),
    notes: String(getCell(row, ["Remarks", "Notes", "notes"]) || "").trim(),
    poNum: String(getCell(row, ["PO#", "PO Num", "poNum", "po"]) || "").trim(),
    sheetScope: "payment",
  };
}

function clipboardRowsToObjects(text) {
  const table = parseClipboardTable(text);
  if (!table.length) return [];

  const first = table[0].map(cleanHeader);
  const known = [
    ...PAYMENT_IMPORT_HEADERS,
    "Candidate", "Name", "Candidate Name", "CandidateName",
    "PO Date", "poDate", "DOJ", "Date of Joining", "doj", "dateofjoining",
    "USD", "Amount", "amount", "Salary", "salary", "Total", "total",
    "PO#", "PO Num", "poNum", "po", "Remarks", "Notes", "notes"
  ].map(cleanHeader);
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
  const { getActive, getLaidOff, getDefaulters, getCandidateNames, updateEntry, updateStatus, createEntry, deleteEntry, bulkDelete, importEntries, showToast, loading, navigate } =
    useDashboardStore();

  const entries       = getActive();
  const laidOffRows   = getLaidOff();
  const defaulterRows = getDefaulters();
  const allNames      = getCandidateNames();
  const now           = new Date();
  const currentMonth  = MONTH_NAMES[now.getMonth()];
  const currentYear   = String(now.getFullYear());

  const [searchTerm, setSearchTerm]     = useState("ajaj");
  const [selectedName, setSelectedName] = useState(null);   // exact-match lock when user picks from dropdown
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [filters, setFilters]           = useState({ company: "", month: currentMonth, year: currentYear, instance: "", status: "", serviceType: "" });
  const [sortKey, setSortKey]           = useState("poDate");
  const [sortDir, setSortDir]           = useState("asc");
  const [fadingIds, setFadingIds]       = useState(new Set());
  const [editingUSD, setEditingUSD]     = useState(null);
  const [usdDraft, setUSDDraft]         = useState("");
  const [editingActual, setEditingActual] = useState(null);
  const [actualDraft, setActualDraft] = useState("");
  const [showActualColumn, setShowActualColumn] = useState(false);
  const [gbpToUsd, setGbpToUsd]         = useState(1.35);
  const [pasteImport, setPasteImport]   = useState(null);
  const [selected, setSelected]         = useState(new Set());
  const [editingRemarks, setEditingRemarks] = useState(null);
  const [remarksDraft, setRemarksDraft] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    loading: false,
  });
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(100);
  const [pendingMove, setPendingMove]   = useState(null);
  const [moveDateIso, setMoveDateIso]   = useState("");
  const [moveError, setMoveError]       = useState("");
  const [moveRows, setMoveRows]         = useState([]);
  const importRef = useRef();
  const searchRef = useRef();
  const pasteTargetRef = useRef();

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [searchTerm, filters, selectedName]);

  useEffect(() => {
    setSelected(new Set());
  }, [page, pageSize]);



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
    const defaults = ["Placement", "New Placement"];
    const fromData = entries
      .map(e => normalizeServiceTypeValue(e.serviceType))
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
    const totalDue   = rows.reduce((s, e) => {
      if (e.status === "Pending") {
        return s + (parseFloat(e.due) || 0);
      }
      return s;
    }, 0);
    const totalPaid  = rows.reduce((s, e) => {
      if (e.status === "Received") {
        return s + (parseFloat(e.paid) || 0);
      }
      return s;
    }, 0);
    const totalValue = totalPaid + totalDue;
    const currency   = currencyOf(rows[0]);                             // candidate → single currency
    return { count: rows.length, totalValue, totalPaid, totalDue, currency };
  }, [exactMatch, entries]);

  /* ── Filtering ──
   *   • If a name was selected from the dropdown → exact-match only.
   *   • Otherwise typed search does substring (`includes`) matching. */
  const filtered = useMemo(() => {
    const monthFilter = filters.month || "";
    const yearFilter  = filters.year  ? String(filters.year) : "";
    let rows = entries;
    if (selectedName) {
      const sel = selectedName.toLowerCase();
      rows = rows.filter(e => (e.candidate || "").trim().toLowerCase() === sel);
    } else {
      const q = searchTerm.trim().toLowerCase();
      if (q) rows = rows.filter(e => (e.candidate || "").toLowerCase().includes(q));
    }
    if (filters.status)   rows = rows.filter(e => e.status === filters.status);
    if (monthFilter || yearFilter) rows = rows.filter(e => entryMatchesPeriod(e, monthFilter, yearFilter));
    if (filters.instance) rows = rows.filter(e => e.instance === filters.instance);
    if (filters.company)  rows = rows.filter(e => e.company === filters.company);
    if (filters.serviceType) rows = rows.filter(e => normalizeServiceTypeValue(e.serviceType) === filters.serviceType);
    return rows;
  }, [entries, searchTerm, selectedName, filters]);

  /* ── Stats scope — ALWAYS narrowed to the selected month + year,
     regardless of the other filters. The KPI strip uses this so the
     numbers always reflect "this month" totals even if the user
     clears the company/status/search dropdowns.

     IMPORTANT: this filter falls back to the row's `poDate` whenever
     the stored `month`/`year` is missing or doesn't match the dropdown
     value. Without that fallback, rows with a missing month/year (or
     a typo'd value) would slip through the table's filter too, making
     the table and the stats disagree. */
  const statsRows = useMemo(() => {
    const monthFilter = filters.month || "";
    const yearFilter  = filters.year  ? String(filters.year) : "";
    return entries.filter(e => entryMatchesPeriod(e, monthFilter, yearFilter));
  }, [entries, filters.month, filters.year]);

  /* ── Sorting ── */
  const sorted = useMemo(() => {
    const toDate = (s) => {
      const m = String(s || "").match(/^(\d{2})-(\d{2})-(\d{4})$/);
      return m ? new Date(+m[3], +m[1] - 1, +m[2]).getTime() : 0;
    };
    
    // Helper: check if row has changed color (Actual !== USD)
    const hasChangedColor = (e) => {
      const actualVal = parseFloat(e.actual) || 0;
      const usdVal = parseFloat(e.amount) || 0;
      return actualVal !== usdVal;
    };

    return [...filtered].sort((a, b) => {
      // First priority: pin colored (changed) rows to top
      const aColored = hasChangedColor(a);
      const bColored = hasChangedColor(b);
      if (aColored && !bColored) return -1;
      if (!aColored && bColored) return 1;

      // Within each group, apply regular sort order
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

  const paginatedRows = useMemo(() => {
    return sorted.slice((page - 1) * pageSize, page * pageSize);
  }, [sorted, page, pageSize]);

//   const handleStatusChange = async (entry, nextStatus) => {
//   if (nextStatus === "Move" && entry.status !== "Move") {
//       const currentIndex = sorted.findIndex((e) => String(e.id) === String(entry.id));
//     if (currentIndex === -1) return;
//     const affected = sorted.slice(currentIndex);
//     const originals = affected.map((row) => ({ ...row }));
//     setPendingMove({ entry, prevStatus: entry.status, currentIndex });
//     setMoveRows(originals);
//     setMoveDateIso(toISODate(entry.poDate));
//     setMoveError("");

//       for (const row of affected) {
//         if (row.status === "Move") continue;
//         await updateEntry(row.id, {
//           status: "Move",
//           paid: 0,
//           due: parseFloat(row.amount) || 0,
//           sheetScope: "payment",
//         });
//       }
//     return;
//   }
//   updateStatus(entry.id, nextStatus);
// };

  const handleStatusChange = (entry, nextStatus) => {
    if (nextStatus === "Move" && entry.status !== "Move") {
      const currentIndex = sorted.findIndex(
        (e) => String(e.id) === String(entry.id)
      );

      if (currentIndex === -1) return;

      // Just remember which row was selected.
      // Actual updates happen only after Confirm.
      setPendingMove({
        entry,
        prevStatus: entry.status,
        currentIndex,
      });

      setMoveDateIso(toISODate(entry.poDate));
      setMoveError("");

      return;
    }

    // Normal status changes.
    updateStatus(entry.id, nextStatus);
  };

  const handleMoveConfirm = async () => {
      if (!pendingMove) return;

      if (!moveDateIso) {
          setMoveError("Please select a date.");
          return;
      }

      const baseDate = fromISODate(moveDateIso);

      if (!baseDate || isNaN(baseDate.getTime())) {
          setMoveError("Please select a valid date.");
          return;
      }

        const { currentIndex } = pendingMove;
        const anchor = pendingMove.entry || sorted[currentIndex];
        const candidateKey = String(anchor?.candidate || "").trim().toLowerCase();
        const sameCandidateBelow = sorted
        .slice(currentIndex + 1)
        .filter((row) => String(row.candidate || "").trim().toLowerCase() === candidateKey);

        const cloneDate = toMMDDYYYY(baseDate);
        const cloneParts = dateParts(cloneDate);

        const clonedRow = await createEntry({
          ...anchor,
          id: String(Date.now()) + "-move",
          poDate: cloneDate,
          month: cloneParts.month,
          year: cloneParts.year,
          instance: cloneParts.instance,
          paid: 0,
          due: parseFloat(anchor?.amount) || 0,
          status: "Pending",
          sheetScope: "payment",
        });

        if (!clonedRow) return;

        await updateEntry(anchor.id, {
          status: "Move",
          paid: 0,
          due: parseFloat(anchor.amount) || 0,
          sheetScope: "payment",
        });

        for (let i = 0; i < sameCandidateBelow.length; i++) {
          const row = sameCandidateBelow[i];
          const newDate = addMonths(baseDate, i + 1);
          const poDate = toMMDDYYYY(newDate);

          await updateEntry(row.id, {
            poDate,
            status: "Pending",
            paid: 0,
            due: parseFloat(row.amount) || 0,
            sheetScope: "payment",
          });
        }

      setPendingMove(null);
      setMoveDateIso("");
      setMoveError("");
  };

  const handleMoveCancel = () => {
      setPendingMove(null);
      setMoveDateIso("");
      setMoveError("");
      setMoveRows([]);
  };

  const handleActualClick = (entry) => {
    setEditingActual(entry.id);
    setActualDraft(String(entry.actual ?? 0));
  };

  const handleActualBlur = async (entry) => {
    const val = parseFloat(actualDraft);

    if (!isNaN(val)) {
      await updateEntry(entry.id, {
        actual: val,
      });
    }

    setEditingActual(null);
  };

  const toggleAll = (checked) => setSelected(checked ? new Set(sorted.map(r => r.id)) : new Set());
  const toggleRow = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const handleDeleteSelected = () => {
    if (!selected.size) return;
    const count = selected.size;
    const batches = Math.ceil(count / 500);
    setDeleteConfirm({
      isOpen: true,
      title: `Delete ${count.toLocaleString()} selected ${count === 1 ? "entry" : "entries"}?`,
      message: `Are you sure you want to delete the ${count.toLocaleString()} selected entry/entries? This cannot be undone.`,
      loadingText: count > 500 ? `Deleting in ${batches} batches…` : "Deleting…",
      onConfirm: async () => {
        setDeleteConfirm(prev => ({ ...prev, loading: true }));
        const ok = await bulkDelete(Array.from(selected));
        if (ok) {
          setSelected(new Set());
          showToast(`✓ Deleted ${count.toLocaleString()} entries`);
        }
        setDeleteConfirm({ isOpen: false, title: "", message: "", onConfirm: null, loading: false, loadingText: "" });
      },
    });
  };

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };
  const sortIcon = (key) => sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  useEffect(() => {
    const abort = new AbortController();
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
    return () => abort.abort();
  }, []);

  /* ── KPIs (always scoped to the selected month + year, independent of
     the other filters that drive the table) — split by currency for
     stacked display. */
  const totalValueByCur = sumByCurrency(statsRows, "amount");
  const totalPaidByCur  = sumByCurrency(statsRows, "paid");
  const totalDueByCur   = sumByCurrency(statsRows, "due");
  const totalActualByCur = sumByCurrency(
    statsRows.map(e => ({
        ...e,
      actual: (e.actual || e.amount) ?? 0
    })),
    "actual"
);
  const totalValueUSD    = totalValueByCur.USD + totalValueByCur.GBP * gbpToUsd;
  const totalPaidUSD     = totalPaidByCur.USD  + totalPaidByCur.GBP * gbpToUsd;
  const totalDueUSD      = totalDueByCur.USD   + totalDueByCur.GBP * gbpToUsd;
  const totalActualUSD   = totalActualByCur.USD + totalActualByCur.GBP * gbpToUsd;

  const recurringPlacementEntries = statsRows.filter(
    e => normalizeServiceTypeValue(e.serviceType) === "Placement"
  );
  const recurringPaymentByCur = sumByCurrency(
    recurringPlacementEntries.map(e => ({
      ...e,
      amount: e.actual ?? 0
    })),
    "amount"
  );
  const recurringPaymentUSD = recurringPaymentByCur.USD + recurringPaymentByCur.GBP * gbpToUsd;

  /* ── Move / Placement / New Placement metrics */
  const moveEntries = statsRows.filter(e => e.status === "Move");
  const moveUniqueCandidates = new Set(moveEntries.map(e => (e.candidate || "").trim().toLowerCase())).size;
  const moveAmountByCur = sumByCurrency(moveEntries, "amount");

  /* ── Laid Off and Default amounts for reconciliation.
     Both sheets come from the store with no month/year filter, so for
     the KPI strip we narrow them down to the currently-selected period
     (same scope as statsRows). The sheet pages themselves still show
     everything. */
  const monthScopeKpi = filters.month || "";
  const yearScopeKpi  = filters.year  ? String(filters.year) : "";
  const laidOffRowsInPeriod    = laidOffRows.filter(e => entryMatchesPeriod(e, monthScopeKpi, yearScopeKpi));
  const defaulterRowsInPeriod  = defaulterRows.filter(e => entryMatchesPeriod(e, monthScopeKpi, yearScopeKpi));
  const laidOffAmountByCur = sumByCurrency(laidOffRowsInPeriod, "amount");
  const defaultAmountByCur = sumByCurrency(defaulterRowsInPeriod, "amount");

  const reconciliationByCur = {
    USD: totalPaidByCur.USD + totalDueByCur.USD + moveAmountByCur.USD + laidOffAmountByCur.USD + defaultAmountByCur.USD,
    GBP: totalPaidByCur.GBP + totalDueByCur.GBP + moveAmountByCur.GBP + laidOffAmountByCur.GBP + defaultAmountByCur.GBP,
  };
  const moveAmountUSD = moveAmountByCur.USD + moveAmountByCur.GBP * gbpToUsd;
  const laidOffAmountUSD = laidOffAmountByCur.USD + laidOffAmountByCur.GBP * gbpToUsd;
  const defaultAmountUSD = defaultAmountByCur.USD + defaultAmountByCur.GBP * gbpToUsd;
  const reconciliationUSD = reconciliationByCur.USD + reconciliationByCur.GBP * gbpToUsd;

  const placementReceivedByCur = sumByCurrency(
    statsRows.filter(e => e.status === "Received" && normalizeServiceTypeValue(e.serviceType) === "Placement"),
    "amount"
  );

  const placementPendingByCur = sumByCurrency(
    statsRows.filter(e => e.status === "Pending" && normalizeServiceTypeValue(e.serviceType) === "Placement"),
    "amount"
  );

  const newPlacementReceivedByCur = sumByCurrency(
    statsRows.filter(e => e.status === "Received" && normalizeServiceTypeValue(e.serviceType) === "New Placement"),
    "amount"
  );

  const newPlacementPendingByCur = sumByCurrency(
    statsRows.filter(e => e.status === "Pending" && normalizeServiceTypeValue(e.serviceType) === "New Placement"),
    "amount"
  );

  const placementReceivedUSD = placementReceivedByCur.USD + placementReceivedByCur.GBP * gbpToUsd;
  const newPlacementReceivedUSD = newPlacementReceivedByCur.USD + newPlacementReceivedByCur.GBP * gbpToUsd;

  const placementPendingUSD = placementPendingByCur.USD + placementPendingByCur.GBP * gbpToUsd;
  const newPlacementPendingUSD = newPlacementPendingByCur.USD + newPlacementPendingByCur.GBP * gbpToUsd;

  /* ── Delete with fade ── */
  const handleDelete = (id, candidateName) => {
    setDeleteConfirm({
      isOpen: true,
      title: "Delete payment entry?",
      message: `Are you sure you want to delete this payment entry for ${candidateName || "this candidate"}? This cannot be undone.`,
      onConfirm: async () => {
        setDeleteConfirm(prev => ({ ...prev, loading: true }));
        setDeleteConfirm({ isOpen: false, title: "", message: "", onConfirm: null, loading: false });
        setFadingIds(prev => new Set([...prev, id]));
        setTimeout(async () => {
          await deleteEntry(id);
          setFadingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        }, 200);
      },
    });
  };

  /* ── Excel Import ── */
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb   = XLSX.read(evt.target.result, { type: "array", cellDates: true });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const mapped = rows.map((r, i) => mapPaymentImportRow(r, i, XLSX.utils));
        importMappedRows(mapped, "Imported");
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

  const preparePastedRows = (text) => {
    if (!text.trim() || !text.includes("\t")) return false;
    const rowObjects = clipboardRowsToObjects(text);
    const mapped = rowObjects.map((row, i) => mapPaymentImportRow(row, i)).filter(Boolean);
    if (mapped.length) {
      setPasteImport({ rows: mapped });
      return true;
    }
    if (rowObjects.length) showToast("No valid payment rows found in clipboard");
    return false;
  };

  const handlePasteRows = (e) => {
    const text = e.clipboardData?.getData("text/plain") || "";
    if (preparePastedRows(text)) e.preventDefault();
  };

  const handlePasteButton = async () => {
    pasteTargetRef.current?.focus();
    if (!navigator?.clipboard?.readText) {
      showToast("Press Ctrl+V to paste copied Excel rows into Payment Calculation");
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (!preparePastedRows(text)) {
        showToast("Clipboard does not contain copied Excel rows");
      }
    } catch {
      showToast("Press Ctrl+V to paste copied Excel rows into Payment Calculation");
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
      Actual:                 parseFloat(e.actual) || 0,
      USD:                    parseFloat(e.amount) || 0,
      "Type of Service":      normalizeServiceTypeValue(e.serviceType),
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

  const handleRemarksClick = (entry) => {
    setEditingRemarks(entry.id);
    setRemarksDraft(entry.notes || "");
  };

  const handleRemarksBlur = async (entry) => {
    await updateEntry(entry.id, {
      notes: remarksDraft,
    });

    setEditingRemarks(null);
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
        paid: entry.status === "Received" ? val : (parseFloat(entry.paid) || 0),
        due:  entry.status === "Received" ? 0 : entry.status === "Pending" ? val : (parseFloat(entry.due) || 0),
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
    <div className="page-inner" ref={pasteTargetRef} onPaste={handlePasteRows} tabIndex={0} style={{ outline: "none" }}>
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
      <div className="kpi-strip-mobile">
        <div className="kpi-card" style={{ minWidth: 0, padding: "10px 12px" }}>
          <div className="kpi-label">Entries (this {filters.month || "month"})</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{statsRows.length}</div>
          <div className="kpi-sub">of {entries.length} total · showing {filtered.length} in table</div>
        </div>
        <div className="kpi-card" style={{ minWidth: 0, padding: "10px 12px" }}>
          <div className="kpi-label">Recurring Payment</div>
          <div className="kpi-value" style={{ color: "var(--mint)", fontSize: 18 }}>{fmtMoneyC(recurringPaymentUSD, "USD", 2)}</div>
          <div className="kpi-sub">across {recurringPlacementEntries.length} {recurringPlacementEntries.length === 1 ? "entry" : "entries"}</div>
        </div>
        <div className="kpi-card" style={{ minWidth: 0, padding: "10px 12px" }}>
          <div className="kpi-label">Received</div>
          <div className="kpi-value" style={{ color: "#4ade80", fontSize: 18 }}>{fmtMoneyC(totalPaidUSD, "USD", 2)}</div>
          <div className="kpi-sub">{totalValueUSD > 0 ? Math.round((totalPaidUSD / totalValueUSD) * 100) : 0}% received</div>
        </div>
        <div className="kpi-card" style={{ minWidth: 0, padding: "10px 12px" }}>
          <div className="kpi-label">Outstanding</div>
          <div className="kpi-value" style={{ color: "#fbbf24", fontSize: 18 }}>{fmtMoneyC(totalDueUSD, "USD", 2)}</div>
          <div className="kpi-sub">pending collection</div>
        </div>
        <div className="kpi-card" style={{ minWidth: 0, padding: "10px 12px", background: "#fff1f2", borderColor: "#fecaca" }}>
          <div className="kpi-label" style={{ color: "#b91c1c" }}>Move / Laid Off / Default (this {filters.month || "month"})</div>
          <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#991b1b" }}>Move</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#7f1d1d", fontVariantNumeric: "tabular-nums" }}>{fmtMoneyC(moveAmountUSD, "USD", 2)}</span>
            </div>
            <div style={{ height: 1, background: "#fecaca" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#991b1b" }}>Laid Off</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#7f1d1d", fontVariantNumeric: "tabular-nums" }}>{fmtMoneyC(laidOffAmountUSD, "USD", 2)}</span>
            </div>
            <div style={{ height: 1, background: "#fecaca" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#991b1b" }}>Default</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#7f1d1d", fontVariantNumeric: "tabular-nums" }}>{fmtMoneyC(defaultAmountUSD, "USD", 2)}</span>
            </div>
          </div>
        </div>
        {/* <div className="kpi-card" style={{ background: "#f0f9ff", borderColor: "#bfdbfe" }}>
          <div className="kpi-label" style={{ color: "#2563eb" }}>Actual</div>
          <div className="kpi-value" style={{ color: "#1d4ed8", fontSize: 26 }}>{fmtMoneyC(totalActualUSD, "USD", 2)}</div>
          <div className="kpi-sub" style={{ color: "#2563eb" }}>current actual value</div>
        </div> */}
        <div className="kpi-card" style={{ minWidth: 0, padding: "10px 12px", background: "#ecfccb", borderColor: "#bbf7d0" }}>
          <div className="kpi-label" style={{ color: "#166534" }}>Reconciliation</div>
          <div className="kpi-value" style={{ color: "#15803d", fontSize: 18 }}>{fmtMoneyC(reconciliationUSD, "USD", 2)}</div>
          <div className="kpi-sub" style={{ color: "#166534" }}>Received + Outstanding + Moved + Laid Off + Default</div>
        </div>
        <div className="kpi-card" style={{ minWidth: 0, padding: "10px 12px", background: "#faf5ff", borderColor: "#ddd6fe" }}>
          <div className="kpi-label" style={{ color: "#5b21b6" }}>Placement</div>
          <div className="kpi-value" style={{ color: "#4c1d95", fontSize: 18 }}>{fmtMoneyC(placementReceivedUSD, "USD", 2)}</div>
          <div className="kpi-sub" style={{ color: "#5b21b6" }}>received amount</div>
          <hr />
          <div className="kpi-value" style={{ color: "#4c1d95", fontSize: 18 }}>{fmtMoneyC(placementPendingUSD, "USD", 2)}</div>
          <div className="kpi-sub" style={{ color: "#5b21b6" }}>pending amount</div>
        </div>
          <div className="kpi-card" style={{ minWidth: 0, padding: "10px 12px", background: "#eef2ff", borderColor: "#c7d2fe" }}>
          <div className="kpi-label" style={{ color: "#4338ca" }}>New Placement</div>
          <div className="kpi-value" style={{ color: "#312e81", fontSize: 18 }}><MoneyStack usd={newPlacementReceivedByCur.USD} gbp={newPlacementReceivedByCur.GBP} decimals={2} /></div>
          <div className="kpi-sub" style={{ color: "#4338ca" }}>received amount</div>
          <hr />
          <div className="kpi-value" style={{ color: "#312e81", fontSize: 18 }}><MoneyStack usd={newPlacementPendingByCur.USD} gbp={newPlacementPendingByCur.GBP} decimals={2} /></div>
          <div className="kpi-sub" style={{ color: "#4338ca" }}>pending amount</div>
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
          {selected.size > 0 && (
            <button className="btn-del" onClick={handleDeleteSelected} style={{ marginRight: 8 }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              </svg>
              Delete ({selected.size})
            </button>
          )}
          <label className="btn-icon" style={{ cursor: "pointer" }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import Excel
            <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleImport} />
          </label>
          <button className="btn-icon" onClick={handlePasteButton}>
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
            ["Total Value",  fmtMoneyC(candidateSummary.totalValue, candidateSummary.currency, 2)],
            ["Received",     fmtMoneyC(candidateSummary.totalPaid,  candidateSummary.currency, 2)],
            ["Outstanding",  fmtMoneyC(candidateSummary.totalDue,   candidateSummary.currency, 2)],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em" }}>{k}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)", fontVariantNumeric: "tabular-nums" }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar entries={entries} filters={filters} onFilterChange={setFilters} />

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
                <th style={{ width: 36, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={selected.size === sorted.length && sorted.length > 0}
                    onChange={e => toggleAll(e.target.checked)}
                    style={{ width: 14, height: 14, cursor: "pointer" }}
                  />
                </th>
                <th style={{ width: 36 }}>#</th>
                <th onClick={() => toggleSort("company")}>Company{sortIcon("company")}</th>
                <th onClick={() => toggleSort("candidate")}>Name of the Candidate{sortIcon("candidate")}</th>
                <th onClick={() => toggleSort("poDate")}>Date{sortIcon("poDate")}</th>
                <th onClick={() => toggleSort("month")}>Month{sortIcon("month")}</th>
                <th onClick={() => toggleSort("year")}>Year{sortIcon("year")}</th>
                <th onClick={() => toggleSort("instance")}>Instance of Payment{sortIcon("instance")}</th>
                {showActualColumn && (
                  <th>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowActualColumn(false);
                      }}
                      style={{
                        padding: "4px 8px",
                        fontSize: 11,
                        fontWeight: 700,
                        background: "#ffffff",
                        color: "#1f2937",
                        border: "1px solid #d1d5db",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                      title="Hide Actual column"
                    >
                      Actual {sortIcon("actual")}
                    </button>
                  </th>
                )}
                <th onClick={() => toggleSort("amount")}>
                  {!showActualColumn && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowActualColumn(true);
                      }}
                      style={{
                        marginRight: 8,
                        padding: "4px 8px",
                        fontSize: 11,
                        fontWeight: 700,
                        background: "#ffffff",
                        color: "#1f2937",
                        border: "1px solid #d1d5db",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                      title="Show Actual column"
                    >
                      Show Actual
                    </button>
                  )}
                  USD{sortIcon("amount")}
                </th>
                <th onClick={() => toggleSort("serviceType")}>Type of Service{sortIcon("serviceType")}</th>
                <th onClick={() => toggleSort("status")}>Status{sortIcon("status")}</th>
                <th onClick={() => toggleSort("type")}>Type{sortIcon("type")}</th>
                <th>Remarks</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((entry, idx) => {
                const actualValue = parseFloat(entry.actual) || 0;
                const usdValue = parseFloat(entry.amount) || 0;

                const isTerminalStatus = LAIDOFF_STATUSES.includes(entry.status) || entry.status === "Default";
                const rowBackground =
                  isTerminalStatus
                    ? "rgba(220, 38, 38, 0.18)"   // solid red — Laid Off / Default anchor row
                    : entry.status === "Move"
                      ? "rgba(248, 113, 113, 0.12)"
                      : selected.has(entry.id)
                        ? "var(--surface-2)"
                        : actualValue > usdValue
                          ? "rgba(248, 113, 113, 0.12)"
                          : actualValue < usdValue
                            ? "rgba(34, 197, 94, 0.12)"
                            : undefined;

                return (
                  <tr
                    key={entry.id}
                    style={{
                      opacity: fadingIds.has(entry.id) ? 0 : 1,
                      transition: "opacity 0.2s ease",
                      background: rowBackground,
                      ...(isTerminalStatus ? { borderLeft: "3px solid #dc2626" } : {}),
                    }}
                  >
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selected.has(entry.id)}
                        onChange={() => toggleRow(entry.id)}
                        style={{ width: 14, height: 14, cursor: "pointer" }}
                      />
                    </td>

                    <td style={{ color: "var(--text-dim)", fontSize: 11 }}>
                      {(page - 1) * pageSize + idx + 1}
                    </td>

                    <td
                      style={{
                        fontWeight: 500,
                        maxWidth: 160,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.company || "—"}
                    </td>

                    <td style={{ fontWeight: 600, color: "var(--mint)" }}>
                      {entry.candidate || "—"}
                    </td>

                    <td>
                      <DateInput
                        value={entry.poDate}
                        onChange={v => {
                          if (v !== entry.poDate)
                            updateEntry(entry.id, { poDate: v });
                        }}
                        className="tbl-input"
                        style={{ minWidth: 132 }}
                      />
                    </td>

                    <td style={{ color: "var(--text-muted)" }}>
                      {entry.month}
                    </td>

                    <td style={{ color: "var(--text-muted)" }}>
                      {entry.year}
                    </td>

                    <td>
                      <select
                        className="tbl-select"
                        value={entry.instance || "First Half"}
                        onChange={e =>
                          updateEntry(entry.id, { instance: e.target.value })
                        }
                      >
                        {INSTANCE_OPTIONS.map(o => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </td>

                    {showActualColumn && (
                      <td>
                        {editingActual === entry.id ? (
                          <input
                            className="inline-cell-input"
                            value={actualDraft}
                            onChange={(e) => setActualDraft(e.target.value)}
                            onBlur={() => handleActualBlur(entry)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleActualBlur(entry);
                              }
                            }}
                            autoFocus
                            style={{
                              minWidth: 100,
                              textAlign: "right",
                            }}
                          />
                        ) : (
                          <span
                            onClick={() => handleActualClick(entry)}
                            style={{
                              cursor: "pointer",
                              fontWeight: 600,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {fmtMoneyC(
                              entry.actual ?? 0,
                              currencyOf(entry),
                              2
                            )}
                          </span>
                        )}
                      </td>
                    )}

                    <td>
                      {/* USD column */}
                      {editingUSD === entry.id ? (
                        <input
                          className="inline-cell-input"
                          value={usdDraft}
                          onChange={e => setUSDDraft(e.target.value)}
                          onBlur={() => handleUSDBlur(entry)}
                          onKeyDown={e => { if (e.key === "Enter") handleUSDBlur(entry); }}
                          autoFocus
                          style={{ minWidth: 100 }}
                        />
                      ) : (
                        <span
                          onClick={() => handleUSDClick(entry)}
                          style={{ fontVariantNumeric: "tabular-nums", cursor: "pointer", color: "var(--text-main)", fontWeight: 700 }}
                        >
                          {fmtMoneyC(entry.amount, currencyOf(entry), 2)}
                        </span>
                      )}
                    </td>

                    <td>
                      {/* Service Type */}
                      <input
                        list="svc-type-options"
                        className="tbl-input"
                        value={entry.serviceType || ""}
                        onChange={e => updateEntry(entry.id, { serviceType: e.target.value })}
                        style={{ minWidth: 120 }}
                      />
                    </td>

                    <td>
                      {/* Status */}
                      <select
                        className="tbl-select"
                        value={entry.status || ""}
                        onChange={e => handleStatusChange(entry, e.target.value)}
                      >
                        {PAYMENT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>

                    <td
                      style={{
                        color: "var(--text-dim)",
                        fontSize: 12,
                        maxWidth: 120,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.type || "—"}
                    </td>

                    <td
                      style={{
                        maxWidth: 260,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {editingRemarks === entry.id ? (
                        <input
                          className="inline-cell-input"
                          value={remarksDraft}
                          onChange={(e) => setRemarksDraft(e.target.value)}
                          onBlur={() => handleRemarksBlur(entry)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleRemarksBlur(entry);
                            }
                          }}
                          autoFocus
                          style={{ minWidth: 220 }}
                        />
                      ) : (
                        <span
                          onClick={() => handleRemarksClick(entry)}
                          style={{
                            cursor: "pointer",
                            display: "inline-block",
                            width: "100%",
                          }}
                        >
                          {entry.notes || "—"}
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn-icon"
                        title="Delete entry"
                        onClick={() => handleDelete(entry.id, entry.candidate)}
                        style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 16 }}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <PaginationControls
            total={sorted.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
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
                        <td style={{ fontWeight:600 }}>{fmtMoneyC(row.amount, currencyOf(row), 2)}</td>
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

      {pendingMove && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && handleMoveCancel()}>
          <div style={{ background:"var(--color-surface)", borderRadius:"var(--r-lg)", width:"100%", maxWidth:420, boxShadow:"0 24px 70px rgba(0,0,0,.22)", overflow:"hidden", border:"1px solid var(--color-border)" }}>
            <div style={{ padding:"18px 22px", borderBottom:"1px solid var(--color-border)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:"var(--color-ink)" }}>Move payment entry</div>
                <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:3 }}>
                  Select the starting date for this entry and later rows will be assigned sequential dates.
                </div>
              </div>
              <button className="modal-close" onClick={handleMoveCancel} style={{ fontSize:20, lineHeight:1 }}>x</button>
            </div>
            <div style={{ padding:22, display:"grid", gap:14 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label htmlFor="move-date" style={{ fontSize:13, fontWeight:600, color:"var(--text-dim)" }}>Start Date</label>
                <input
                  id="move-date"
                  type="date"
                  value={moveDateIso}
                  onChange={e => { setMoveDateIso(e.target.value); setMoveError(""); }}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:"1px solid var(--border)", fontSize:14 }}
                />
              </div>
              {moveError && (
                <div style={{ color:"#dc2626", fontSize:13, fontWeight:600 }}>{moveError}</div>
              )}
              <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
                <button className="btn-ghost" onClick={handleMoveCancel} style={{ padding:"8px 14px" }}>
                  Cancel
                </button>
                <button className="btn-icon" onClick={handleMoveConfirm} style={{ padding:"8px 14px" }}>
                  Confirm Move
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showQuickEntry && <QuickEntryModal onClose={() => setShowQuickEntry(false)} />}

      <DeleteConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        onConfirm={deleteConfirm.onConfirm}
        onCancel={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
        loading={deleteConfirm.loading}
        loadingText={deleteConfirm.loadingText || "Deleting..."}
      />
    </div>
  );
}
