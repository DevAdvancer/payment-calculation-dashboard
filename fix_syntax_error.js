const fs = require('fs');

let jsx = fs.readFileSync('app/components/dashboard/PaymentDashboardPage.jsx', 'utf-8');

jsx = jsx.replace(/"var\(--color-surface\)"beb"/g, '"var(--color-surface-2)"');

fs.writeFileSync('app/components/dashboard/PaymentDashboardPage.jsx', jsx);
console.log('Fixed syntax error in PaymentDashboardPage!');
