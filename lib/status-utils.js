export const ROUTED_STATUSES = [
  "Laid Off",
  "Offer Revoke",
  "No Offer",
  "Resigned",
  "Contract End",
  "BGV Fail",
  "Default",
];

export const LAIDOFF_STATUSES = [
  "Laid Off",
  "Offer Revoke",
  "No Offer",
  "Resigned",
  "Contract End",
  "BGV Fail",
];

export const ALL_STATUSES = [
  "Received",
  "Pending",
  "Move",
  ...LAIDOFF_STATUSES,
  "Default",
];

function statusKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

const STATUS_ALIASES = new Map([
  ["received", "Received"],
  ["receved", "Received"],
  ["recieved", "Received"],
  ["recievend", "Received"],
  ["receive", "Received"],
  ["paid", "Received"],
  ["pending", "Pending"],
  ["move", "Move"],
  ["laidoff", "Laid Off"],
  ["laid", "Laid Off"],
  ["layoff", "Laid Off"],
  ["offerrevoke", "Offer Revoke"],
  ["offerrevoked", "Offer Revoke"],
  ["nooffer", "No Offer"],
  ["resigned", "Resigned"],
  ["resign", "Resigned"],
  ["contractend", "Contract End"],
  ["contractended", "Contract End"],
  ["bgvfail", "BGV Fail"],
  ["bgvfailed", "BGV Fail"],
  ["bgvfailure", "BGV Fail"],
  ["default", "Default"],
  ["defaulter", "Default"],
  ["defaulters", "Default"],
]);

export function normalizePaymentStatus(value) {
  const raw = String(value || "").trim();
  if (ALL_STATUSES.includes(raw)) return raw;
  return STATUS_ALIASES.get(statusKey(raw)) || "Pending";
}

export function normalizeSpecialSheetStatus(value, isLaidOff) {
  const normalized = normalizePaymentStatus(value);
  if (isLaidOff) {
    return LAIDOFF_STATUSES.includes(normalized) ? normalized : "Laid Off";
  }
  return "Default";
}

export function routeBucketForEntry(entry) {
  /* `sheetScope` is the authoritative routing field — it tells the UI
     which page the row lives on. The `status` field is the user-facing
     label (used for filtering within a page).

     IMPORTANT: If sheetScope is explicitly "payment", the row always
     stays on the Payment Calculation page — even if its status is a
     terminal one like "Laid Off" or "Default". This is what keeps the
     original "anchor" row visible (colored red) after a Laid Off /
     Default cascade. Only the cloned rows (with sheetScope="laidoff"/
     "defaulter") are routed to the terminal sheets. */
  const scope = entry?.sheetScope;
  if (scope === "po-details") return "po-details";
  if (scope === "payment")    return "payment";   // explicit payment scope always wins
  if (scope === "defaulter")  return "defaulter";
  if (scope === "laidoff")    return "laidoff";
  /* No explicit scope — fall back to status for legacy rows that
     pre-date the sheetScope field. */
  const status = normalizePaymentStatus(entry?.status);
  if (status === "Default") return "defaulter";
  if (status === "Pending" || status === "Received" || status === "Move") return "payment";
  return "laidoff";
}

export function scopeForStatusUpdate(currentScope, nextStatus) {
  if (currentScope === "po-details") return "po-details";
  const status = normalizePaymentStatus(nextStatus);
  if (status === "Default") return "defaulter";
  if (status === "Pending" || status === "Received" || status === "Move") return "payment";
  return "laidoff";
}
