import {
  LAIDOFF_STATUSES,
  normalizePaymentStatus,
  scopeForStatusUpdate,
} from "./status-utils.js";

/* ── Internal: parse MM-DD-YYYY or YYYY-MM-DD to a timestamp for comparison.
   Returns 0 (falsy) if the value can't be parsed. */
function _parseDateTs(val) {
  if (!val) return 0;
  const s = String(val).trim();
  // MM-DD-YYYY
  const mdy = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mdy) return new Date(+mdy[3], +mdy[1] - 1, +mdy[2]).getTime();
  // YYYY-MM-DD
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return new Date(+ymd[1], +ymd[2] - 1, +ymd[3]).getTime();
  return 0;
}

/* ── Cascade planner (pure, no I/O) ─────────────────────
 * Given the full list of entries, the id of the row the user clicked,
 * and the new status they picked, returns a new entries array with the
 * cascade applied.
 *
 * Rules:
 *   • "Received"  — only the clicked entry changes.
 *   • "Pending"   — only the clicked entry changes.
 *   • "Laid Off" (and the other terminal laidoff statuses
 *                  — Offer Revoke, No Offer, Resigned, Contract End,
 *                  BGV Fail): the clicked entry keeps sheetScope="payment"
 *                  but its status is set to the terminal status so it
 *                  renders red on the Payment page. Only *Pending* entries
 *                  for the same candidate whose date is AFTER the clicked
 *                  row's date are swept onto the Laid Off sheet.
 *                  Entries before the clicked row are left untouched.
 *                  A clone of the clicked row is created in use-store.js
 *                  (a DB side-effect) and placed on the terminal sheet.
 *   • "Default"   — same as above but swept rows get sheetScope="defaulter".
 *   • any other terminal status — only the clicked entry changes.
 *   • non-terminal statuses (Move, …) — only the clicked entry changes.
 *
 * Bringing a swept row back: when the user later flips one of these
 * swept rows to "Pending" / "Received" / "Move", scopeForStatusUpdate
 * returns "payment" — the row moves back to the Payment Calculation page.
 * Reference-equal rows are returned for everything else so callers
 * can detect changes by identity and only write the rows that
 * actually moved.
 */
export function planStatusUpdate(entries, clickedId, status) {
  const normalized = normalizePaymentStatus(status);
  const clicked = entries.find(e => String(e.id) === String(clickedId));
  if (!clicked) return entries;
  const candidate = (clicked.candidate || "").trim().toLowerCase();
  const sameCandidate = (e) =>
    (e.candidate || "").trim().toLowerCase() === candidate;

  if (LAIDOFF_STATUSES.includes(normalized)) {
    return sweepCandidate(entries, clicked, sameCandidate, normalized, "laidoff");
  }
  if (normalized === "Default") {
    return sweepCandidate(entries, clicked, sameCandidate, "Default", "defaulter");
  }

  // Pending, Received, and any other (Move, …) — only the clicked row changes.
  const amount = parseFloat(clicked.amount) || 0;
  const isReceived = normalized === "Received";
  return entries.map(e => {
    if (String(e.id) !== String(clickedId)) return e;
    return {
      ...e,
      status: normalized,
      paid: isReceived ? amount : 0,
      due: isReceived ? 0 : amount,
      sheetScope: scopeForStatusUpdate(e.sheetScope, normalized),
    };
  });
}

/* ── Helper: apply a "sweep onto terminal sheet" cascade.
   Clicked row    → terminal status, sheetScope stays "payment" (red anchor).
   Pending rows for the same candidate whose poDate is STRICTLY AFTER the
   clicked row's poDate → terminal status, sheetScope=terminalScope.
   Rows BEFORE the clicked row (Aug, Sept, etc.) are left untouched.
   A clone of the clicked row is created separately in use-store.js.
   All other rows are returned reference-equal. */
function sweepCandidate(entries, clickedEntry, sameCandidate, terminalStatus, terminalScope) {
  const clickedId = String(clickedEntry.id);
  const clickedTs = _parseDateTs(clickedEntry.poDate);

  // Collect ids of Pending rows for the same candidate whose date is
  // strictly AFTER the clicked row's date.
  const sweepIds = new Set(
    entries
      .filter(e => {
        if (!sameCandidate(e)) return false;
        if (e.status !== "Pending") return false;
        if (String(e.id) === clickedId) return false;
        // Only sweep rows that come AFTER the clicked row chronologically
        const rowTs = _parseDateTs(e.poDate);
        return rowTs > clickedTs;
      })
      .map(e => String(e.id))
  );

  return entries.map(e => {
    const id = String(e.id);
    if (id === clickedId) {
      // Original clicked row stays on the payment page (sheetScope="payment")
      // but its status changes to the terminal value → renders as red.
      const amt = parseFloat(e.amount) || 0;
      return {
        ...e,
        status: terminalStatus,
        paid: 0,
        due: amt,
        sheetScope: "payment", // always keep on payment page
      };
    }
    if (sweepIds.has(id)) {
      // Pending rows AFTER the clicked row → swept to the terminal sheet
      const amt = parseFloat(e.amount) || 0;
      return {
        ...e,
        status: terminalStatus,
        paid: 0,
        due: amt,
        sheetScope: terminalScope,
      };
    }
    return e;
  });
}