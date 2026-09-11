const fs = require('fs');

// 1. Add classes to globals.css
let css = fs.readFileSync('app/globals.css', 'utf-8');
if (!css.includes('.row-actual-less')) {
  css += '\n.excel-table tbody tr.row-actual-greater td { background: rgba(248, 113, 113, 0.12) !important; }\n';
  css += '.excel-table tbody tr.row-actual-greater:hover td { background: rgba(248, 113, 113, 0.18) !important; }\n';
  css += '.excel-table tbody tr.row-actual-less td { background: rgba(34, 197, 94, 0.12) !important; }\n';
  css += '.excel-table tbody tr.row-actual-less:hover td { background: rgba(34, 197, 94, 0.18) !important; }\n';
  fs.writeFileSync('app/globals.css', css);
}

// 2. Update PaymentCalcPage.jsx
let jsx = fs.readFileSync('app/components/payment/PaymentCalcPage.jsx', 'utf-8');

jsx = jsx.replace(
  /const rowClass = isTerminalStatus \? "row-terminal" : entry\.status === "Move" \? "row-move" : selected\.has\(entry\.id\) \? "row-selected" : "";/g,
  'const rowClass = isTerminalStatus ? "row-terminal" : entry.status === "Move" ? "row-move" : selected.has(entry.id) ? "row-selected" : actualValue > usdValue ? "row-actual-greater" : actualValue < usdValue ? "row-actual-less" : "";'
);

fs.writeFileSync('app/components/payment/PaymentCalcPage.jsx', jsx);
console.log('Restored red and green logic!');
