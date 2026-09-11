const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.css')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('app');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  let original = content;
  content = content.replace(/#2563eb/gi, '#4f46e5');
  content = content.replace(/#eff6ff/gi, '#eef2ff');
  content = content.replace(/rgba\(37,99,235/g, 'rgba(79,70,229');
  
  if (original !== content) {
    fs.writeFileSync(f, content);
    console.log('Fixed', f);
  }
});
