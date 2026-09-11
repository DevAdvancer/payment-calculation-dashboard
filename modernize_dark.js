const fs = require('fs');

let css = fs.readFileSync('app/globals.css', 'utf-8');

const rootRegex = /:root\s*\{[\s\S]*?\}/;
const newRoot = ':root {' +
  '\n  --color-bg:           #020617;' +
  '\n  --color-surface:      #0f172a;' +
  '\n  --color-surface-2:    #1e293b;' +
  '\n  --color-border:       #334155;' +
  '\n  --color-border-light: #1e293b;' +
  '\n  --color-ink:          #f8fafc;' +
  '\n  --color-ink-2:        #cbd5e1;' +
  '\n  --color-ink-muted:    #94a3b8;' +
  '\n  --color-primary:      #6366f1;' +
  '\n  --color-primary-hover:#4f46e5;' +
  '\n  --color-sidebar:      #020617;' +
  '\n  --color-accent:       #6366f1;' +
  '\n  --color-accent-border:rgba(99, 102, 241, 0.4);' +
  '\n  --color-accent-soft:  rgba(99, 102, 241, 0.15);' +
  '\n  --color-danger:       #ef4444;' +
  '\n  --color-danger-soft:  rgba(239, 68, 68, 0.15);' +
  '\n  --color-success:      #10b981;' +
  '\n  --color-success-soft: rgba(16, 185, 129, 0.15);' +
  '\n  --color-warning:      #f59e0b;' +
  '\n  --mint: var(--color-success);' +
  '\n  --teal: var(--color-primary);' +
  '\n  --border: var(--color-border);' +
  '\n  --surface-1: var(--color-surface);' +
  '\n  --surface-2: var(--color-surface-2);' +
  '\n  --text-main: var(--color-ink);' +
  '\n  --text-dim: var(--color-ink-2);' +
  '\n  --text-muted: var(--color-ink-muted);' +
  '\n  --font-body: \'Inter\', system-ui, -apple-system, sans-serif;' +
  '\n  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;' +
  '\n  --text-xs:  12px; --text-sm:  13px; --text-md:  14px; --text-lg:  16px;' +
  '\n  --radius-sm:  6px; --radius-md:  8px; --radius-lg:  12px; --radius-xl:  16px; --radius-full:9999px;' +
  '\n  --r-sm: var(--radius-sm); --r-md: var(--radius-md); --r-lg: var(--radius-lg); --r-xl: var(--radius-xl); --r-full: var(--radius-full);' +
  '\n  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 20px; --sp-6: 24px; --sp-8: 32px; --sp-10: 40px;' +
  '\n  --shadow-xs: 0 1px 2px rgba(0,0,0,0.4); --shadow-sm: 0 1px 3px rgba(0,0,0,0.5); --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.6); --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.8);' +
  '\n  --ease: cubic-bezier(0.4, 0, 0.2, 1); --duration-fast: 150ms;' +
  '\n}';

css = css.replace(rootRegex, newRoot);

// Ensure sidebar class is updated
css = css.replace(/\.sidebar\s*\{[\s\S]*?\}/, (match) => {
  return match.replace(/background:\s*var\(--color-primary\)/, 'background: var(--color-sidebar); border-right: 1px solid var(--color-border)');
});

fs.writeFileSync('app/globals.css', css);

let sidebar = fs.readFileSync('app/components/Sidebar.jsx', 'utf-8');
sidebar = sidebar.replace(/background:\s*["']?var\(--color-primary\)["']?/g, 'background: "var(--color-sidebar)"');
fs.writeFileSync('app/components/Sidebar.jsx', sidebar);

console.log('Migrated to Dark Mode!');
