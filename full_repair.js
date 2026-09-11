const fs = require('fs');

let input = fs.readFileSync('app/admin/users/page.jsx', 'utf-8');

input = input.replace(/var\(--surface,\s*#1e293b\)/g, 'var(--color-surface)');
input = input.replace(/var\(--border-md,\s*#334155\)/g, 'var(--color-border)');
input = input.replace(/var\(--text-muted,\s*#94a3b8\)/g, 'var(--color-ink-muted)');

input = input.replace(/background:\s*['"]?#(f4f5f7|f8fafc|f9fafb|e5e7eb|f3f4f6|e0e7ff|eef2ff)['"]?/gi, 'background: "var(--color-surface-2)"');
input = input.replace(/background:\s*['"]?(white|#ffffff|#fff)['"]?/gi, 'background: "var(--color-surface)"');
input = input.replace(/color:\s*['"]?#(4b5563|64748b|9ca3af|94a3b8)['"]?/gi, 'color: "var(--color-ink-muted)"');
input = input.replace(/color:\s*['"]?#(111827|0f172a|1f2937|374151)['"]?/gi, 'color: "var(--color-ink)"');
input = input.replace(/border:\s*['"]?1px solid #(e5e7eb|d1d5db|e2e8f0|cbd5e1|f1f5f9)['"]?/gi, 'border: "1px solid var(--color-border)"');
input = input.replace(/borderBottom:\s*['"]?1px solid #(e5e7eb|d1d5db|e2e8f0|cbd5e1|eef0f3)['"]?/gi, 'borderBottom: "1px solid var(--color-border)"');
input = input.replace(/borderTop:\s*['"]?1px solid #(e5e7eb|d1d5db|e2e8f0|cbd5e1)['"]?/gi, 'borderTop: "1px solid var(--color-border)"');

// Then apply the UI specific fixes!
// 1. Expand layout
input = input.replace(/maxWidth: 1000/g, 'maxWidth: 1400');
input = input.replace(/<table style=\{\{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 \}\}>/g, '<table className="tbl" style={{ width: "100%" }}>');
input = input.replace(/<tr style=\{\{ borderBottom: "1px solid var\(--color-border\)" \}\}>/g, '<tr>');
input = input.replace(/<tr style=\{\{ background: "var\(--color-surface-2\)", borderBottom: "1px solid var\(--color-border\)" \}\}>/g, '<tr>');
input = input.replace(/<th style=\{\{ padding: "12px 24px", fontWeight: 600, color: "var\(--color-ink-muted\)" \}\}>/g, '<th>');
input = input.replace(/<td style=\{\{ padding: "16px 24px", color: "var\(--color-ink\)", fontWeight: 500 \}\}>/g, '<td style={{ fontWeight: 500 }}>');
input = input.replace(/<td style=\{\{ padding: "16px 24px" \}\}>/g, '<td>');

// 3. UserRow badges and buttons
// Role select
input = input.replace(/color: currentRole === 'admin' \? "#8b5cf6" : "var\(--color-ink-muted\)"/g, 'color: currentRole === "admin" ? "var(--color-primary)" : "var(--text-main)"');
// Status select
input = input.replace(/color: currentStatus === 'active' \? "#10b981" : "#f59e0b"/g, 'color: currentStatus === "active" ? "var(--color-success)" : "var(--color-warning)"');

const accessBtnTarget = '<button onClick={() => onPromptAccess(user)} style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)", padding: "6px 14px", borderRadius: 16, fontSize: 12, fontWeight: 600, color: "var(--color-ink-muted)", cursor: "pointer", transition: "all 0.15s" }}>\\n            Access\\n          </button>';
const accessBtnRep = '<button onClick={() => onPromptAccess(user)} style={{ border: "1px solid var(--color-border)", background: "transparent", padding: "6px 14px", borderRadius: 16, fontSize: 12, fontWeight: 600, color: "var(--text-main)", cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-surface-2)"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>\\n            Access\\n          </button>';
input = input.replace(accessBtnTarget.replace(/\\n/g, '\n'), accessBtnRep.replace(/\\n/g, '\n'));

const resetOld = '<button \\n                onClick={handleResetPassword}\\n                style={{ \\n                  background: "var(--color-surface-2)", \\n                  padding: "6px 12px", \\n                  border: "1px solid #c7d2fe", \\n                  color: "#4f46e5", \\n                  fontWeight: 600, \\n                  cursor: "pointer",\\n                  borderRadius: "6px",\\n                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",\\n                  transition: "all 0.15s",\\n                  fontSize: "12px"\\n                }}\\n              >\\n                Reset Password\\n              </button>';

const resetNew = '<button onClick={handleResetPassword} style={{ background: "var(--color-surface-2)", padding: "6px 12px", border: "1px solid var(--color-border)", color: "var(--color-ink)", fontWeight: 500, cursor: "pointer", borderRadius: "6px", transition: "border 0.15s", fontSize: "12px" }}>Reset Password</button>';

input = input.replace(resetOld.replace(/\\n/g, '\n'), resetNew.replace(/\\n/g, '\n'));

const delOld = '<button \\n                onClick={handleDelete}\\n                style={{ \\n                  background: "#fee2e2", \\n                  padding: "6px 12px", \\n                  border: "1px solid #fca5a5", \\n                  color: "#ef4444", \\n                  fontWeight: 600, \\n                  cursor: "pointer",\\n                  borderRadius: "6px",\\n                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",\\n                  transition: "all 0.15s",\\n                  fontSize: "12px"\\n                }}\\n              >\\n                Delete\\n              </button>';

const delNew = '<button onClick={handleDelete} style={{ background: "var(--color-danger-soft)", padding: "6px 12px", border: "1px solid var(--color-danger-soft)", color: "var(--color-danger)", fontWeight: 500, cursor: "pointer", borderRadius: "6px", transition: "border 0.15s", fontSize: "12px" }}>Delete</button>';

input = input.replace(delOld.replace(/\\n/g, '\n'), delNew.replace(/\\n/g, '\n'));

input = input.replace(/background: "#3b82f6", color: "#fff"/g, 'background: "var(--color-primary)", color: "white"');
input = input.replace(/background: "#10b981", color: "#fff"/g, 'background: "var(--color-success)", color: "white"');
input = input.replace(/background: "#1a1f2e"/g, 'background: "var(--color-primary)"');
input = input.replace(/background: "#ef4444"/g, 'background: "var(--color-danger)"');

fs.writeFileSync('app/admin/users/page.jsx', input);
console.log('Restored and Fixed successfully without regex gulping!');
