"use client";

import { useMemo } from "react";
import { MONTH_NAMES, ALL_STATUSES, INSTANCE_OPTIONS } from "@/lib/use-store";

const EMPTY_FILTERS = {
  company:  "",
  month:    "",
  year:     "",
  instance: "",
  status:   "",
};

export default function FilterBar({ entries = [], filters = EMPTY_FILTERS, onFilterChange }) {
  /* Derive unique options from entries */
  const companies = useMemo(() => [...new Set(entries.map((e) => e.company).filter(Boolean))].sort(), [entries]);
  const years = useMemo(() => {
    const fromEntries = [...new Set(entries.map((e) => e.year).filter(Boolean))].sort((a, b) => b - a);
    const currentYear = String(new Date().getFullYear());
    if (!fromEntries.includes(currentYear)) {
      return [currentYear, ...fromEntries];
    }
    return fromEntries;
  }, [entries]);

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
          {MONTH_NAMES.map((m) => <option key={m} value={m}>{m}</option>)}
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
          {INSTANCE_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>

        {/* Status */}
        <select
          className="filter-select"
          value={filters.status}
          onChange={set("status")}
        >
          <option value="">All Status</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
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
