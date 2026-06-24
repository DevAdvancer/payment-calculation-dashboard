/* ── Period matching (shared) ─────────────────────────────
 *
 * A single source of truth for "is this entry in the selected
 * month + year?" — used by the Payment Calculation page table, the
 * KPI strip, and the Laid Off / Defaulter sheets. Keeping the logic
 * in one place means the table, the stats box, and the special
 * sheets can never silently disagree about what "Jun 2026" means.
 *
 * The stored `e.month` is preferred when present and recognizable,
 * but falls back to the `poDate` so rows whose stored month/year is
 * blank, mistyped, or stored in a non-canonical form (e.g. "June",
 * "september") still resolve to the right period.
 */

import { MONTH_NAMES } from "./use-store.js";

function normalizeMonth(val) {
  if (!val) return "";
  const str = String(val).trim();
  if (!str) return "";
  const key = str.slice(0, 3).toLowerCase();
  const idx = MONTH_NAMES.findIndex(m => m.toLowerCase().startsWith(key));
  return idx === -1 ? str : MONTH_NAMES[idx];
}

/* Derive { month, year } for an entry. Stored month/year win when
   they parse cleanly; otherwise we derive from `poDate` (accepts
   MM-DD-YYYY and YYYY-MM-DD). Returns `{ month: "", year: "" }` if
   neither is usable. */
export function periodOf(entry) {
  const storedMonth = normalizeMonth(entry?.month);
  const storedYear  = entry?.year != null && entry?.year !== ""
    ? String(entry.year)
    : "";
  if (storedMonth && MONTH_NAMES.includes(storedMonth) && storedYear) {
    return { month: storedMonth, year: storedYear };
  }

  const raw = String(entry?.poDate || "").trim();
  const mdy = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mdy) {
    const d = new Date(+mdy[3], +mdy[1] - 1, +mdy[2]);
    if (!isNaN(d.getTime())) {
      return { month: MONTH_NAMES[d.getMonth()], year: String(d.getFullYear()) };
    }
  }
  const ymd = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    const d = new Date(+ymd[1], +ymd[2] - 1, +ymd[3]);
    if (!isNaN(d.getTime())) {
      return { month: MONTH_NAMES[d.getMonth()], year: String(d.getFullYear()) };
    }
  }

  return {
    month: storedMonth && MONTH_NAMES.includes(storedMonth) ? storedMonth : "",
    year:  storedYear,
  };
}

/* True iff `entry` belongs to the given (month, year) scope.
   - month/year may be empty strings, in which case that dimension
     is not constrained.
   - An entry whose period can't be resolved at all is excluded
     once any constraint is set. */
export function entryMatchesPeriod(entry, monthFilter, yearFilter) {
  const monthScope = normalizeMonth(monthFilter);
  const yearScope  = yearFilter ? String(yearFilter) : "";
  if (!monthScope && !yearScope) return true;

  const p = periodOf(entry);
  if (monthScope && p.month !== monthScope) return false;
  if (yearScope  && p.year  !== yearScope)  return false;
  return true;
}

export { normalizeMonth };