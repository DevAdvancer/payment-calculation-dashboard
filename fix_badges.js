const fs = require('fs');
let css = fs.readFileSync('app/globals.css', 'utf-8');

css = css.replace(/background:\s*#fef2f2/g, 'background: rgba(239, 68, 68, 0.15)');
css = css.replace(/color:\s*#b91c1c/g, 'color: #ef4444');
css = css.replace(/color:\s*#dc2626/g, 'color: #ef4444');

css = css.replace(/background:\s*#fdf4ff/g, 'background: rgba(168, 85, 247, 0.15)');
css = css.replace(/color:\s*#9333ea/g, 'color: #c084fc');

css = css.replace(/background:\s*#fefce8/g, 'background: rgba(234, 179, 8, 0.15)');
css = css.replace(/color:\s*#ca8a04/g, 'color: #facc15');

css = css.replace(/background:\s*#f0fdf4/g, 'background: rgba(34, 197, 94, 0.15)');
css = css.replace(/color:\s*#16a34a/g, 'color: #4ade80');

css = css.replace(/background:\s*#fff7ed/g, 'background: rgba(249, 115, 22, 0.15)');
css = css.replace(/color:\s*#ea580c/g, 'color: #fb923c');

css = css.replace(/background:\s*#eff6ff/g, 'background: rgba(59, 130, 246, 0.15)');
css = css.replace(/color:\s*#3b82f6/g, 'color: #60a5fa');

css = css.replace(/background:\s*#f3f4f6/g, 'background: rgba(156, 163, 175, 0.15)');
css = css.replace(/color:\s*#6b7280/g, 'color: #9ca3af');

fs.writeFileSync('app/globals.css', css);
console.log('Fixed badges!');
