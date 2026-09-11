const fs = require('fs');

let input = fs.readFileSync('app/components/NotificationsPage.jsx', 'utf-8');

input = input.replace(/var\(--surface,\s*#1e293b\)/g, 'var(--color-surface)');
input = input.replace(/var\(--border-md,\s*#334155\)/g, 'var(--color-border)');
input = input.replace(/var\(--text-muted,\s*#94a3b8\)/g, 'var(--color-ink-muted)');
input = input.replace(/var\(--color-ink-muted\)/g, 'var(--color-ink-muted)');

input = input.replace(/e\.currentTarget\.style\.background\s*=\s*['"]#dc2626['"]/g, 'e.currentTarget.style.background = "var(--color-danger)"');

fs.writeFileSync('app/components/NotificationsPage.jsx', input);
console.log('Fixed refresh button');
