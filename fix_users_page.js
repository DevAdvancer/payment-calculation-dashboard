const fs = require('fs');

let jsx = fs.readFileSync('app/admin/users/page.jsx', 'utf-8');

// 1. Expand layout
jsx = jsx.replace(/maxWidth: 1000/g, 'maxWidth: 1400');

// 2. Table styling
jsx = jsx.replace(/<table style=\{\{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 \}\}>/g, '<table className="tbl" style={{ width: "100%" }}>');
jsx = jsx.replace(/<tr style=\{\{ background: "var\(--color-surface-2\)", borderBottom: "1px solid var\(--color-border-light\)" \}\}>/g, '<tr>');
// Remove inline padding from headers and cells since .tbl handles it
jsx = jsx.replace(/<th style=\{\{ padding: "12px 24px", fontWeight: 600, color: "var\(--color-ink-muted\)" \}\}>/g, '<th>');
jsx = jsx.replace(/<td style=\{\{ padding: "16px 24px", color: "var\(--color-ink\)", fontWeight: 500 \}\}>/g, '<td style={{ fontWeight: 500 }}>');
jsx = jsx.replace(/<td style=\{\{ padding: "16px 24px" \}\}>/g, '<td>');

// 3. UserRow badges and buttons
// Role select
jsx = jsx.replace(/color: currentRole === 'admin' \? "#8b5cf6" : "#64748b"/g, 'color: currentRole === "admin" ? "var(--color-primary)" : "var(--text-main)"');
jsx = jsx.replace(/border: "1px solid #cbd5e1"/g, 'border: "1px solid var(--color-border)"');
// Status select
jsx = jsx.replace(/color: currentStatus === 'active' \? "#10b981" : "#f59e0b"/g, 'color: currentStatus === "active" ? "var(--color-success)" : "var(--color-warning)"');

// Buttons in UserRow
// Access
jsx = jsx.replace(
  /<button onClick=\{\(\) => onPromptAccess\(user\)\} style=\{\{ border: "1px solid #cbd5e1", background: "var\(--color-surface\)", padding: "6px 14px", borderRadius: 16, fontSize: 12, fontWeight: 600, color: "var\(--color-ink-muted\)", cursor: "pointer", transition: "all 0.15s" \}\}>/g,
  '<button onClick={() => onPromptAccess(user)} style={{ border: "1px solid var(--color-border)", background: "transparent", padding: "6px 14px", borderRadius: 16, fontSize: 12, fontWeight: 600, color: "var(--text-main)", cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-surface-2)"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>'
);

// Reset password
jsx = jsx.replace(
  /background: "var\(--color-surface-2\)",[\s\S]*?padding: "6px 12px",[\s\S]*?border: "1px solid #c7d2fe",[\s\S]*?color: "#4f46e5",[\s\S]*?fontWeight: 600,[\s\S]*?cursor: "pointer",[\s\S]*?borderRadius: "6px",[\s\S]*?boxShadow: "0 1px 2px rgba\(0,0,0,0.05\)",[\s\S]*?transition: "all 0.15s",[\s\S]*?fontSize: "12px"/g,
  'background: "var(--color-surface-2)", padding: "6px 12px", border: "1px solid var(--color-border)", color: "var(--color-ink)", fontWeight: 500, cursor: "pointer", borderRadius: "6px", transition: "border 0.15s", fontSize: "12px"'
);

// Delete
jsx = jsx.replace(
  /background: "#fee2e2",[\s\S]*?padding: "6px 12px",[\s\S]*?border: "1px solid #fca5a5",[\s\S]*?color: "#ef4444",[\s\S]*?fontWeight: 600,[\s\S]*?cursor: "pointer",[\s\S]*?borderRadius: "6px",[\s\S]*?boxShadow: "0 1px 2px rgba\(0,0,0,0.05\)",[\s\S]*?transition: "all 0.15s",[\s\S]*?fontSize: "12px"/g,
  'background: "var(--color-danger-soft)", padding: "6px 12px", border: "1px solid var(--color-danger-soft)", color: "var(--color-danger)", fontWeight: 500, cursor: "pointer", borderRadius: "6px", transition: "border 0.15s", fontSize: "12px"'
);


// Save/Cancel standard replacements
jsx = jsx.replace(/background: "#3b82f6", color: "#fff"/g, 'background: "var(--color-primary)", color: "white"');
jsx = jsx.replace(/background: "#10b981", color: "#fff"/g, 'background: "var(--color-success)", color: "white"');
jsx = jsx.replace(/background: "#1a1f2e"/g, 'background: "var(--color-primary)"');
jsx = jsx.replace(/background: "#ef4444"/g, 'background: "var(--color-danger)"');

// Access modal rows "#f8fafc" and "#fff"
jsx = jsx.replace(/background: hasAccess \? "#f8fafc" : "#fff"/g, 'background: hasAccess ? "var(--color-surface-2)" : "var(--color-surface)"');
jsx = jsx.replace(/border: "1px solid #e5e7eb"/g, 'border: "1px solid var(--color-border)"');
jsx = jsx.replace(/borderTop: "1px solid #e5e7eb"/g, 'borderTop: "1px solid var(--color-border)"');
jsx = jsx.replace(/border: "1px solid #d1d5db"/g, 'border: "1px solid var(--color-border)"');
jsx = jsx.replace(/border: "1px solid #cbd5e1"/g, 'border: "1px solid var(--color-border)"');
jsx = jsx.replace(/background: "#fee2e2"/g, 'background: "var(--color-danger-soft)"');
jsx = jsx.replace(/border: "1px solid #fca5a5"/g, 'border: "1px solid var(--color-danger-soft)"');
jsx = jsx.replace(/color: "#ef4444"/g, 'color: "var(--color-danger)"');

fs.writeFileSync('app/admin/users/page.jsx', jsx);
console.log('Fixed users page!');
