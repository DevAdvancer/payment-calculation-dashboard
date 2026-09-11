const fs = require('fs');

let jsx = fs.readFileSync('app/components/NotificationsPage.jsx', 'utf-8');

jsx = jsx.replace(/e\.currentTarget\.style\.transform\s*=\s*"scale\(1\.05\)";/g, 'e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.color = "#ffffff";');
jsx = jsx.replace(/e\.currentTarget\.style\.transform\s*=\s*"scale\(1\)";/g, 'e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.color = "var(--color-danger)";');

fs.writeFileSync('app/components/NotificationsPage.jsx', jsx);
console.log('Fixed text contrast on hover');
