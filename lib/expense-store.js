import { sql } from "./neon";

export async function ensureExpenseTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS expense_entries (
      id           TEXT PRIMARY KEY,
      expense_date TEXT,
      month        TEXT,
      year         TEXT,
      category     TEXT,
      vendor       TEXT,
      description  TEXT,
      amount       NUMERIC(14,2) DEFAULT 0,
      paid         NUMERIC(14,2) DEFAULT 0,
      due          NUMERIC(14,2) DEFAULT 0,
      currency     TEXT DEFAULT 'USD',
      status       TEXT NOT NULL DEFAULT 'Pending',
      payment_method TEXT,
      reference    TEXT,
      notes        TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

function toRow(e) {
  return {
    id:             String(e.id),
    expense_date:   e.expenseDate || e.expense_date || null,
    month:          e.month || null,
    year:           e.year ? String(e.year) : null,
    category:       e.category || null,
    vendor:         e.vendor || null,
    description:    e.description || null,
    amount:         parseFloat(e.amount) || 0,
    paid:           parseFloat(e.paid)   || 0,
    due:            parseFloat(e.due)    || 0,
    currency:       e.currency || "USD",
    status:         e.status || "Pending",
    payment_method: e.paymentMethod || e.payment_method || null,
    reference:      e.reference || null,
    notes:          e.notes || null,
  };
}

function fromRow(r) {
  return {
    id:            r.id,
    expenseDate:   r.expense_date,
    month:         r.month,
    year:          r.year,
    category:      r.category,
    vendor:        r.vendor,
    description:   r.description,
    amount:        parseFloat(r.amount) || 0,
    paid:          parseFloat(r.paid)   || 0,
    due:           parseFloat(r.due)    || 0,
    currency:      r.currency || "USD",
    status:        r.status,
    paymentMethod: r.payment_method,
    reference:     r.reference,
    notes:         r.notes,
    createdAt:     r.created_at,
    updatedAt:     r.updated_at,
  };
}

export async function listExpenses() {
  await ensureExpenseTable();
  const rows = await sql`SELECT * FROM expense_entries ORDER BY created_at ASC`;
  return rows.map(fromRow);
}

export async function createExpense(entry) {
  await ensureExpenseTable();
  const r = toRow(entry);
  const rows = await sql`
    INSERT INTO expense_entries
      (id, expense_date, month, year, category, vendor, description,
       amount, paid, due, currency, status, payment_method, reference, notes)
    VALUES
      (${r.id}, ${r.expense_date}, ${r.month}, ${r.year}, ${r.category},
       ${r.vendor}, ${r.description}, ${r.amount}, ${r.paid}, ${r.due},
       ${r.currency}, ${r.status}, ${r.payment_method}, ${r.reference}, ${r.notes})
    ON CONFLICT (id) DO UPDATE SET
      expense_date   = EXCLUDED.expense_date,
      month          = EXCLUDED.month,
      year           = EXCLUDED.year,
      category       = EXCLUDED.category,
      vendor         = EXCLUDED.vendor,
      description    = EXCLUDED.description,
      amount         = EXCLUDED.amount,
      paid           = EXCLUDED.paid,
      due            = EXCLUDED.due,
      currency       = EXCLUDED.currency,
      status         = EXCLUDED.status,
      payment_method = EXCLUDED.payment_method,
      reference      = EXCLUDED.reference,
      notes          = EXCLUDED.notes,
      updated_at     = NOW()
    RETURNING *
  `;
  return fromRow(rows[0]);
}

export async function updateExpense(id, patch) {
  await ensureExpenseTable();
  const existing = await sql`SELECT * FROM expense_entries WHERE id = ${String(id)}`;
  if (!existing.length) return null;
  const merged = { ...fromRow(existing[0]), ...patch };
  const r = toRow(merged);
  const rows = await sql`
    UPDATE expense_entries SET
      expense_date   = ${r.expense_date},
      month          = ${r.month},
      year           = ${r.year},
      category       = ${r.category},
      vendor         = ${r.vendor},
      description    = ${r.description},
      amount         = ${r.amount},
      paid           = ${r.paid},
      due            = ${r.due},
      currency       = ${r.currency},
      status         = ${r.status},
      payment_method = ${r.payment_method},
      reference      = ${r.reference},
      notes          = ${r.notes},
      updated_at     = NOW()
    WHERE id = ${String(id)}
    RETURNING *
  `;
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function deleteExpense(id) {
  await ensureExpenseTable();
  const rows = await sql`DELETE FROM expense_entries WHERE id = ${String(id)} RETURNING id`;
  return rows[0] ?? null;
}

export async function bulkUpsertExpenses(entries) {
  await ensureExpenseTable();
  if (!entries.length) return [];
  const out = [];
  for (const e of entries) out.push(await createExpense(e));
  return out;
}

export async function bulkDeleteExpenses(ids) {
  await ensureExpenseTable();
  if (!ids.length) return [];
  const rows = await sql`
    DELETE FROM expense_entries
    WHERE id = ANY(${ids.map(String)})
    RETURNING id
  `;
  return rows.map(r => r.id);
}
