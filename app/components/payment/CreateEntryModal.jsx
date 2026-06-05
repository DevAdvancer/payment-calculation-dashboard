"use client";

import { useState } from "react";
import useDashboardStore, {
  ALL_STATUSES,
  INSTANCE_OPTIONS,
  dateInputToMMDDYYYY,
} from "@/lib/use-store";

const EMPTY_FORM = {
  candidate:   "",
  company:     "",
  date:        "",
  instance:    "First Half",
  amount:      "",
  paid:        "0",
  status:      "Pending",
  serviceType: "",
  agreement:   "",
  remarks:     "",
};

export default function CreateEntryModal({ onClose }) {
  const createEntry = useDashboardStore((s) => s.createEntry);
  const showToast   = useDashboardStore((s) => s.showToast);

  const [form,   setForm]   = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const due = Math.max(0, parseFloat(form.amount || 0) - parseFloat(form.paid || 0));

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.candidate.trim()) errs.candidate = "Candidate name is required";
    if (!form.company.trim())   errs.company   = "Company is required";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);

    const amount = parseFloat(form.amount) || 0;
    const paid   = parseFloat(form.paid)   || 0;

    await createEntry({
      id:          Date.now().toString(),
      candidate:   form.candidate.trim(),
      company:     form.company.trim(),
      date:        dateInputToMMDDYYYY(form.date),
      instance:    form.instance,
      amount,
      paid,
      due:         Math.max(0, amount - paid),
      status:      form.status,
      serviceType: form.serviceType.trim(),
      agreement:   form.agreement.trim(),
      remarks:     form.remarks.trim(),
    });

    showToast("Entry created successfully");
    onClose();
  };

  return (
    <>
      <style>{`
        .cem-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(13, 15, 15, 0.78);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.15s ease;
        }
        .cem-card {
          background: var(--surface);
          border: 1px solid var(--border-md);
          border-radius: var(--r-xl);
          width: 100%;
          max-width: 640px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(51,153,137,0.1) inset;
          animation: slideUp 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .cem-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 22px 16px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .cem-title {
          font-family: var(--font-serif);
          font-size: 18px;
          color: var(--cream);
          letter-spacing: -0.01em;
        }
        .cem-title-sub {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .cem-close {
          width: 30px; height: 30px;
          border-radius: var(--r-md);
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 18px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
          font-family: var(--font);
          padding: 0; line-height: 1;
        }
        .cem-close:hover { border-color: var(--teal); color: var(--cream); }
        .cem-body {
          padding: 20px 22px;
          overflow-y: auto;
          flex: 1;
        }
        .cem-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .cem-full { grid-column: 1 / -1; }
        .cem-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          padding: 14px 22px;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
        }
        .due-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(51,153,137,0.12);
          border: 1px solid rgba(51,153,137,0.25);
          border-radius: var(--r-full);
          padding: 3px 10px;
          font-size: 11px;
          color: var(--mint);
          font-weight: 600;
          margin-top: 5px;
          align-self: flex-start;
        }
      `}</style>

      <div
        className="cem-backdrop modal-backdrop"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="cem-card modal-card">
          <div className="cem-header modal-header">
            <div>
              <div className="cem-title modal-title">New Payment Entry</div>
              <div className="cem-title-sub">Add a placement record to the active sheet</div>
            </div>
            <button className="cem-close modal-close" onClick={onClose} aria-label="Close">×</button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="cem-body modal-body">
              <div className="cem-grid">

                {/* Candidate */}
                <div className={`field ${errors.candidate ? "field-has-error" : ""}`}>
                  <label>Candidate *</label>
                  <input
                    type="text"
                    value={form.candidate}
                    onChange={set("candidate")}
                    placeholder="Full name"
                    autoFocus
                  />
                  {errors.candidate && <span className="field-error">{errors.candidate}</span>}
                </div>

                {/* Company */}
                <div className={`field ${errors.company ? "field-has-error" : ""}`}>
                  <label>Company *</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={set("company")}
                    placeholder="Company name"
                  />
                  {errors.company && <span className="field-error">{errors.company}</span>}
                </div>

                {/* Date */}
                <div className="field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={set("date")}
                  />
                </div>

                {/* Instance */}
                <div className="field">
                  <label>Instance</label>
                  <select value={form.instance} onChange={set("instance")}>
                    {INSTANCE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div className="field">
                  <label>Amount ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={set("amount")}
                    placeholder="0.00"
                  />
                </div>

                {/* Paid + Due preview */}
                <div className="field">
                  <label>Paid ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.paid}
                    onChange={set("paid")}
                    placeholder="0.00"
                  />
                  <span className="due-chip">
                    Due: ${due.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Status */}
                <div className="field">
                  <label>Status</label>
                  <select value={form.status} onChange={set("status")}>
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Service Type */}
                <div className="field">
                  <label>Service Type</label>
                  <input
                    type="text"
                    value={form.serviceType}
                    onChange={set("serviceType")}
                    placeholder="e.g. Permanent, Contract"
                  />
                </div>

                {/* Agreement */}
                <div className="field cem-full">
                  <label>Type / Agreement</label>
                  <input
                    type="text"
                    value={form.agreement}
                    onChange={set("agreement")}
                    placeholder="e.g. 15% in 6 months"
                  />
                </div>

                {/* Remarks */}
                <div className="field cem-full">
                  <label>Remarks</label>
                  <textarea
                    rows={2}
                    value={form.remarks}
                    onChange={set("remarks")}
                    placeholder="Any additional notes..."
                    style={{ resize: "vertical" }}
                  />
                </div>

              </div>
            </div>

            <div className="cem-footer modal-footer">
              <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Create Entry"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
