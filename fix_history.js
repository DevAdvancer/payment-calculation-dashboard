const fs = require('fs');
let jsx = fs.readFileSync('app/components/history/CandidateHistoryPage.jsx', 'utf-8');

jsx = jsx.replace(/color: "var\(--color-ink-muted\)",\s*fontWeight: 700,\s*fontSize: 12,/g, 'color: "white", fontWeight: 700, fontSize: 12,');
jsx = jsx.replace(/linear-gradient\(135deg, var\(--teal\), var\(--mint\)\)/g, 'var(--color-primary)');

fs.writeFileSync('app/components/history/CandidateHistoryPage.jsx', jsx);
