import { sql } from "./neon";

export async function ensureAdminTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS admin_settings (
      key   TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

const DEFAULTS = {
  company_name:       "Global Staffing Solutions Inc.",
  company_address:    "123 Business Park, Suite 400\nNew York, NY 10001",
  company_website:    "www.globalstaffing.com",
  company_ein:        "XX-XXXXXXX",
  company_email:      "hr@globalstaffing.com",
  company_phone:      "+1 (800) 000-0000",
  company_logo:       "",
  signatory_name:     "Chief Executive Officer",
  signatory_title:    "CEO",
  signatory_signature: "",
  noc_footer_note:    "This certificate is issued without prejudice and in good faith.",
};

export async function getSettings() {
  await ensureAdminTable();
  const rows = await sql`SELECT key, value FROM admin_settings`;
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return { ...DEFAULTS, ...map };
}

export async function setSetting(key, value) {
  await ensureAdminTable();
  await sql`
    INSERT INTO admin_settings (key, value) VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
}

/* Single-statement multi-row upsert. Runs in one Neon round trip
   even for dozens of keys, so a save no longer racks up N awaits. */
export async function setSettings(obj) {
  await ensureAdminTable();
  const entries = Object.entries(obj);
  if (!entries.length) return;
  const keys   = entries.map(([k]) => k);
  const values = entries.map(([, v]) => String(v ?? ""));
  await sql`
    INSERT INTO admin_settings (key, value)
    SELECT * FROM UNNEST(${keys}::text[], ${values}::text[])
    ON CONFLICT (key) DO UPDATE SET
      value      = EXCLUDED.value,
      updated_at = NOW()
  `;
}
