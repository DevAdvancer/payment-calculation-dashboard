const fs = require('fs');
let jsx = fs.readFileSync('app/ClientLayout.jsx', 'utf-8');

jsx = jsx.replace(/<div style=\{\{ display:"flex", minHeight:"100vh" \}\}>/, '<div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>');
jsx = jsx.replace(/<main style=\{\{ marginLeft: hideSidebar \? 0 : 220, flex:1, background:"var\(--color-bg\)", overflowY:"auto", minHeight:"100vh" \}\}>/, '<main style={{ marginLeft: hideSidebar ? 0 : 220, flex:1, background:"var(--color-bg)", overflowY:"auto", height:"100vh" }}>');

fs.writeFileSync('app/ClientLayout.jsx', jsx);
console.log('Fixed scroll');
