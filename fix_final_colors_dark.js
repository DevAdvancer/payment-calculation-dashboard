const fs = require('fs');
let css = fs.readFileSync('app/globals.css', 'utf-8');

// Strip out the previous bad row colors and box-shadows
while(css.indexOf('/* Row state colors */') !== -1 || css.indexOf('/* Row state border indicators */') !== -1) {
    let start = css.indexOf('/* Row state colors */');
    if (start === -1) start = css.indexOf('/* Row state border indicators */');
    let end = css.length;
    let nextComment = css.indexOf('/*', start + 2);
    if (nextComment !== -1) {
        end = nextComment;
    }
    css = css.substring(0, start) + css.substring(end);
}

// Clean up any trailing space
css = css.trimEnd();

const newCSS = '\n/* Row state colors & borders */\n' +
'.tbl tbody tr.row-terminal td, .excel-table tbody tr.row-terminal td { background: var(--color-danger-soft) !important; }\n' +
'.tbl tbody tr.row-terminal:hover td, .excel-table tbody tr.row-terminal:hover td { background: rgba(239, 68, 68, 0.22) !important; }\n' +
'.tbl tbody tr.row-move td, .excel-table tbody tr.row-move td { background: rgba(249, 115, 22, 0.15) !important; }\n' +
'.tbl tbody tr.row-move:hover td, .excel-table tbody tr.row-move:hover td { background: rgba(249, 115, 22, 0.22) !important; }\n' +
'.tbl tbody tr.row-selected td, .excel-table tbody tr.row-selected td { background: var(--color-surface-2) !important; }\n' +
'.tbl tbody tr.row-actual-greater td, .excel-table tbody tr.row-actual-greater td { background: var(--color-danger-soft) !important; }\n' +
'.tbl tbody tr.row-actual-greater:hover td, .excel-table tbody tr.row-actual-greater:hover td { background: rgba(239, 68, 68, 0.22) !important; }\n' +
'.tbl tbody tr.row-actual-less td, .excel-table tbody tr.row-actual-less td { background: var(--color-success-soft) !important; }\n' +
'.tbl tbody tr.row-actual-less:hover td, .excel-table tbody tr.row-actual-less:hover td { background: rgba(16, 185, 129, 0.22) !important; }\n' +
'.tbl tbody tr.row-terminal td:first-child, .excel-table tbody tr.row-terminal td:first-child { box-shadow: inset 3px 0 0 var(--color-danger) !important; }\n' +
'.tbl tbody tr.row-move td:first-child, .excel-table tbody tr.row-move td:first-child { box-shadow: inset 3px 0 0 #f97316 !important; }\n' +
'.tbl tbody tr.row-actual-greater td:first-child, .excel-table tbody tr.row-actual-greater td:first-child { box-shadow: inset 3px 0 0 var(--color-danger) !important; }\n' +
'.tbl tbody tr.row-actual-less td:first-child, .excel-table tbody tr.row-actual-less td:first-child { box-shadow: inset 3px 0 0 var(--color-success) !important; }\n';

css = css + newCSS;

fs.writeFileSync('app/globals.css', css);
console.log('Fixed Dark Mode Row Colors!');
