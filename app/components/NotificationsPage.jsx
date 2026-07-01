"use client";

import { useState } from "react";
import useDashboardStore from "../../lib/use-store";

export default function NotificationsPage() {
  const notifications = useDashboardStore((s) => s.notifications);
  const markNotificationRead = useDashboardStore((s) => s.markNotificationRead);
  const deleteSpecificNotification = useDashboardStore((s) => s.deleteSpecificNotification);
  const deleteAllNotifications = useDashboardStore((s) => s.deleteAllNotifications);
  const navigate = useDashboardStore((s) => s.navigate);
  const setNocTarget = useDashboardStore((s) => s.setNocTarget);
  const showToast = useDashboardStore((s) => s.showToast);
  const set = useDashboardStore.setState;

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) {
        const { notifications: fresh } = await res.json();
        set({ notifications: fresh || [] });
      }
    } catch (e) {
      console.warn("refresh notifications error:", e);
    } finally {
      setRefreshing(false);
      showToast("Data refreshed", 2000);
    }
  };

  const sortedNotifications = [...notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleGenerateNOC = (notif) => {
    // Set the target so CandidateHistoryPage picks it up
    setNocTarget(notif.candidate, notif.id);
    // Navigate to Candidate History page
    navigate("history");
  };

  return (
    <div className="page-inner">
      <div className="page-header" style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20}}>
        <div>
          <h1 className="page-title">All <span>Notifications</span></h1>
          <p className="page-subtitle">Review payment completion alerts and mark them as read.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Refresh icon */}
          <button
            onClick={handleRefresh}
            title="Refresh notifications"
            style={{
              background: "var(--surface, #1e293b)",
              color: "var(--text-muted, #94a3b8)",
              border: "1.5px solid var(--border-md, #334155)",
              width: 44,
              height: 44,
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#10b981";
              e.currentTarget.style.color = "#10b981";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-md, #334155)";
              e.currentTarget.style.color = "var(--text-muted, #94a3b8)";
            }}
          >
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
              style={{
                animation: refreshing ? "spin 0.7s linear infinite" : "none",
                transformOrigin: "center",
              }}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.36-3.36L23 10M1 14l5.13 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>

          {/* Delete all */}
          <button
            onClick={() => deleteAllNotifications()}
            style={{
              background: "#ef4444",
              color: "#ffffff",
              border: "none",
              height: "50px",
              padding: "10px",
              borderRadius: "9px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 6px rgba(239, 68, 68, 0.25)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#dc2626";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ef4444";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            DELETE ALL
          </button>
        </div>
      </div>

      {sortedNotifications.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: 20 }}>
          <div className="empty-icon">🔔</div>
          <div className="empty-title">No notifications yet</div>
          <div className="empty-sub">Once a candidate reaches 100% payment completion, alerts will appear here.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {sortedNotifications.map((notif) => {
            const isRead = notif.read;
            const nocGenerated = notif.noc === true;
            return (
              <div
                key={notif.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: 20,
                  borderRadius: 18,
                  background: isRead ? "#f8fafc" : "#ecfdf5",
                  border: isRead ? "1px solid #e2e8f0" : "1px solid #34d399",
                  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 9999, display: "grid", placeItems: "center", background: isRead ? "#d1fae5" : "#34d399", color: isRead ? "#065f46" : "#ffffff", fontWeight: 700 }}>
                      ✓
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isRead ? "#0f172a" : "#064e3b" }}>
                      {isRead ? "Read" : "New"}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.6, color: "#0f172a", marginBottom: 8, whiteSpace: "pre-wrap" }}>
                    {notif.message}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {new Date(notif.createdAt).toLocaleString()}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {/* Mark as Read */}
                  <button
                    onClick={() => markNotificationRead(notif.id)}
                    disabled={isRead}
                    style={{
                      background: isRead ? "#e2e8f0" : "#10b981",
                      color: isRead ? "#64748b" : "#ffffff",
                      border: "none",
                      padding: "10px 18px",
                      borderRadius: 9999,
                      cursor: isRead ? "default" : "pointer",
                      fontWeight: 700,
                      fontSize: 13,
                      transition: "background 0.2s ease",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isRead ? "Read" : "Mark as Read"}
                  </button>

                  {/* Generate NOC — only shown for payment-complete notifications */}
                  {notif.type === "payment-complete" && notif.candidate && (
                    <button
                      onClick={() => handleGenerateNOC(notif)}
                      disabled={nocGenerated}
                      title={nocGenerated ? "NOC already generated for this candidate" : "Go to Candidate History to generate NOC"}
                      style={{
                        background: nocGenerated ? "#1e293b" : "linear-gradient(135deg, #0f766e, #0d9488)",
                        color: nocGenerated ? "#94a3b8" : "#ffffff",
                        border: nocGenerated ? "1px solid #334155" : "none",
                        padding: "10px 18px",
                        borderRadius: 9999,
                        cursor: nocGenerated ? "default" : "pointer",
                        fontWeight: 700,
                        fontSize: 13,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        transition: "all 0.2s ease",
                        whiteSpace: "nowrap",
                        boxShadow: nocGenerated ? "none" : "0 2px 8px rgba(13,148,136,0.3)",
                      }}
                      onMouseEnter={(e) => {
                        if (!nocGenerated) {
                          e.currentTarget.style.transform = "scale(1.04)";
                          e.currentTarget.style.boxShadow = "0 4px 14px rgba(13,148,136,0.45)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!nocGenerated) {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(13,148,136,0.3)";
                        }
                      }}
                    >
                      {/* File icon */}
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                      {nocGenerated ? "NOC Generated" : "Generate NOC"}
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => deleteSpecificNotification(notif.id)}
                    style={{
                      background: "#ef4444",
                      color: "#ffffff",
                      border: "none",
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                      boxShadow: "0 2px 6px rgba(239, 68, 68, 0.25)",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#dc2626";
                      e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#ef4444";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
