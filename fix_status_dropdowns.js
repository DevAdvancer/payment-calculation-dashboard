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
  
  content = content.replace(/value=\{([a-zA-Z0-9_]+\.status)(?:\s*\|\|\s*["'][^"']*["'])?\}/g, function(match, p1) {
    if (match.includes('data-status')) return match; 
    return match + ' data-status={' + p1 + '}';
  });
  
  if (original !== content) {
    fs.writeFileSync(f, content);
    console.log('Fixed', f);
  }
});
