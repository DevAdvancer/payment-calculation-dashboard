const fs = require('fs');
let css = fs.readFileSync('app/globals.css', 'utf-8');

const modernUI = '\n/* Modern Custom Inputs */\n' +
'input[type="checkbox"] { appearance: none; -webkit-appearance: none; background-color: var(--color-surface); margin: 0; font: inherit; color: currentColor; width: 14px; height: 14px; border: 1px solid var(--color-border); border-radius: 4px; display: inline-grid; place-content: center; cursor: pointer; transition: all 0.2s ease; }\n' +
'input[type="checkbox"]::before { content: ""; width: 8px; height: 8px; clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%); transform: scale(0); background-color: white; transition: 120ms transform ease-in-out; }\n' +
'input[type="checkbox"]:checked { background-color: var(--color-primary); border-color: var(--color-primary); }\n' +
'input[type="checkbox"]:checked::before { transform: scale(1); }\n' +
'input[type="checkbox"]:focus { outline: 2px solid var(--color-accent-soft); outline-offset: 2px; }\n' +
'select.tbl-select, select { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E"); background-repeat: no-repeat; background-position: right 6px center; background-size: 14px; padding-right: 24px !important; }\n' +
'.row-hover-checkbox { opacity: 0; transition: opacity 0.15s var(--ease); }\n' +
'.tbl tbody tr:hover .row-hover-checkbox, .excel-table tbody tr:hover .row-hover-checkbox { opacity: 1; }\n' +
'.row-hover-checkbox.is-selected { opacity: 1; }\n' +
'input.tbl-input, input[type="text"] { background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-ink); transition: border 0.15s, box-shadow 0.15s; }\n' +
'input.tbl-input:focus, input[type="text"]:focus { border-color: var(--color-primary); box-shadow: 0 0 0 2px var(--color-accent-soft); outline: none; }';

if (!css.includes('/* Modern Custom Inputs */')) {
  css = css + '\n' + modernUI;
  fs.writeFileSync('app/globals.css', css);
  console.log('Added Custom UI css!');
}
