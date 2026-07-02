"use client";

import { useMemo } from "react";
import { MONTH_NAMES, INSTANCE_OPTIONS, SERVICE_TYPES } from "@/lib/use-store";
import { periodOf, normalizeMonth } from "@/lib/period-utils";

const EMPTY_FILTERS = {
  company:  "",
  month:    "",
  year:     "",
  instance: "",
  status:   "",
  serviceType: "",
};

/* Canonical display order so the dropdown is stable regardless of
   insertion order. Anything not in this list (e.g. a status someone
   typed manually during an import) is still shown, but appended after
   the known ones, alphabetically. */
const STATUS_ORDER = [
  "Pending",
  "Received",
  "Move",
  "Laid Off",
  "Offer Revoke",
  "No Offer",
  "Resigned",
  "Contract End",
  "BGV Fail",
  "Default",
];

export default function FilterBar({ entries = [], filters = EMPTY_FILTERS, onFilterChange }) {
  /* All dropdowns are derived dynamically from the actual entries so
     each only lists values that exist in the data. The current
     selection is always kept visible even if no row currently has
     it (so clearing the last matching row doesn't silently drop
     the filter). */

  const companies = useMemo(() => {
    const set = new Set(entries.map((e) => e.company).filter(Boolean));
    if (filters.company) set.add(String(filters.company));
    return [...set].sort();
  }, [entries, filters.company]);

  const years = useMemo(() => {
    const set = new Set(entries.map((e) => e.year).filter(Boolean).map(String));
    if (filters.year) set.add(String(filters.year));
    const currentYear = String(new Date().getFullYear());
    if (!set.has(currentYear)) set.add(currentYear);
    return [...set].sort((a, b) => Number(b) - Number(a));
  }, [entries, filters.year]);

  /* Month: combine the stored `e.month` AND the period derived from
     `poDate` (via shared periodOf) so rows whose stored month is
     blank or non-canonical still surface. */
  const months = useMemo(() => {
    const present = new Set();
    for (const e of entries) {
      const p = periodOf(e);
      if (p.month) present.add(p.month);
      if (e.month) {
        const m = normalizeMonth(e.month);
        if (m) present.add(m);
      }
    }
    if (filters.month) present.add(normalizeMonth(filters.month));
    const ordered = MONTH_NAMES.filter(m => present.has(m));
    const extras  = [...present].filter(m => !MONTH_NAMES.includes(m)).sort((a, b) => a.localeCompare(b));
    return [...ordered, ...extras];
  }, [entries, filters.month]);

  /* Instance: derived from entries (data may have only First Half or
     only Second Half on this page). */
  const instances = useMemo(() => {
    const present = new Set(entries.map(e => String(e.instance || "").trim()).filter(Boolean));
    if (filters.instance) present.add(String(filters.instance));
    const ordered = INSTANCE_OPTIONS.filter(i => present.has(i));
    const extras  = [...present].filter(i => !INSTANCE_OPTIONS.includes(i)).sort((a, b) => a.localeCompare(b));
    return [...ordered, ...extras];
  }, [entries, filters.instance]);

  /* Status options are derived from the actual entries so the dropdown
     only shows statuses that exist in the data. The current selection
     is kept visible even if no row currently has it (e.g. the user
     just cleared the only row of that status). */
  const statuses = useMemo(() => {
    const present = new Set(
      entries.map(e => String(e.status || "").trim()).filter(Boolean)
    );
    if (filters.status) present.add(String(filters.status));
    const ordered = STATUS_ORDER.filter(s => present.has(s));
    const extras = [...present]
      .filter(s => !STATUS_ORDER.includes(s))
      .sort((a, b) => a.localeCompare(b));
    return [...ordered, ...extras];
  }, [entries, filters.status]);

  const types = useMemo(() => {
    const present = new Set(
      entries.map(e => String(e.serviceType || "").trim()).filter(Boolean)
      );
    if (filters.serviceType) present.add(String(filters.serviceType));
    const ordered = SERVICE_TYPES.filter(s => present.has(s));
    const extras = [...present].filter(s => !SERVICE_TYPES.includes(s)).sort((a, b) => a.localeCompare(b));
    return [...ordered, ...extras];
  }, [entries, filters.serviceType]);


  const set = (key) => (e) => {
    if (typeof onFilterChange === "function") {
      onFilterChange((prev) => ({ ...prev, [key]: e.target.value }));
    }
  };

  const activeCount = Object.values(filters).filter(Boolean).length;
  const hasFilters = activeCount > 0;

  const clearAll = () => {
    if (typeof onFilterChange === "function") {
      onFilterChange(EMPTY_FILTERS);
    }
  };

  return (
    <>
      <style>{`
        .fb-badge {
          background: var(--teal);
          color: var(--cream);
          border-radius: var(--r-full);
          font-size: 10px;
          font-weight: 700;
          padding: 1px 7px;
          min-width: 20px;
          text-align: center;
          line-height: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .fb-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .fb-clear {
          background: transparent;
          border: 1px solid var(--border-md);
          border-radius: var(--r-md);
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
          cursor: pointer;
          font-family: var(--font);
          transition: all 0.15s;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .fb-clear:hover {
          border-color: var(--teal);
          color: var(--cream);
        }
      `}</style>

      <div className="filter-bar">
        <span className="fb-label">
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filters
          {hasFilters && <span className="fb-badge">{activeCount}</span>}
        </span>

        {/* Company */}
        <select
          className="filter-select"
          value={filters.company}
          onChange={set("company")}
        >
          <option value="">All Companies</option>
          {companies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Month */}
        <select
          className="filter-select"
          value={filters.month}
          onChange={set("month")}
        >
          <option value="">All Months</option>
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        {/* Year */}
        <select
          className="filter-select"
          value={filters.year}
          onChange={set("year")}
        >
          <option value="">All Years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        {/* Instance */}
        <select
          className="filter-select"
          value={filters.instance}
          onChange={set("instance")}
        >
          <option value="">All Instances</option>
          {instances.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>

        {/* Status — options are derived from the actual entries so the
            dropdown only lists statuses that exist in the data. */}
        <select
          className="filter-select"
          value={filters.status}
          onChange={set("status")}
        >
          <option value="">All Status</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Type of Service */}
        <select
          className="filter-select"
          value={filters.serviceType}
          onChange={set("serviceType")}
        >
          <option value="">All Types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Clear */}
        {hasFilters && (
          <button className="fb-clear" onClick={clearAll}>
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear
          </button>
        )}
      </div>
    </>
  );
}
