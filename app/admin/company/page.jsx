"use client";
import { useContext } from "react";
import { AdminContext } from "../layout";
import { COMPANIES, Card, FieldRow, Field, Input, ImgUpload } from "../components";

export default function CompanyProfilesPage() {
  const { activeCo, setActiveCo, coVal, coValOrDefault, updateCo, ck, handleImageUpload } = useContext(AdminContext);

  return (
    <>
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:"#111827", letterSpacing:"-0.02em" }}>
          Company Profiles
        </h1>
        <p style={{ fontSize:13, color:"#6b7280", marginTop:4 }}>Changes are saved to the database and applied to all generated NOC documents.</p>
      </div>

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
            <textarea rows={3} value={coVal("company_address")} onChange={e => updateCo("company_address", e.target.value)} placeholder="123 Business Park, Suite 100&#10;New York, NY 10001" style={{ background:"#fff", border:"1px solid #e3e6ea", borderRadius:8, padding:"9px 12px", color:"#111827", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", width:"100%", resize:"vertical", transition:"border-color 0.15s" }} />
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
  );
}
