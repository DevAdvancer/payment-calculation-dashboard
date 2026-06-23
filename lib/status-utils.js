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
  if (entry?.sheetScope === "po-details") return "po-details";
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
