"use client";
import useDashboardStore, { fmtMoneyC } from "@/lib/use-store";

export default function PaymentDashboardPage() {
  const { lastDashboard, navigate, showToast } = useDashboardStore();

  if (!lastDashboard) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16, padding: 32 }}>
        <div style={{ width: 56, height: 56, background: "var(--color-surface-2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)", marginBottom: 6 }}>No Dashboard Data</div>
          <div style={{ fontSize: 13, color: "var(--color-ink-muted)", maxWidth: 320 }}>
            Submit a placement from Config Entry to see the payment dashboard here.
          </div>
        </div>
        <button
          onClick={() => navigate("placement")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create New Placement
        </button>
      </div>
    );
  }

  const d = lastDashboard;
  const cur = d.currency || "USD";
  const isUK = d.isUK || cur === "GBP";
  const annualPkg = d.totalSalary > 0
    ? d.totalSalary
    : (d.pct > 0 ? d.totalContractValue / (d.pct / 100) : 0);
  const totalPaid    = (d.installments || []).reduce((s, e) => s + (parseFloat(e.paid) || 0), 0);
  const outstanding  = d.totalContractValue - totalPaid;
  const firstInstAmt = (d.installments && d.installments[0]) ? (parseFloat(d.installments[0].amount) || 0) : (isUK ? 0 : 1500);

  const handleCopy = () => {
    const el = document.getElementById("dash-email-body");
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("copy");
    sel.removeAllRanges();
    showToast("✓ Email copied to clipboard");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar metrics */}
      <aside style={{
        width: 280, minWidth: 280, background: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)", padding: 24,
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--color-ink-muted)", marginBottom: 2 }}>
          Placement Summary
        </div>

        {[
          { label: "Contract Value",      value: fmtMoneyC(d.totalContractValue, cur, 0), sub: "Total agreement amount" },
          ...(isUK ? [] : [
            { label: "First Installment", value: fmtMoneyC(firstInstAmt, cur, 0),         sub: "Due on the day of joining" },
          ]),
          { label: "Monthly Installment", value: fmtMoneyC(d.monthlyAmt, cur, 2),         sub: `Across ${d.months} months` },
          { label: "Outstanding",         value: fmtMoneyC(outstanding, cur, 0),          sub: "Remaining to collect" },
        ].map(m => (
          <div key={m.label} style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-lg)", padding: 14 }}>
            <div style={{ fontSize: 11, color: "var(--color-ink-muted)", fontWeight: 500, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-ink)", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)" }}>{m.value}</div>
            <div style={{ fontSize: 11, color: "var(--color-ink-muted)", marginTop: 2 }}>{m.sub}</div>
          </div>
        ))}

        <div style={{ height: 1, background: "var(--color-border-light)" }} />

        <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-lg)", padding: 14 }}>
          <div style={{ fontSize: 11, color: "var(--color-ink-muted)", fontWeight: 500, marginBottom: 4 }}>Agreement</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-ink)", letterSpacing: "-0.02em" }}>{d.pct}% / {d.months} months</div>
          <div style={{ fontSize: 11, color: "var(--color-ink-muted)", marginTop: 2 }}>Client: {d.client}</div>
        </div>

        <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-lg)", padding: 14 }}>
          <div style={{ fontSize: 11, color: "var(--color-ink-muted)", fontWeight: 500, marginBottom: 4 }}>Candidate</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-ink)" }}>{d.name}</div>
          <div style={{ fontSize: 11, color: "var(--color-ink-muted)", marginTop: 2 }}>{d.company}</div>
        </div>

        <button
          onClick={() => navigate("placement")}
          style={{ marginTop: "auto", padding: "10px 16px", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}
        >
          + New Placement
        </button>
        <button
          onClick={() => navigate("payment")}
          style={{ padding: "8px 16px", background: "transparent", color: "var(--color-ink-muted)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)" }}
        >
          View Payment Sheet
        </button>
      </aside>

      {/* Email preview */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>Email Preview</div>
            <div style={{ fontSize: 11, color: "var(--color-ink-muted)", marginTop: 1 }}>Copy and paste into your email client</div>
          </div>
          <button
            onClick={handleCopy}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: 12, fontWeight: 500, color: "var(--color-ink-2)", cursor: "pointer", fontFamily: "var(--font-body)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy Email
          </button>
        </div>

        <div style={{ flex: 1, background: "var(--color-bg)", padding: "32px 24px", overflowY: "auto", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 640, background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 4px 18px rgba(0,0,0,0.08)", overflow: "hidden" }} id="dash-email-body">
            <div style={{ padding: "14px 40px 0", background: "#ffffff" }}>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13, fontWeight: 500, color: "#2563eb" }}>
                Subject: Payment Schedule - {d.company}
              </div>
            </div>
            <div style={{ background: "#ffffff", padding: "12px 40px 40px", color: "#374151", fontSize: 14, lineHeight: 1.4 }}>
              <p style={{ margin: "0" }}>Dear <strong>{d.name}</strong>,</p>
              <p style={{ margin: "0" }}>Congratulations on receiving your offer! It has been a pleasure working with you, and we are delighted to have played a part in helping you achieve this milestone in your career. Please find the breakdown of your payment details and schedule shared below.</p>

              <table style={{ width: "100%", maxWidth: 460, borderCollapse: "collapse", margin: "20px 0", border: "2px solid #000", fontSize: 13 }}>
                <tbody>
                  <tr style={{ background: "#000", color: "#fff", fontWeight: "bold" }}>
                    <td style={{ border: "1px solid #333", padding: "6px 12px" }}>Payment Breakup</td>
                    <td style={{ border: "1px solid #333", padding: "6px 12px" }}>{d.name}</td>
                  </tr>
                  <tr style={{ background: "#000", color: "#fff", fontWeight: "bold" }}>
                    <td style={{ border: "1px solid #000", padding: "6px 12px" }}>Client</td>
                    <td style={{ border: "1px solid #000", padding: "6px 12px" }}>{d.client}</td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #000", padding: "6px 12px", fontWeight: "bold", background: "#fff", width: "45%" }}>Annual Package</td>
                    <td style={{ border: "1px solid #000", padding: "6px 12px", fontFamily: "var(--font-mono)", width: "55%" }}>{fmtMoneyC(annualPkg, cur, 2)}</td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #000", padding: "6px 12px", fontWeight: "bold", background: "#fff" }}>Agreement %</td>
                    <td style={{ border: "1px solid #000", padding: "6px 12px", fontFamily: "var(--font-mono)" }}>{d.pct}% in {d.months} Months</td>
                  </tr>
                  <tr style={{ fontWeight: "bold", background: "#f9fafb" }}>
                    <td style={{ border: "1px solid #000", padding: "6px 12px", fontWeight: "bold" }}>Total Outstanding</td>
                    <td style={{ border: "1px solid #000", padding: "6px 12px", fontFamily: "var(--font-mono)" }}>{fmtMoneyC(outstanding, cur, 2)}</td>
                  </tr>
                  {d.rows.map((row, i) => (
                    <tr key={i}>
                      <td style={{ border: "1px solid #000", padding: "6px 12px", fontWeight: "bold", background: "#fff" }}>
                        {row.label}
                      </td>
                      <td style={{ border: "1px solid #000", padding: "6px 12px", fontFamily: "var(--font-mono)" }}>{fmtMoneyC(row.amount, cur, 2)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#000", color: "#fff", fontWeight: "bold" }}>
                    <td style={{ border: "1px solid #333", padding: "6px 12px" }}>Total Amount</td>
                    <td style={{ border: "1px solid #333", padding: "6px 12px", fontFamily: "var(--font-mono)" }}>{fmtMoneyC(d.totalContractValue, cur, 2)}</td>
                  </tr>
                </tbody>
              </table>

              <p style={{ margin: "0 0 6px 0" }}>We sincerely appreciate your trust in <strong>{d.company}</strong> and look forward to continuing our professional association with you.</p>

              <div style={{ background: "#fffbeb", borderLeft: "3px solid #f59e0b", padding: "12px 16px", borderRadius: "0 4px 4px 0", marginBottom: 14, fontSize: 13 }}>
                <strong>Important Notice:</strong> Going forward, this email thread will serve as the official communication channel for any queries, issues, clarifications, or requests related to compliance.
              </div>

              <p style={{ marginBottom: 0 }}>If you are unable to reach us by phone, you may reply directly to this email or send us a text message, and our Compliance Team will assist you accordingly.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
