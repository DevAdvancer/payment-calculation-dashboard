const fs = require('fs');
let css = fs.readFileSync('app/globals.css', 'utf-8');

// For .tbl
css = css.replace(
  /\.tbl thead tr \{\s*background:\s*var\(--color-primary\);\s*border-bottom:\s*none;\s*\}/g, 
  '.tbl thead tr { background: var(--color-surface-2); border-bottom: 1px solid var(--color-border); }'
);
css = css.replace(
  /color:\s*rgba\(255,255,255,0\.85\);/g, 
  'color: var(--color-ink-muted);'
);

// For .excel-table
css = css.replace(
  /background:\s*var\(--color-primary\);\s*color:\s*rgba\(255,255,255,0\.9\);/g,
  'background: var(--color-surface-2); color: var(--color-ink-muted);'
);
css = css.replace(
  /border-right:\s*1px solid rgba\(255,255,255,0\.08\);/g,
  'border-right: none;'
);


fs.writeFileSync('app/globals.css', css);
console.log('Fixed table headers!');
