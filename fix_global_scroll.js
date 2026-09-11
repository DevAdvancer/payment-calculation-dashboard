const fs = require('fs');
let css = fs.readFileSync('app/globals.css', 'utf-8');

const lockHtml = 'html, body {\\n  height: 100vh;\\n  overflow: hidden;\\n}\\n\\nbody {';

css = css.replace(/body \{/, lockHtml.replace(/\\n/g, '\n'));

fs.writeFileSync('app/globals.css', css);
console.log('Fixed body scroll properly');
