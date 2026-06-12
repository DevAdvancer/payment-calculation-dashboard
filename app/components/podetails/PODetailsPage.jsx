"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import useDashboardStore, { fmtMoney, fmtMoneyC, fmtDate, fmtEmailDate, MONTH_NAMES, currencyOf, currencySymbol, sumByCurrency } from "../../../lib/use-store";
import MoneyStack from "../MoneyStack";
import DateInput from "../DateInput";
import PaginationControls from "../PaginationControls";
import DeleteConfirmModal from "../DeleteConfirmModal";
import { normalizeCompanyName } from "../../../lib/company-utils";
import { normalizePaymentStatus } from "../../../lib/status-utils";
import { isPoDetailsEntry } from "../../../lib/po-details-utils";

/* ─── Placement form constants (mirrors NewPlacementPage) ─── */
const COMPANY_OPTIONS = [
  { value: "SST",         label: "SST (SilverSpace Inc)" },
  { value: "Vizva",       label: "Vizva (Vizva Inc)" },
  { value: "Vizva-UK",    label: "Vizva-UK (Vizva UK Ltd)" },
  { value: "Flawless-ED", label: "Flawless-ED" },
];

function getOfficialName(val) {
  if (val === "SST")      return "SilverSpace Inc";
  if (val === "Vizva")    return "Vizva Inc";
  if (val === "Vizva-UK") return "Vizva UK Ltd";
  return val;
}
const LOCATION_OPTIONS_PLACE = ["Gurugram", "Ahmedabad", "Lucknow"];
const AGREEMENT_OPTIONS = [
  { value: "14|5",   label: "14% in 5 Months" },
  { value: "12|4",   label: "12% in 4 Months" },
  { value: "11|3",   label: "11% in 3 Months" },
  { value: "10|3",   label: "10% in 3 Months" },
  { value: "custom", label: "— Custom Agreement —" },
];
const EMPTY_FORM = {
  candidateName: "", clientName: "", companyGroup: "SST",
  agreement: "14|5", customPct: "", customMonths: "",
  payStructure: "annual", annualSalary: "", hourlyRate: "", totalHours: "",
  dateOfJoining: "", manualPayStart: "", upfront: "1500", nrUpfront: "0",
  signupDate: "", placedDate: "", closedBy: "", placedBy: "", reference: "", location: "Gurugram",
};

function parseAgreement(agreement, customPct, customMonths) {
  if (agreement === "custom") return { pct: parseFloat(customPct) || 0, months: parseInt(customMonths) || 1 };
  const [p, m] = agreement.split("|").map(Number);
  return { pct: p || 0, months: m || 1 };
}
function toMMDDYYYY(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}-${d.getFullYear()}`;
}
function parseLocalDate(str) {
  if (!str) return null;
  str = String(str).trim();
  const mdy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy)  return new Date(+mdy[3], +mdy[1]-1, +mdy[2]);
  const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd)  return new Date(+ymd[1], +ymd[2]-1, +ymd[3]);
  return null;
}
function normalizeFormDate(str) {
  if (!str) return "";
  const d = parseLocalDate(str);
  return d ? toMMDDYYYY(d) : str;
}
function snapDate(d) {
  const day = d.getDate();
  if (day <= 7) d.setDate(7);
  else if (day <= 15) d.setDate(15);
  else if (day <= 21) d.setDate(21);
  else { d.setMonth(d.getMonth()+1); d.setDate(7); }
  return d;
}

/* ─── PO Details table columns ─── */
const COLS = [
  { key:"company",    label:"Company" },
  { key:"signupDate", label:"Signup Date" },
  { key:"placedDate", label:"Placed Date" },
  { key:"candidate",  label:"Name" },
  { key:"closedBy",   label:"Closed By" },
  { key:"reference",  label:"Reference" },
  { key:"placedBy",   label:"Placed By" },
  { key:"location",   label:"Location" },
  { key:"poDate",     label:"DOJ" },
  { key:"amount",     label:"Salary" },
  { key:"agreement",  label:"Agrmt" },
  { key:"totalAmt",   label:"Total" },
  { key:"monthly",    label:"Monthly" },
  { key:"balance",    label:"Balance" },
];
const COMPANY_OPTIONS_TABLE = ["Vizva", "Vizva Inc", "Vizva-UK", "Vizva UK Ltd", "SilverSpace", "SilverSpace Inc", "SST", "Flawless", "Flawless-ED"];
const LOCATION_OPTIONS = ["Gurugram", "Ahmedabad", "Lucknow"];
const PO_IMPORT_HEADERS = [
  "Company", "Signup Date", "Placed Date", "Name", "Closed By", "Reference", "Placed By",
  "Location", "DOJ", "Salary", "Agrmt", "Total", "Monthly", "Balance",
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

function normalizeDateCell(value, utils) {
  if (value == null || value === "") return "";
  if (value instanceof Date && !isNaN(value.getTime())) return toMMDDYYYY(value);
  if (typeof value === "number" && utils?.SSF?.parse_date_code) {
    const parsed = utils.SSF.parse_date_code(value);
    if (parsed) return toMMDDYYYY(new Date(parsed.y, parsed.m - 1, parsed.d));
  }
  return normalizeFormDate(String(value).trim());
}

function agreementInfo(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/(\d+(?:\.\d+)?)\s*%?.*?(\d+)\s*(?:mo|month|months)?/i);
  if (!match) return { raw, pct: 0, months: 0, type: raw };
  const pct = parseFloat(match[1]) || 0;
  const months = parseInt(match[2], 10) || 0;
  return { raw, pct, months, type: pct && months ? `${pct}% in ${months} months` : raw };
}

function poDateParts(poDate) {
  const d = parseLocalDate(poDate);
  if (!d) return { month: "", year: "", instance: "First Half" };
  return {
    month: MONTH_NAMES[d.getMonth()],
    year: String(d.getFullYear()),
    instance: d.getDate() <= 15 ? "First Half" : "Second Half",
  };
}

function normalizeInstance(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "second half" || raw === "second" || raw === "2nd half" || raw === "2") return "Second Half";
  return "First Half";
}

function normalizeStatus(value) {
  return normalizePaymentStatus(value);
}

function rowLooksEmpty(row) {
  return !Object.values(row || {}).some(v => String(v ?? "").trim() !== "");
}

function mapPoImportRow(row, index, utils) {
  const candidate = String(getCell(row, ["Name", "Name of the Candidate", "Candidate Name", "CandidateName", "Candidate", "candidate"]) || "").trim();
  if (!candidate) return null;

  const company = normalizeCompanyName(getCell(row, ["Company", "company"]));
  const agreement = agreementInfo(getCell(row, ["Agrmt", "Agreement", "Type", "agreement", "type"]));
  const salary = parseMoney(getCell(row, ["Salary", "Annual Salary", "Annual Package", "salary"]));
  const importedTotal = parseMoney(getCell(row, ["Total", "Total Contract", "Total Amount", "Contract Value", "totalAmt"]));
  const importedAmount = parseMoney(getCell(row, ["Amount", "USD", "GBP", "amount"]));
  const total = importedTotal || (salary && agreement.pct ? salary * (agreement.pct / 100) : 0) || importedAmount;
  const importedBalance = parseMoney(getCell(row, ["Balance", "Due", "Outstanding", "balance", "due"]));
  const importedPaid = parseMoney(getCell(row, ["Paid", "paid"]));
  const balance = importedBalance || Math.max(0, total - importedPaid) || total;
  const paid = importedPaid || Math.max(0, total - balance);
  const poDate = normalizeDateCell(getCell(row, ["DOJ", "Date of Joining", "PO Date", "Date", "poDate"]), utils);
  const dateParts = poDateParts(poDate);
  const currency = String(getCell(row, ["Currency", "currency"]) || "").toUpperCase();

  return {
    id: String(Date.now() + index),
    candidate,
    client: String(getCell(row, ["Client", "client"]) || "").trim(),
    company,
    signupDate: normalizeDateCell(getCell(row, ["Signup Date", "signupDate"]), utils),
    placedDate: normalizeDateCell(getCell(row, ["Placed Date", "placedDate"]), utils),
    closedBy: String(getCell(row, ["Closed By", "closedBy"]) || "").trim(),
    reference: String(getCell(row, ["Reference", "reference"]) || "").trim(),
    placedBy: String(getCell(row, ["Placed By", "placedBy"]) || "").trim(),
    location: String(getCell(row, ["Location", "location"]) || "").trim(),
    poDate,
    month: String(getCell(row, ["Month", "month"]) || dateParts.month || "").trim(),
    year: String(getCell(row, ["Year", "year"]) || dateParts.year || "").trim(),
    instance: normalizeInstance(getCell(row, ["Instance of Payment", "Instance", "instance"]) || dateParts.instance),
    amount: total,
    paid,
    due: balance,
    serviceType: String(getCell(row, ["Type of Service", "Service Type", "serviceType"]) || "Placement").trim(),
    status: normalizeStatus(getCell(row, ["Status", "status"])),
    type: agreement.type,
    notes: String(getCell(row, ["Remarks", "Notes", "notes"]) || "").trim(),
    poNum: String(getCell(row, ["PO#", "PO Num", "poNum"]) || "").trim(),
    currency: currency === "GBP" || currency === "USD" ? currency : undefined,
    sheetScope: "po-details",
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
  const known = [
    ...PO_IMPORT_HEADERS,
    "Candidate", "Name", "Candidate Name", "CandidateName",
    "DOJ", "Date of Joining", "doj", "dateofjoining", "PO Date", "poDate", "Date",
    "Salary", "Annual Salary", "Annual Package", "salary",
    "Total Contract", "Total Amount", "Contract Value", "totalAmt",
    "Agrmt", "Agreement", "Type", "agreement", "type",
    "Remarks", "Notes", "notes"
  ].map(cleanHeader);
  const hasHeader = first.some(h => known.includes(h) || ["candidate", "nameofcandidate", "dateofjoining"].includes(h));
  const headers = hasHeader ? table[0] : PO_IMPORT_HEADERS;
  const rows = hasHeader ? table.slice(1) : table;

  return rows.map(cells => {
    const row = {};
    headers.forEach((header, i) => { row[header] = cells[i] ?? ""; });
    return row;
  }).filter(row => !rowLooksEmpty(row));
}

export default function PODetailsPage() {
  const entries         = useDashboardStore((s) => s.entries);
  const updateEntry     = useDashboardStore((s) => s.updateEntry);
  const deleteEntry     = useDashboardStore((s) => s.deleteEntry);
  const bulkDelete      = useDashboardStore((s) => s.bulkDelete);
  const importEntries   = useDashboardStore((s) => s.importEntries);
  const bulkCreate      = useDashboardStore((s) => s.bulkCreate);
  const showToast       = useDashboardStore((s) => s.showToast);
  const navigate        = useDashboardStore((s) => s.navigate);
  const setLastDashboard = useDashboardStore((s) => s.setLastDashboard);

  const [sort, setSort]       = useState({ key:"candidate", dir:"asc" });
  const [search, setSearch]   = useState("");
  const [poFilters, setPoFilters] = useState({ company: "", month: "", year: "" });
  const [selected, setSelected] = useState(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    loading: false,
  });
  const [editingId, setEditingId] = useState(null);
  const [editBuf, setEditBuf]   = useState({});
  const [showModal, setShowModal] = useState(false);
  const [pasteImport, setPasteImport] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const fileRef = useRef();
  const pasteTargetRef = useRef();

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, poFilters]);

  useEffect(() => {
    setSelected(new Set());
  }, [page, pageSize]);



  /* ── Placement form state (inside modal) ── */
  const [form, setFormState] = useState(EMPTY_FORM);
  const [step, setStep]      = useState(1);
  const [saving, setSaving]  = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const setF = (k, v) => {
    setFormState(f => ({ ...f, [k]: v }));
    if (formErrors[k]) setFormErrors(e => ({ ...e, [k]: "" }));
  };

  const openModal = () => {
    setFormState(EMPTY_FORM);
    setStep(1);
    setFormErrors({});
    setShowModal(true);
  };
  const closeModal = () => setShowModal(false);

  const poEntries = useMemo(
    () => entries.filter(isPoDetailsEntry),
    [entries]
  );
  const filterOptions = useMemo(() => ({
    companies: [...new Set(poEntries.map(e => e.company).filter(Boolean))].sort(),
    months: [...new Set(poEntries.map(e => e.month).filter(Boolean))]
      .sort((a, b) => MONTH_NAMES.indexOf(a) - MONTH_NAMES.indexOf(b)),
    years: [...new Set(poEntries.map(e => e.year).filter(Boolean))].sort((a, b) => Number(b) - Number(a)),
  }), [poEntries]);

  const { pct, months } = parseAgreement(form.agreement, form.customPct, form.customMonths);
  const totalSalary = form.payStructure === "annual"
    ? parseFloat(form.annualSalary) || 0
    : (parseFloat(form.hourlyRate)||0) * (parseFloat(form.totalHours)||0);
  const totalContractValue = totalSalary * (pct / 100);
  const isUK              = form.companyGroup === "Vizva-UK";
  const upfrontFirst      = isUK ? 0 : 1500;
  const monthlyAmt        = months > 0 ? (totalContractValue - upfrontFirst) / months : 0;
  const nrUpfront         = parseFloat(form.nrUpfront) || 0;
  const currency          = currencyOf(form.companyGroup);
  const cSym              = currencySymbol(currency);

  const computeInstallments = () => {
    if (!totalContractValue) return [];

    /* First-payment date: DOJ → manual → today+45 (snapped to next 7/15/21) */
    let firstPaymentDate;
    if (form.dateOfJoining) {
      firstPaymentDate = parseLocalDate(form.dateOfJoining);
    } else if (form.manualPayStart) {
      firstPaymentDate = parseLocalDate(form.manualPayStart);
    } else {
      firstPaymentDate = new Date();
      firstPaymentDate.setDate(firstPaymentDate.getDate() + 45);
      snapDate(firstPaymentDate);
    }

    const instAmt   = (totalContractValue - upfrontFirst) / months;
    const typeLabel = `${pct}% in ${months} months`;
    const FIRST_SERVICE_TYPE = "Placement";
    const REST_SERVICE_TYPE  = "Payment Collection";
    const now = Date.now();
    const installments = [];

    /* USA: push the $1,500 upfront First Installment row.
       UK : skip — all installments are equal monthly. */
    if (!isUK) {
      installments.push({
        id: String(now + 1),
        candidate: form.candidateName, client: form.clientName, company: getOfficialName(form.companyGroup),
        poDate: toMMDDYYYY(firstPaymentDate),
        month: MONTH_NAMES[firstPaymentDate.getMonth()], year: String(firstPaymentDate.getFullYear()),
        instance: firstPaymentDate.getDate() <= 15 ? "First Half" : "Second Half",
        amount: 1500, paid: 0, due: 1500, status: "Pending",
        serviceType: FIRST_SERVICE_TYPE, type: typeLabel,
        notes: nrUpfront > 0 ? `${cSym}${nrUpfront.toLocaleString()} (NR)` : "Non Upfront",
        signupDate: form.signupDate, placedDate: form.placedDate,
        closedBy: form.closedBy, placedBy: form.placedBy,
        reference: form.reference, location: form.location,
      });
    }

    /* runDate for the equal monthly installments. UK starts on the
       firstPaymentDate; USA starts the month after. */
    let runDate;
    if (isUK) {
      runDate = new Date(firstPaymentDate);
    } else if (form.dateOfJoining) {
      runDate = parseLocalDate(form.dateOfJoining);
      runDate.setMonth(runDate.getMonth() + 1);
    } else if (form.manualPayStart) {
      runDate = parseLocalDate(form.manualPayStart);
    } else {
      runDate = new Date(firstPaymentDate);
      runDate.setMonth(runDate.getMonth() + 1);
    }

    for (let i = 0; i < months; i++) {
      if (!(isUK && i === 0)) snapDate(runDate);
      installments.push({
        id: String(now + 100 + i),
        candidate: form.candidateName, client: form.clientName, company: getOfficialName(form.companyGroup),
        poDate: toMMDDYYYY(new Date(runDate)), month: MONTH_NAMES[runDate.getMonth()], year: String(runDate.getFullYear()),
        instance: runDate.getDate() <= 15 ? "First Half" : "Second Half",
        amount: parseFloat(instAmt.toFixed(2)), paid: 0, due: parseFloat(instAmt.toFixed(2)),
        status: "Pending",
        serviceType: (isUK && i === 0) ? FIRST_SERVICE_TYPE : REST_SERVICE_TYPE,
        type: typeLabel,
        notes: (isUK && i === 0 && nrUpfront > 0)
                 ? `${cSym}${nrUpfront.toLocaleString()} (NR)`
                 : `Installment ${i+1}`,
        signupDate: form.signupDate, placedDate: form.placedDate,
        closedBy: form.closedBy, placedBy: form.placedBy,
        reference: form.reference, location: form.location,
      });
      runDate.setMonth(runDate.getMonth() + 1);
    }
    return installments;
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.candidateName.trim()) e.candidateName = "Required";
    if (!form.clientName.trim())    e.clientName    = "Required";
    if (form.dateOfJoining && !parseLocalDate(form.dateOfJoining)) e.dateOfJoining = "Use MM/DD/YYYY";
    if (form.payStructure === "annual" && !form.annualSalary) e.annualSalary = "Required";
    if (form.payStructure === "hourly" && !form.hourlyRate)   e.hourlyRate   = "Required";
    if (form.payStructure === "hourly" && !form.totalHours)   e.totalHours   = "Required";
    if (form.agreement === "custom" && (!form.customPct || pct <= 0))       e.customPct    = "Required";
    if (form.agreement === "custom" && (!form.customMonths || months <= 0)) e.customMonths = "Required";
    return e;
  };

  const handleNext = () => {
    const e = validateStep1();
    if (Object.keys(e).length) { setFormErrors(e); return; }
    setStep(2);
  };

  const handleSubmitPlacement = async () => {
    const e = validateStep1();
    if (Object.keys(e).length) { setFormErrors(e); setStep(1); return; }
    const installments = computeInstallments();
    if (!installments.length) { showToast("Could not compute installments — check your inputs"); return; }
    setSaving(true);
    try {
      await bulkCreate(installments);
      closeModal();
    } catch {
      showToast("Failed to save entries");
    }
    setSaving(false);
  };

  /* ─── Table logic ─── */
  const rows = useMemo(() => {
    /* Group all installments by candidate */
    const groups = new Map();
    poEntries.forEach(e => {
      const key = (e.candidate || "").trim().toLowerCase();
      if (!key) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    });

    /* Build one aggregated row per candidate, deriving Salary / Agrmt /
       Total / Monthly / Upfront / Balance from the installment entries. */
    const dateMs = (s) => {
      const m = String(s || "").match(/^(\d{2})-(\d{2})-(\d{4})$/);
      return m ? new Date(+m[3], +m[1] - 1, +m[2]).getTime() : 0;
    };

    const aggregated = Array.from(groups.values()).map(group => {
      const sorted = [...group].sort((a, b) => dateMs(a.poDate) - dateMs(b.poDate));
      const first  = sorted[0];

      /* Master-sheet metadata: take the first non-empty value across installments */
      const pick = (k) => sorted.map(e => e[k]).find(v => v != null && v !== "") ?? "";

      /* Parse "14% in 5 months" from the type field */
      const typeStr = pick("type");
      const m       = String(typeStr).match(/(\d+(?:\.\d+)?)%.*?(\d+)\s*month/i);
      const pct     = m ? parseFloat(m[1]) : 0;
      const months  = m ? parseInt(m[2])   : 0;

      const totalAmt = sorted.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
      const totalDue = sorted.reduce((s, e) => s + (parseFloat(e.due)    || 0), 0);
      const balance  = totalDue;                                  // outstanding across all installments
      const cur      = currencyOf(first.company);
      const isUK     = cur === "GBP";
      /* UK has no $1,500 upfront, so monthly = total / months.
         USA monthly = (total - 1500) / months. */
      const monthly  = months > 0
        ? Math.max(0, totalAmt - (isUK ? 0 : 1500)) / months
        : 0;
      const salary   = pct > 0 ? totalAmt / (pct / 100) : 0;
      const agrmt    = pct > 0 && months > 0 ? `${pct}% / ${months}mo` : (typeStr || "");

      return {
        id:         first.id,
        candidate:  first.candidate,
        client:     first.client,
        company:    first.company,
        currency:   cur,
        poDate:     first.poDate,                              // DOJ
        month:      pick("month"),
        year:       pick("year"),
        signupDate: pick("signupDate"),
        placedDate: pick("placedDate"),
        closedBy:   pick("closedBy"),
        reference:  pick("reference"),
        placedBy:   pick("placedBy"),
        location:   pick("location"),
        amount:     salary,                                    // Salary column
        agreement:  agrmt,
        totalAmt,
        monthly,
        balance,
      };
    });

    let arr = aggregated;
    if (poFilters.company) arr = arr.filter(r => r.company === poFilters.company);
    if (poFilters.month) arr = arr.filter(r => r.month === poFilters.month);
    if (poFilters.year) arr = arr.filter(r => String(r.year) === String(poFilters.year));
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(r =>
        (r.candidate || "").toLowerCase().includes(q) ||
        (r.company   || "").toLowerCase().includes(q) ||
        (r.closedBy  || "").toLowerCase().includes(q)
      );
    }
    arr.sort((a, b) => {
      const av = String(a[sort.key] || "").toLowerCase();
      const bv = String(b[sort.key] || "").toLowerCase();
      return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return arr;
  }, [poEntries, sort, search, poFilters]);

  const paginatedRows = useMemo(() => {
    return rows.slice((page - 1) * pageSize, page * pageSize);
  }, [rows, page, pageSize]);

  const toggleSort = (key) => setSort(s => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));
  const toggleAll  = (checked) => setSelected(checked ? new Set(rows.map(r => r.id)) : new Set());
  const toggleRow  = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const startEdit  = (row) => { setEditingId(row.id); setEditBuf({ ...row }); };
  const cancelEdit = () => { setEditingId(null); setEditBuf({}); };
  const saveEdit   = async () => {
    if (!editingId) return;
    const patch = { ...editBuf };
    await updateEntry(editingId, patch);
    setEditingId(null); setEditBuf({});
  };

  /* Delete every installment belonging to one candidate (an entire PO Details row) */
  const handleDeleteRow = (row) => {
    const sameCandidate = (e) =>
      (e.candidate || "").trim().toLowerCase() === (row.candidate || "").trim().toLowerCase();
    const candidateEntries = poEntries.filter(sameCandidate);
    const count = candidateEntries.length;
    if (!count) return;

    setDeleteConfirm({
      isOpen: true,
      title: `Delete ${row.candidate}?`,
      message: `Delete ${row.candidate} and all ${count} installment${count === 1 ? "" : "s"}?\n\nThis will permanently remove every payment entry for this candidate from PO Details, Payment Calculation, and any routed sheets. This cannot be undone.`,
      onConfirm: async () => {
        setDeleteConfirm(prev => ({ ...prev, loading: true }));
        const ok = await bulkDelete(candidateEntries.map(e => e.id));
        if (ok) {
          showToast(`✓ Deleted ${row.candidate} (${count} ${count === 1 ? "entry" : "entries"})`);
        }
        setDeleteConfirm({ isOpen: false, title: "", message: "", onConfirm: null, loading: false });
      },
    });
  };

  const handleDeleteSelected = () => {
    if (!selected.size) return;
    const selectedRows = rows.filter(r => selected.has(r.id));
    if (!selectedRows.length) return;

    const sameAs = (row) => (e) =>
      (e.candidate || "").trim().toLowerCase() === (row.candidate || "").trim().toLowerCase();

    let totalEntries = 0;
    const toDelete = [];
    for (const row of selectedRows) {
      const matches = poEntries.filter(sameAs(row));
      totalEntries += matches.length;
      toDelete.push(...matches);
    }

    const candidateLabel = selectedRows.length === 1
      ? selectedRows[0].candidate
      : `${selectedRows.length} candidates`;

    setDeleteConfirm({
      isOpen: true,
      title: `Delete ${candidateLabel}?`,
      message: `Delete ${candidateLabel} and all ${totalEntries} installment${totalEntries === 1 ? "" : "s"}?\n\nThis will permanently remove every payment entry for ${selectedRows.length === 1 ? "this candidate" : "these candidates"} from PO Details, Payment Calculation, and any routed sheets. This cannot be undone.`,
      onConfirm: async () => {
        setDeleteConfirm(prev => ({ ...prev, loading: true }));
        const ok = await bulkDelete(toDelete.map(e => e.id));
        if (ok) {
          setSelected(new Set());
          showToast(`✓ Deleted ${selectedRows.length} ${selectedRows.length === 1 ? "candidate" : "candidates"} (${totalEntries} entries)`);
        }
        setDeleteConfirm({ isOpen: false, title: "", message: "", onConfirm: null, loading: false });
      },
    });
  };

  const importMappedRows = async (mapped, label = "Imported") => {
    const valid = mapped.filter(Boolean);
    if (!valid.length) {
      showToast("No valid PO rows found to import");
      return false;
    }
    const ok = await importEntries(valid);
    if (ok !== false) showToast(`${label} ${valid.length} PO row${valid.length === 1 ? "" : "s"}`);
    return ok;
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    import("xlsx").then(({ read, utils }) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const wb   = read(ev.target.result, { type:"array", cellDates:true });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const data = utils.sheet_to_json(ws, { defval:"" });
          const mapped = data.map((row, i) => mapPoImportRow(row, i, utils));
          importMappedRows(mapped);
        } catch {
          showToast("Import failed - invalid Excel file");
        }
      };
      reader.readAsArrayBuffer(file);
    });
    e.target.value = "";
  };

  const handlePasteRows = (e) => {
    const target = e.target;
    if (target?.closest?.("input, textarea, select, [contenteditable='true']")) return;

    const text = e.clipboardData?.getData("text/plain") || "";
    if (!text.trim() || !text.includes("\t")) return;

    const rowObjects = clipboardRowsToObjects(text);
    const mapped = rowObjects.map((row, i) => mapPoImportRow(row, i)).filter(Boolean);
    if (mapped.length) {
      e.preventDefault();
      setPasteImport({ rows: mapped });
    } else if (rowObjects.length) {
      e.preventDefault();
      showToast("No valid PO rows found in clipboard");
    }
  };

  const confirmPasteImport = async () => {
    if (!pasteImport?.rows?.length) return;
    const rowsToImport = pasteImport.rows;
    setPasteImport(null);
    await importMappedRows(rowsToImport, "Pasted");
  };

  const handleViewCandidate = (row) => {
    const candidateEntries = poEntries.filter(e =>
      (e.candidate || "").trim().toLowerCase() === (row.candidate || "").trim().toLowerCase()
    );
    if (!candidateEntries.length) { showToast("No entries found for this candidate"); return; }

    const first = candidateEntries[0];
    const totalContractValue = candidateEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const typeStr  = first.type || "";
    const typeMatch = typeStr.match(/(\d+)%.*?(\d+)\s*month/i);
    const pct      = typeMatch ? parseInt(typeMatch[1]) : 0;
    const months   = typeMatch ? parseInt(typeMatch[2]) : 0;
    const cur      = currencyOf(first.company);
    const isUK     = cur === "GBP";
    const monthlyAmt = months > 0 ? (totalContractValue - (isUK ? 0 : 1500)) / months : 0;
    /* NR can be in £ or $; strip both when reading */
    const nrMatch  = (first.notes || "").match(/[\$£]([0-9,]+)\s*\(NR\)/);
    const nrUpfront = nrMatch ? parseInt(nrMatch[1].replace(/,/g, "")) : 0;

    const rows = candidateEntries.map((e, i) => ({
      label:  i === 0 ? "First Installment" : fmtEmailDate(e.poDate),
      amount: parseFloat(e.amount) || 0,
    }));

    const COMPANY_LABELS = { SST: "SST (SilverSpace Inc)", Vizva: "Vizva (Vizva Inc)", "Vizva-UK": "Vizva-UK (Vizva UK Ltd)", "Flawless-ED": "Flawless-ED" };

    const totalSalary = pct > 0 ? totalContractValue / (pct / 100) : 0;

    setLastDashboard({
      name:               first.candidate,
      client:             first.client || "—",
      company:            COMPANY_LABELS[first.company] || first.company || "—",
      currency:           cur,
      isUK,
      totalSalary,
      totalContractValue,
      monthlyAmt,
      upfront:            isUK ? 0 : 1500,
      nrUpfront,
      pct,
      months,
      rows,
      installments:       candidateEntries,
    });
    navigate("dashboard");
  };

  const handleExport = () => {
    import("xlsx").then(({ utils, writeFile }) => {
      const data = rows.map(r => ({
        "Company":     r.company    || "",
        "Signup Date": r.signupDate || "",
        "Placed Date": r.placedDate || "",
        "Name":        r.candidate  || "",
        "Closed By":   r.closedBy   || "",
        "Reference":   r.reference  || "",
        "Placed By":   r.placedBy   || "",
        "Location":    r.location   || "",
        "DOJ":         r.poDate     || "",
        "Salary":      r.amount     || "",
        "Agrmt":       r.agreement  || "",
        "Total":       r.totalAmt   || "",
        "Monthly":     r.monthly    || "",
        "Balance":     r.balance    || "",
      }));
      const ws = utils.json_to_sheet(data);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "PO Details");
      writeFile(wb, "po-details.xlsx");
    });
  };

  const sortIcon = (key) => sort.key === key ? (sort.dir === "asc" ? " ↑" : " ↓") : null;

  /* ── Filter-aware summary metrics, split by currency for stacked KPIs ── */
  const summary = useMemo(() => {
    const acc = {
      totalValue: { USD: 0, GBP: 0 },
      totalPaid:  { USD: 0, GBP: 0 },
      totalBal:   { USD: 0, GBP: 0 },
    };
    for (const r of rows) {
      const cur = r.currency || currencyOf(r.company);
      const tv  = parseFloat(r.totalAmt) || 0;
      const tb  = parseFloat(r.balance)  || 0;
      acc.totalValue[cur] += tv;
      acc.totalBal[cur]   += tb;
      acc.totalPaid[cur]  += (tv - tb);
    }
    return acc;
  }, [rows]);

  return (
    <div
      ref={pasteTargetRef}
      onPaste={handlePasteRows}
      tabIndex={0}
      style={{ padding:"var(--sp-6)", display:"flex", flexDirection:"column", gap:"var(--sp-5)", minHeight:"100vh", outline:"none" }}
    >

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"var(--sp-3)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"var(--sp-3)" }}>
          <span style={{ fontSize:"var(--text-lg)", fontWeight:700, color:"var(--color-ink)", letterSpacing:"-0.01em" }}>PO Details</span>
          <span className="record-count">{rows.length} records</span>
        </div>
        <div style={{ display:"flex", gap:"var(--sp-2)", flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position:"absolute", left:8, pointerEvents:"none" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding:"5px 10px 5px 26px", fontSize:12, border:"1px solid var(--color-border)", borderRadius:"var(--radius-md)", background:"var(--color-surface)", color:"var(--color-ink)", outline:"none", width:180 }}
              onFocus={e => e.target.style.borderColor="var(--color-accent)"}
              onBlur={e => e.target.style.borderColor="var(--color-border)"} />
          </div>
          <select className="filter-select" value={poFilters.company} onChange={e => setPoFilters(f => ({ ...f, company: e.target.value }))} style={{ height:29, fontSize:12 }}>
            <option value="">All Companies</option>
            {filterOptions.companies.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="filter-select" value={poFilters.month} onChange={e => setPoFilters(f => ({ ...f, month: e.target.value }))} style={{ height:29, fontSize:12 }}>
            <option value="">All Months</option>
            {filterOptions.months.map(m => <option key={m}>{m}</option>)}
          </select>
          <select className="filter-select" value={poFilters.year} onChange={e => setPoFilters(f => ({ ...f, year: e.target.value }))} style={{ height:29, fontSize:12 }}>
            <option value="">All Years</option>
            {filterOptions.years.map(y => <option key={y}>{y}</option>)}
          </select>
          {Object.values(poFilters).some(Boolean) && (
            <button className="btn-toolbar" style={{ padding:"5px 10px", fontSize:12 }} onClick={() => setPoFilters({ company:"", month:"", year:"" })}>
              Clear
            </button>
          )}
          <button className="btn-toolbar btn-export" style={{ padding:"5px 10px", fontSize:12 }} onClick={openModal}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Row
          </button>
          <label className="btn-toolbar btn-import" style={{ padding:"5px 10px", fontSize:12 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Import Excel
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} onChange={handleImport} />
          </label>
          <button className="btn-toolbar btn-import" style={{ padding:"5px 10px", fontSize:12 }} onClick={() => { pasteTargetRef.current?.focus(); showToast("Paste copied Excel rows into PO Details"); }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h6"/><path d="M9 16h6"/><path d="M9 8h1"/><path d="M5 4h9l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M14 4v5h5"/></svg>
            Paste Rows
          </button>
          <button className="btn-toolbar btn-export" style={{ padding:"5px 10px", fontSize:12 }} onClick={handleExport}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Excel
          </button>
          {selected.size > 0 && (
            <button className="btn-del" style={{ padding:"5px 10px", fontSize:12 }} onClick={handleDeleteSelected}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              Delete ({selected.size})
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip — reflects current search filter; stacked currencies for mixed cohorts */}
      <div className="podetails-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Candidates",     count: true,                                                                color: "var(--color-ink)" },
          { label: "Total Contract", money: summary.totalValue,                                                  color: "var(--color-accent)" },
          { label: "Received",       money: summary.totalPaid,                                                   color: "#16a34a" },
          { label: "Outstanding",    money: summary.totalBal,                                                    color: "#d97706" },
        ].map((k) => (
          <div key={k.label} className="podetails-summary-card" style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)", padding: "14px 18px", boxShadow: "var(--shadow-sm)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--color-ink-muted)", marginBottom: 6 }}>
              {k.label}
            </div>
            <div className="podetails-summary-value" style={{ fontSize: 22, fontWeight: 700, color: k.color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
              {k.count ? String(rows.length) : <MoneyStack usd={k.money.USD} gbp={k.money.GBP} decimals={0} />}
            </div>
            {search.trim() && (
              <div style={{ fontSize: 10, color: "var(--color-ink-muted)", marginTop: 4 }}>
                filtered by "{search}"
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:"var(--color-surface)", border:"1px solid var(--color-border)", borderRadius:"var(--radius-lg)", overflow:"hidden", boxShadow:"var(--shadow-sm)", flex:1 }}>
        <div style={{ overflowX:"auto", maxHeight:"calc(100vh - 220px)" }}>
          <table className="excel-table" style={{ minWidth:1800 }}>
            <thead>
              <tr>
                <th style={{ width:40, textAlign:"center", cursor:"default" }}>
                  <input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={e => toggleAll(e.target.checked)} style={{ width:14, height:14 }} />
                </th>
                {COLS.map(c => <th key={c.key} onClick={() => toggleSort(c.key)}>{c.label}{sortIcon(c.key)}</th>)}
                <th style={{ width:80, cursor:"default" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={COLS.length + 2}>
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <div className="empty-title">No PO records yet</div>
                    <div className="empty-sub">Add a row, import Excel, or paste copied Excel rows to get started.</div>
                  </div>
                </td></tr>
              ) : paginatedRows.map(row => {
                const isEditing = editingId === row.id;
                return (
                  <tr key={row.id} style={{ background: selected.has(row.id) ? "#dbeafe" : undefined }}>
                    <td style={{ textAlign:"center" }}>
                      <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleRow(row.id)} style={{ width:14, height:14 }} />
                    </td>
                    <td>{isEditing ? <select className="inline-cell-select" value={editBuf.company||""} onChange={e=>setEditBuf(b=>({...b,company:e.target.value}))}>{COMPANY_OPTIONS_TABLE.map(o=><option key={o}>{o}</option>)}</select> : row.company||"—"}</td>
                    <td>{isEditing ? <DateInput className="inline-cell-input" value={editBuf.signupDate} onChange={v=>setEditBuf(b=>({...b,signupDate:v}))} /> : fmtDate(row.signupDate)}</td>
                    <td>{isEditing ? <DateInput className="inline-cell-input" value={editBuf.placedDate} onChange={v=>setEditBuf(b=>({...b,placedDate:v}))} /> : fmtDate(row.placedDate)}</td>
                    <td style={{ fontWeight:600, color:"var(--color-ink)" }}>{isEditing ? <input className="inline-cell-input" value={editBuf.candidate||""} onChange={e=>setEditBuf(b=>({...b,candidate:e.target.value}))} /> : row.candidate||"—"}</td>
                    <td>{isEditing ? <input className="inline-cell-input" value={editBuf.closedBy||""} onChange={e=>setEditBuf(b=>({...b,closedBy:e.target.value}))} /> : row.closedBy||"—"}</td>
                    <td>{isEditing ? <input className="inline-cell-input" value={editBuf.reference||""} onChange={e=>setEditBuf(b=>({...b,reference:e.target.value}))} /> : row.reference||"—"}</td>
                    <td>{isEditing ? <input className="inline-cell-input" value={editBuf.placedBy||""} onChange={e=>setEditBuf(b=>({...b,placedBy:e.target.value}))} /> : row.placedBy||"—"}</td>
                    <td>{isEditing ? <select className="inline-cell-select" value={editBuf.location||""} onChange={e=>setEditBuf(b=>({...b,location:e.target.value}))}>{LOCATION_OPTIONS.map(o=><option key={o}>{o}</option>)}</select> : row.location||"—"}</td>
                    <td>{isEditing ? <DateInput className="inline-cell-input" value={editBuf.poDate} onChange={v=>setEditBuf(b=>({...b,poDate:v}))} /> : fmtDate(row.poDate)}</td>
                    <td className="num">{isEditing ? <input type="number" className="inline-cell-input" value={editBuf.amount||""} onChange={e=>setEditBuf(b=>({...b,amount:e.target.value}))} /> : fmtMoneyC(row.amount, row.currency || currencyOf(row.company), 0)}</td>
                    <td>{isEditing ? <input className="inline-cell-input" value={editBuf.agreement||""} onChange={e=>setEditBuf(b=>({...b,agreement:e.target.value}))} /> : row.agreement||"—"}</td>
                    <td className="num">{isEditing ? <input type="number" className="inline-cell-input" value={editBuf.totalAmt||""} onChange={e=>setEditBuf(b=>({...b,totalAmt:e.target.value}))} /> : fmtMoneyC(row.totalAmt, row.currency || currencyOf(row.company), 0)}</td>
                    <td className="num">{isEditing ? <input type="number" className="inline-cell-input" value={editBuf.monthly||""} onChange={e=>setEditBuf(b=>({...b,monthly:e.target.value}))} /> : fmtMoneyC(row.monthly, row.currency || currencyOf(row.company), 0)}</td>
                    <td className="num">{isEditing ? <input type="number" className="inline-cell-input" value={editBuf.balance||""} onChange={e=>setEditBuf(b=>({...b,balance:e.target.value}))} /> : fmtMoneyC(row.balance || 0, row.currency || currencyOf(row.company), 0)}</td>
                    <td>
                      {isEditing ? (
                        <div style={{ display:"flex", gap:4 }}>
                          <button onClick={saveEdit} style={{ fontSize:11, padding:"2px 8px", background:"var(--color-success-soft)", color:"var(--color-success)", border:"1px solid #a7f3d0", borderRadius:4, cursor:"pointer", fontWeight:600 }}>Save</button>
                          <button onClick={cancelEdit} style={{ fontSize:11, padding:"2px 8px", background:"var(--color-surface-2)", color:"var(--color-ink-muted)", border:"1px solid var(--color-border)", borderRadius:4, cursor:"pointer" }}>Cancel</button>
                        </div>
                      ) : (
                        <div style={{ display:"flex", gap:4 }}>
                          <button onClick={() => handleViewCandidate(row)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--color-primary)", padding:"2px 4px", borderRadius:4, display:"inline-flex", alignItems:"center" }} title="View Dashboard">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                          <button onClick={() => startEdit(row)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--color-accent)", padding:"2px 4px", borderRadius:4, display:"inline-flex", alignItems:"center" }} title="Edit">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={() => handleDeleteRow(row)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--color-danger)", padding:"2px 4px", borderRadius:4, display:"inline-flex", alignItems:"center" }} title="Delete candidate (all installments)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PaginationControls
          total={rows.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* ── New Placement Modal (2-step form) ── */}
      {pasteImport && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setPasteImport(null)}>
          <div style={{ background:"var(--color-surface)", borderRadius:"var(--radius-lg)", width:"100%", maxWidth:620, boxShadow:"0 24px 70px rgba(15,23,42,.18)", overflow:"hidden", border:"1px solid var(--color-border)" }}>
            <div style={{ padding:"18px 22px", borderBottom:"1px solid var(--color-border)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:"var(--color-ink)" }}>Paste PO Details Rows</div>
                <div style={{ fontSize:12, color:"var(--color-ink-muted)", marginTop:3 }}>
                  {pasteImport.rows.length} copied row{pasteImport.rows.length === 1 ? "" : "s"} will be imported into PO Details.
                </div>
              </div>
              <button className="modal-close" onClick={() => setPasteImport(null)} style={{ fontSize:20, lineHeight:1 }}>×</button>
            </div>
            <div style={{ padding:22 }}>
              <div style={{ maxHeight:260, overflow:"auto", border:"1px solid var(--color-border)", borderRadius:"var(--radius-md)" }}>
                <table className="excel-table" style={{ minWidth:560 }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Company</th>
                      <th>DOJ</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pasteImport.rows.slice(0, 8).map((row, i) => (
                      <tr key={`${row.id}-${i}`}>
                        <td style={{ fontWeight:600 }}>{row.candidate || "—"}</td>
                        <td>{row.company || "—"}</td>
                        <td>{fmtDate(row.poDate)}</td>
                        <td className="num">{fmtMoneyC(row.amount, row.currency || currencyOf(row.company), 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pasteImport.rows.length > 8 && (
                <div style={{ fontSize:12, color:"var(--color-ink-muted)", marginTop:8 }}>
                  Showing first 8 rows. All {pasteImport.rows.length} copied rows will be pasted.
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:18 }}>
                <button onClick={() => setPasteImport(null)} style={{ padding:"8px 14px", border:"1px solid var(--color-border)", borderRadius:"var(--radius-md)", background:"var(--color-surface-2)", color:"var(--color-ink-muted)", cursor:"pointer", fontWeight:600 }}>
                  Cancel
                </button>
                <button onClick={confirmPasteImport} style={{ padding:"8px 14px", border:"1px solid var(--color-primary)", borderRadius:"var(--radius-md)", background:"var(--color-primary)", color:"#fff", cursor:"pointer", fontWeight:700 }}>
                  Paste {pasteImport.rows.length} Row{pasteImport.rows.length === 1 ? "" : "s"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeModal()}
          style={{ alignItems:"flex-start", paddingTop:32, paddingBottom:32, overflowY:"auto" }}>
          <div style={{ background:"var(--color-bg)", borderRadius:"var(--radius-xl)", width:"100%", maxWidth:760, margin:"0 auto", boxShadow:"0 25px 60px rgba(0,0,0,.18)", overflow:"hidden" }}>

            {/* Modal header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 28px", background:"var(--color-surface)", borderBottom:"1px solid var(--color-border)" }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:"var(--color-ink)", letterSpacing:"-0.01em" }}>New Placement</div>
                <div style={{ fontSize:12, color:"var(--color-ink-muted)", marginTop:2 }}>Fill in placement details to auto-generate a full payment schedule</div>
              </div>
              <button className="modal-close" onClick={closeModal} style={{ fontSize:20, lineHeight:1 }}>×</button>
            </div>

            {/* Step pills */}
            <div style={{ display:"flex", gap:8, padding:"16px 28px 0" }}>
              {["I. Payment Schedule Setup", "II. Master Sheet Details"].map((label, i) => (
                <div key={i} style={{
                  padding:"6px 16px", borderRadius:999, fontSize:12, fontWeight:600, cursor:"pointer",
                  background: step === i+1 ? "var(--color-primary)" : "var(--color-surface-2)",
                  color:      step === i+1 ? "#fff" : "var(--color-ink-muted)",
                  border:     step === i+1 ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                }} onClick={() => {
                  if (i === 0) setStep(1);
                  if (i === 1) { const e = validateStep1(); if (!Object.keys(e).length) setStep(2); else setFormErrors(e); }
                }}>{label}</div>
              ))}
            </div>

            {/* STEP 1 */}
            {step === 1 && (
              <div style={{ padding:28 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  <PField label="Recipient Name" required error={formErrors.candidateName}>
                    <input value={form.candidateName} onChange={e => setF("candidateName", e.target.value)} placeholder="Full name of candidate" style={iStyle} />
                  </PField>
                  <PField label="Client Name" required error={formErrors.clientName}>
                    <input value={form.clientName} onChange={e => setF("clientName", e.target.value)} placeholder="e.g. Google, Microsoft" style={iStyle} />
                  </PField>
                  <PField label="Company">
                    <select value={form.companyGroup} onChange={e => setF("companyGroup", e.target.value)} style={iStyle}>
                      {COMPANY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </PField>
                  <PField label="Agreement Type">
                    <select value={form.agreement} onChange={e => setF("agreement", e.target.value)} style={iStyle}>
                      {AGREEMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </PField>
                  {form.agreement === "custom" && (<>
                    <PField label="Percentage (%)" error={formErrors.customPct}>
                      <input type="number" value={form.customPct} onChange={e => setF("customPct", e.target.value)} placeholder="e.g. 12" style={iStyle} />
                    </PField>
                    <PField label="Months" error={formErrors.customMonths}>
                      <input type="number" value={form.customMonths} onChange={e => setF("customMonths", e.target.value)} placeholder="e.g. 4" style={iStyle} />
                    </PField>
                  </>)}
                  <PField label="Pay Structure">
                    <select value={form.payStructure} onChange={e => setF("payStructure", e.target.value)} style={iStyle}>
                      <option value="annual">Annual Package</option>
                      <option value="hourly">Hourly Rate</option>
                    </select>
                  </PField>
                  {form.payStructure === "annual" && (
                    <PField label="Annual Package ($)" error={formErrors.annualSalary}>
                      <input type="number" value={form.annualSalary} onChange={e => setF("annualSalary", e.target.value)} placeholder="e.g. 95000" style={iStyle} />
                    </PField>
                  )}
                  {form.payStructure === "hourly" && (<>
                    <PField label="Rate ($/hr)" error={formErrors.hourlyRate}>
                      <input type="number" value={form.hourlyRate} onChange={e => setF("hourlyRate", e.target.value)} placeholder="e.g. 45" style={iStyle} />
                    </PField>
                    <PField label="Total Hours" error={formErrors.totalHours}>
                      <input type="number" value={form.totalHours} onChange={e => setF("totalHours", e.target.value)} placeholder="e.g. 2080" style={iStyle} />
                    </PField>
                  </>)}
                  <PField label="Date of Joining (DOJ)" error={formErrors.dateOfJoining}>
                    <DateInput value={form.dateOfJoining} onChange={v => setF("dateOfJoining", v)} style={iStyle} />
                  </PField>
                  {!form.dateOfJoining && (
                    <PField label="Manual First Payment Date">
                      <DateInput value={form.manualPayStart} onChange={v => setF("manualPayStart", v)} style={iStyle} />
                    </PField>
                  )}
                  <PField label="Non-Reimbursable Upfront ($)" style={{ gridColumn: "1 / -1" }}>
                    <input type="number" value={form.nrUpfront} onChange={e => setF("nrUpfront", e.target.value)} placeholder="0" title="Recorded on the First Payment Remarks only — not deducted from contract value, balance, or upfront" style={iStyle} />
                  </PField>
                  {totalContractValue > 0 && (
                    <div style={{ gridColumn:"1/-1", display:"flex", gap:10, flexWrap:"wrap" }}>
                      {[["Contract Value", fmtMoney(totalContractValue,0)], ["Monthly", fmtMoney(monthlyAmt,2)], ["Entries", String(months+1)]].map(([k, v]) => (
                        <div key={k} style={{ background:"var(--color-accent-soft)", border:"1px solid var(--color-accent-border)", borderRadius:"var(--radius-full)", padding:"6px 14px", fontSize:12 }}>
                          <span style={{ color:"var(--color-ink-muted)" }}>{k}: </span>
                          <strong style={{ color:"var(--color-accent)" }}>{v}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display:"flex", justifyContent:"flex-end", marginTop:20 }}>
                  <button onClick={handleNext} style={btnPrimary}>Next →</button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div style={{ padding:28 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  <PField label="Company Group" style={{ gridColumn:"1/-1" }}>
                    <select value={form.companyGroup} onChange={e => setF("companyGroup", e.target.value)} style={iStyle}>
                      {COMPANY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </PField>
                  <PField label="Signup Date">
                    <DateInput value={form.signupDate} onChange={v => setF("signupDate", v)} style={iStyle} />
                  </PField>
                  <PField label="Placed Date">
                    <DateInput value={form.placedDate} onChange={v => setF("placedDate", v)} style={iStyle} />
                  </PField>
                  <PField label="Closed By">
                    <input value={form.closedBy} onChange={e => setF("closedBy", e.target.value)} placeholder="Sales Person" style={iStyle} />
                  </PField>
                  <PField label="Placed By">
                    <input value={form.placedBy} onChange={e => setF("placedBy", e.target.value)} placeholder="Placement lead" style={iStyle} />
                  </PField>
                  <PField label="Reference">
                    <input value={form.reference} onChange={e => setF("reference", e.target.value)} placeholder="Referral source" style={iStyle} />
                  </PField>
                  <PField label="Location">
                    <select value={form.location} onChange={e => setF("location", e.target.value)} style={iStyle}>
                      {LOCATION_OPTIONS_PLACE.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </PField>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:20 }}>
                  <button onClick={() => setStep(1)} style={btnGhost}>← Back</button>
                  <button onClick={handleSubmitPlacement} disabled={saving} style={btnPrimary}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight:6 }}>
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    {saving ? "Saving…" : "Submit & Create Placement"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Custom delete modal */}
      <DeleteConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        onConfirm={deleteConfirm.onConfirm}
        onCancel={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
        loading={deleteConfirm.loading}
      />
    </div>
  );
}

function PField({ label, required, error, children, style }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, ...style }}>
      <label style={{ fontSize:11, fontWeight:700, color:"var(--color-ink-muted)", textTransform:"uppercase", letterSpacing:".06em" }}>
        {label}{required && <span style={{ color:"var(--color-danger)", marginLeft:2 }}>*</span>}
      </label>
      {children}
      {error && <span style={{ fontSize:11, color:"var(--color-danger)" }}>{error}</span>}
    </div>
  );
}

const iStyle = {
  width:"100%", padding:"9px 12px", border:"1px solid var(--color-border)",
  borderRadius:"var(--radius-md)", fontSize:13, fontFamily:"var(--font-body)",
  color:"var(--color-ink)", background:"var(--color-surface)", outline:"none", appearance:"none",
};
const btnPrimary = {
  display:"inline-flex", alignItems:"center", padding:"10px 20px",
  background:"var(--color-primary)", color:"#fff", border:"none",
  borderRadius:"var(--radius-md)", fontSize:13, fontWeight:700,
  fontFamily:"var(--font-body)", cursor:"pointer",
};
const btnGhost = {
  display:"inline-flex", alignItems:"center", padding:"8px 16px",
  background:"transparent", color:"var(--color-ink-muted)",
  border:"1px solid var(--color-border)", borderRadius:"var(--radius-md)",
  fontSize:12, fontWeight:600, fontFamily:"var(--font-body)", cursor:"pointer",
};
