const fs = require('fs');

// 1. Remove inline borderLeft from PaymentCalcPage.jsx to avoid double borders
let jsx = fs.readFileSync('app/components/payment/PaymentCalcPage.jsx', 'utf-8');
jsx = jsx.replace(/\.\.\.\(isTerminalStatus \? \{ borderLeft: "3px solid #dc2626" \} : \{\}\),/g, '');
fs.writeFileSync('app/components/payment/PaymentCalcPage.jsx', jsx);

// 2. Add box-shadow (border left simulation) on td:first-child globally for row state classes
let css = fs.readFileSync('app/globals.css', 'utf-8');

const updatedCSS = '\n/* Row state border indicators */\n' +
'.tbl tbody tr.row-terminal td:first-child, .excel-table tbody tr.row-terminal td:first-child { box-shadow: inset 3px 0 0 #dc2626 !important; }\n' +
'.tbl tbody tr.row-move td:first-child, .excel-table tbody tr.row-move td:first-child { box-shadow: inset 3px 0 0 #f97316 !important; }\n' +
'.tbl tbody tr.row-actual-greater td:first-child, .excel-table tbody tr.row-actual-greater td:first-child { box-shadow: inset 3px 0 0 #ef4444 !important; }\n' +
'.tbl tbody tr.row-actual-less td:first-child, .excel-table tbody tr.row-actual-less td:first-child { box-shadow: inset 3px 0 0 #10b981 !important; }\n';

css = css + updatedCSS;
fs.writeFileSync('app/globals.css', css);
console.log('Fixed side lines!');
