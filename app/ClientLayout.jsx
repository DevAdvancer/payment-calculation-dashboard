"use client";

import { useEffect, useRef } from "react";
import useDashboardStore from "../lib/use-store";
import Sidebar from "./components/Sidebar";
import Toast from "./components/Toast";
import CounterLoader from "./components/CounterLoader";

export default function ClientLayout({ children }) {
  const loading    = useDashboardStore((s) => s.loading);
  const loadFromDB = useDashboardStore((s) => s.loadFromDB);

  /* Fire-once guard: prevents React Strict Mode from triggering loadFromDB a second time */
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadFromDB();
  }, [loadFromDB]);

  if (loading) return <CounterLoader />;

  return (
    <div style={{ display:"flex", minHeight:"100vh" }}>
      <Sidebar />
      <main style={{ marginLeft:220, flex:1, background:"var(--color-bg)", overflowY:"auto", minHeight:"100vh" }}>
        {children}
      </main>
      <Toast />
    </div>
  );
}
