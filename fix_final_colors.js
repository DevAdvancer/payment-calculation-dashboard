const fs = require('fs');
let jsx = fs.readFileSync('app/admin/users/page.jsx', 'utf-8');

jsx = jsx.replace(/background:\s*hasAccess\s*\?\s*"#f8fafc"\s*:\s*"#fff"/g, 'background: hasAccess ? "var(--color-surface-2)" : "var(--color-surface)"');
jsx = jsx.replace(/color:\s*"#6b7280"/g, 'color: "var(--color-ink-muted)"');
jsx = jsx.replace(/background:\s*"#fee2e2"/g, 'background: "var(--color-danger-soft)"');
jsx = jsx.replace(/border:\s*"1px solid #fca5a5"/g, 'border: "1px solid var(--color-danger)"');
jsx = jsx.replace(/color:\s*"#ef4444"/g, 'color: "var(--color-danger)"');

fs.writeFileSync('app/admin/users/page.jsx', jsx);
console.log('Fixed final colors');
