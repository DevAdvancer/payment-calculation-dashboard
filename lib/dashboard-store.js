import { sql } from "./neon";

export async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS payment_entries (
      id            TEXT PRIMARY KEY,
      po_num        TEXT,
      candidate     TEXT,
      client        TEXT,
      company       TEXT,
      po_date       TEXT,
      due_date      TEXT,
      month         TEXT,
      year          TEXT,
      instance      TEXT,
      amount        NUMERIC(14,2) DEFAULT 0,
      paid          NUMERIC(14,2) DEFAULT 0,
      due           NUMERIC(14,2) DEFAULT 0,
      service_type  TEXT,
      status        TEXT NOT NULL DEFAULT 'Pending',
      type          TEXT,
      notes         TEXT,
      signup_date   TEXT,
      placed_date   TEXT,
      closed_by     TEXT,
      placed_by     TEXT,
      reference     TEXT,
      location      TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  /* Add placement metadata columns if they don't exist (idempotent) */
  await sql`ALTER TABLE payment_entries ADD COLUMN IF NOT EXISTS signup_date TEXT`.catch(() => {});
  await sql`ALTER TABLE payment_entries ADD COLUMN IF NOT EXISTS placed_date TEXT`.catch(() => {});
  await sql`ALTER TABLE payment_entries ADD COLUMN IF NOT EXISTS closed_by TEXT`.catch(() => {});
  await sql`ALTER TABLE payment_entries ADD COLUMN IF NOT EXISTS placed_by TEXT`.catch(() => {});
  await sql`ALTER TABLE payment_entries ADD COLUMN IF NOT EXISTS reference TEXT`.catch(() => {});
  await sql`ALTER TABLE payment_entries ADD COLUMN IF NOT EXISTS location TEXT`.catch(() => {});
  await sql`ALTER TABLE payment_entries ADD COLUMN IF NOT EXISTS currency TEXT`.catch(() => {});

  await sql`
    CREATE TABLE IF NOT EXISTS entry_history (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entry_id      TEXT NOT NULL,
      action        TEXT NOT NULL,
      field_changed TEXT,
      old_value     TEXT,
      new_value     TEXT,
      changed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS dashboard_state (
      key        TEXT PRIMARY KEY,
      payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

function toRow(e) {
  return {
    id:           String(e.id),
    po_num:       e.poNum       || e.po_num    || null,
    candidate:    e.candidate                  || null,
    client:       e.client                     || null,
    company:      e.company                    || null,
    po_date:      e.poDate      || e.po_date   || null,
    due_date:     e.dueDate     || e.due_date  || null,
    month:        e.month                      || null,
    year:         e.year                       || null,
    instance:     e.instance                   || null,
    amount:       parseFloat(e.amount)  || 0,
    paid:         parseFloat(e.paid)    || 0,
    due:          parseFloat(e.due)     || 0,
    service_type: e.serviceType || e.service_type || null,
    status:       e.status      || 'Pending',
    type:         e.type                       || null,
    notes:        e.notes                      || null,
    signup_date:  e.signupDate  || e.signup_date || null,
    placed_date:  e.placedDate  || e.placed_date || null,
    closed_by:    e.closedBy    || e.closed_by  || null,
    placed_by:    e.placedBy    || e.placed_by  || null,
    reference:    e.reference                  || null,
    location:     e.location                   || null,
    currency:     e.currency                   || null,
  };
}

function fromRow(r) {
  return {
    id:          r.id,
    poNum:       r.po_num,
    candidate:   r.candidate,
    client:      r.client,
    company:     r.company,
    poDate:      r.po_date,
    dueDate:     r.due_date,
    month:       r.month,
    year:        r.year,
    instance:    r.instance,
    amount:      parseFloat(r.amount)  || 0,
    paid:        parseFloat(r.paid)    || 0,
    due:         parseFloat(r.due)     || 0,
    serviceType: r.service_type,
    status:      r.status,
    type:        r.type,
    notes:       r.notes,
    signupDate:  r.signup_date,
    placedDate:  r.placed_date,
    closedBy:    r.closed_by,
    placedBy:    r.placed_by,
    reference:   r.reference,
    location:    r.location,
    currency:    r.currency,
    createdAt:   r.created_at,
    updatedAt:   r.updated_at,
  };
}

export async function listEntries() {
  await ensureTables();
  const rows = await sql`
    SELECT * FROM payment_entries ORDER BY created_at ASC
  `;
  return rows.map(fromRow);
}

export async function createEntry(entry) {
  await ensureTables();
  const r = toRow(entry);
  const rows = await sql`
    INSERT INTO payment_entries
      (id, po_num, candidate, client, company, po_date, due_date, month, year,
       instance, amount, paid, due, service_type, status, type, notes,
       signup_date, placed_date, closed_by, placed_by, reference, location, currency)
    VALUES
      (${r.id}, ${r.po_num}, ${r.candidate}, ${r.client}, ${r.company},
       ${r.po_date}, ${r.due_date}, ${r.month}, ${r.year}, ${r.instance},
       ${r.amount}, ${r.paid}, ${r.due}, ${r.service_type}, ${r.status},
       ${r.type}, ${r.notes},
       ${r.signup_date}, ${r.placed_date}, ${r.closed_by}, ${r.placed_by},
       ${r.reference}, ${r.location}, ${r.currency})
    ON CONFLICT (id) DO UPDATE SET
      po_num       = EXCLUDED.po_num,
      candidate    = EXCLUDED.candidate,
      client       = EXCLUDED.client,
      company      = EXCLUDED.company,
      po_date      = EXCLUDED.po_date,
      due_date     = EXCLUDED.due_date,
      month        = EXCLUDED.month,
      year         = EXCLUDED.year,
      instance     = EXCLUDED.instance,
      amount       = EXCLUDED.amount,
      paid         = EXCLUDED.paid,
      due          = EXCLUDED.due,
      service_type = EXCLUDED.service_type,
      status       = EXCLUDED.status,
      type         = EXCLUDED.type,
      notes        = EXCLUDED.notes,
      signup_date  = EXCLUDED.signup_date,
      placed_date  = EXCLUDED.placed_date,
      closed_by    = EXCLUDED.closed_by,
      placed_by    = EXCLUDED.placed_by,
      reference    = EXCLUDED.reference,
      location     = EXCLUDED.location,
      currency     = EXCLUDED.currency,
      updated_at   = NOW()
    RETURNING *
  `;
  await sql`
    INSERT INTO entry_history (entry_id, action, new_value)
    VALUES (${r.id}, 'create', ${JSON.stringify(r)})
  `;
  return fromRow(rows[0]);
}

export async function updateEntry(id, patch) {
  await ensureTables();
  const existing = await sql`SELECT * FROM payment_entries WHERE id = ${String(id)}`;
  if (!existing.length) return null;

  const merged = { ...fromRow(existing[0]), ...patch };
  const r = toRow(merged);

  const rows = await sql`
    UPDATE payment_entries SET
      po_num       = ${r.po_num},
      candidate    = ${r.candidate},
      client       = ${r.client},
      company      = ${r.company},
      po_date      = ${r.po_date},
      due_date     = ${r.due_date},
      month        = ${r.month},
      year         = ${r.year},
      instance     = ${r.instance},
      amount       = ${r.amount},
      paid         = ${r.paid},
      due          = ${r.due},
      service_type = ${r.service_type},
      status       = ${r.status},
      type         = ${r.type},
      notes        = ${r.notes},
      signup_date  = ${r.signup_date},
      placed_date  = ${r.placed_date},
      closed_by    = ${r.closed_by},
      placed_by    = ${r.placed_by},
      reference    = ${r.reference},
      location     = ${r.location},
      currency     = ${r.currency},
      updated_at   = NOW()
    WHERE id = ${String(id)}
    RETURNING *
  `;

  const changed = Object.entries(patch)
    .filter(([k]) => k !== 'id' && k !== 'createdAt' && k !== 'updatedAt')
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');
  if (changed) {
    await sql`
      INSERT INTO entry_history (entry_id, action, field_changed, new_value)
      VALUES (${String(id)}, 'update', ${changed}, ${JSON.stringify(r)})
    `;
  }
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function deleteEntry(id) {
  await ensureTables();
  await sql`
    INSERT INTO entry_history (entry_id, action)
    VALUES (${String(id)}, 'delete')
  `;
  const rows = await sql`
    DELETE FROM payment_entries WHERE id = ${String(id)} RETURNING id
  `;
  return rows[0] ?? null;
}

/* Delete many entries in one round trip; returns the ids that were
   actually present in the table (so the caller can reconcile). */
export async function bulkDelete(ids) {
  await ensureTables();
  if (!ids.length) return [];
  for (const id of ids) {
    await sql`INSERT INTO entry_history (entry_id, action) VALUES (${String(id)}, 'delete')`;
  }
  const rows = await sql`
    DELETE FROM payment_entries
    WHERE id = ANY(${ids})
    RETURNING id
  `;
  return rows.map(r => r.id);
}

export async function bulkUpsert(entries) {
  await ensureTables();
  if (!entries.length) return [];
  const results = [];
  for (const entry of entries) {
    const created = await createEntry(entry);
    results.push(created);
  }
  return results;
}

export async function getHistory(entryId) {
  await ensureTables();
  const rows = await sql`
    SELECT * FROM entry_history
    WHERE entry_id = ${String(entryId)}
    ORDER BY changed_at DESC
    LIMIT 100
  `;
  return rows;
}

export async function getDashboardState(key = "default") {
  await ensureTables();
  const rows = await sql`
    SELECT key, payload, created_at, updated_at
    FROM dashboard_state
    WHERE key = ${String(key)}
    LIMIT 1
  `;
  return rows[0] ?? { key: String(key), payload: {}, created_at: null, updated_at: null };
}

export async function setDashboardState(key = "default", payload = {}) {
  await ensureTables();
  const rows = await sql`
    INSERT INTO dashboard_state (key, payload)
    VALUES (${String(key)}, ${JSON.stringify(payload)}::jsonb)
    ON CONFLICT (key) DO UPDATE SET
      payload = EXCLUDED.payload,
      updated_at = NOW()
    RETURNING key, payload, created_at, updated_at
  `;
  return rows[0];
}
