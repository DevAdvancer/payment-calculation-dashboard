export function normalizeCompanyName(value) {
  const raw = String(value || "").trim();
  const key = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!key) return raw;
  if (key === "sst" || key === "silverspace" || key === "silverspaceinc") return "SilverSpace Inc";
  if (key === "vcs" || key === "vizva" || key === "vizvainc") return "Vizva Inc";
  if (key === "vizvauk" || key === "vizvaukltd") return "Vizva UK Ltd";
  if (key === "flawless" || key === "flawlessed") return "Flawless-ED";
  return raw;
}

export function normalizeEntryCompany(entry) {
  if (!entry || typeof entry !== "object" || !("company" in entry)) return entry;
  return { ...entry, company: normalizeCompanyName(entry.company) };
}
