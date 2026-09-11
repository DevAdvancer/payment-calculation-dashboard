const fs = require('fs');

let jsx = fs.readFileSync('app/admin/users/page.jsx', 'utf-8');

jsx = jsx.replace(/maxWidth: 1000/g, 'maxWidth: 1400');
jsx = jsx.replace(/<table style=\{\{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 \}\}>/g, '<table className="tbl" style={{ width: "100%" }}>');
jsx = jsx.replace(/<tr style=\{\{ background: "var\(--color-surface-2\)", borderBottom: "1px solid var\(--color-border-light\)" \}\}>/g, '<tr>');
jsx = jsx.replace(/<th style=\{\{ padding: "12px 24px", fontWeight: 600, color: "var\(--color-ink-muted\)" \}\}>/g, '<th>');
jsx = jsx.replace(/<td style=\{\{ padding: "16px 24px", color: "var\(--color-ink\)", fontWeight: 500 \}\}>/g, '<td style={{ fontWeight: 500 }}>');
jsx = jsx.replace(/<td style=\{\{ padding: "16px 24px" \}\}>/g, '<td>');

const resetOld = '<button \\n                onClick={handleResetPassword}\\n                style={{ \\n                  background: "var(--color-surface-2)", \\n                  padding: "6px 12px", \\n                  border: "1px solid #c7d2fe", \\n                  color: "#4f46e5", \\n                  fontWeight: 600, \\n                  cursor: "pointer",\\n                  borderRadius: "6px",\\n                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",\\n                  transition: "all 0.15s",\\n                  fontSize: "12px"\\n                }}\\n              >\\n                Reset Password\\n              </button>';

const resetNew = '<button onClick={handleResetPassword} style={{ background: "var(--color-surface-2)", padding: "6px 12px", border: "1px solid var(--color-border)", color: "var(--color-ink)", fontWeight: 500, cursor: "pointer", borderRadius: "6px", transition: "border 0.15s", fontSize: "12px" }}>Reset Password</button>';

jsx = jsx.replace(resetOld.replace(/\\n/g, '\n'), resetNew.replace(/\\n/g, '\n'));

const delOld = '<button \\n                onClick={handleDelete}\\n                style={{ \\n                  background: "#fee2e2", \\n                  padding: "6px 12px", \\n                  border: "1px solid #fca5a5", \\n                  color: "#ef4444", \\n                  fontWeight: 600, \\n                  cursor: "pointer",\\n                  borderRadius: "6px",\\n                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",\\n                  transition: "all 0.15s",\\n                  fontSize: "12px"\\n                }}\\n              >\\n                Delete\\n              </button>';

const delNew = '<button onClick={handleDelete} style={{ background: "var(--color-danger-soft)", padding: "6px 12px", border: "1px solid var(--color-danger-soft)", color: "var(--color-danger)", fontWeight: 500, cursor: "pointer", borderRadius: "6px", transition: "border 0.15s", fontSize: "12px" }}>Delete</button>';

jsx = jsx.replace(delOld.replace(/\\n/g, '\n'), delNew.replace(/\\n/g, '\n'));

const accessBtnTarget = '<button onClick={() => onPromptAccess(user)} style={{ border: "1px solid #cbd5e1", background: "var(--color-surface)", padding: "6px 14px", borderRadius: 16, fontSize: 12, fontWeight: 600, color: "var(--color-ink-muted)", cursor: "pointer", transition: "all 0.15s" }}>\\n            Access\\n          </button>';
const accessBtnRep = '<button onClick={() => onPromptAccess(user)} style={{ border: "1px solid var(--color-border)", background: "transparent", padding: "6px 14px", borderRadius: 16, fontSize: 12, fontWeight: 600, color: "var(--text-main)", cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-surface-2)"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>\\n            Access\\n          </button>';
jsx = jsx.replace(accessBtnTarget.replace(/\\n/g, '\n'), accessBtnRep.replace(/\\n/g, '\n'));

fs.writeFileSync('app/admin/users/page.jsx', jsx);
console.log('Safe fix applied!');
