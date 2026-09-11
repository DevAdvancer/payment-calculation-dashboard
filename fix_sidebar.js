const fs = require('fs');
let s = fs.readFileSync('app/components/Sidebar.jsx', 'utf-8');
s = s.replace(/rgba\(37,99,235/g, 'rgba(79,70,229'); // #4f46e5 standard indigo
s = s.replace(/color:\"#10b981\"/g, 'color:\"#059669\"');
fs.writeFileSync('app/components/Sidebar.jsx', s);
