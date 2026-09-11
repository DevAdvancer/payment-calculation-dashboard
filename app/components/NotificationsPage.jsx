"use client";
import { Bell, Check, X } from "lucide-react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useDashboardStore from "../../lib/use-store";
import SkeletonTable from "@/app/components/SkeletonTable";

export default function NotificationsPage() {
  const notifications = useDashboardStore((s) => s.notifications);
  const markNotificationRead = useDashboardStore((s) => s.markNotificationRead);
  const deleteSpecificNotification = useDashboardStore((s) => s.deleteSpecificNotification);
  const deleteAllNotifications = useDashboardStore((s) => s.deleteAllNotifications);
  const router = useRouter();
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
    router.push("/history");
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
              width: 40, height: 40,
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
              background: "var(--color-danger-soft)",
              color: "var(--color-danger)",
              border: "none",
              height: "40px",
              padding: "0 18px",
              borderRadius: "20px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              boxShadow: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-danger)";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--color-danger-soft)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            DELETE ALL
          </button>
        </div>
      </div>

      {sortedNotifications.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: 20 }}>
          <div className="empty-icon" style={{ display:"flex", justifyContent:"center", marginBottom:12 }}><Bell size={48} strokeWidth={1} color="#9ca3af" /></div>
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
                  background: isRead ? "var(--color-surface)" : "var(--color-surface-2)",
                  border: isRead ? "1px solid var(--color-border)" : "1px solid rgba(16, 185, 129, 0.4)",
                  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 9999, display: "grid", placeItems: "center", background: isRead ? "var(--color-surface-2)" : "var(--color-success-soft)", color: isRead ? "var(--text-dim)" : "var(--color-success)", fontWeight: 700 }}><Check size={16} /></div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isRead ? "var(--text-dim)" : "var(--color-success)" }}>
                      {isRead ? "Read" : "New"}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.6, color: "var(--text-main)", marginBottom: 8, whiteSpace: "pre-wrap" }}>
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
                      background: isRead ? "var(--color-surface-2)" : "var(--color-success-soft)",
                      color: isRead ? "var(--text-muted)" : "var(--color-success)",
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
                        background: nocGenerated ? "var(--color-surface-2)" : "var(--color-primary)",
                        color: nocGenerated ? "var(--text-muted)" : "#fff",
                        border: nocGenerated ? "1px solid var(--color-border)" : "none",
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
                        boxShadow: nocGenerated ? "none" : "0 2px 8px var(--color-accent-soft)",
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
                      background: "var(--color-danger-soft)",
                      color: "var(--color-danger)",
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
                      boxShadow: "none",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--color-danger)";
                      e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--color-danger-soft)";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  ><X size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



