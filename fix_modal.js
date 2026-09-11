const fs = require('fs');

let jsx = fs.readFileSync('app/admin/users/page.jsx', 'utf-8');

jsx = jsx.replace(/background: hasAccess \? \"#f8fafc\" : \"#fff\"/g, 'background: hasAccess ? "var(--color-surface-2)" : "var(--color-surface)"');

// Check for text colors in the modal
// Like "Permissions:", "Allowed Filters:", "Read & Write", etc.
// Replace bad muted text and bad foreground text.
// The screenshot shows labels are practically invisible gray/white!
// This usually means they inherited (#64748b ? #9ca3af ?)

// I will just use standard regex for any remaining light mode colors in the file:
jsx = jsx.replace(/#f8fafc/g, 'var(--color-surface-2)');
jsx = jsx.replace(/#fff/g, 'var(--color-surface)');
jsx = jsx.replace(/#ffffff/g, 'var(--color-surface)');

// Wait, I shouldn't replace ALL #fff with surface because button texts are #fff and need to be white!
// Let's reload from file first to undo the global #fff replacement if it was unsafe.
