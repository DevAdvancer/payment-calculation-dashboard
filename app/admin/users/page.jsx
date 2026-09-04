"use client";
import Link from "next/link";

export default function AccessControlPage() {
  return (
    <div style={{ padding: "40px 56px", maxWidth: 1000, margin: "0 auto", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
          Access Control
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
          Manage users and their permissions within the system.
        </p>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e3e6ea", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        
        {/* Header */}
        <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eef0f3" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>Manage Users</h2>
          <button style={{ padding: "8px 16px", background: "#1a1f2e", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
            Create
          </button>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #eef0f3" }}>
                <th style={{ padding: "12px 24px", fontWeight: 600, color: "#64748b" }}>Name</th>
                <th style={{ padding: "12px 24px", fontWeight: 600, color: "#64748b" }}>Role</th>
                <th style={{ padding: "12px 24px", fontWeight: 600, color: "#64748b" }}>Control</th>
                <th style={{ padding: "12px 24px", fontWeight: 600, color: "#64748b" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Sample Row */}
              <tr style={{ borderBottom: "1px solid #eef0f3" }}>
                <td style={{ padding: "16px 24px", color: "#111827", fontWeight: 500 }}>Abhirup</td>
                <td style={{ padding: "16px 24px", color: "#64748b" }}>User</td>
                <td style={{ padding: "16px 24px" }}>
                  <Link href="/admin/access-control" style={{ display: "inline-block", textDecoration: "none", padding: "6px 14px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 16, fontSize: 12, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                    Access
                  </Link>
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
                    <button style={{ background: "none", border: "none", color: "#f59e0b", fontWeight: 600, cursor: "pointer", padding: 0 }}>Inactive</button>
                    <span style={{ color: "#cbd5e1" }}>|</span>
                    <button style={{ background: "none", border: "none", color: "#ef4444", fontWeight: 600, cursor: "pointer", padding: 0 }}>Delete</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
