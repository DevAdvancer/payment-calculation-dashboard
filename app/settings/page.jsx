"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setUser(d.user);
          setName(d.user.name || "");
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (password && password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    
    setIsSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password: password || undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");
      toast.success("Profile saved successfully");
      setPassword(""); 
      if (data.user) {
        setUser(data.user);
        setName(data.user.name || "");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px 56px", maxWidth: 800, margin: "0 auto", fontFamily: "'DM Sans', sans-serif" }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .skeleton-pulse {
            animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        ` }} />
        <div style={{ marginBottom: 32 }}>
          <div className="skeleton-pulse" style={{ width: 140, height: 28, background: "#d1d5db", borderRadius: 6, marginBottom: 8 }} />
          <div className="skeleton-pulse" style={{ width: 260, height: 16, background: "#e5e7eb", borderRadius: 4 }} />
        </div>
        <div style={{ background: "#fff", border: "1px solid #e3e6ea", borderRadius: 12, padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <div className="skeleton-pulse" style={{ width: 100, height: 16, background: "#e5e7eb", borderRadius: 4, marginBottom: 6 }} />
              <div className="skeleton-pulse" style={{ width: "100%", height: 38, background: "#f3f4f6", borderRadius: 6 }} />
            </div>
            <div>
              <div className="skeleton-pulse" style={{ width: 80, height: 16, background: "#e5e7eb", borderRadius: 4, marginBottom: 6 }} />
              <div className="skeleton-pulse" style={{ width: "100%", height: 38, background: "#f3f4f6", borderRadius: 6 }} />
            </div>
            <div style={{ borderTop: "1px solid #e5e7eb", margin: "8px 0" }} />
            <div>
              <div className="skeleton-pulse" style={{ width: 120, height: 16, background: "#e5e7eb", borderRadius: 4, marginBottom: 6 }} />
              <div className="skeleton-pulse" style={{ width: "100%", height: 38, background: "#f3f4f6", borderRadius: 6 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 56px", maxWidth: 800, margin: "0 auto", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
          My Settings
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
          Manage your personal profile and security preferences.
        </p>
      </div>
      
      <div style={{ background: "#fff", border: "1px solid #e3e6ea", borderRadius: 12, padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#374151" }}>Email Address</label>
            <div style={{ marginTop: "4px", padding: "10px 14px", background: "#f9fafb", borderRadius: "6px", border: "1px solid #e5e7eb", color: "#6b7280", fontSize: "14px" }}>
              {user?.email}
            </div>
            <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>Your email is used for login and cannot be altered.</p>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Full Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: "6px", border: "1px solid #d1d5db", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
              placeholder="Your Name"
            />
          </div>

          <div style={{ borderTop: "1px solid #e5e7eb", margin: "8px 0" }} />

          <div>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>New Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: "6px", border: "1px solid #d1d5db", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
              placeholder="Leave blank to keep current password"
            />
          </div>
          
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
            <button 
              type="submit" 
              disabled={isSaving}
              style={{ padding: "10px 24px", background: "#1a1f2e", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer", transition: "all 0.15s" }}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

