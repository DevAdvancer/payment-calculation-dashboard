import React from "react";
import { fmtMoneyC } from "@/lib/use-store";

export default function DefaulterPreviewModal({ isOpen, onClose, data }) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !data) return null;

  const candidateName = [data.firstName, data.lastName].filter(Boolean).join(" ") || "Candidate Name";
  const fields = [
    { label: "Company", value: data.company },
    { label: "First Name", value: data.firstName },
    { label: "Last Name", value: data.lastName },
    { label: "Street", value: data.street2 },
    { label: "City", value: data.city },
    { label: "Zip", value: data.zip },
    { label: "Phone", value: data.homePhone },
    { label: "Email", value: data.email },
    { label: "Drivers License", value: data.driversLicense },
    { label: "Last Charge Date", value: data.lastChargeDate },
    { label: "Total Amount", value: fmtMoneyC(data.totalAmount, "USD", 2), isAmount: true },
    { label: "Amount Paid", value: fmtMoneyC(data.amountPaid, "USD", 2), isAmount: true },
    { label: "Outstanding Amount", value: fmtMoneyC(data.outstandingAmount, "USD", 2), isAmount: true },
    { label: "Date Last Paid", value: data.dateLastPaid },
    { label: "SSN", value: data.ssn },
    { label: "Date of Birth", value: data.dob },
    { label: "Notes", value: data.notes },
  ].map((field) => ({ ...field, value: field.value || "—" }));

  const handleCopy = () => {
    const copyText = `Subject Line - Defaulter Details and Supporting Documents of (${candidateName})

Dear Team,

Please find attached the detailed list of defaulters along with the relevant supporting documents for your review and further reference.

The attached documents include the available details and supporting information related to the respective candidate’s accounts. These have been compiled to provide a clear overview of the outstanding cases and the relevant background for each defaulter.

Debtor Details
${fields.map(({ label, value }) => `${label}: ${value}`).join("\n")}

I request you to kindly review the attached details and documents and take the necessary action as required. In case any additional information, clarification, or supporting documentation is needed for any particular case, please feel free to let me know.

Please consider the attached information for further review and necessary follow-up from your end.

Thank you for your time and cooperation.`;

    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.75)", padding: "20px", backdropFilter: "blur(4px)"
    }}>
      <div style={{
        background: "var(--color-surface, #1e2433)", border: "1px solid var(--color-border, #2d3748)",
        borderRadius: "12px", width: "100%", maxWidth: "700px", display: "flex", flexDirection: "column",
        maxHeight: "90vh", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid var(--color-border, #2d3748)" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text, #f3f4f6)" }}>Email Preview</div>
            <div style={{ fontSize: 13, color: "var(--text-muted, #9ca3af)", marginTop: 4 }}>Copy and paste into your email client</div>
          </div>
          <button onClick={handleCopy} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: copied ? "rgba(16, 185, 129, 0.15)" : "rgba(255,255,255,0.05)", border: copied ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", fontSize: 13, fontWeight: 500, color: copied ? "#10b981" : "var(--text, #f3f4f6)", cursor: "pointer", transition: "all 0.2s" }}
            onMouseOver={(e) => !copied && (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
            onMouseOut={(e) => !copied && (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
          >
             {copied ? (
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
             ) : (
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
             )}
             {copied ? "Copied!" : "Copy Email"}
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, background: "#0b0f19" }}>
           <div style={{ padding: "32px 24px", minHeight: "min-content" }}>
             <div style={{ margin: "0 auto", width: "100%", maxWidth: 640, background: "#111827", border: "1px solid #1f2937", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 18px rgba(0,0,0,0.2)" }}>
              <div style={{ padding: "16px 32px", borderBottom: "1px solid #1f2937", background: "#0f172a" }}>
                <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13, fontWeight: 500, color: "#6366f1" }}>
                  Subject Line - Defaulter Details and Supporting Documents of ({candidateName})
                </div>
              </div>
              
              <div style={{ padding: "24px 32px 32px", color: "#e2e8f0", fontSize: 14, lineHeight: 1.6 }}>
                 <p style={{ margin: "0 0 16px 0" }}>Dear Team,</p>
                 <p style={{ margin: "0 0 16px 0" }}>Please find attached the detailed list of defaulters along with the relevant supporting documents for your review and further reference.</p>
                 <p style={{ margin: "0 0 24px 0" }}>The attached documents include the available details and supporting information related to the respective candidate’s accounts. These have been compiled to provide a clear overview of the outstanding cases and the relevant background for each defaulter.</p>
                 
                 <table style={{ width: "100%", borderCollapse: "collapse", margin: "24px 0", fontSize: 13, border: "2px solid #020617" }}>
                    <tbody>
                      <tr style={{ background: "#020617", color: "#fff", fontWeight: "bold" }}>
                        <td colSpan={2} style={{ border: "1px solid #1e293b", padding: "8px 12px", textAlign: "center" }}>Debtor Details</td>
                      </tr>
                      {fields.map((field, idx) => (
                        <tr key={idx} style={{ background: field.isAmount ? "#1e293b" : "#0f172a" }}>
                          <td style={{ border: "1px solid #1e293b", padding: "8px 12px", fontWeight: "bold", color: field.isAmount ? "#f8fafc" : "#94a3b8" }}>{field.label}</td>
                          <td style={{ border: "1px solid #1e293b", padding: "8px 12px", color: "#e2e8f0", fontFamily: field.isAmount ? "var(--font-mono)" : "inherit", fontWeight: field.isAmount ? "600" : "400" }}>{field.value}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>

                 <p style={{ margin: "48px 0 16px 0" }}>I request you to kindly review the attached details and documents and take the necessary action as required. In case any additional information, clarification, or supporting documentation is needed for any particular case, please feel free to let me know.</p>
                 <p style={{ margin: "0 0 16px 0" }}>Please consider the attached information for further review and necessary follow-up from your end.</p>
                 <p style={{ margin: 0 }}>Thank you for your time and cooperation.</p>
              </div>
           </div>
           </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--color-border, #2d3748)", display: "flex", justifyContent: "flex-end" }}>
           <button onClick={onClose} style={{ padding: "8px 24px", background: "#6366f1", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: 14, transition: "background 0.2s" }}
            onMouseOver={(e) => e.currentTarget.style.background = "#4f46e5"}
            onMouseOut={(e) => e.currentTarget.style.background = "#6366f1"}
           >
             Close Preview
           </button>
        </div>
      </div>
    </div>
  );
}
