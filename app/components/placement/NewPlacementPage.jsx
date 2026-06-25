"use client";
import { useState } from "react";
import useDashboardStore, { MONTH_NAMES, fmtMoneyC, currencyOf, currencySymbol, fmtEmailDate } from "@/lib/use-store";
import DateInput from "@/app/components/DateInput";

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

const LOCATION_OPTIONS = ["Gurugram", "Ahmedabad", "Lucknow"];

const AGREEMENT_OPTIONS = [
  { value: "14|5",   label: "14% in 5 Months" },
  { value: "12|4",   label: "12% in 4 Months" },
  { value: "11|3",   label: "11% in 3 Months" },
  { value: "10|3",   label: "10% in 3 Months" },
  { value: "custom", label: "— Custom Agreement —" },
];

const EMPTY_FORM = {
  candidateName:  "",
  clientName:     "",
  companyGroup:   "SST",
  agreement:      "14|5",
  customPct:      "",
  customMonths:   "",
  payStructure:   "annual",
  annualSalary:   "",
  hourlyRate:     "",
  totalHours:     "",
  dateOfJoining:  "",
  manualPayStart: "",
  upfront:        "1500",
  nrUpfront:      "0",
  signupDate:     "",
  placedDate:     "",
  closedBy:       "",
  placedBy:       "",
  reference:      "",
  location:       "Gurugram",
};

function parseAgreement(agreement, customPct, customMonths) {
  if (agreement === "custom") return { pct: parseFloat(customPct) || 0, months: parseInt(customMonths) || 1 };
  const [p, m] = agreement.split("|").map(Number);
  return { pct: p || 0, months: m || 1 };
}

function parseLocalDate(str) {
  if (!str) return null;
  str = String(str).trim();
  const mdy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy) return new Date(+mdy[3], +mdy[1]-1, +mdy[2]);
  const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return new Date(+ymd[1], +ymd[2]-1, +ymd[3]);
  return null;
}

function toMMDDYYYY(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}-${d.getFullYear()}`;
}

function snapDate(d) {
  const day = d.getDate();
  if (day <= 7)        d.setDate(7);
  else if (day <= 15)  d.setDate(15);
  else if (day <= 21)  d.setDate(21);
  else { d.setMonth(d.getMonth()+1); d.setDate(7); }
  return d;
}

function formatDateDisplay(d) {
  if (!d) return "";
  return `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}/${d.getFullYear()}`;
}

export default function NewPlacementPage() {
  const { bulkCreate, showToast, navigate, setLastDashboard } = useDashboardStore();
  const [form, setForm]     = useState(EMPTY_FORM);
  const [step, setStep]     = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: "" }));
  };

  const { pct, months } = parseAgreement(form.agreement, form.customPct, form.customMonths);

  const totalSalary = form.payStructure === "annual"
    ? parseFloat(form.annualSalary) || 0
    : (parseFloat(form.hourlyRate) || 0) * (parseFloat(form.totalHours) || 0);

  const totalContractValue = totalSalary * (pct / 100);
  const upfront            = parseFloat(form.upfront)   || 0;
  /* NR Upfront is record-only: it appears as a remark on the first
     installment row and is NEVER deducted from contract value, total,
     monthly, balance, or the Upfront column anywhere in the app. */
  const nrUpfront          = parseFloat(form.nrUpfront) || 0;
  const isUK               = form.companyGroup === "Vizva-UK";
  /* USA: $1,500 first installment + N monthly at (total - 1500)/months.
   * UK : N equal monthly installments at total/months (no upfront row). */
  const upfrontFirst       = isUK ? 0 : 1500;
  const monthlyAmt         = months > 0 ? (totalContractValue - upfrontFirst) / months : 0;
  const currency           = currencyOf(form.companyGroup);
  const cSym               = currencySymbol(currency);
  const companyLabel       = getOfficialName(form.companyGroup);

  const computeInstallments = () => {
    if (!totalContractValue) return [];

    /* Second-payment date resolution:
     *   1. DOJ if provided
     *   2. Manual Second Payment Date if provided
     *   3. Otherwise: today + 45 days, snapped forward to next 7/15/21
     */
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
    /* type retains the X% / N month info (parseable downstream).
       Service Type rule: first installment of any placement is
       "Placement"; every subsequent installment is "New Placement". */
    const typeLabel = pct + "% in " + months + " months";
    const FIRST_SERVICE_TYPE = "New Placement";
    const REST_SERVICE_TYPE  = "Placement";
    const now      = Date.now();
    const entries  = [];

    /* USA: push the $1,500 upfront First Installment row.
       UK : skip — all installments are equal monthly, no upfront.
       The first installment of the placement (USA or UK) is always
       categorized as "Placement Offer" service type; subsequent rows
       use the placement-type default ("Placement" or "UK Placement"). */
    if (!isUK) {
      entries.push({
        id:          String(now + 1),
        candidate:   form.candidateName,
        client:      form.clientName,
        company:     getOfficialName(form.companyGroup),
        poDate:      toMMDDYYYY(firstPaymentDate),
        month:       MONTH_NAMES[firstPaymentDate.getMonth()],
        year:        String(firstPaymentDate.getFullYear()),
        instance:    firstPaymentDate.getDate() <= 15 ? "First Half" : "Second Half",
        amount:      1500,
        paid:        0,
        due:         1500,
        status:      "Pending",
        serviceType: FIRST_SERVICE_TYPE,
        type:        typeLabel,
        notes:       nrUpfront > 0 ? `${cSym}${nrUpfront.toLocaleString()} (NR)` : "Non Upfront",
        signupDate:  form.signupDate,
        placedDate:  form.placedDate,
        closedBy:    form.closedBy,
        placedBy:    form.placedBy,
        reference:   form.reference,
        location:    form.location,
      });
    }

    /* runDate for the equal monthly installments.
     *   USA: starts the month AFTER the upfront (DOJ + 1 month, etc.) so
     *        the $1,500 upfront sits on its own date.
     *   UK : starts ON the firstPaymentDate itself — there's no upfront
     *        row to "make room" for. */
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
      /* For UK row 0, keep the raw firstPaymentDate (today or DOJ) — don't
         snap forward. Subsequent UK rows and all USA rows are snapped. */
      if (!(isUK && i === 0)) snapDate(runDate);
      entries.push({
        id:          String(now + 100 + i),
        candidate:   form.candidateName,
        client:      form.clientName,
        company:     getOfficialName(form.companyGroup),
        poDate:      toMMDDYYYY(new Date(runDate)),
        month:       MONTH_NAMES[runDate.getMonth()],
        year:        String(runDate.getFullYear()),
        instance:    runDate.getDate() <= 15 ? "First Half" : "Second Half",
        amount:      parseFloat(instAmt.toFixed(2)),
        paid:        0,
        due:         parseFloat(instAmt.toFixed(2)),
        status:      "Pending",
        /* UK row 0 is the placement's first installment → "Placement".
           Every other loop row (USA + UK) is a subsequent payment → "New Placement". */
        serviceType: (isUK && i === 0) ? FIRST_SERVICE_TYPE : REST_SERVICE_TYPE,
        type:        typeLabel,
        notes:       (isUK && i === 0 && nrUpfront > 0)
                       ? `${cSym}${nrUpfront.toLocaleString()} (NR)`
                       : "Installment " + (i + 1),
        signupDate:  form.signupDate,
        placedDate:  form.placedDate,
        closedBy:    form.closedBy,
        placedBy:    form.placedBy,
        reference:   form.reference,
        location:    form.location,
      });
      runDate.setMonth(runDate.getMonth() + 1);
    }

    return entries;
  };

  const buildDashboardRows = (installments) => {
    return installments.map((e, i) => ({
      label:  i === 0 ? "First Installment" : fmtEmailDate(e.poDate),
      amount: e.amount,
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.candidateName.trim()) e.candidateName = "Required";
    if (!form.clientName.trim())    e.clientName    = "Required";
    if (form.dateOfJoining && !parseLocalDate(form.dateOfJoining)) e.dateOfJoining = "Invalid date";
    if (form.payStructure === "annual" && !form.annualSalary) e.annualSalary = "Required";
    if (form.payStructure === "hourly" && !form.hourlyRate)   e.hourlyRate   = "Required";
    if (form.payStructure === "hourly" && !form.totalHours)   e.totalHours   = "Required";
    if (form.agreement === "custom" && (!form.customPct || pct <= 0))       e.customPct    = "Required";
    if (form.agreement === "custom" && (!form.customMonths || months <= 0)) e.customMonths = "Required";
    return e;
  };

  const handleNext = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setStep(2);
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); setStep(1); return; }
    const installments = computeInstallments();
    if (!installments.length) { showToast("Could not compute installments — check your inputs"); return; }
    setSaving(true);
    try {
      const ok = await bulkCreate(installments);
      if (ok === false) { setSaving(false); return; }   // save failed; toast already shown by store

      const rows = buildDashboardRows(installments);
      setLastDashboard({
        name:               form.candidateName,
        client:             form.clientName,
        company:            companyLabel,
        currency,
        isUK,
        totalSalary,
        totalContractValue,
        monthlyAmt,
        upfront,
        nrUpfront,
        pct,
        months,
        rows,
        installments,
      });
      setForm(EMPTY_FORM);
      setStep(1);
      navigate("dashboard");
    } catch {
      showToast("Failed to save entries");
    }
    setSaving(false);
  };

  return (
    <div className="placement-page" style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-ink)", letterSpacing: "-0.02em" }}>New Placement</h1>
        <p style={{ fontSize: 13, color: "var(--color-ink-muted)", marginTop: 4 }}>Fill in placement details to auto-generate a full payment schedule</p>
      </div>

      {/* Step pills */}
      <div className="placement-steps" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["I. Payment Schedule Setup", "II. Master Sheet Details"].map((label, i) => {
          const num   = i + 1;
          const done  = step > num;
          const isActive = step === num;
          return (
            <button
              key={i}
              type="button"
              onClick={() => { if (num === 1 || step === 2) setStep(num); }}
              style={{
                padding: "6px 16px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                cursor: (num === 1 || step === 2) ? "pointer" : "default",
                background: isActive ? "var(--color-primary)" : (done ? "var(--color-success-soft)" : "var(--color-surface-2)"),
                color:      isActive ? "#fff" : (done ? "var(--color-success)" : "var(--color-ink-muted)"),
                border:     isActive ? "1px solid var(--color-primary)" : (done ? "1px solid #a7f3d0" : "1px solid var(--color-border)"),
                fontFamily: "var(--font-body)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Single-card layout — current step only */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, alignItems: "start" }}>

        {/* ── Step 1: Payment Schedule Setup ── */}
        {step === 1 && (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border-light)", background: "var(--color-surface-2)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--color-primary)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>I</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Payment Schedule Setup</div>
              <div style={{ fontSize: 11, color: "var(--color-ink-muted)" }}>Candidate info, salary &amp; agreement terms</div>
            </div>
          </div>
          <div className="placement-form-grid" style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Recipient Name" required error={errors.candidateName}>
              <input value={form.candidateName} onChange={e => set("candidateName", e.target.value)} placeholder="Full name of candidate" style={inputStyle} />
            </Field>
            <Field label="Client Name" required error={errors.clientName}>
              <input value={form.clientName} onChange={e => set("clientName", e.target.value)} placeholder="e.g. Google, Microsoft" style={inputStyle} />
            </Field>
            <Field label="Company">
              <div style={{ position: "relative" }}>
                <select value={form.companyGroup} onChange={e => set("companyGroup", e.target.value)}
                  style={{ ...inputStyle, ...(isUK ? { borderColor: "#2563eb", background: "#eff6ff" } : null), paddingRight: isUK ? 76 : 12 }}>
                  {COMPANY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {isUK && (
                  <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", letterSpacing: ".06em", pointerEvents: "none" }}>
                    🇬🇧 GBP
                  </span>
                )}
              </div>
            </Field>
            <Field label="Agreement Type">
              <select value={form.agreement} onChange={e => set("agreement", e.target.value)} style={inputStyle}>
                {AGREEMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            {form.agreement === "custom" && (<>
              <Field label="Percentage (%)" error={errors.customPct}>
                <input type="number" value={form.customPct} onChange={e => set("customPct", e.target.value)} placeholder="e.g. 12" style={inputStyle} />
              </Field>
              <Field label="Months" error={errors.customMonths}>
                <input type="number" value={form.customMonths} onChange={e => set("customMonths", e.target.value)} placeholder="e.g. 4" style={inputStyle} />
              </Field>
            </>)}
            <Field label="Pay Structure">
              <select value={form.payStructure} onChange={e => set("payStructure", e.target.value)} style={inputStyle}>
                <option value="annual">Annual Package</option>
                <option value="hourly">Hourly Rate</option>
              </select>
            </Field>
            {form.payStructure === "annual" && (
              <Field label={`Annual Package (${cSym})`} required error={errors.annualSalary}>
                <input type="number" value={form.annualSalary} onChange={e => set("annualSalary", e.target.value)} placeholder="e.g. 95000" style={inputStyle} />
              </Field>
            )}
            {form.payStructure === "hourly" && (<>
              <Field label={`Rate (${cSym}/hr)`} required error={errors.hourlyRate}>
                <input type="number" value={form.hourlyRate} onChange={e => set("hourlyRate", e.target.value)} placeholder="e.g. 45" style={inputStyle} />
              </Field>
              <Field label="Total Hours" required error={errors.totalHours}>
                <input type="number" value={form.totalHours} onChange={e => set("totalHours", e.target.value)} placeholder="e.g. 2080" style={inputStyle} />
              </Field>
            </>)}
            <Field label="Date of Joining (DOJ)" error={errors.dateOfJoining}>
              <DateInput value={form.dateOfJoining} onChange={v => set("dateOfJoining", v)} style={inputStyle} />
            </Field>
            {!form.dateOfJoining && (
              <Field label="Manual Second Payment Date">
                <DateInput value={form.manualPayStart} onChange={v => set("manualPayStart", v)} style={inputStyle} />
              </Field>
            )}
            <Field label={`Non-Reimbursable Upfront (${cSym})`} style={{ gridColumn: "1 / -1" }}>
              <input type="number" value={form.nrUpfront} onChange={e => set("nrUpfront", e.target.value)} placeholder="0" title="Recorded on the First Payment Remarks only — not deducted from contract value, balance, or upfront" style={inputStyle} />
            </Field>
            {totalContractValue > 0 && (
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  ["Contract Value", fmtMoneyC(totalContractValue, currency, 0)],
                  ["Monthly Inst.",  fmtMoneyC(monthlyAmt, currency, 2)],
                  ["Total Entries",  String(isUK ? months : months + 1)],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: "var(--color-accent-soft)", border: "1px solid var(--color-accent-border)", borderRadius: "var(--radius-full)", padding: "5px 12px", fontSize: 11 }}>
                    <span style={{ color: "var(--color-ink-muted)" }}>{k}: </span>
                    <strong style={{ color: "var(--color-accent)" }}>{v}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Step 1 footer: Next only */}
          <div className="placement-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderTop: "1px solid var(--color-border-light)", background: "var(--color-surface-2)" }}>
            <button onClick={() => { setForm(EMPTY_FORM); setErrors({}); }} style={btnGhostStyle}>Clear Form</button>
            <button onClick={handleNext} style={btnPrimaryStyle}>Next →</button>
          </div>
        </div>
        )}

        {/* ── Step 2: Master Sheet Details ── */}
        {step === 2 && (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border-light)", background: "var(--color-surface-2)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--color-ink-muted)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>II</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Master Sheet Details</div>
              <div style={{ fontSize: 11, color: "var(--color-ink-muted)" }}>Placement metadata for record-keeping</div>
            </div>
          </div>
          <div className="placement-form-grid" style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Signup Date">
              <DateInput value={form.signupDate} onChange={v => set("signupDate", v)} style={inputStyle} />
            </Field>
            <Field label="Placed Date">
              <DateInput value={form.placedDate} onChange={v => set("placedDate", v)} style={inputStyle} />
            </Field>
            <Field label="Closed By">
              <input value={form.closedBy} onChange={e => set("closedBy", e.target.value)} placeholder="Sales person" style={inputStyle} />
            </Field>
            <Field label="Placed By">
              <input value={form.placedBy} onChange={e => set("placedBy", e.target.value)} placeholder="Placement lead" style={inputStyle} />
            </Field>
            <Field label="Reference">
              <input value={form.reference} onChange={e => set("reference", e.target.value)} placeholder="Referral source" style={inputStyle} />
            </Field>
            <Field label="Location">
              <select value={form.location} onChange={e => set("location", e.target.value)} style={inputStyle}>
                {LOCATION_OPTIONS.map(l => <option key={l}>{l}</option>)}
              </select>
            </Field>
          </div>
          {/* Step 2 footer: Back + Submit */}
          <div className="placement-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderTop: "1px solid var(--color-border-light)", background: "var(--color-surface-2)" }}>
            <button onClick={() => setStep(1)} style={btnGhostStyle}>← Back</button>
            <button onClick={handleSubmit} disabled={saving} style={btnPrimaryStyle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              {saving ? "Saving…" : "Submit Placement"}
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, error, children, style }) {
  return (
    <div className="placement-field" style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
        {label}{required && <span style={{ color: "var(--color-danger)", marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <span style={{ fontSize: 11, color: "var(--color-danger)" }}>{error}</span>}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)", fontSize: 13, fontFamily: "var(--font-body)",
  color: "var(--color-ink)", background: "var(--color-surface)", outline: "none",
  appearance: "none", boxSizing: "border-box",
};

const btnPrimaryStyle = {
  display: "inline-flex", alignItems: "center", padding: "10px 20px",
  background: "var(--color-primary)", color: "#fff", border: "none",
  borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 700,
  fontFamily: "var(--font-body)", cursor: "pointer",
};

const btnGhostStyle = {
  display: "inline-flex", alignItems: "center", padding: "8px 16px",
  background: "transparent", color: "var(--color-ink-muted)",
  border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)",
  fontSize: 12, fontWeight: 600, fontFamily: "var(--font-body)", cursor: "pointer",
};
