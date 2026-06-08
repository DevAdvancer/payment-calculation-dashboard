import React from "react";

export default function DeleteConfirmModal({
  isOpen,
  title = "Delete Entry",
  message = "Are you sure you want to delete this entry? This action cannot be undone.",
  confirmText = "Delete Permanently",
  cancelText = "Cancel",
  loadingText = "Deleting...",
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !loading && onCancel()}>
      <div
        className="modal-card"
        style={{
          maxWidth: "440px",
          display: "flex",
          flexDirection: "column",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: "16px 20px" }}>
          <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "var(--color-danger)" }}>⚠️</span> Confirm Deletion
          </h3>
          <button
            className="modal-close"
            onClick={onCancel}
            disabled={loading}
            style={{ fontSize: "18px", width: "28px", height: "28px" }}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: "20px 24px", gap: "12px" }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "var(--color-danger-soft)",
                color: "var(--color-danger)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <h4
                style={{
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "var(--color-ink)",
                  margin: 0,
                }}
              >
                {title}
              </h4>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--color-ink-muted)",
                  lineHeight: "1.5",
                  margin: 0,
                  whiteSpace: "pre-line",
                }}
              >
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            padding: "12px 20px",
            background: "var(--color-surface-2)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <button
            className="btn-ghost"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "6px 14px",
              fontSize: "12.5px",
              height: "32px",
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "6px 14px",
              fontSize: "12.5px",
              fontWeight: "700",
              fontFamily: "var(--font-body)",
              borderRadius: "var(--radius-md)",
              cursor: loading ? "not-allowed" : "pointer",
              background: "var(--color-danger)",
              color: "white",
              border: "1px solid var(--color-danger)",
              height: "32px",
              opacity: loading ? 0.7 : 1,
              transition: "background var(--duration-fast) var(--ease)",
            }}
            onMouseOver={(e) => {
              if (!loading) e.currentTarget.style.background = "#b91c1c";
            }}
            onMouseOut={(e) => {
              if (!loading) e.currentTarget.style.background = "var(--color-danger)";
            }}
          >
            {loading ? (
              <>
                <svg
                  style={{
                    animation: "spin 1s linear infinite",
                    width: "12px",
                    height: "12px",
                  }}
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    style={{ opacity: 0.25 }}
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    style={{ opacity: 0.75 }}
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {loadingText}
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
