"use client";
import { useContext } from "react";
import { AdminContext } from "../layout";
import { COMPANIES, Card, FieldRow, Field, textareaStyle } from "../components";

export default function NOCTemplatePage() {
  const { activeCo, setActiveCo, coVal, updateCo } = useContext(AdminContext);

  return (
    <>
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:"#111827", letterSpacing:"-0.02em" }}>
          NOC Template
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
  );
}
