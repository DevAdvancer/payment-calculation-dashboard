const fs = require('fs');

let input = fs.readFileSync('app/components/NotificationsPage.jsx', 'utf-8');

// The file has heavily hardcoded styles. I will strategically replace known blocks.
input = input.replace(/background:\s*isRead\s*\?\s*"#f8fafc"\s*:\s*"#ecfdf5"/g, 'background: isRead ? "var(--color-surface)" : "var(--color-surface-2)"');
input = input.replace(/border:\s*isRead\s*\?\s*"1px solid #e2e8f0"\s*:\s*"1px solid #34d399"/g, 'border: isRead ? "1px solid var(--color-border)" : "1px solid rgba(16, 185, 129, 0.4)"');
input = input.replace(/background:\s*isRead\s*\?\s*"#d1fae5"\s*:\s*"#34d399"/g, 'background: isRead ? "var(--color-surface-2)" : "var(--color-success-soft)"');
input = input.replace(/color:\s*isRead\s*\?\s*"#065f46"\s*:\s*"#ffffff"/g, 'color: isRead ? "var(--text-dim)" : "var(--color-success)"');
input = input.replace(/color:\s*isRead\s*\?\s*"#0f172a"\s*:\s*"#064e3b"/g, 'color: isRead ? "var(--text-dim)" : "var(--color-success)"');
input = input.replace(/color:\s*"#0f172a"/g, 'color: "var(--text-main)"');

// Buttons
input = input.replace(/background:\s*isRead\s*\?\s*"#e2e8f0"\s*:\s*"#10b981"/g, 'background: isRead ? "var(--color-surface-2)" : "var(--color-success-soft)"');
input = input.replace(/color:\s*isRead\s*\?\s*"#64748b"\s*:\s*"#ffffff"/g, 'color: isRead ? "var(--text-muted)" : "var(--color-success)"');

input = input.replace(/background:\s*nocGenerated\s*\?\s*"#1e293b"\s*:\s*"linear-gradient\(135deg,\s*#0f766e,\s*#0d9488\)"/g, 'background: nocGenerated ? "var(--color-surface-2)" : "var(--color-primary)"');
input = input.replace(/color:\s*nocGenerated\s*\?\s*"#94a3b8"\s*:\s*"#ffffff"/g, 'color: nocGenerated ? "var(--text-muted)" : "#fff"');
input = input.replace(/border:\s*nocGenerated\s*\?\s*"1px solid #334155"\s*:\s*"none"/g, 'border: nocGenerated ? "1px solid var(--color-border)" : "none"');
input = input.replace(/boxShadow:\s*nocGenerated\s*\?\s*"none"\s*:\s*"0 2px 8px rgba\(13,148,136,0\.3\)"/g, 'boxShadow: nocGenerated ? "none" : "0 2px 8px var(--color-accent-soft)"');

// Delete all button
input = input.replace(/background:\s*"#ef4444"/g, 'background: "var(--color-danger-soft)"');
input = input.replace(/color:\s*"#ffffff"/g, 'color: "var(--color-danger)"');
input = input.replace(/boxShadow:\s*"0 2px 6px rgba\(239, 68, 68, 0\.25\)"/g, 'boxShadow: "none"');

// And mouse enters for delete button
input = input.replace(/e\.currentTarget\.style\.background\s*=\s*"#dc2626"/g, 'e.currentTarget.style.background = "var(--color-danger)"');
input = input.replace(/e\.currentTarget\.style\.background\s*=\s*"#ef4444"/g, 'e.currentTarget.style.background = "var(--color-danger-soft)"');

fs.writeFileSync('app/components/NotificationsPage.jsx', input);
console.log('Fixed NotificationsPage styling!');
