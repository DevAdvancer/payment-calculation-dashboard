"use client";
import { useContext } from "react";
import { AdminContext } from "../layout";
import { COMPANIES, Card, FieldRow, Field, Input, ImgUpload } from "../components";

export default function SignatoryPage() {
  const { activeCo, setActiveCo, coVal, coValOrDefault, updateCo, ck, handleImageUpload } = useContext(AdminContext);

  return (
    <>
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:"#111827", letterSpacing:"-0.02em" }}>
          Signatory Settings
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
  );
}
