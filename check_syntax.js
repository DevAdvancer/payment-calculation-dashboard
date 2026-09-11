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
  let match = content.match(/var\(--color-[a-zA-Z0-9-]+\)"[a-zA-Z0-9]+/g);
  if (match) console.log('Found syntax corruption in:', f, match);
});
