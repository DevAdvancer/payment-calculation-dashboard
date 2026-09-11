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

const files = walk('app');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  let original = content;
  content = content.replace(/background:\s*['"]?(white|#ffffff|#fff)['"]?/gi, 'background: "var(--color-surface)"');
  
  if (original !== content) {
    fs.writeFileSync(f, content);
    console.log('Fixed', f);
  }
});
