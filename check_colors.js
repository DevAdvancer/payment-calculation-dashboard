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
  let matches = content.match(/background:\s*['"]?#[e-f][0-9a-f]{2,5}['"]?/gi);
  if (matches) console.log(f + ': ' + matches.join(', '));
  matches = content.match(/color:\s*['"]?#[0-9a-f]{6}['"]?/gi);
  if (matches) console.log(f + ': ' + matches.join(', '));
});
