"use client";

import Link from "next/link";

export default function PageNotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)",
      fontFamily: "var(--font-inter, system-ui, sans-serif)",
      padding: "20px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "500px",
        background: "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: "24px",
        padding: "48px 32px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        textAlign: "center",
        animation: "fadeInUp 0.6s ease-out"
      }}>
        <div style={{
          fontSize: "80px",
          fontWeight: "800",
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "16px",
          lineHeight: "1"
        }}>
          404
        </div>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#fff", marginBottom: "12px" }}>
          Page Not Found
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px", marginBottom: "32px", lineHeight: "1.6" }}>
          The page you are looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        <Link href="/dashboard" style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "14px 24px",
          background: "linear-gradient(135deg, #3b82f6, #6366f1)",
          color: "#fff",
          textDecoration: "none",
          borderRadius: "12px",
          fontSize: "15px",
          fontWeight: "600",
          boxShadow: "0 4px 14px 0 rgba(99, 102, 241, 0.39)",
          transition: "transform 0.2s, box-shadow 0.2s"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(99, 102, 241, 0.5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "0 4px 14px 0 rgba(99, 102, 241, 0.39)";
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Return to Dashboard
        </Link>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}} />
      </div>
    </div>
  );
}
