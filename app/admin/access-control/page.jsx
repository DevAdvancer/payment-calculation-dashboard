"use client";
import Link from "next/link";

export default function AccessSettingsPage() {
  return (
    <div style={{ padding: "40px 56px", maxWidth: 1000, margin: "0 auto", fontFamily: "'DM Sans', sans-serif" }}>
      
      <Link href="/admin/users" style={{ display: "inline-block", marginBottom: 24, fontSize: 13, fontWeight: 600, color: "#64748b", textDecoration: "none" }}>
        ← Back to Users
      </Link>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
          Access Settings: Abhirup
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
          Manage granular permissions for this user.
        </p>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e3e6ea", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <p style={{ fontSize: 14, color: "#374151" }}>
          (Access Control settings UI will go here)
        </p>
      </div>
    </div>
  );
}
