const fs = require('fs');
let jsx = fs.readFileSync('app/components/payment/PaymentCalcPage.jsx', 'utf-8');

jsx = jsx.replace('<th style={{ width: 36 }}>#</th>', '');

const search = '<td style={{ textAlign: "center" }}>\\n' +
'                      <input\\n' +
'                        type="checkbox"\\n' +
'                        checked={selected.has(entry.id)}\\n' +
'                        onChange={() => toggleRow(entry.id)}\\n' +
'                        style={{ width: 14, height: 14, cursor: "pointer" }}\\n' +
'                      />\\n' +
'                    </td>\\n' +
'\\n' +
'                    <td style={{ color: "var(--text-dim)", fontSize: 11 }}>\\n' +
'                      {(page - 1) * pageSize + idx + 1}\\n' +
'                    </td>';

const replace = '<td style={{ textAlign: "center", position: "relative", width: 44 }}>\\n' +
'                      <div className={"row-hover-checkbox " + (selected.has(entry.id) ? "is-selected" : "")} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "inherit", zIndex: 10 }}>\\n' +
'                        <input\\n' +
'                          type="checkbox"\\n' +
'                          checked={selected.has(entry.id)}\\n' +
'                          onChange={() => toggleRow(entry.id)}\\n' +
'                        />\\n' +
'                      </div>\\n' +
'                      <span style={{ color: "var(--text-dim)", fontSize: 11, position: "relative", zIndex: 1 }}>\\n' +
'                        {(page - 1) * pageSize + idx + 1}\\n' +
'                      </span>\\n' +
'                    </td>';

// Actually regex replacement for safety against whitespace
const safeSearchRegex = /<td style=\{\{\s*textAlign:\s*"center"\s*\}\}>[\s\S]*?<input[\s\S]*?type="checkbox"[\s\S]*?checked=\{selected\.has\(entry\.id\)\}[\s\S]*?onChange=\{\(\)\s*=>\s*toggleRow\(entry\.id\)\}[\s\S]*?\/>[\s\S]*?<\/td>[\s\S]*?<td style=\{\{\s*color:\s*"var\(--text-dim\)",\s*fontSize:\s*11\s*\}\}>[\s\S]*?\{\(page\s*-\s*1\)\s*\*\s*pageSize\s*\+\s*idx\s*\+\s*1\}[\s\S]*?<\/td>/m;


if (safeSearchRegex.test(jsx)) {
  jsx = jsx.replace(safeSearchRegex, replace.replace(/\\n/g, '\n'));
  fs.writeFileSync('app/components/payment/PaymentCalcPage.jsx', jsx);
  console.log('Merged checkbox and index safely!');
} else {
  console.log('Safe regex did not match.');
}
