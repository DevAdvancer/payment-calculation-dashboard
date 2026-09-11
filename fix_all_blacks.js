const fs = require('fs');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('app/components');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  let original = content;
  content = content.replace(/color:\s*["']#(000|000000|333|333333|111|111111|222|222222|444|444444|555|555555)["']/gi, 'color: "var(--text-main)"');
  content = content.replace(/color:\s*["']black["']/gi, 'color: "var(--text-main)"');
  
  if (original !== content) {
    fs.writeFileSync(f, content);
    console.log('Fixed blacks in', f);
  }
});
