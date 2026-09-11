const fs = require('fs');
let jsx = fs.readFileSync('app/components/history/CandidateHistoryPage.jsx', 'utf-8');

jsx = jsx.replace(
  /background: "var\(--surface\)",[\s]*border: 1\.5px solid \$\{dropdownOpen \? "var\(--teal\)" : "var\(--border-md\)"\}/,
  'background: "var(--color-surface-2)",\n            border: dropdownOpen ? "1px solid var(--color-primary)" : "1px solid var(--color-border)"'
);

jsx = jsx.replace(
  /background: "var\(--surface\)",(?=\s*border: "1px solid var\(--border-md\)",)/g,
  'background: "var(--color-surface-2)",'
);

jsx = jsx.replace(/var\(--border-md\)/g, 'var(--color-border)');
jsx = jsx.replace(/var\(--surface\)/g, 'var(--color-surface-2)');
jsx = jsx.replace(/var\(--shadow-lg\)/g, '0 10px 15px -3px rgba(0,0,0,0.4)');

fs.writeFileSync('app/components/history/CandidateHistoryPage.jsx', jsx);
console.log('Fixed search border');
