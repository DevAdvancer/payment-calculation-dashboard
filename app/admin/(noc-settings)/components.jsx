"use client";
import { defaultLogoFor, defaultSignatureFor } from "@/lib/noc-defaults";

export const COMPANIES = ["Vizva", "SilverSpace", "Flawless"];

export const COMPANY_SLUGS = {
  Vizva:       "vizva",
  SilverSpace: "silverspace",
  Flawless:    "flawless",
};

export function fallbackFor(field, slug) {
  if (field === "logo_url" || field === "watermark_url") return defaultLogoFor(slug);
  if (field === "signature_url") return defaultSignatureFor(slug);
  return "";
}

export function Card({ title, children, style }) {
  return (
    <div style={{ background:"#fff", border:"1px solid #e3e6ea", borderRadius:12, padding:"24px 28px", boxShadow:"0 1px 3px rgba(0,0,0,0.06)", ...style }}>
      {title && <div style={{ fontSize:13, fontWeight:700, color:"#111827", marginBottom:20, paddingBottom:12, borderBottom:"1px solid #eef0f3" }}>{title}</div>}
      {children}
    </div>
  );
}

export function FieldRow({ children, full, triple }) {
  const cols = triple ? "1fr 1fr 1fr" : full ? "1fr" : "1fr 1fr";
  return <div style={{ display:"grid", gridTemplateColumns:cols, gap:16, marginBottom:16 }}>{children}</div>;
}

export function Field({ label, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {label && <label style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".07em", color:"#6b7280" }}>{label}</label>}
      {children}
    </div>
  );
}

const inputStyle = { background:"#fff", border:"1px solid #e3e6ea", borderRadius:8, padding:"9px 12px", color:"#111827", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", width:"100%", transition:"border-color 0.15s, box-shadow 0.15s" };
export const textareaStyle = { background:"#fff", border:"1px solid #e3e6ea", borderRadius:8, padding:"9px 12px", color:"#111827", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", width:"100%", resize:"vertical", transition:"border-color 0.15s" };

export function Input({ value, onChange, placeholder, type="text" }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={inputStyle}
      onFocus={e => { e.target.style.borderColor="#2563eb"; e.target.style.boxShadow="0 0 0 3px rgba(37,99,235,0.1)"; }}
      onBlur={e => { e.target.style.borderColor="#e3e6ea"; e.target.style.boxShadow="none"; }} />
  );
}

export function ImgUpload({ src, onChange, label, imgStyle }) {
  return (
    <div style={{ border:"2px dashed #e3e6ea", borderRadius:10, padding:20, textAlign:"center", cursor:"pointer", position:"relative", transition:"all 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor="#2563eb"}
      onMouseLeave={e => e.currentTarget.style.borderColor="#e3e6ea"}>
      <input type="file" accept="image/*" style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer" }}
        onChange={e => onChange(e.target.files[0])} />
      {src ? <img src={src} alt="" style={{ maxWidth:180, maxHeight:72, objectFit:"contain", borderRadius:6, marginBottom:6, display:"block", marginLeft:"auto", marginRight:"auto", ...imgStyle }} /> : null}
      <div style={{ fontSize:12, color:"#9ca3af" }}><span style={{ color:"#2563eb", fontWeight:600 }}>Click to upload</span> · {label}</div>
    </div>
  );
}

export function NOCPreview({ settings, company }) {
  const slug = COMPANY_SLUGS[company] || "vizva";
  const s = {
    company_name:    settings[`${slug}_company_name`]    || company,
    company_address: settings[`${slug}_company_address`] || "",
    ein:             settings[`${slug}_ein`]             || "",
    email:           settings[`${slug}_email`]           || "",
    phone:           settings[`${slug}_phone`]           || "",
    website:         settings[`${slug}_website`]         || "",
    logo_url:        settings[`${slug}_logo_url`]        || defaultLogoFor(slug),
    signature_url:   settings[`${slug}_signature_url`]   || defaultSignatureFor(slug),
    signature_name:  settings[`${slug}_signature_name`]  || "Authorized Signatory",
    signature_title: settings[`${slug}_signature_title`] || "Director",
    noc_body_template: settings[`${slug}_noc_body_template`] || "Configure the NOC body template in NOC Template to see a preview here.",
    noc_footer_note:   settings[`${slug}_noc_footer_note`]  || "",
  };

  const _td = new Date();
  const today = `${String(_td.getMonth()+1).padStart(2,"0")}/${String(_td.getDate()).padStart(2,"0")}/${_td.getFullYear()}`;
  const bodyText = s.noc_body_template
    .replace(/{candidate_name}/g, "Sample Candidate")
    .replace(/{company_name}/g, "Client Company LLC")
    .replace(/{total_amount}/g, "$12,500.00")
    .replace(/{date}/g, today)
    .replace(/{our_company}/g, s.company_name);

  return (
    <div style={{ background:"#fff", color:"#111827", borderRadius:10, padding:"36px 40px", fontFamily:"Georgia,serif", fontSize:13, lineHeight:1.7, position:"relative", overflow:"hidden", border:"1px solid #e3e6ea", boxShadow:"var(--shadow-md)", minHeight:500 }}>
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none", opacity:0.05, overflow:"hidden" }}>
        {s.watermark_url ? (
          <img src={s.watermark_url} alt="" style={{ maxWidth:"80%", maxHeight:"80%", objectFit:"contain" }} />
        ) : (
          <div style={{ fontSize:120, fontWeight:900, color:"#1a1f2e", letterSpacing:-4 }}>
            {s.company_name.slice(0,3).toUpperCase()}
          </div>
        )}
      </div>
      <div style={{ position:"relative", zIndex:1 }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, borderBottom:"2px solid #1a1f2e", paddingBottom:16 }}>
          <div>
            {s.logo_url && <img src={s.logo_url} alt="" style={{ height:48, objectFit:"contain", marginBottom:6, display:"block" }} />}
            <div style={{ fontSize:17, fontWeight:700 }}>{s.company_name}</div>
            {s.company_address && <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>{s.company_address}</div>}
          </div>
          <div style={{ textAlign:"right", fontSize:11, color:"#6b7280", lineHeight:1.8 }}>
            {s.ein     && <div><strong>EIN:</strong> {s.ein}</div>}
            {s.email   && <div>{s.email}</div>}
            {s.phone   && <div>{s.phone}</div>}
            {s.website && <div>{s.website}</div>}
          </div>
        </div>
        {/* Title */}
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:18, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#1a1f2e" }}>No Objection Certificate</div>
          <div style={{ fontSize:11, color:"#9ca3af", marginTop:4 }}>Date: {today}</div>
          <div style={{ width:60, height:2.5, background:"#2563eb", margin:"8px auto 0" }} />
        </div>
        {/* Body */}
        <div style={{ fontSize:13, lineHeight:1.85, color:"#374151", marginBottom:36, whiteSpace:"pre-line" }}>
          {bodyText}
        </div>
        {/* Signature */}
        <div style={{ width:220 }}>
          {s.signature_url && (
            <img src={s.signature_url} alt="Signature" style={{ height:54, objectFit:"contain", display:"block", marginBottom:4 }} />
          )}
          <div style={{ borderTop:"1px solid #2563eb", paddingTop:10 }}>
            <div style={{ fontWeight:700, fontSize:13, color:"#111827" }}>{s.signature_name}</div>
            <div style={{ fontSize:12, color:"#6b7280" }}>{s.signature_title}</div>
            <div style={{ fontSize:12, color:"#6b7280" }}>{s.company_name}</div>
          </div>
        </div>
        {s.noc_footer_note && (
          <div style={{ marginTop:32, borderTop:"1px solid #eef0f3", paddingTop:10, fontSize:11, color:"#9ca3af", fontStyle:"italic" }}>
            {s.noc_footer_note}
          </div>
        )}
      </div>
    </div>
  );
}
