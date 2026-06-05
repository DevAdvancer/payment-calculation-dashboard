"use client";

import { useEffect, useRef } from "react";
import useDashboardStore from "../../lib/use-store";

export default function Toast() {
  const toast = useDashboardStore((s) => s.toast);
  const showToast = useDashboardStore((s) => s.showToast);
  const timerRef = useRef(null);
  const message = typeof toast === "object" && toast !== null ? toast.message : toast;
  const sticky = typeof toast === "object" && toast !== null ? !!toast.sticky : false;

  useEffect(() => {
    if (toast !== null && !sticky) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { showToast(null); }, 3500);
    }
    return () => clearTimeout(timerRef.current);
  }, [toast, sticky, showToast]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position:"fixed", bottom:24, right:24,
        background:"var(--color-ink)", color:"#fff",
        padding:"10px 20px", borderRadius:"var(--radius-lg)",
        fontSize:13, fontWeight:500, boxShadow:"var(--shadow-lg)",
        zIndex:9999, pointerEvents: toast !== null ? "auto" : "none",
        opacity: toast !== null ? 1 : 0,
        transform: toast !== null ? "translateY(0)" : "translateY(8px)",
        transition:"opacity 0.2s ease, transform 0.2s ease",
        whiteSpace:"normal", maxWidth:"min(560px, calc(100vw - 48px))",
        fontFamily:"var(--font-body)",
        display:"flex", alignItems:"flex-start", gap:12,
      }}
    >
      <span>{message}</span>
      {sticky && (
        <button
          onClick={() => showToast(null)}
          aria-label="Close error"
          style={{ background:"transparent", border:"none", color:"#fff", cursor:"pointer", fontSize:16, lineHeight:1, padding:0, marginTop:1 }}
        >
          x
        </button>
      )}
    </div>
  );
}
