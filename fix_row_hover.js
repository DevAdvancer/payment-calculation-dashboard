const fs = require('fs');

// 1. Add classes to globals.css
let css = fs.readFileSync('app/globals.css', 'utf-8');
if (!css.includes('.row-terminal')) {
  css += '\n/* Row state colors */\n';
  css += '.excel-table tbody tr.row-terminal td { background: rgba(220, 38, 38, 0.12) !important; }\n';
  css += '.excel-table tbody tr.row-terminal:hover td { background: rgba(220, 38, 38, 0.18) !important; }\n';
  css += '.excel-table tbody tr.row-move td { background: rgba(248, 113, 113, 0.08) !important; }\n';
  css += '.excel-table tbody tr.row-move:hover td { background: rgba(248, 113, 113, 0.15) !important; }\n';
  css += '.excel-table tbody tr.row-selected td { background: var(--color-surface-2) !important; }\n';
  fs.writeFileSync('app/globals.css', css);
}

// 2. Update PaymentCalcPage.jsx
let jsx = fs.readFileSync('app/components/payment/PaymentCalcPage.jsx', 'utf-8');

jsx = jsx.replace(
  /const rowBackground =[\s\S]*?isTerminalStatus[\s\S]*?\? "rgba\(220, 38, 38, 0\.18\)"[\s\S]*?: entry\.status === "Move"[\s\S]*?\? "rgba\(248, 113, 113, 0\.12\)"[\s\S]*?: selected\.has\(entry\.id\)[\s\S]*?\? "var\(--surface-2\)"[\s\S]*?: undefined;/,
  'const rowClass = isTerminalStatus ? "row-terminal" : entry.status === "Move" ? "row-move" : selected.has(entry.id) ? "row-selected" : "";'
);

jsx = jsx.replace(/background: rowBackground,/g, '');

jsx = jsx.replace(
  /<tr\s*key=\{entry\.id\}\s*style=\{\{/,
  '<tr key={entry.id} className={rowClass} style={{'
);

fs.writeFileSync('app/components/payment/PaymentCalcPage.jsx', jsx);
console.log('Fixed row hover logic!');
