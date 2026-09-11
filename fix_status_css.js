const fs = require('fs');

let css = fs.readFileSync('app/globals.css', 'utf-8');

const newCSS = '\n/* Dynamic Status Dropdown Coloring */\n' +
'select[data-status="Received"], select[data-status="Paid"] { background-color: rgba(16, 185, 129, 0.15) !important; color: #4ade80 !important; border-color: rgba(16, 185, 129, 0.3) !important; }\n' +
'select[data-status="Pending"] { background-color: rgba(245, 158, 11, 0.15) !important; color: #facc15 !important; border-color: rgba(245, 158, 11, 0.3) !important; }\n' +
'select[data-status="Laid Off"], select[data-status="Default"], select[data-status="Unpaid"], select[data-status="Rejected"] { background-color: rgba(239, 68, 68, 0.15) !important; color: #f87171 !important; border-color: rgba(239, 68, 68, 0.3) !important; }\n' +
'select[data-status="Move"] { background-color: rgba(249, 115, 22, 0.15) !important; color: #fb923c !important; border-color: rgba(249, 115, 22, 0.3) !important; }\n' +
'select[data-status="Returned"], select[data-status="Negotiating"] { background-color: rgba(59, 130, 246, 0.15) !important; color: #60a5fa !important; border-color: rgba(59, 130, 246, 0.3) !important; }\n';

css = css + newCSS;
fs.writeFileSync('app/globals.css', css);
console.log('Added dynamic status colors.');
