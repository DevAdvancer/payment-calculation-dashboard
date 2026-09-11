const fs = require('fs');

let jsx = fs.readFileSync('app/components/payment/PaymentCalcPage.jsx', 'utf-8');

jsx = jsx.replace(/<th style=\{\{ width: 36 \}\}>#<\/th>/, '');

const searchCode = \<td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selected.has(entry.id)}
                        onChange={() => toggleRow(entry.id)}
                        style={{ width: 14, height: 14, cursor: "pointer" }}
                      />
                    </td>

                    <td style={{ color: "var(--text-dim)", fontSize: 11 }}>
                      {(page - 1) * pageSize + idx + 1}
                    </td>\;

const replaceCode = \<td style={{ textAlign: "center", position: "relative", width: 44 }}>
                      <div className={"row-hover-checkbox " + (selected.has(entry.id) ? "is-selected" : "")} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "inherit", zIndex: 10, borderRadius: "6px 0 0 6px" }}>
                        <input
                          type="checkbox"
                          checked={selected.has(entry.id)}
                          onChange={() => toggleRow(entry.id)}
                        />
                      </div>
                      <span style={{ color: "var(--text-dim)", fontSize: 11, position: "relative", zIndex: 1 }}>
                        {(page - 1) * pageSize + idx + 1}
                      </span>
                    </td>\;

if (jsx.includes('<td style={{ textAlign: "center" }}>')) {
  jsx = jsx.replace(searchCode, replaceCode);
  fs.writeFileSync('app/components/payment/PaymentCalcPage.jsx', jsx);
  console.log('Merged checkbox and index!');
} else {
  console.log('Could not find search code');
}
