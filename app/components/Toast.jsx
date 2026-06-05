"use client";

import { useEffect, useRef } from "react";
import useDashboardStore from "../../lib/use-store";

export default function Toast() {
  const toast = useDashboardStore((s) => s.toast);
  const showToast = useDashboardStore((s) => s.showToast);
  const timerRef = useRef(null);

  useEffect(() => {
    if (toast !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { showToast(null); }, 3500);
    }
    return () => clearTimeout(timerRef.current);
  }, [toast, showToast]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position:"fixed", bottom:24, right:24,
        background:"var(--color-ink)", color:"#fff",
        padding:"10px 20px", borderRadius:"var(--radius-lg)",
        fontSize:13, fontWeight:500, boxShadow:"var(--shadow-lg)",
        zIndex:9999, pointerEvents:"none",
        opacity: toast !== null ? 1 : 0,
        transform: toast !== null ? "translateY(0)" : "translateY(8px)",
        transition:"opacity 0.2s ease, transform 0.2s ease",
        whiteSpace:"nowrap", maxWidth:"calc(100vw - 48px)",
        fontFamily:"var(--font-body)",
      }}
    >
      {toast}
    </div>
  );
}
