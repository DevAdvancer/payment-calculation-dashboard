"use client";

import React from "react";

export default function PaginationControls({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        background: "var(--surface-1, #1a1f2e)",
        borderTop: "1px solid var(--border, #2d3748)",
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 13, color: "var(--text-muted, #a0aec0)" }}>
        Showing <strong>{start}</strong> to <strong>{end}</strong> of <strong>{total}</strong> entries
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted, #a0aec0)" }}>
          Show:
          <select
            value={pageSize === total && total > 0 ? "all" : pageSize}
            onChange={(e) => {
              const val = e.target.value === "all" ? total : Number(e.target.value);
              onPageSizeChange(val);
            }}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid var(--border, #2d3748)",
              background: "var(--surface-2, #f8f9fa)",
              color: "var(--ink, #111827)",
              fontSize: 12,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value={100}>100</option>
            <option value={250}>250</option>
            <option value={500}>500</option>
            <option value="all">All</option>
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            className="btn-ghost"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            style={{
              padding: "5px 12px",
              minWidth: 70,
              fontSize: 12,
              opacity: page === 1 ? 0.5 : 1,
              cursor: page === 1 ? "not-allowed" : "pointer",
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: 13, color: "var(--text-muted, #a0aec0)", padding: "0 8px" }}>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>
          <button
            className="btn-ghost"
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            style={{
              padding: "5px 12px",
              minWidth: 70,
              fontSize: 12,
              opacity: page === totalPages ? 0.5 : 1,
              cursor: page === totalPages ? "not-allowed" : "pointer",
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
