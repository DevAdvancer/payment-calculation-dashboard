"use client";
import { useEffect, useRef, useState, createContext } from "react";
import { COMPANY_SLUGS, fallbackFor } from "./components";

export const AdminContext = createContext(null);

export default function AdminLayout({ children }) {
  const [settings, setSettings] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [activeCo, setActiveCo] = useState("Vizva");
  const [toast, setToast]       = useState("");
  const toastTimer = useRef(null);

  useEffect(() => {
    fetch(`/api/admin/settings?t=${Date.now()}`, { cache: "no-store" })
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

  const ck = (field) => `${COMPANY_SLUGS[activeCo]}_${field}`;
  const coVal = (field) => settings?.[ck(field)] || "";
  const coValOrDefault = (field) => coVal(field) || fallbackFor(field, COMPANY_SLUGS[activeCo]);
  const updateCo = (field, val) => update(ck(field), val);

  async function handleImageUpload(key, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_DIM = 800;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) { height *= MAX_DIM / width; width = MAX_DIM; }
          else { width *= MAX_DIM / height; height = MAX_DIM; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        update(key, canvas.toDataURL("image/png", 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

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

      const payload = {};
      for (const [k, v] of Object.entries(settings || {})) {
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
    <AdminContext.Provider value={{
      settings,
      activeCo,
      setActiveCo,
      updateCo,
      coVal,
      coValOrDefault,
      ck,
      handleImageUpload
    }}>
      <div style={{ display:"flex", minHeight:"100vh", background:"#f4f5f7", fontFamily:"'DM Sans',sans-serif" }}>
        <main style={{ flex:1, padding:"40px 56px", maxWidth:900, overflow:"auto" }}>
          {children}

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
    </AdminContext.Provider>
  );
}
