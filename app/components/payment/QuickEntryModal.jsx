"use client";
import { useState } from "react";
import useDashboardStore, {
  ALL_STATUSES,
  INSTANCE_OPTIONS,
  MONTH_NAMES,
  currencySymbol,
} from "@/lib/use-store";
import DateInput from "@/app/components/DateInput";

/**
 * Quick single-row entry creator for the Payment Calculation page.
 * - Company: pick a known company OR "Other…" → free-text custom name
 *   (e.g. "Bridgepoint" for non-placement income).
 * - Currency: explicit USD/GBP picker so custom companies can be either.
 * - One DB row per submit (vs the multi-installment New Placement form).
 */
const PRESET_COMPANIES = [
  { value: "SST",          label: "SST (SilverSpace Inc)" },
  { value: "Vizva",        label: "Vizva (Vizva Inc)" },
  { value: "Vizva-UK",     label: "Vizva-UK (Vizva UK Ltd)" },
  { value: "Flawless-ED",  label: "Flawless-ED" },
  { value: "__custom__",   label: "Other (enter custom name)…" },
];

const SERVICE_TYPES = [
  "Placement",
  "UK Placement",
  "Other Income",
  "Recurring",
  "Consulting",
];

export default function QuickEntryModal({ onClose }) {
  const { createEntry, showToast } = useDashboardStore();

  const [form, setForm] = useState({
    candidate:    "",
    company:      "SST",
    customCompany: "",
    poDate:       "",
    amount:       "",
    paid:         "0",
    currency:     "USD",            // forced when SST / Vizva / Flawless-ED
    serviceType:  "Placement",
    customService: "",
    instance:     "First Half",
    status:       "Pending",
    notes:        "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: "" }));
  };

  const isCustomCompany = form.company === "__custom__";
  const isCustomService = form.serviceType === "__custom__";

  /* When a preset company is picked, currency is forced.
     For "Other (custom)", the user controls currency. */
  const currencyDisabled = !isCustomCompany;
  const effectiveCurrency = (() => {
    if (isCustomCompany) return form.currency;
    if (form.company === "Vizva-UK") return "GBP";
    return "USD";
  })();
  const cSym = currencySymbol(effectiveCurrency);

  const validate = () => {
    const e = {};
    if (!form.candidate.trim()) e.candidate = "Required";
    if (isCustomCompany && !form.customCompany.trim()) e.customCompany = "Enter a company name";
    if (!form.poDate) e.poDate = "Required";
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = "Enter amount";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    /* Resolve company string */
    const companyName = isCustomCompany
      ? form.customCompany.trim()
      : form.company === "SST"        ? "SilverSpace Inc"
      : form.company === "Vizva"      ? "Vizva Inc"
      : form.company === "Vizva-UK"   ? "Vizva UK Ltd"
      : form.company;

    /* Derive month/year/instance from poDate */
    const m = String(form.poDate).match(/^(\d{2})-(\d{2})-(\d{4})$/);
    const month = m ? MONTH_NAMES[parseInt(m[1], 10) - 1] : "";
    const year  = m ? m[3] : String(new Date().getFullYear());
    const day   = m ? parseInt(m[2], 10) : 1;
    const instance = day <= 15 ? "First Half" : "Second Half";

    const amt  = parseFloat(form.amount) || 0;
    const paid = form.status === "Received" ? amt : (parseFloat(form.paid) || 0);

    setSaving(true);
    const result = await createEntry({
      id:          String(Date.now()),
      candidate:   form.candidate,
      company:     companyName,
      poDate:      form.poDate,
      month, year, instance,
      amount:      amt,
      actual:      amt,
      paid,
      due:         amt - paid,
      status:      form.status,
      serviceType: isCustomService ? form.customService.trim() : form.serviceType,
      type:        "",
      notes:       form.notes,
      currency:    effectiveCurrency,
    });
    setSaving(false);

    if (result) {
      showToast(`✓ Entry created for ${form.candidate}`);
      onClose();
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "60px 24px", overflowY: "auto",
      }}
    >
      <div style={{
        width: "100%", maxWidth: 640,
        background: "var(--surface, #fff)",
        border: "1px solid var(--border, #e3e6ea)",
        borderRadius: 14, boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border, #e3e6ea)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text, #111827)" }}>Create Entry</div>
            <div style={{ fontSize: 11, color: "var(--text-muted, #6b7280)", marginTop: 2 }}>
              Single payment row — for placement installments use the New Placement page.
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: "transparent", border: "none", fontSize: 22, lineHeight: 1, color: "var(--text-muted, #6b7280)", cursor: "pointer", padding: 4 }}>
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Candidate / Source" required error={errors.candidate}>
            <input value={form.candidate} onChange={e => set("candidate", e.target.value)}
              placeholder="Candidate name or income source" style={inputStyle} />
          </Field>

          <Field label="Date" required error={errors.poDate}>
            <DateInput value={form.poDate} onChange={v => set("poDate", v)} style={inputStyle} />
          </Field>

          <Field label="Company">
            <select value={form.company} onChange={e => set("company", e.target.value)} style={inputStyle}>
              {PRESET_COMPANIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>

          {isCustomCompany ? (
            <Field label="Custom Company Name" required error={errors.customCompany}>
              <input value={form.customCompany} onChange={e => set("customCompany", e.target.value)}
                placeholder="e.g. Bridgepoint, Acme LLC" style={inputStyle} />
            </Field>
          ) : (
            <Field label="Currency">
              <input value={effectiveCurrency} disabled style={{ ...inputStyle, background: "#f3f4f6", color: "var(--text-muted, #6b7280)" }} />
            </Field>
          )}

          {isCustomCompany && (
            <Field label="Currency" style={{ gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", gap: 8 }}>
                {["USD", "GBP"].map(c => (
                  <button key={c} type="button"
                    onClick={() => set("currency", c)}
                    style={{
                      flex: 1, padding: "9px 12px", border: "1px solid var(--border, #e3e6ea)",
                      borderRadius: 8, background: form.currency === c ? "#1a1f2e" : "#fff",
                      color: form.currency === c ? "#fff" : "var(--text, #111827)",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                      fontFamily: "var(--font-body)",
                    }}>
                    {c === "USD" ? "$ USD" : "£ GBP"}
                  </button>
                ))}
              </div>
            </Field>
          )}

          <Field label={`Amount (${cSym})`} required error={errors.amount}>
            <input type="number" value={form.amount} onChange={e => set("amount", e.target.value)}
              placeholder="0.00" style={inputStyle} />
          </Field>

          <Field label="Status">
            <select value={form.status} onChange={e => set("status", e.target.value)} style={inputStyle}>
              {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="Type of Service">
            <select value={form.serviceType} onChange={e => set("serviceType", e.target.value)} style={inputStyle}>
              {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
              <option value="__custom__">Other (enter custom)…</option>
            </select>
          </Field>

          {isCustomService && (
            <Field label="Custom Service Type">
              <input value={form.customService} onChange={e => set("customService", e.target.value)}
                placeholder="e.g. Retainer" style={inputStyle} />
            </Field>
          )}

          <Field label="Instance">
            <select value={form.instance} onChange={e => set("instance", e.target.value)} style={inputStyle}>
              {INSTANCE_OPTIONS.map(i => <option key={i}>{i}</option>)}
            </select>
          </Field>

          <Field label="Remarks" style={{ gridColumn: "1 / -1" }}>
            <input value={form.notes} onChange={e => set("notes", e.target.value)}
              placeholder="Optional note" style={inputStyle} />
          </Field>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border, #e3e6ea)", display: "flex", justifyContent: "space-between" }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={btnPrimary}>
            {saving ? "Saving…" : `Create Entry`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, error, children, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted, #6b7280)", textTransform: "uppercase", letterSpacing: ".06em" }}>
        {label}{required && <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <span style={{ fontSize: 11, color: "#dc2626" }}>{error}</span>}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 12px",
  border: "1px solid var(--border, #e3e6ea)", borderRadius: 8,
  fontSize: 13, fontFamily: "var(--font-body)",
  color: "var(--text, #111827)", background: "#fff",
  outline: "none", appearance: "none", boxSizing: "border-box",
};

const btnGhost = {
  padding: "9px 18px", background: "transparent",
  border: "1px solid var(--border, #e3e6ea)", borderRadius: 8,
  fontSize: 13, fontWeight: 600, color: "var(--text-muted, #6b7280)",
  cursor: "pointer", fontFamily: "var(--font-body)",
};

const btnPrimary = {
  padding: "9px 18px", background: "#1a1f2e",
  border: "none", borderRadius: 8,
  fontSize: 13, fontWeight: 700, color: "#fff",
  cursor: "pointer", fontFamily: "var(--font-body)",
};
