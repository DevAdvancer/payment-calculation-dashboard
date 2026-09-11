const fs = require('fs');
let jsx = fs.readFileSync('app/components/NotificationsPage.jsx', 'utf-8');

jsx = jsx.replace(/width: 44,\s*height: 44,/g, 'width: 40, height: 40,');

const delOld = 'height: "50px",\\n              padding: "10px",\\n              borderRadius: "9px",\\n              cursor: "pointer",\\n              fontWeight: 700,\\n              fontSize: "16px",';
const delNew = 'height: "40px",\\n              padding: "0 18px",\\n              borderRadius: "20px",\\n              cursor: "pointer",\\n              fontWeight: 600,\\n              fontSize: "13px",';

// using a regex fallback just in case formatting is totally off
jsx = jsx.replace(/height: "50px",\s*padding: "10px",\s*borderRadius: "9px",\s*cursor: "pointer",\s*fontWeight: 700,\s*fontSize: "16px",/g, delNew.replace(/\\n/g, '\n'));

fs.writeFileSync('app/components/NotificationsPage.jsx', jsx);
console.log('Fixed buttons');
