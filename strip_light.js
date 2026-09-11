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
  content = content.replace(/background:\s*['"]?#(f4f5f7|f8fafc|f9fafb|e5e7eb|f3f4f6|e0e7ff|eef2ff)['"]?/gi, 'background: "var(--color-surface-2)"');
  content = content.replace(/color:\s*['"]?#(6b7280|9ca3af|64748b|94a3b8|475569|4b5563|334155|1a1f2e|131515)['"]?/gi, 'color: "var(--color-ink-muted)"');
  
  if (original !== content) {
    fs.writeFileSync(f, content);
    console.log('Fixed stragglers in', f);
  }
});
