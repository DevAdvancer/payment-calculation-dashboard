import {
  LAIDOFF_STATUSES,
  normalizePaymentStatus,
  scopeForStatusUpdate,
} from "./status-utils.js";

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
 *                  BGV Fail): the clicked entry takes the chosen
 *                  terminal status; every other *Pending* entry for
 *                  that candidate is swept onto the Laid Off sheet
 *                  with status normalized to "Laid Off" and
 *                  sheetScope="laidoff". Received and Move rows are
 *                  left alone.
 *   • "Default"   — same sweep, but the swept rows get
 *                  status="Default" and sheetScope="defaulter".
 *   • any other terminal status — only the clicked entry changes.
 *   • non-terminal statuses (Move, …) — only the clicked entry changes.
 *
 * Bringing a swept row back: when the user later flips one of these
 * swept rows to "Pending" / "Received" / "Move", the second branch
 * below takes over (the click no longer matches a laidoff/default
 * status) and `scopeForStatusUpdate("laidoff", "Pending")` /
 * `scopeForStatusUpdate("defaulter", "Received")` returns
 * "payment" — the row moves back to the Payment Calculation page.
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

  /* The "swept" terminal statuses. The user picks one of these on
     the clicked row; the cascade copies the same terminal status
     onto every other Pending row for the candidate so the swept
     rows surface under that status filter on the Laid Off /
     Defaulter page (filter by status, route by sheetScope). */
  if (LAIDOFF_STATUSES.includes(normalized)) {
    return sweepCandidate(entries, clickedId, sameCandidate, normalized, "laidoff");
  }
  if (normalized === "Default") {
    return sweepCandidate(entries, clickedId, sameCandidate, "Default", "defaulter");
  }

  // Pending, Received, and any other (Offer Revoke, Move, …) — only
  // the clicked row changes. scopeForStatusUpdate routes the row to
  // the correct page based on its new status: e.g. a row that was
  // previously swept onto the laidoff sheet comes back to payment
  // when flipped to "Pending" or "Received".
  const amount = parseFloat(clicked.amount) || 0;
  const isReceived = normalized === "Received";
  return entries.map(e => {
    if (String(e.id) !== String(clickedId)) return e;
    return {
      ...e,
      status: normalized,
      paid: isReceived ? amount : 0,
      due:  isReceived ? 0      : amount,
      sheetScope: scopeForStatusUpdate(e.sheetScope, normalized),
    };
  });
}

/* ── Helper: apply a "sweep onto terminal sheet" cascade.
   Clicked row → terminal status, paid=0, due=amount, sheetScope set
   to terminalScope.  Other *Pending* rows for the same candidate →
   same terminal status, paid=0, due=amount, sheetScope=terminalScope.
   All other rows are returned reference-equal. */
function sweepCandidate(entries, clickedId, sameCandidate, terminalStatus, terminalScope) {
  const sweepIds = new Set(
    entries
      .filter(e =>
        sameCandidate(e) &&
        e.status === "Pending" &&
        String(e.id) !== String(clickedId)
      )
      .map(e => String(e.id))
  );
  return entries.map(e => {
    const id = String(e.id);
    if (id === String(clickedId) || sweepIds.has(id)) {
      const amt = parseFloat(e.amount) || 0;
      return {
        ...e,
        status: terminalStatus,
        paid: 0,
        due: amt,
        sheetScope: scopeForStatusUpdate(e.sheetScope, terminalStatus),
      };
    }
    return e;
  });
}