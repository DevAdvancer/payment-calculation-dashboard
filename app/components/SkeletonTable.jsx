"use client";

export default function SkeletonTable() {
  return (
    <div style={{ padding: "20px" }}>
      {/* Top action bar skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <div className="skeleton-pulse" style={{ width: 140, height: 36, borderRadius: 6, background: "#e5e7eb" }} />
          <div className="skeleton-pulse" style={{ width: 100, height: 36, borderRadius: 6, background: "#e5e7eb" }} />
          <div className="skeleton-pulse" style={{ width: 80, height: 36, borderRadius: 6, background: "#e5e7eb" }} />
        </div>
        <div className="skeleton-pulse" style={{ width: 120, height: 36, borderRadius: 6, background: "#e5e7eb" }} />
      </div>

      {/* Table skeleton */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        {/* Table Header */}
        <div style={{ display: "flex", background: "#f9fafb", padding: "12px 16px", borderBottom: "1px solid #e5e7eb" }}>
          <div className="skeleton-pulse" style={{ width: "15%", height: 16, background: "#d1d5db", borderRadius: 4, marginRight: "5%" }} />
          <div className="skeleton-pulse" style={{ width: "20%", height: 16, background: "#d1d5db", borderRadius: 4, marginRight: "5%" }} />
          <div className="skeleton-pulse" style={{ width: "15%", height: 16, background: "#d1d5db", borderRadius: 4, marginRight: "5%" }} />
          <div className="skeleton-pulse" style={{ width: "15%", height: 16, background: "#d1d5db", borderRadius: 4, marginRight: "5%" }} />
          <div className="skeleton-pulse" style={{ width: "15%", height: 16, background: "#d1d5db", borderRadius: 4 }} />
        </div>
        
        {/* Table Rows */}
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ display: "flex", padding: "16px", borderBottom: "1px solid #f3f4f6" }}>
            <div className="skeleton-pulse" style={{ width: "15%", height: 14, background: "#e5e7eb", borderRadius: 4, marginRight: "5%" }} />
            <div className="skeleton-pulse" style={{ width: "20%", height: 14, background: "#e5e7eb", borderRadius: 4, marginRight: "5%" }} />
            <div className="skeleton-pulse" style={{ width: "15%", height: 14, background: "#e5e7eb", borderRadius: 4, marginRight: "5%" }} />
            <div className="skeleton-pulse" style={{ width: "15%", height: 14, background: "#e5e7eb", borderRadius: 4, marginRight: "5%" }} />
            <div className="skeleton-pulse" style={{ width: "15%", height: 14, background: "#e5e7eb", borderRadius: 4 }} />
          </div>
        ))}
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .skeleton-pulse {
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      ` }} />
    </div>
  );
}

