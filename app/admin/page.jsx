"use client";
import { useEffect, useRef, useState } from "react";
import { defaultLogoFor, defaultSignatureFor } from "@/lib/noc-defaults";

const COMPANIES = ["Vizva", "SilverSpace", "Flawless"];

const COMPANY_SLUGS = {
  Vizva:       "vizva",
  SilverSpace: "silverspace",
  Flawless:    "flawless",
};

/* Fields that should display a built-in default image when empty in the DB.
   The default never overwrites a stored value — admin uploads still win. */
function fallbackFor(field, slug) {
  if (field === "logo_url" || field === "watermark_url") return defaultLogoFor(slug);
  if (field === "signature_url") return defaultSignatureFor(slug);
  return "";
}

const SECTIONS = [
  { id:"company",   label:"Company Profiles", icon:"🏢" },
  { id:"signatory", label:"Signatory",         icon:"✍️" },
  { id:"noc",       label:"NOC Template",      icon:"📄" },
  { id:"preview",   label:"Live Preview",      icon:"👁️" },
];

export default function AdminPage() {
  const [settings, setSettings] = useState(null);
  const [baseline, setBaseline] = useState(null);   // last saved snapshot — drives delta save
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [section, setSection]   = useState("company");
  const [activeCo, setActiveCo] = useState("Vizva");
  const [toast, setToast]       = useState("");
  const toastTimer = useRef(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(d => {
        const s = d.settings || {};
        setSettings(s);
        setBaseline(s);
      })
      .catch(() => showToast("⚠ Could not load settings"));
  }, []);

  function showToast(msg, ms = 4500) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), ms);
  }

  function update(key, val) {
    setSettings(s => ({ ...s, [key]: val }));
    setSaved(false);
  }

  /* Per-company key helper */
  const ck = (field) => `${COMPANY_SLUGS[activeCo]}_${field}`;
  const coVal = (field) => settings?.[ck(field)] || "";
  const coValOrDefault = (field) => coVal(field) || fallbackFor(field, COMPANY_SLUGS[activeCo]);
  const updateCo = (field, val) => update(ck(field), val);

  async function handleImageUpload(key, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => update(key, e.target.result);
    reader.readAsDataURL(file);
  }

  /* Check if any field changed since last save/load */
  function hasChanges() {
    if (!baseline) return true;
    for (const k of Object.keys(settings || {})) {
      if (settings[k] !== baseline[k]) return true;
    }
    return false;
  }

  function approxKB(obj) {
    try { return Math.round(JSON.stringify(obj).length / 1024); } catch { return 0; }
  }

  async function save() {
    setSaving(true);
    try {
      if (!hasChanges()) {
        showToast("Nothing to save — no changes");
        setSaving(false);
        return;
      }

      /* Send ALL current per-company settings (skip legacy DEFAULTS keys).
         This ensures every field the user sees gets persisted reliably. */
      const payload = {};
      for (const [k, v] of Object.entries(settings || {})) {
        /* Only persist company-scoped keys (vizva_*, silverspace_*, flawless_*) */
        if (k.startsWith("vizva_") || k.startsWith("silverspace_") || k.startsWith("flawless_")) {
          payload[k] = v;
        }
      }

      const sizeKB = approxKB(payload);
      if (sizeKB > 4000) {
        showToast(`✕ Save failed — payload is ${sizeKB} KB (limit ~4500 KB). Compress images and retry.`, 7000);
        setSaving(false);
        return;
      }

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody.error || `HTTP ${res.status}`;
        console.error("admin save failed:", res.status, errBody);
        showToast(`✕ Save failed — ${msg}`, 7000);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.settings) {
        setSettings(data.settings);
        setBaseline(data.settings);
      } else {
        /* Fallback: just update baseline to current so hasChanges() resets */
        setBaseline({ ...settings });
      }
      setSaved(true);
      showToast("✓ Settings saved successfully");
    } catch (e) {
      console.error("admin save error:", e);
      showToast("✕ Save failed — network error", 7000);
    } finally { setSaving(false); }
  }

  if (!settings) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f4f5f7", fontFamily:"'DM Sans',sans-serif", color:"#6b7280" }}>
      Loading settings…
    </div>
  );

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f4f5f7", fontFamily:"'DM Sans',sans-serif" }}>

      {/* Sidebar */}
      <aside style={{ width:220, minWidth:220, background:"#1a1f2e", position:"sticky", top:0, height:"100vh", overflow:"auto", display:"flex", flexDirection:"column", boxShadow:"2px 0 12px rgba(0,0,0,0.12)" }}>
        <div style={{ padding:"20px 16px 16px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#fff", lineHeight:1.3 }}>NOC Admin</div>
          <div style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:".1em", marginTop:3 }}>CMS Configuration</div>
        </div>
        <nav style={{ flex:1, padding:"10px 8px", display:"flex", flexDirection:"column", gap:2 }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 12px", border:"none", background:section===s.id?"rgba(255,255,255,0.15)":"transparent", cursor:"pointer", borderRadius:8, fontSize:13, fontWeight:section===s.id?600:500, color:section===s.id?"#fff":"rgba(255,255,255,0.65)", fontFamily:"inherit", textAlign:"left", width:"100%", transition:"all 0.15s" }}>
              <span>{s.icon}</span>{s.label}
            </button>
          ))}
        </nav>
        <div style={{ padding:"12px 8px 16px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
          <a href="/" style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:8, fontSize:12, fontWeight:500, color:"rgba(255,255,255,0.45)", textDecoration:"none", border:"1px solid rgba(255,255,255,0.08)" }}>
            ← Dashboard
          </a>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, padding:"40px 56px", maxWidth:900, overflow:"auto" }}>

        <div style={{ marginBottom:32 }}>
          <h1 style={{ fontSize:22, fontWeight:700, color:"#111827", letterSpacing:"-0.02em" }}>
            {section==="company"   && "Company Profiles"}
            {section==="signatory" && "Signatory Settings"}
            {section==="noc"       && "NOC Template"}
            {section==="preview"   && "Live Preview"}
          </h1>
          <p style={{ fontSize:13, color:"#6b7280", marginTop:4 }}>Changes are saved to the database and applied to all generated NOC documents.</p>
        </div>

        {/* Company Profiles */}
        {section === "company" && (
          <>
            {/* Company Tabs */}
            <div style={{ display:"flex", gap:8, marginBottom:24 }}>
              {COMPANIES.map(co => (
                <button key={co} onClick={() => setActiveCo(co)}
                  style={{ padding:"7px 20px", borderRadius:9999, fontSize:13, fontWeight:600, cursor:"pointer", border: activeCo===co ? "1px solid #1a1f2e" : "1px solid #e3e6ea", background: activeCo===co ? "#1a1f2e" : "#fff", color: activeCo===co ? "#fff" : "#6b7280", transition:"all 0.15s" }}>
                  {co}
                </button>
              ))}
            </div>

            <Card title={`${activeCo} — Basic Information`}>
              <FieldRow>
                <Field label="Company Name">
                  <Input value={coVal("company_name")} onChange={e => updateCo("company_name", e.target.value)} placeholder="e.g. Vizva Inc" />
                </Field>
                <Field label="EIN / Tax ID">
                  <Input value={coVal("ein")} onChange={e => updateCo("ein", e.target.value)} placeholder="XX-XXXXXXX" />
                </Field>
              </FieldRow>
              <FieldRow full>
                <Field label="Address">
                  <textarea rows={3} value={coVal("company_address")} onChange={e => updateCo("company_address", e.target.value)} placeholder="123 Business Park, Suite 100&#10;New York, NY 10001" style={textareaStyle} />
                </Field>
              </FieldRow>
              <FieldRow triple>
                <Field label="Website">
                  <Input value={coVal("website")} onChange={e => updateCo("website", e.target.value)} placeholder="www.vizva.com" />
                </Field>
                <Field label="Email">
                  <Input type="email" value={coVal("email")} onChange={e => updateCo("email", e.target.value)} placeholder="compliance@vizva.com" />
                </Field>
                <Field label="Phone">
                  <Input value={coVal("phone")} onChange={e => updateCo("phone", e.target.value)} placeholder="+1 (800) 000-0000" />
                </Field>
              </FieldRow>
            </Card>

            <Card title={`${activeCo} — Logo`} style={{ marginTop:16 }}>
              <FieldRow>
                <Field label="Header Logo">
                  <ImgUpload src={coValOrDefault("logo_url")} onChange={f => handleImageUpload(ck("logo_url"), f)} label="PNG, JPG, SVG · default applied" />
                </Field>
                <Field label="Watermark Logo (behind text)">
                  <ImgUpload src={coValOrDefault("watermark_url")} onChange={f => handleImageUpload(ck("watermark_url"), f)} label="Uses main logo if empty" />
                </Field>
              </FieldRow>
            </Card>
          </>
        )}

        {/* Signatory */}
        {section === "signatory" && (
          <>
            <div style={{ display:"flex", gap:8, marginBottom:24 }}>
              {COMPANIES.map(co => (
                <button key={co} onClick={() => setActiveCo(co)}
                  style={{ padding:"7px 20px", borderRadius:9999, fontSize:13, fontWeight:600, cursor:"pointer", border: activeCo===co ? "1px solid #1a1f2e" : "1px solid #e3e6ea", background: activeCo===co ? "#1a1f2e" : "#fff", color: activeCo===co ? "#fff" : "#6b7280", transition:"all 0.15s" }}>
                  {co}
                </button>
              ))}
            </div>

            <Card title={`${activeCo} — Signatory Details`}>
              <FieldRow>
                <Field label="Full Name">
                  <Input value={coVal("signature_name")} onChange={e => updateCo("signature_name", e.target.value)} placeholder="Jane Smith" />
                </Field>
                <Field label="Title / Designation">
                  <Input value={coVal("signature_title")} onChange={e => updateCo("signature_title", e.target.value)} placeholder="Director of Operations" />
                </Field>
              </FieldRow>
              <FieldRow full>
                <Field label="Signature Image">
                  <ImgUpload src={coValOrDefault("signature_url")} onChange={f => handleImageUpload(ck("signature_url"), f)} label="PNG with transparent background recommended · default applied" imgStyle={{ maxHeight:60 }} />
                </Field>
              </FieldRow>
            </Card>
          </>
        )}

        {/* NOC Template */}
        {section === "noc" && (
          <>
            <div style={{ display:"flex", gap:8, marginBottom:24 }}>
              {COMPANIES.map(co => (
                <button key={co} onClick={() => setActiveCo(co)}
                  style={{ padding:"7px 20px", borderRadius:9999, fontSize:13, fontWeight:600, cursor:"pointer", border: activeCo===co ? "1px solid #1a1f2e" : "1px solid #e3e6ea", background: activeCo===co ? "#1a1f2e" : "#fff", color: activeCo===co ? "#fff" : "#6b7280", transition:"all 0.15s" }}>
                  {co}
                </button>
              ))}
            </div>

            <Card title={`${activeCo} — NOC Body Template`}>
              <FieldRow full>
                <Field label="">
                  <div style={{ fontSize:11, color:"#6b7280", marginBottom:8 }}>
                    Variables: <code style={{ background:"#eff6ff", color:"#2563eb", padding:"1px 5px", borderRadius:3 }}>{"{candidate_name}"}</code>{" "}
                    <code style={{ background:"#eff6ff", color:"#2563eb", padding:"1px 5px", borderRadius:3 }}>{"{company_name}"}</code>{" "}
                    <code style={{ background:"#eff6ff", color:"#2563eb", padding:"1px 5px", borderRadius:3 }}>{"{total_amount}"}</code>{" "}
                    <code style={{ background:"#eff6ff", color:"#2563eb", padding:"1px 5px", borderRadius:3 }}>{"{date}"}</code>{" "}
                    <code style={{ background:"#eff6ff", color:"#2563eb", padding:"1px 5px", borderRadius:3 }}>{"{our_company}"}</code>
                  </div>
                  <textarea rows={9} value={coVal("noc_body_template")} onChange={e => updateCo("noc_body_template", e.target.value)}
                    placeholder={`This is to certify that {candidate_name} has been successfully placed by {our_company} with {company_name}...`}
                    style={textareaStyle} />
                </Field>
              </FieldRow>
              <FieldRow full>
                <Field label="Footer / Disclaimer Note">
                  <textarea rows={3} value={coVal("noc_footer_note")} onChange={e => updateCo("noc_footer_note", e.target.value)}
                    placeholder="This certificate is issued without prejudice and in good faith."
                    style={textareaStyle} />
                </Field>
              </FieldRow>
            </Card>
          </>
        )}

        {/* Live Preview */}
        {section === "preview" && (
          <>
            <div style={{ display:"flex", gap:8, marginBottom:24 }}>
              {COMPANIES.map(co => (
                <button key={co} onClick={() => setActiveCo(co)}
                  style={{ padding:"7px 20px", borderRadius:9999, fontSize:13, fontWeight:600, cursor:"pointer", border: activeCo===co ? "1px solid #1a1f2e" : "1px solid #e3e6ea", background: activeCo===co ? "#1a1f2e" : "#fff", color: activeCo===co ? "#fff" : "#6b7280", transition:"all 0.15s" }}>
                  {co}
                </button>
              ))}
            </div>
            <NOCPreview settings={settings} company={activeCo} />
          </>
        )}

        {/* Save Bar */}
        <div style={{ display:"flex", alignItems:"center", gap:16, marginTop:32, paddingTop:24, borderTop:"1px solid #e3e6ea" }}>
          <button onClick={save} disabled={saving}
            style={{ padding:"10px 28px", background:"#1a1f2e", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:8 }}>
            {saving ? "Saving…" : "Save Settings"}
          </button>
          <span style={{ fontSize:12, fontWeight:600, padding:"4px 12px", borderRadius:9999, background: saved ? "#ecfdf5" : "#f3f4f6", color: saved ? "#059669" : "#9ca3af" }}>
            {saved ? "● Saved" : "○ Unsaved changes"}
          </span>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, background:"#111827", color:"#fff", padding:"10px 20px", borderRadius:12, fontSize:13, fontWeight:500, boxShadow:"0 8px 24px rgba(0,0,0,0.2)", zIndex:9999 }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ── Helper Components ── */

function Card({ title, children, style }) {
  return (
    <div style={{ background:"#fff", border:"1px solid #e3e6ea", borderRadius:12, padding:"24px 28px", boxShadow:"0 1px 3px rgba(0,0,0,0.06)", ...style }}>
      {title && <div style={{ fontSize:13, fontWeight:700, color:"#111827", marginBottom:20, paddingBottom:12, borderBottom:"1px solid #eef0f3" }}>{title}</div>}
      {children}
    </div>
  );
}

function FieldRow({ children, full, triple }) {
  const cols = triple ? "1fr 1fr 1fr" : full ? "1fr" : "1fr 1fr";
  return <div style={{ display:"grid", gridTemplateColumns:cols, gap:16, marginBottom:16 }}>{children}</div>;
}

function Field({ label, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {label && <label style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".07em", color:"#6b7280" }}>{label}</label>}
      {children}
    </div>
  );
}

const inputStyle = { background:"#fff", border:"1px solid #e3e6ea", borderRadius:8, padding:"9px 12px", color:"#111827", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", width:"100%", transition:"border-color 0.15s, box-shadow 0.15s" };
const textareaStyle = { background:"#fff", border:"1px solid #e3e6ea", borderRadius:8, padding:"9px 12px", color:"#111827", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", width:"100%", resize:"vertical", transition:"border-color 0.15s" };

function Input({ value, onChange, placeholder, type="text" }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={inputStyle}
      onFocus={e => { e.target.style.borderColor="#2563eb"; e.target.style.boxShadow="0 0 0 3px rgba(37,99,235,0.1)"; }}
      onBlur={e => { e.target.style.borderColor="#e3e6ea"; e.target.style.boxShadow="none"; }} />
  );
}

function ImgUpload({ src, onChange, label, imgStyle }) {
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

function NOCPreview({ settings, company }) {
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
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none", opacity:0.05, fontSize:120, fontWeight:900, color:"#1a1f2e" }}>
        {s.company_name.slice(0,3).toUpperCase()}
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
