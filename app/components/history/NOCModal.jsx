"use client";
import { useState, useEffect, useRef } from "react";
import useDashboardStore, { fmtMoney } from "@/lib/use-store";
import { defaultLogoFor, defaultSignatureFor } from "@/lib/noc-defaults";

const COMPANIES = ["Vizva", "SilverSpace", "Flawless"];

const DEFAULT_SETTINGS = {
  Vizva: {
    company_name:    "Vizva Inc",
    company_address: "123 Business Park, Suite 100, New York, NY 10001",
    ein:             "XX-XXXXXXX",
    email:           "compliance@vizva.com",
    phone:           "+1 (800) 000-0001",
    website:         "www.vizva.com",
    signature_name:  "Authorized Signatory",
    signature_title: "Director of Operations",
  },
  SilverSpace: {
    company_name:    "SilverSpace Inc",
    company_address: "456 Enterprise Ave, Floor 3, Austin, TX 78701",
    ein:             "XX-XXXXXXX",
    email:           "compliance@silverspace.com",
    phone:           "+1 (800) 000-0002",
    website:         "www.silverspace.com",
    signature_name:  "Authorized Signatory",
    signature_title: "Director of Operations",
  },
  Flawless: {
    company_name:    "Flawless-ED",
    company_address: "789 Innovation Blvd, Chicago, IL 60601",
    ein:             "XX-XXXXXXX",
    email:           "compliance@flawless-ed.com",
    phone:           "+1 (800) 000-0003",
    website:         "www.flawless-ed.com",
    signature_name:  "Authorized Signatory",
    signature_title: "Director of Operations",
  },
};

const DEFAULT_BODY = `This is to certify that {candidate_name} has been successfully placed by {our_company} with {company_name}. We have no objection to their continued employment and hereby confirm receipt of the total agreed service fee of {total_amount}.

This certificate is issued in good faith and represents the complete discharge of all financial obligations between the parties for the placement of the above-named candidate.

We wish {candidate_name} continued success in their career.`;

function todayFormatted() {
  const d = new Date();
  return `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}/${d.getFullYear()}`;
}
function currentYear() { return new Date().getFullYear(); }
function refNum() { return `NOC-${currentYear()}-${String(Math.floor(Math.random()*9000)+1000)}`; }

export default function NOCModal({ candidate, company, totalAmount, onClose }) {
  const { loadNOCSettings, nocSettings } = useDashboardStore();
  const [loadingSettings, setLoadingSettings] = useState(!nocSettings);
  const [selectedCo, setSelectedCo] = useState(() => {
    /* pre-select company closest to candidate's company if passed */
    if (company) {
      const lc = company.toLowerCase();
      if (lc.includes("vizva") || lc.includes("vcs")) return "Vizva";
      if (lc.includes("silver"))                      return "SilverSpace";
      if (lc.includes("flawless"))    return "Flawless";
    }
    return "Vizva";
  });
  const nocRef = useRef(refNum());
  const today  = todayFormatted();

  useEffect(() => {
    if (!nocSettings) {
      setLoadingSettings(true);
      loadNOCSettings().finally(() => setLoadingSettings(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allSettings = nocSettings || {};

  /* Per-company settings: CMS keys prefixed with company slug */
  const coSlug = selectedCo.toLowerCase().replace(/\s+/g, "_");
  const def = DEFAULT_SETTINGS[selectedCo] || DEFAULT_SETTINGS.Vizva;

  const s = {
    company_name:    allSettings[`${coSlug}_company_name`]    || def.company_name,
    company_address: allSettings[`${coSlug}_company_address`] || def.company_address,
    ein:             allSettings[`${coSlug}_ein`]             || def.ein,
    email:           allSettings[`${coSlug}_email`]           || def.email,
    phone:           allSettings[`${coSlug}_phone`]           || def.phone,
    website:         allSettings[`${coSlug}_website`]         || def.website,
    logo_url:        allSettings[`${coSlug}_logo_url`]        || allSettings.logo_url        || defaultLogoFor(coSlug),
    watermark_url:   allSettings[`${coSlug}_watermark_url`]   || allSettings.watermark_url   || defaultLogoFor(coSlug),
    signature_name:  allSettings[`${coSlug}_signature_name`]  || allSettings.signature_name  || def.signature_name,
    signature_title: allSettings[`${coSlug}_signature_title`] || allSettings.signature_title || def.signature_title,
    signature_url:   allSettings[`${coSlug}_signature_url`]   || allSettings.signature_url   || defaultSignatureFor(coSlug),
    noc_body_template: allSettings[`${coSlug}_noc_body_template`] || allSettings.noc_body_template || DEFAULT_BODY,
  };

  const bodyText = s.noc_body_template
    .replace(/{candidate_name}/g, candidate || "Candidate")
    .replace(/{company_name}/g,   company   || "Company")
    .replace(/{total_amount}/g,   fmtMoney(totalAmount))
    .replace(/{date}/g,           today)
    .replace(/{our_company}/g,    s.company_name);

  /* ── PDF Download ── */
  const handleDownloadPDF = async () => {
    if (typeof window.jspdf === "undefined") {
      await new Promise((resolve, reject) => {
        const sc = document.createElement("script");
        sc.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        sc.onload = resolve; sc.onerror = reject;
        document.head.appendChild(sc);
      });
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:"portrait", unit:"pt", format:"letter" });
    const W = 612, H = 792, margin = 48;
    const primary = [26, 31, 46]; /* dark navy */
    const accent  = [37, 99, 235]; /* blue */
    const ink     = [17, 24, 39];

    /* Border */
    doc.setDrawColor(...primary);
    doc.setLineWidth(3);
    doc.rect(18, 18, W-36, H-36);
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.5);
    doc.rect(24, 24, W-48, H-48);

    /* Watermark */
    doc.setTextColor(...accent);
    doc.setGState(doc.GState({ opacity:0.05 }));
    if (s.watermark_url && s.watermark_url.startsWith("data:")) {
      try {
        doc.addImage(s.watermark_url, W/2 - 150, H/2 - 150, 300, 300);
      } catch (e) {
        doc.setFontSize(140);
        doc.setFont("helvetica","bold");
        doc.text(s.company_name.slice(0,3).toUpperCase(), W/2, H/2+50, { align:"center" });
      }
    } else {
      doc.setFontSize(140);
      doc.setFont("helvetica","bold");
      doc.text(s.company_name.slice(0,3).toUpperCase(), W/2, H/2+50, { align:"center" });
    }
    doc.setGState(doc.GState({ opacity:1 }));

    let y = margin + 30;

    /* Company name */
    doc.setTextColor(...ink);
    doc.setFontSize(20);
    doc.setFont("helvetica","bold");
    doc.text(s.company_name, margin, y);
    y += 20;

    if (s.company_address) {
      doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(80,80,80);
      doc.text(s.company_address, margin, y); y += 14;
    }

    /* Right meta */
    let ry = margin + 30;
    doc.setFontSize(8.5); doc.setTextColor(80,80,80);
    if (s.ein)     { doc.text(`EIN: ${s.ein}`,   W-margin, ry, {align:"right"}); ry+=12; }
    if (s.email)   { doc.text(s.email,            W-margin, ry, {align:"right"}); ry+=12; }
    if (s.phone)   { doc.text(s.phone,            W-margin, ry, {align:"right"}); ry+=12; }
    if (s.website) { doc.text(s.website,          W-margin, ry, {align:"right"}); ry+=12; }

    y = Math.max(y, ry) + 10;

    /* Separator */
    doc.setDrawColor(...accent); doc.setLineWidth(2);
    doc.line(margin, y, W-margin, y); y += 14;

    /* Ref / date */
    doc.setFontSize(8.5); doc.setTextColor(100,100,100); doc.setFont("helvetica","normal");
    doc.text(`Ref: ${nocRef.current}`, margin, y);
    doc.text(`Date: ${today}`, W-margin, y, {align:"right"}); y += 22;

    /* Title */
    doc.setFontSize(18); doc.setFont("helvetica","bold");
    doc.setTextColor(...accent);
    doc.text("NO OBJECTION CERTIFICATE", W/2, y, {align:"center"}); y += 8;
    const tw = 280;
    doc.setFillColor(...accent);
    doc.rect((W-tw)/2, y, tw, 2.5, "F"); y += 22;

    /* Body */
    doc.setFontSize(11); doc.setFont("helvetica","normal"); doc.setTextColor(...ink);
    const lines = doc.splitTextToSize(bodyText, W-margin*2);
    lines.forEach(line => {
      if (y > H-120) { doc.addPage(); y = margin+20; }
      doc.text(line, margin, y); y += 16;
    });
    y += 30;

    /* Signature */
    if (s.signature_name || s.signature_title) {
      doc.setDrawColor(...accent); doc.setLineWidth(0.75);
      doc.line(margin, y, margin+200, y); y += 14;
      doc.setFontSize(10); doc.setFont("helvetica","bold"); doc.setTextColor(...ink);
      if (s.signature_name)  { doc.text(s.signature_name, margin, y); y+=13; }
      if (s.signature_title) { doc.setFont("helvetica","normal"); doc.setTextColor(100,100,100); doc.text(s.signature_title, margin, y); }
    }

    doc.save(`NOC_${selectedCo}_${(candidate||"Candidate").replace(/\s+/g,"_")}_${currentYear()}.pdf`);
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && onClose()} style={{ zIndex:9000 }}>
      <div className="modal-card" style={{ maxWidth:780, width:"100%", maxHeight:"92vh", overflowY:"auto" }}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title" style={{ fontSize:15, fontWeight:700 }}>No Objection Certificate</div>
            <div style={{ fontSize:12, color:"var(--color-ink-muted)", marginTop:3 }}>{candidate}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Company Selector */}
        <div style={{ padding:"12px 24px", borderBottom:"1px solid var(--color-border)", background:"var(--color-surface-2)", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:12, fontWeight:700, color:"var(--color-ink-muted)", textTransform:"uppercase", letterSpacing:".06em" }}>Issuing Company:</span>
          <div style={{ display:"flex", gap:6 }}>
            <span style={{
              padding:"5px 16px", borderRadius:"var(--radius-full)", fontSize:12, fontWeight:600,
              border:"1px solid var(--color-primary)", background:"var(--color-primary)", color:"#fff"
            }}>
              {selectedCo}
            </span>
          </div>
        </div>

        <div className="modal-body">
          {loadingSettings ? (
            <div style={{ display:"flex", alignItems:"center", gap:10, justifyContent:"center", padding:"40px 0", color:"var(--color-ink-muted)" }}>
              <div style={{ width:18, height:18, border:"2px solid var(--color-accent)", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
              Loading settings…
            </div>
          ) : (
            /* NOC Preview */
            <div style={{
              background:"#fff", color:"#111827", borderRadius:8, padding:"32px 36px",
              position:"relative", overflow:"hidden", fontFamily:"Georgia, serif",
              border:"1px solid var(--color-border)", boxShadow:"var(--shadow-md)",
            }}>
              {/* Watermark */}
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none", zIndex:0, opacity:0.05, overflow:"hidden" }}>
                {s.watermark_url ? (
                  <img src={s.watermark_url} alt="" style={{ maxWidth:"80%", maxHeight:"80%", objectFit:"contain" }} />
                ) : (
                  <span style={{ fontSize:120, fontWeight:900, color:"#1a1f2e", letterSpacing:-4 }}>
                    {s.company_name.slice(0,3).toUpperCase()}
                  </span>
                )}
              </div>

              <div style={{ position:"relative", zIndex:1 }}>
                {/* Header */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                  <div>
                    {s.logo_url && <img src={s.logo_url} alt="logo" style={{ height:36, marginBottom:6, display:"block" }} />}
                    <div style={{ fontSize:17, fontWeight:700, color:"#111827", fontFamily:"Georgia, serif" }}>{s.company_name}</div>
                    {s.company_address && <div style={{ fontSize:10, color:"#6b7280", marginTop:3 }}>{s.company_address}</div>}
                  </div>
                  <div style={{ textAlign:"right", fontSize:10, color:"#6b7280", lineHeight:1.7 }}>
                    {s.ein     && <div><strong>EIN:</strong> {s.ein}</div>}
                    {s.email   && <div>{s.email}</div>}
                    {s.phone   && <div>{s.phone}</div>}
                    {s.website && <div>{s.website}</div>}
                  </div>
                </div>

                {/* Separator */}
                <div style={{ height:2, background:"#1a1f2e", marginBottom:12 }} />

                {/* Ref + Date */}
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#9ca3af", marginBottom:16 }}>
                  <span>Ref: {nocRef.current}</span>
                  <span>Date: {today}</span>
                </div>

                {/* Title */}
                <div style={{ textAlign:"center", marginBottom:18 }}>
                  <div style={{ fontSize:16, fontWeight:700, letterSpacing:1, color:"#1a1f2e", fontFamily:"Georgia, serif", textTransform:"uppercase" }}>
                    No Objection Certificate
                  </div>
                  <div style={{ height:2.5, background:"#2563eb", width:220, margin:"6px auto 0" }} />
                </div>

                {/* Body */}
                <div style={{ fontSize:12.5, lineHeight:1.85, color:"#374151", whiteSpace:"pre-line" }}>
                  {bodyText}
                </div>

                {/* Signature */}
                {(s.signature_name || s.signature_title) && (
                  <div style={{ marginTop:36 }}>
                    {s.signature_url && <img src={s.signature_url} alt="signature" style={{ height:48, marginBottom:4 }} />}
                    <div style={{ borderTop:"1px solid #2563eb", paddingTop:8, width:200 }}>
                      {s.signature_name  && <div style={{ fontSize:12, fontWeight:700, color:"#111827" }}>{s.signature_name}</div>}
                      {s.signature_title && <div style={{ fontSize:10.5, color:"#6b7280" }}>{s.signature_title}</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ fontSize:11, color:"var(--color-ink-subtle)", marginTop:4 }}>
            Preview reflects CMS settings for <strong>{selectedCo}</strong>. Configure each company under Admin → Company Profiles.
          </div>
        </div>

        <div className="modal-footer">
          <span style={{ flex:1, fontSize:11, color:"var(--color-ink-muted)" }}>
            Total payable: <strong style={{ color:"var(--color-accent)" }}>{fmtMoney(totalAmount)}</strong>
          </span>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleDownloadPDF}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download PDF — {selectedCo}
          </button>
        </div>
      </div>
    </div>
  );
}
