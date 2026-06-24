function hasPlacementAgreementType(entry) {
  return /(\d+(?:\.\d+)?)\s*%.*?(\d+)\s*months?/i.test(String(entry?.type || ""));
}

function hasGeneratedPlacementShape(entry) {
  const serviceType = String(entry?.serviceType || "").trim().toLowerCase();
  const notes = String(entry?.notes || "").trim().toLowerCase();

  return (
    serviceType === "payment collection" ||
    serviceType === "new placement" ||
    notes === "non upfront" ||
    /^installment\s+\d+$/i.test(notes) ||
    /\(nr\)/i.test(notes)
  );
}

export function isPoDetailsEntry(entry) {
  if (!entry) return false;
  if (entry.sheetScope === "po-details") return true;

  const scope = String(entry.sheetScope || "").trim();
  if (scope && scope !== "payment") return false;

  return hasPlacementAgreementType(entry) && hasGeneratedPlacementShape(entry);
}
