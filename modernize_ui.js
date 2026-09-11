const fs = require('fs');

const path = 'app/globals.css';
let css = fs.readFileSync(path, 'utf-8');

// 1. Font
css = css.replace(
  "--font-body:  'DM Sans', system-ui, -apple-system, sans-serif;",
  "--font-body:  'Inter', system-ui, -apple-system, sans-serif;"
);

// 2. Palette
const palette = [
  ['--color-bg:           #f4f5f7;', '--color-bg:           #f8fafc;'],
  ['--color-surface-2:    #f8f9fa;', '--color-surface-2:    #f1f5f9;'],
  ['--color-border:       #e3e6ea;', '--color-border:       #e2e8f0;'],
  ['--color-border-light: #eef0f3;', '--color-border-light: #f1f5f9;'],
  ['--color-ink:          #111827;', '--color-ink:          #0f172a;'],
  ['--color-ink-2:        #374151;', '--color-ink-2:        #334155;'],
  ['--color-ink-muted:    #6b7280;', '--color-ink-muted:    #64748b;'],
  ['--color-ink-subtle:   #9ca3af;', '--color-ink-subtle:   #94a3b8;'],
  ['--color-primary:      #1a1f2e;', '--color-primary:      #0f172a;'],
  ['--color-primary-hover:#252d42;', '--color-primary-hover:#1e293b;'],
  ['--color-accent:       #2563eb;', '--color-accent:       #4f46e5;'],
  ['--color-accent-hover: #1d4ed8;', '--color-accent-hover: #4338ca;'],
  ['--color-accent-soft:  #eff6ff;', '--color-accent-soft:  #eef2ff;'],
  ['--color-accent-border:#bfdbfe;', '--color-accent-border:#c7d2fe;']
];
palette.forEach(([oldV, newV]) => {
  css = css.replace(oldV, newV);
});

// 3. Shadows
css = css.replace(
  '--shadow-xs:  0 1px 2px rgba(0,0,0,0.04);',
  '--shadow-xs:  0 1px 2px rgba(0,0,0,0.03);'
);
css = css.replace(
  '--shadow-sm:  0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);',
  '--shadow-sm:  0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04);'
);
css = css.replace(
  '--shadow-md:  0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.05);',
  '--shadow-md:  0 10px 15px -3px rgba(15,23,42,0.08), 0 4px 6px -4px rgba(15,23,42,0.04);'
);
css = css.replace(
  '--shadow-lg:  0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -2px rgba(0,0,0,0.04);',
  '--shadow-lg:  0 20px 25px -5px rgba(15,23,42,0.1), 0 8px 10px -6px rgba(15,23,42,0.04);'
);

// 4. Border Radius
css = css.replace('--radius-sm:  4px;', '--radius-sm:  6px;');
css = css.replace('--radius-md:  8px;', '--radius-md:  8px;'); // Keep cards consistent
css = css.replace('--radius-lg:  12px;', '--radius-lg:  12px;');
css = css.replace('--radius-xl:  16px;', '--radius-xl:  16px;');

// 5. Tables
const tblReplacement = `.tbl thead tr { background: var(--color-surface-2); border-bottom: 1px solid var(--color-border); }
.tbl th {
  padding: 12px 14px; text-align: left; font-size: 12px; font-weight: 600;
  color: var(--color-ink-muted); white-space: nowrap; cursor: pointer; user-select: none;
  border-right: none; transition: background var(--duration-fast) var(--ease), color var(--duration-fast);
}
.tbl th:hover { background: var(--color-border-light); color: var(--color-ink); }`;
css = css.replace(/\.tbl thead tr {[\s\S]*?\.tbl th:hover {[\s\S]*?}/, tblReplacement);

const excelReplacement = `.excel-table thead { position: sticky; top: 0; z-index: 10; box-shadow: 0 1px 0 var(--color-border); }
.excel-table th {
  background: var(--color-surface-2); color: var(--color-ink-muted);
  padding: 12px 16px; border-right: none;
  font-size: 12px; font-weight: 600; text-transform: none;
  letter-spacing: normal; white-space: nowrap; text-align: left;
  cursor: pointer; user-select: none; transition: background var(--duration-fast) var(--ease);
}
.excel-table th:hover { background: var(--color-border-light); color: var(--color-ink); }`;
css = css.replace(/\.excel-table thead {[\s\S]*?\.excel-table th:hover {[\s\S]*?}/, excelReplacement);

// 6. Focus Ring
css = css.replace(
  'box-shadow: 0 0 0 3px rgba(37,99,235,0.1);',
  'box-shadow: 0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-accent-border);'
);

fs.writeFileSync(path, css, 'utf-8');
console.log('Update successful');