"use client";
import { useState, useEffect, useRef } from "react";
import { fmtDate } from "@/lib/use-store";

/**
 * Locale-independent date input that always shows MM/DD/YYYY.
 *
 * value:    stored format MM-DD-YYYY (or empty)
 * onChange: receives MM-DD-YYYY (or empty)
 *
 * The visible input is type="text" with MM/DD/YYYY display + auto-formatting
 * as the user types. A small calendar icon opens a hidden native picker for
 * users who prefer point-and-click; the picker writes back through onChange.
 */
export default function DateInput({ value, onChange, style, className, placeholder = "MM/DD/YYYY", ...rest }) {
  const display = value ? fmtDate(value).replace("—", "") : "";
  const [draft, setDraft] = useState(display);
  const pickerRef = useRef(null);

  useEffect(() => { setDraft(display); }, [display]);

  const commit = (str) => {
    const s = (str || "").trim();
    if (!s) { onChange(""); return; }
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (!m) { setDraft(display); return; }
    const stored = `${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}-${m[3]}`;
    onChange(stored);
  };

  const handleType = (e) => {
    let v = e.target.value.replace(/[^\d/]/g, "");
    if (v.length > 10) v = v.slice(0, 10);
    if (/^\d{3}$/.test(v))     v = v.slice(0, 2) + "/" + v.slice(2);
    if (/^\d{2}\/\d{3}$/.test(v)) v = v.slice(0, 5) + "/" + v.slice(5);
    setDraft(v);
  };

  const handlePickerChange = (e) => {
    const iso = e.target.value;
    if (!iso) { onChange(""); return; }
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) onChange(`${m[2]}-${m[3]}-${m[1]}`);
  };

  const openPicker = () => {
    const el = pickerRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.click();
  };

  const isoForPicker = (() => {
    if (!value) return "";
    const m = String(value).match(/^(\d{2})-(\d{2})-(\d{4})$/);
    return m ? `${m[3]}-${m[1]}-${m[2]}` : "";
  })();

  return (
    <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={handleType}
        onBlur={() => commit(draft)}
        placeholder={placeholder}
        className={className}
        style={{ ...style, paddingRight: 30 }}
        {...rest}
      />
      <button
        type="button"
        onClick={openPicker}
        tabIndex={-1}
        aria-label="Open date picker"
        style={{
          position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
          background: "transparent", border: "none", cursor: "pointer",
          padding: 4, display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: "currentColor", opacity: 0.55,
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = 1}
        onMouseLeave={e => e.currentTarget.style.opacity = 0.55}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>
      <input
        ref={pickerRef}
        type="date"
        value={isoForPicker}
        onChange={handlePickerChange}
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
      />
    </div>
  );
}
