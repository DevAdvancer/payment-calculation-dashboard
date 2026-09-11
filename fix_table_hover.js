const fs = require('fs');
let css = fs.readFileSync('app/globals.css', 'utf-8');

css = css.replace(/\.tbl th:hover \{ background: var\(--color-primary-hover\); \}/, '.tbl th:hover { background: var(--color-border); color: var(--color-ink); }');
css = css.replace(/\.excel-table th:hover \{ background: var\(--color-primary-hover\); \}/, '.excel-table th:hover { background: var(--color-border); color: var(--color-ink); }');

fs.writeFileSync('app/globals.css', css);
console.log('Fixed hovers')
