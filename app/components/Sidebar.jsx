"use client";

import { useState } from "react";
import useDashboardStore from "../../lib/use-store";

export default function Sidebar() {
  const currentPage    = useDashboardStore((s) => s.currentPage);
  const navigateStore  = useDashboardStore((s) => s.navigate);
  const getLaidOff     = useDashboardStore((s) => s.getLaidOff);
  const getDefaulters  = useDashboardStore((s) => s.getDefaulters);
  const sidebarOpen    = useDashboardStore((s) => s.sidebarOpen);
  const setSidebarOpen = useDashboardStore((s) => s.setSidebarOpen);

  const paymentGroupActive = ["payment", "laidoff", "defaulter"].includes(currentPage);
  const [paymentOpen, setPaymentOpen] = useState(paymentGroupActive);

  const laidOffCount   = getLaidOff().length;
  const defaulterCount = getDefaulters().length;

  const isActive = (id) => currentPage === id;
  /* Close mobile drawer after navigating */
  const navigate = (id) => { navigateStore(id); setSidebarOpen(false); };

  return (
    <>
    <button
      className="hamburger"
      aria-label="Open menu"
      onClick={() => setSidebarOpen(true)}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6"  x2="21" y2="6"  />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
    <div
      className={`sidebar-backdrop${sidebarOpen ? " open" : ""}`}
      onClick={() => setSidebarOpen(false)}
    />
    <nav className={`sidebar${sidebarOpen ? " open" : ""}`}>
      {/* Brand */}
      <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"20px 16px 16px", borderBottom:"1px solid rgba(255,255,255,0.08)", flexShrink:0 }}>
        <div style={{ width:34, height:34, background:"rgba(255,255,255,0.15)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          </svg>
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:"#fff", letterSpacing:"-0.01em", lineHeight:1.3 }}>
          Placement<br/>Management System
        </span>
      </div>

      {/* Nav Items */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:2, padding:"10px 8px", overflowY:"auto" }}>

        {/* New Placement */}
        <NavBtn active={isActive("placement")} onClick={() => navigate("placement")} accent>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Placement
        </NavBtn>

        {/* Payment Dashboard */}
        <NavBtn active={isActive("dashboard")} onClick={() => navigate("dashboard")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          Payment Dashboard
        </NavBtn>

        <div style={{ height:1, background:"rgba(255,255,255,0.07)", margin:"4px 4px" }} />

        {/* Candidate History */}
        <NavBtn active={isActive("history")} onClick={() => navigate("history")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          Candidate History
        </NavBtn>

        {/* PO Details */}
        <NavBtn active={isActive("po-details")} onClick={() => navigate("po-details")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          PO Details
        </NavBtn>

        {/* Payment Calculation */}
        <NavBtn
          active={isActive("payment")}
          onClick={() => { setPaymentOpen(v => !v); navigate("payment"); }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          Payment Calculation
          <span style={{ marginLeft:"auto", fontSize:10, transition:"transform 0.2s", transform: (paymentOpen || paymentGroupActive) ? "rotate(90deg)" : "none", color:"rgba(255,255,255,0.5)" }}>›</span>
        </NavBtn>

        {/* Sub: Laid Off */}
        <div style={{ overflow:"hidden", maxHeight:(paymentOpen || paymentGroupActive) ? 120 : 0, transition:"max-height 0.25s ease", opacity:(paymentOpen || paymentGroupActive) ? 1 : 0 }}>
          <NavSubBtn active={isActive("laidoff")} onClick={() => navigate("laidoff")}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#f87171", flexShrink:0 }} />
            Laid Off
            {laidOffCount > 0 && <span style={{ marginLeft:"auto", fontSize:10, padding:"1px 6px", background:"rgba(248,113,113,0.2)", color:"#f87171", borderRadius:9999 }}>{laidOffCount}</span>}
          </NavSubBtn>
          <NavSubBtn active={isActive("defaulter")} onClick={() => navigate("defaulter")}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#fb923c", flexShrink:0 }} />
            Defaulter
            {defaulterCount > 0 && <span style={{ marginLeft:"auto", fontSize:10, padding:"1px 6px", background:"rgba(251,146,60,0.2)", color:"#fb923c", borderRadius:9999 }}>{defaulterCount}</span>}
          </NavSubBtn>
        </div>

        {/* Expense Management */}
        <NavBtn active={isActive("expenses")} onClick={() => navigate("expenses")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          Expense Management
        </NavBtn>

        {/* Summary */}
        <NavBtn active={isActive("monthly")} onClick={() => navigate("monthly")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
            <rect x="7" y="14" width="3" height="3"/>
            <rect x="11" y="14" width="3" height="3"/>
          </svg>
          Summary
        </NavBtn>

      </div>

      {/* Footer */}
      <div style={{ padding:"12px 16px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
        <a href="/admin" style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:8, fontSize:12, fontWeight:500, color:"rgba(255,255,255,0.45)", textDecoration:"none", border:"1px solid rgba(255,255,255,0.08)", transition:"all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.06)"; e.currentTarget.style.color="rgba(255,255,255,0.75)"; }}
          onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,0.45)"; }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.07 4.93A10 10 0 0 0 4.93 19.07M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
          Admin &amp; NOC Settings
        </a>
      </div>
    </nav>
    </>
  );
}

function NavBtn({ active, onClick, children, accent }) {
  const accentBg     = "rgba(37,99,235,0.85)";
  const accentBgHov  = "rgba(37,99,235,1)";
  return (
    <button
      onClick={onClick}
      style={{
        display:"flex", alignItems:"center", gap:8, padding:"8px 12px",
        border: "none",
        background: accent
          ? (active ? accentBg : "rgba(37,99,235,0.55)")
          : (active ? "rgba(255,255,255,0.15)" : "transparent"),
        cursor:"pointer", borderRadius:8, fontSize:13, fontWeight: (active || accent) ? 700 : 500,
        color: "#fff", fontFamily:"inherit",
        textAlign:"left", width:"100%", transition:"background 0.15s, color 0.15s",
        whiteSpace:"nowrap",
      }}
      onMouseEnter={e => {
        if (accent) e.currentTarget.style.background = accentBgHov;
        else if (!active) { e.currentTarget.style.background="rgba(255,255,255,0.08)"; e.currentTarget.style.color="#fff"; }
      }}
      onMouseLeave={e => {
        if (accent) e.currentTarget.style.background = active ? accentBg : "rgba(37,99,235,0.55)";
        else if (!active) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,0.65)"; }
      }}
    >
      {children}
    </button>
  );
}

function NavSubBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        display:"flex", alignItems:"center", gap:8, padding:"6px 12px 6px 28px",
        border:"none", background: active ? "rgba(255,255,255,0.1)" : "transparent",
        cursor:"pointer", borderRadius:8, fontSize:12, fontWeight:500,
        color: active ? "#fff" : "rgba(255,255,255,0.5)", fontFamily:"inherit",
        textAlign:"left", width:"100%", transition:"background 0.15s, color 0.15s",
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background="rgba(255,255,255,0.06)"; e.currentTarget.style.color="rgba(255,255,255,0.85)"; }}}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,0.5)"; }}}
    >
      {children}
    </button>
  );
}
