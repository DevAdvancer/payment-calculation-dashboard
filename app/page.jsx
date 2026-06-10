"use client";

import { useEffect, useRef } from "react";
import useDashboardStore from "../lib/use-store";
import Sidebar from "./components/Sidebar";
import Toast from "./components/Toast";
import PaymentCalcPage from "./components/payment/PaymentCalcPage";
import SpecialSheetPage from "./components/special/SpecialSheetPage";
import CandidateHistoryPage from "./components/history/CandidateHistoryPage";
import MonthlySummaryPage from "./components/monthly/MonthlySummaryPage";
import NewPlacementPage from "./components/placement/NewPlacementPage";
import PODetailsPage from "./components/podetails/PODetailsPage";
import PaymentDashboardPage from "./components/dashboard/PaymentDashboardPage";
import ExpensePage from "./components/expense/ExpensePage";
import NotificationsPage from "./components/NotificationsPage";
import CounterLoader from "./components/CounterLoader";

export default function Home() {
  const loading     = useDashboardStore((s) => s.loading);
  const currentPage = useDashboardStore((s) => s.currentPage);
  const loadFromDB  = useDashboardStore((s) => s.loadFromDB);

  /* Fire-once guard: prevents React Strict Mode (and any future
     remounts of <Home/>) from triggering loadFromDB a second time,
     which would flash the loader between fetches. */
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadFromDB();
  }, [loadFromDB]);

  if (loading) return <CounterLoader />;

  const renderPage = () => {
    switch (currentPage) {
      case "po-details": return <PODetailsPage />;
      case "payment":    return <PaymentCalcPage />;
      case "laidoff":    return <SpecialSheetPage type="laidoff" />;
      case "defaulter":  return <SpecialSheetPage type="defaulter" />;
      case "history":    return <CandidateHistoryPage />;
      case "monthly":    return <MonthlySummaryPage />;
      case "placement":  return <NewPlacementPage />;
      case "dashboard":  return <PaymentDashboardPage />;
      case "expenses":   return <ExpensePage />;
      case "notifications": return <NotificationsPage />;
      default:           return <PODetailsPage />;
    }
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh" }}>
      <Sidebar />
      <main style={{ marginLeft:220, flex:1, background:"var(--color-bg)", overflowY:"auto", minHeight:"100vh" }}>
        {renderPage()}
      </main>
      <Toast />
    </div>
  );
}
