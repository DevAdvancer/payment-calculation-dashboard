  import { useState, useEffect } from "react";

export default function DefaulterModal({ isOpen, onClose, onSubmit, entry, allEntries = [] }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    company: "",
    firstName: "",
    lastName: "",
    street2: "",
    city: "",
    state: "",
    zip: "",
    homePhone: "",
    email: "",
    driversLicense: "",
    lastChargeDate: "",
    totalAmount: "",
    amountPaid: "",
    outstandingAmount: "",
    dateLastPaid: "",
    ssn: "",
    dob: "",
    notes: "",
    updates: "",
  });

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      const nameParts = (entry?.candidate || "").trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Safely parse local date to ISO for the <input type="date">
      const toISODate = (dateStr) => {
        if (!dateStr) return "";
        const s = String(dateStr).trim();
        // If it's already YYYY-MM-DD, return it directly to avoid timezone shift
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        // Handle MM-DD-YYYY, M-D-YYYY, MM/DD/YYYY, or M/D/YYYY
        const m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
        if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
        // Fallback for other formats
        const d = new Date(s);
        if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return "";
      };

      const total = parseFloat(entry?.amount) || 0;
      const paid = parseFloat(entry?.paid) || 0;
      // Recalculate outstanding amount in case of stale data
      const outstanding = Math.max(0, total - paid);

      /* ── Date Last Paid ──
       * Find the most recent "Received" entry among ALL entries for
       * this candidate and use its poDate.  Falls back to "" if none. */
      const candidateName = (entry?.candidate || "").trim().toLowerCase();
      let dateLastPaid = "";
      if (candidateName && allEntries.length) {
        const receivedEntries = allEntries
          .filter(e =>
            (e.candidate || "").trim().toLowerCase() === candidateName &&
            e.status === "Received" &&
            e.poDate
          )
          .map(e => {
            const iso = toISODate(e.poDate);
            return { iso, entry: e };
          })
          .filter(e => e.iso)      // discard unparseable dates
          .sort((a, b) => b.iso.localeCompare(a.iso)); // newest first
        if (receivedEntries.length) {
          dateLastPaid = receivedEntries[0].iso;
        }
      }

      setFormData({
        company: entry?.company || "",
        firstName: firstName,
        lastName: lastName,
        street2: "",
        city: "",
        state: "",
        zip: "",
        homePhone: "",
        email: "",
        driversLicense: "",
        lastChargeDate: toISODate(entry?.poDate),
        totalAmount: total,
        amountPaid: paid,
        outstandingAmount: outstanding,
        dateLastPaid,
        ssn: "",
        dob: "",
        notes: entry?.notes || "",
        updates: "",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, entry?.id]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleNext = () => setStep(2);
  const handleBack = () => setStep(1);

  const handleSubmit = () => {
    const processedData = {
      ...formData,
      totalAmount: parseFloat(formData.totalAmount) || 0,
      amountPaid: parseFloat(formData.amountPaid) || 0,
      outstandingAmount: parseFloat(formData.outstandingAmount) || 0,
    };
    onSubmit(processedData);
    setStep(1);
  };

  const handleCancel = () => {
    setStep(1);
    onClose();
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    background: "var(--surface-2, #1e2433)",
    border: "1px solid var(--border, #2d3748)",
    borderRadius: "6px",
    color: "var(--text-main, #f3f4f6)",
    fontSize: "14px",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    fontSize: "12px",
    fontWeight: "600",
    color: "var(--text-muted, #9ca3af)",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  const formGroupStyle = {
    marginBottom: "16px",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "var(--surface, #111827)",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "700px",
          padding: "30px",
          border: "1px solid var(--border, #2d3748)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        <h2 style={{ fontSize: "20px", color: "var(--text-main, white)", marginBottom: "24px" }}>
          Mark as Defaulter - Step {step} of 2
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {step === 1 && (
            <>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Company</label>
                <input style={inputStyle} name="company" value={formData.company} onChange={handleChange} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Debtor First Name</label>
                <input style={inputStyle} name="firstName" value={formData.firstName} onChange={handleChange} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Debtor Last Name</label>
                <input style={inputStyle} name="lastName" value={formData.lastName} onChange={handleChange} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Street 2</label>
                <input style={inputStyle} name="street2" value={formData.street2} onChange={handleChange} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>City</label>
                <input style={inputStyle} name="city" value={formData.city} onChange={handleChange} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>State</label>
                <input style={inputStyle} name="state" value={formData.state} onChange={handleChange} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Zip</label>
                <input style={inputStyle} name="zip" value={formData.zip} onChange={handleChange} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Home Phone</label>
                <input style={inputStyle} name="homePhone" value={formData.homePhone} onChange={handleChange} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} name="email" value={formData.email} onChange={handleChange} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Drivers License</label>
                <input style={inputStyle} name="driversLicense" value={formData.driversLicense} onChange={handleChange} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Last Charge Date</label>
                <input style={inputStyle} type="date" name="lastChargeDate" value={formData.lastChargeDate} onChange={handleChange} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Total Amount</label>
                <input style={inputStyle} name="totalAmount" value={formData.totalAmount} onChange={handleChange} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Amount Paid</label>
                <input style={inputStyle} name="amountPaid" value={formData.amountPaid} onChange={handleChange} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Outstanding Amount</label>
                <input style={inputStyle} name="outstandingAmount" value={formData.outstandingAmount} onChange={handleChange} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Date Last Paid</label>
                <input style={inputStyle} type="date" name="dateLastPaid" value={formData.dateLastPaid} onChange={handleChange} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>SSN</label>
                <input style={inputStyle} name="ssn" value={formData.ssn} onChange={handleChange} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>DOB</label>
                <input style={inputStyle} type="date" name="dob" value={formData.dob} onChange={handleChange} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Notes</label>
                <textarea style={{ ...inputStyle, minHeight: "38px" }} name="notes" value={formData.notes} onChange={handleChange} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Updates</label>
                <input style={inputStyle} name="updates" value={formData.updates} onChange={handleChange} />
              </div>
            </>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "30px" }}>
          <div>
            <button
              onClick={handleCancel}
              style={{
                background: "transparent",
                border: "1px solid var(--border, #374151)",
                color: "var(--text-main, white)",
                padding: "10px 20px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Cancel
            </button>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            {step === 2 && (
              <button
                onClick={handleBack}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border, #374151)",
                  color: "var(--text-main, white)",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Back
              </button>
            )}
            {step === 1 ? (
              <button
                onClick={handleNext}
                style={{
                  background: "var(--brand, #6366f1)",
                  border: "none",
                  color: "white",
                  padding: "10px 24px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Next &rarr;
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                style={{
                  background: "var(--brand, #6366f1)",
                  border: "none",
                  color: "white",
                  padding: "10px 24px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Submit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
