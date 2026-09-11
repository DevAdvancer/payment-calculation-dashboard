const fs = require('fs');
let jsx = fs.readFileSync('app/admin/users/page.jsx', 'utf-8');

jsx = jsx.replace(/#475569/g, 'var(--text-main)'); // Was slate-600
jsx = jsx.replace(/#f1f5f9/g, 'var(--color-surface-2)'); // Was slate-100 (hover bg)
jsx = jsx.replace(/#94a3b8/g, 'var(--color-ink-muted)'); // Was slate-400 (icon color, muted text)
jsx = jsx.replace(/#8b5cf6/g, 'var(--color-primary)'); // Was purple-500
jsx = jsx.replace(/#64748b/g, 'var(--text-dim)'); // Was slate-500
jsx = jsx.replace(/#c7d2fe/g, 'var(--color-accent-soft)'); // Was indigo-200 border
jsx = jsx.replace(/#4f46e5/g, 'var(--color-primary)'); // Was indigo-600 text
jsx = jsx.replace(/#e3e6ea/g, 'var(--color-surface-2)'); // Was border color ?

fs.writeFileSync('app/admin/users/page.jsx', jsx);
console.log('Cleaned all hex codes in users page');
