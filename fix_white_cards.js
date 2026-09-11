const fs = require('fs');

let jsx = fs.readFileSync('app/components/payment/PaymentCalcPage.jsx', 'utf-8');
jsx = jsx.replace(/background:\s*['"]#ffffff['"]/gi, 'background: "var(--color-surface)"');
jsx = jsx.replace(/background:\s*['"]#fff['"]/gi, 'background: "var(--color-surface)"');
fs.writeFileSync('app/components/payment/PaymentCalcPage.jsx', jsx);

console.log('Fixed hardcoded white backgrounds in PaymentCalcPage!');
