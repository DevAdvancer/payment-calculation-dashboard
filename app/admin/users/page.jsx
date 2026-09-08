"use client";
import { useState } from "react";
import Link from "next/link";

export default function AccessControlPage() {
  const [savedStatus, setSavedStatus] = useState("inactive");
  const [currentStatus, setCurrentStatus] = useState("inactive");
  
  const [savedRole, setSavedRole] = useState("user");
  const [currentRole, setCurrentRole] = useState("user");
  
  const hasStatusChanges = savedStatus !== currentStatus;
  const hasRoleChanges = savedRole !== currentRole;

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
                <th style={{ padding: "12px 24px", fontWeight: 600, color: "#64748b" }}>Email</th>
                <th style={{ padding: "12px 24px", fontWeight: 600, color: "#64748b" }}>Role</th>
                <th style={{ padding: "12px 24px", fontWeight: 600, color: "#64748b" }}>Control</th>
                <th style={{ padding: "12px 24px", fontWeight: 600, color: "#64748b" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Sample Row */}
              <tr style={{ borderBottom: "1px solid #eef0f3" }}>
                <td style={{ padding: "16px 24px", color: "#111827", fontWeight: 500 }}>Abhirup</td>
                <td style={{ padding: "16px 24px", color: "#64748b" }}>x@example.com</td>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <select 
                      value={currentRole}
                      onChange={(e) => setCurrentRole(e.target.value)}
                      style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1", outline: "none", background: "#f8fafc", color: currentRole === 'admin' ? "#8b5cf6" : "#64748b", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                    
                    {hasRoleChanges && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button 
                          onClick={() => setSavedRole(currentRole)}
                          style={{ padding: "6px 10px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer", transition: "transform 0.1s", boxShadow: "0 1px 2px rgba(59, 130, 246, 0.2)" }}
                          onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.95)"; }}
                          onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                        >Save</button>
                        <button 
                          onClick={() => setCurrentRole(savedRole)}
                          style={{ padding: "6px 10px", background: "#fff", color: "#64748b", border: "1px solid #cbd5e1", borderRadius: 6, fontWeight: 600, cursor: "pointer", transition: "transform 0.1s" }}
                          onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.95)"; }}
                          onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                        >Cancel</button>
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <Link href="/admin/access-control" style={{ display: "inline-block", textDecoration: "none", padding: "6px 14px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 16, fontSize: 12, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                    Access
                  </Link>
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <select 
                        value={currentStatus}
                        onChange={(e) => setCurrentStatus(e.target.value)}
                        style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1", outline: "none", background: "#f8fafc", color: currentStatus === 'active' ? "#10b981" : "#f59e0b", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      
                      {hasStatusChanges && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button 
                            onClick={() => setSavedStatus(currentStatus)}
                            style={{ padding: "6px 10px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer", transition: "transform 0.1s", boxShadow: "0 1px 2px rgba(16, 185, 129, 0.2)" }}
                            onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.95)"; }}
                            onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                          >Save</button>
                          <button 
                            onClick={() => setCurrentStatus(savedStatus)}
                            style={{ padding: "6px 10px", background: "#fff", color: "#64748b", border: "1px solid #cbd5e1", borderRadius: 6, fontWeight: 600, cursor: "pointer", transition: "transform 0.1s" }}
                            onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.95)"; }}
                            onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                          >Cancel</button>
                        </div>
                      )}
                    </div>
                    <button 
                      style={{ 
                        background: "#fee2e2", 
                        padding: "6px 12px", 
                        border: "1px solid #fca5a5", 
                        color: "#ef4444", 
                        fontWeight: 600, 
                        cursor: "pointer",
                        borderRadius: "6px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                        transition: "all 0.15s"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#fecaca"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
                      onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.96)"; }}
                      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                    >
                      Delete
                    </button>
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
