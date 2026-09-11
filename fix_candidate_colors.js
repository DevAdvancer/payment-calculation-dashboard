const fs = require('fs');

let hist = fs.readFileSync('app/components/history/CandidateHistoryPage.jsx', 'utf-8');
hist = hist.replace(/color:\s*"var\(--text\)"/g, 'color: "var(--color-ink)"');
hist = hist.replace(/color:\s*"var\(--text-muted\)"/g, 'color: "var(--color-ink-muted)"');
hist = hist.replace(/color:\s*"var\(--text-dim\)"/g, 'color: "var(--color-ink-muted)"');
// Initials in avatar
hist = hist.replace(/color:\s*"var\(--color-ink-muted\)",\\n\s*fontWeight:\s*700,/, 'color: "white",\\n                    fontWeight: 700,');
fs.writeFileSync('app/components/history/CandidateHistoryPage.jsx', hist);

let pay = fs.readFileSync('app/components/payment/PaymentCalcPage.jsx', 'utf-8');
pay = pay.replace(/<td style=\{\{\s*fontWeight:\s*600,\s*color:\s*"var\(--mint\)"\s*\}\}>/g, '<td style={{ fontWeight: 600, color: "var(--color-ink)" }}>');
// Also wait what about row 1184 "selectedName"
pay = pay.replace(/style=\{selectedName \? \{\s*fontWeight:\s*700,\s*color:\s*"var\(--mint\)"\s*\} : undefined\}/, 'style={selectedName ? { fontWeight: 700, color: "var(--color-ink)" } : undefined}');
fs.writeFileSync('app/components/payment/PaymentCalcPage.jsx', pay);

let spec = fs.readFileSync('app/components/special/SpecialSheetPage.jsx', 'utf-8');
spec = spec.replace(/<td style=\{\{\s*fontWeight:\s*600,\s*color:\s*"var\(--mint\)"\s*\}\}>/g, '<td style={{ fontWeight: 600, color: "var(--color-ink)" }}>');
spec = spec.replace(/<td style=\{\{\s*fontWeight:\s*600,\s*color:\s*"var\(--mint\)",/g, '<td style={{ fontWeight: 600, color: "var(--color-ink)",');
fs.writeFileSync('app/components/special/SpecialSheetPage.jsx', spec);

console.log('Fixed candidate names');
