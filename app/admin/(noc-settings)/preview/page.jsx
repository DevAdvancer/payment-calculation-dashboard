"use client";
import { useContext } from "react";
import { AdminContext } from "../layout";
import { COMPANIES, NOCPreview } from "../components";

export default function PreviewPage() {
  const { activeCo, setActiveCo, settings } = useContext(AdminContext);

  return (
    <>
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:"#111827", letterSpacing:"-0.02em" }}>
          Live Preview
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

      <NOCPreview settings={settings} company={activeCo} />
    </>
  );
}
