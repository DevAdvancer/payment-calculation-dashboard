const fs = require('fs');
let jsx = fs.readFileSync('app/components/MultiSelectDropdown.jsx', 'utf-8');

jsx = jsx.replace(/#ffffff/gi, 'var(--color-surface)');
jsx = jsx.replace(/#fff/gi, 'var(--color-surface)');
jsx = jsx.replace(/#e2e8f0/gi, 'var(--color-border)');
jsx = jsx.replace(/#0f172a/gi, 'var(--text-main)');
jsx = jsx.replace(/#0d9488/gi, 'var(--color-primary)'); // Teal -> Indigo
jsx = jsx.replace(/#64748b/gi, 'var(--text-muted)');
jsx = jsx.replace(/#f1f5f9/gi, 'var(--color-surface-2)');
jsx = jsx.replace(/#cbd5e1/gi, 'var(--color-border)');

fs.writeFileSync('app/components/MultiSelectDropdown.jsx', jsx);
console.log('Fixed MultiSelectDropdown hex colors');
