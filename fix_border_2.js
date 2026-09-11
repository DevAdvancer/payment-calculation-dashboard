const fs = require('fs');
let jsx = fs.readFileSync('app/components/history/CandidateHistoryPage.jsx', 'utf-8');

jsx = jsx.replace(
  /border: 1\.5px solid \$\{dropdownOpen \? "var\(--teal\)" : "var\(--color-border\)"\}/,
  'border: dropdownOpen ? "1.5px solid var(--color-primary)" : "1.5px solid var(--color-border)"'
);

fs.writeFileSync('app/components/history/CandidateHistoryPage.jsx', jsx);
console.log('Fixed exactly!');
