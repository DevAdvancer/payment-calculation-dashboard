"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import useDashboardStore, {
  ALL_STATUSES,
  INSTANCE_OPTIONS,
  fmtMoney,
  fmtMoneyC,
  currencyOf,
} from "@/lib/use-store";
import NOCModal from "./NOCModal";
import DateInput from "@/app/components/DateInput";

function getInitials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function progressGradient(pct) {
  if (pct >= 100) return "linear-gradient(90deg, #339989, #7DE2D1)";
  if (pct >= 50) return "linear-gradient(90deg, #339989, #2B2C28)";
  return "linear-gradient(90deg, #ef4444, #f97316)";
}

function progressColor(pct) {
  if (pct >= 100) return "var(--teal)";
  if (pct >= 50) return "var(--mint)";
  return "#f97316";
}

export default function CandidateHistoryPage() {
  const { getCandidateNames, getByCandidate, updateEntry, updateStatus, addNotification, notifications,
          showToast, loading, nocTargetCandidate, nocTargetNotifId, markNotificationNoc, clearNocTarget } =
    useDashboardStore();

  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [animated, setAnimated] = useState(false);
  const [showNOC, setShowNOC] = useState(false);
  const searchRef = useRef();
  const prevPctRef = useRef(null);

  const allNames = getCandidateNames();

  /* ── Autocomplete list ── */
  const dropdownNames = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allNames.slice(0, 12);
    return allNames.filter(n => n.toLowerCase().includes(q)).slice(0, 12);
  }, [search, allNames]);

  /* ── Selected candidate entries ── */
  const candidateEntries = selected ? getByCandidate(selected) : [];
  const totalAmount = candidateEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalPaid   = candidateEntries.reduce((s, e) => s + (parseFloat(e.paid) || 0), 0);
  const totalDue    = candidateEntries.reduce((s, e) => s + (parseFloat(e.due) || 0), 0);
  const revenueLoss = candidateEntries
    .filter(e => ["Laid Off", "Offer Revoke", "No Offer", "Resigned", "Default"].includes(e.status))
    .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const pct = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;
  const primaryCompany = candidateEntries[0]?.company || "";
  const primaryCurrency = currencyOf(primaryCompany);

  /* ── Animate progress bar on candidate change ── */
  useEffect(() => {
    setAnimated(false);
    const t = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(t);
  }, [selected]);

  const selectCandidate = (name) => {
    prevPctRef.current = null;
    setSelected(name);
    setSearch(name);
    setDropdownOpen(false);
  };

  /* ── Auto-select candidate when arriving from Notifications "Generate NOC" ── */
  useEffect(() => {
    if (nocTargetCandidate && allNames.includes(nocTargetCandidate)) {
      selectCandidate(nocTargetCandidate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nocTargetCandidate, allNames.length]);

  const notificationExists = (candidate) => {
    return notifications.some(n => n.type === "payment-complete" && n.candidate === candidate);
  };

  const clearSearch = () => {
    setSelected(null);
    setSearch("");
    setDropdownOpen(false);
    searchRef.current?.focus();
  };

  /* Effect: detect transition from <100 -> 100 and add one-time payment completion notification */
  useEffect(() => {
    if (!selected) return;
    if (prevPctRef.current == null) {
      prevPctRef.current = pct;
      return;
    }
    const prev = prevPctRef.current ?? 0;
    if (prev < 100 && pct === 100 && !notificationExists(selected)) {
      const message = `${selected} has fully paid the amount. Please update the NOC`;
      addNotification({
        candidate: selected,
        message,
        type: "payment-complete",
      });
      showToast(message, 4500);
    }
    prevPctRef.current = pct;
  }, [pct, selected, notifications, addNotification, showToast]);

  if (loading) return (
    <div className="page-inner">
      <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-muted)", padding: "40px 0" }}>
        <div style={{ width: 18, height: 18, border: "2px solid var(--teal)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        Loading…
      </div>
    </div>
  );

  return (
    <div className="page-inner">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Candidate <span>History</span></h1>
        <p className="page-subtitle">Search any candidate to view their full payment timeline</p>
      </div>

      {/* Big Search Bar */}
      <div style={{ position: "relative", maxWidth: 560, marginBottom: 32 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          background: "var(--surface)",
          border: `1.5px solid ${dropdownOpen ? "var(--teal)" : "var(--border-md)"}`,
          borderRadius: "var(--r-xl)",
          padding: "10px 16px",
          gap: 10,
          boxShadow: dropdownOpen ? "0 0 0 3px rgba(51,153,137,0.12)" : undefined,
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}>
          <svg width="18" height="18" fill="none" stroke="var(--text-muted)" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchRef}
            value={search}
            onChange={e => { setSearch(e.target.value); setDropdownOpen(true); }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Search candidate name…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text)",
              fontSize: 15,
              fontFamily: "var(--font)",
            }}
          />
          {search && (
            <button
              onClick={clearSearch}
              style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 2px", display: "flex", alignItems: "center" }}
              title="Clear"
            >
              ×
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {dropdownOpen && dropdownNames.length > 0 && (
          <div style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "var(--surface)",
            border: "1px solid var(--border-md)",
            borderRadius: "var(--r-lg)",
            boxShadow: "var(--shadow-lg)",
            zIndex: 500,
            overflow: "hidden",
            animation: "slideUp 0.15s ease",
          }}>
            {dropdownNames.map(name => {
              const ents = getByCandidate(name);
              const tot  = ents.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
              const paid = ents.reduce((s, e) => s + (parseFloat(e.paid) || 0), 0);
              const p    = tot > 0 ? Math.round((paid / tot) * 100) : 0;
              const co   = ents[0]?.company || "";
              return (
                <button
                  key={name}
                  onClick={() => selectCandidate(name)}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.12s",
                    fontFamily: "var(--font)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface-3)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{
                    width: 34, height: 34,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--teal), var(--mint))",
                    color: "#131515",
                    fontWeight: 700,
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {getInitials(name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{name}</div>
                    {co && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{co}</div>}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: p >= 100 ? "#4ade80" : p >= 50 ? "var(--mint)" : "#f97316", flexShrink: 0 }}>
                    {p}% paid
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Click outside closes dropdown */}
      {dropdownOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 499 }} onClick={() => setDropdownOpen(false)} />
      )}

      {/* Candidate Profile */}
      {selected && candidateEntries.length > 0 && (
        <div style={{ animation: "slideUp 0.25s ease" }}>
          {/* Profile Card */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              {/* Left: avatar + info */}
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 52, height: 52,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--teal), var(--mint))",
                  color: "#131515",
                  fontWeight: 800,
                  fontSize: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 4px 16px rgba(51,153,137,0.4)",
                }}>
                  {getInitials(selected)}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-serif)" }}>{selected}</div>
                  {primaryCompany && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{primaryCompany}</div>}
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{candidateEntries.length} payment entries found</div>
                </div>
              </div>

              {/* Right: KPI chips */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginLeft: "auto", alignItems: "center" }}>
                <div style={{ background: "rgba(156,163,175,0.12)", border: "1px solid rgba(156,163,175,0.2)", borderRadius: "var(--r-lg)", padding: "8px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-muted)" }}>Total</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{fmtMoneyC(totalAmount, primaryCurrency, 0)}</div>
                </div>
                <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "var(--r-lg)", padding: "8px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#4ade80" }}>Paid</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#4ade80", fontVariantNumeric: "tabular-nums" }}>{fmtMoneyC(totalPaid, primaryCurrency, 0)}</div>
                </div>
                <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "var(--r-lg)", padding: "8px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#fbbf24" }}>Pending</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fbbf24", fontVariantNumeric: "tabular-nums" }}>{fmtMoneyC(totalDue, primaryCurrency, 0)}</div>
                </div>
                {revenueLoss > 0 && (
                  <div style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)", borderRadius: "var(--r-lg)", padding: "8px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#fb923c" }}>Revenue Loss</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#fb923c", fontVariantNumeric: "tabular-nums" }}>{fmtMoneyC(revenueLoss, primaryCurrency, 0)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar Section */}
            <div style={{ marginTop: 22 }}>
              <div className="candidate-progress-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Payment Completion</span>
                <div className="candidate-progress-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: progressColor(pct) }}>
                    {pct}% Complete
                  </span>
                  {pct === 100 && (
                    <button className="noc-btn" onClick={() => {
                      // Resolve the notification ID: prefer the one set by Notifications page,
                      // otherwise find the payment-complete notification for this candidate
                      const resolvedNotifId = nocTargetNotifId
                        || (notifications.find(n => n.type === "payment-complete" && n.candidate === selected && !n.noc)?.id)
                        || null;

                      if (resolvedNotifId) {
                        markNotificationNoc(resolvedNotifId);
                      }
                      clearNocTarget();
                      setShowNOC(true);
                    }}>
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                      Generate NOC
                    </button>
                  )}
                </div>
              </div>

              <div className="progress-track">
                <div
                  className="progress-bar"
                  style={{
                    width: animated ? `${Math.min(pct, 100)}%` : "0%",
                    background: progressGradient(pct),
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 7, fontSize: 11 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#4ade80" }}>
                  🟢 Paid <strong>{fmtMoneyC(totalPaid, primaryCurrency, 0)}</strong>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-dim)" }}>
                  ⬜ Remaining <strong>{fmtMoneyC(totalDue, primaryCurrency, 0)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Entries Table */}
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>Company</th>
                  <th>Date</th>
                  <th>Month</th>
                  <th>Year</th>
                  <th>Instance</th>
                  <th>USD</th>
                  <th>Paid</th>
                  <th>Due</th>
                  <th>Service Type</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {candidateEntries.map((entry, idx) => (
                  <tr key={entry.id}>
                    <td style={{ color: "var(--text-dim)", fontSize: 11 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 500 }}>{entry.company || "—"}</td>
                    <td>
                      <DateInput
                        value={entry.poDate}
                        onChange={v => updateEntry(entry.id, { poDate: v })}
                        className="tbl-input"
                        style={{ minWidth: 132 }}
                      />
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>{entry.month}</td>
                    <td style={{ color: "var(--text-muted)" }}>{entry.year}</td>
                    <td>
                      <select
                        className="tbl-select"
                        value={entry.instance || "First Half"}
                        onChange={e => updateEntry(entry.id, { instance: e.target.value })}
                      >
                        {INSTANCE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                      </select>
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--mint)", fontVariantNumeric: "tabular-nums" }}>
                      {fmtMoneyC(entry.amount, currencyOf(entry), 0)}
                    </td>
                    <td style={{ color: "#4ade80", fontVariantNumeric: "tabular-nums" }}>
                      {fmtMoneyC(entry.paid, currencyOf(entry), 0)}
                    </td>
                    <td style={{ color: "#fbbf24", fontVariantNumeric: "tabular-nums" }}>
                      {fmtMoneyC(entry.due, currencyOf(entry), 0)}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{entry.serviceType}</td>
                    <td>
                      <select
                        className="tbl-select"
                        value={entry.status}
                        onChange={e => updateStatus(entry.id, e.target.value)}
                        style={{ fontSize: 11 }}
                      >
                        {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ color: "var(--text-dim)", fontSize: 12 }}>{entry.type || "—"}</td>
                    <td>
                      <input
                        className="tbl-input"
                        style={{ minWidth: 100, maxWidth: 180 }}
                        defaultValue={entry.notes || ""}
                        placeholder="Add note…"
                        onBlur={e => {
                          if (e.target.value !== (entry.notes || ""))
                            updateEntry(entry.id, { notes: e.target.value });
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state when no candidate selected */}
      {!selected && (
        <div className="empty-state" style={{ paddingTop: 20 }}>
          <div className="empty-icon">🔍</div>
          <div className="empty-title">Search for a candidate</div>
          <div className="empty-sub">Type a name above to view their complete payment history</div>
        </div>
      )}

      {/* NOC Modal */}
      {showNOC && (
        <NOCModal
          candidate={selected}
          company={primaryCompany}
          totalAmount={totalAmount}
          onClose={() => setShowNOC(false)}
        />
      )}
    </div>
  );
}
