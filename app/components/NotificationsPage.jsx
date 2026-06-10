"use client";

import useDashboardStore from "../../lib/use-store";

export default function NotificationsPage() {
  const notifications = useDashboardStore((s) => s.notifications);
  const markNotificationRead = useDashboardStore((s) => s.markNotificationRead);

  const sortedNotifications = [...notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="page-inner">
      <div className="page-header">
        <h1 className="page-title">All <span>Notifications</span></h1>
        <p className="page-subtitle">Review payment completion alerts and mark them as read.</p>
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
            return (
              <div
                key={notif.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: 20,
                  borderRadius: 18,
                  background: isRead ? "#f8fafc" : "#ecfdf5",
                  border: isRead ? "1px solid #e2e8f0" : "1px solid #34d399",
                  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
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
                    transition: "background 0.2s ease",
                  }}
                >
                  {isRead ? "Read" : "Mark as Read"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
