# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Placement Management System — a Next.js 16 (App Router, React 19) SPA for tracking recruitment placement payments. Each candidate row is a "payment entry" with a `status` (Pending, Received, Move, Laid Off, Offer Revoke, No Offer, Resigned, Contract End, BGV Fail, Default) and a `sheetScope` that routes the row to one of four pages: **PO Details**, **Payment Calculation**, **Laid Off**, or **Defaulter**. Currency is derived from the company name (Vizva UK Ltd → GBP, everything else → USD) unless an explicit `currency` field is set.

Backend: Neon serverless Postgres (`@neondatabase/serverless`). Schema is created idempotently in `lib/dashboard-store.js` (`ensureTables`). UI state: Zustand store in `lib/use-store.js`.

## Commands

```bash
npm run dev      # next dev (Turbopack)
npm run build    # next build
npm run start    # next start
npm run lint     # next lint (uses next/core-web-vitals; ignores .next, node_modules, next.config.mjs, test/)
```

Run a single test file:

```bash
node --test test/status-routing.test.mjs
```

Run all tests:

```bash
node --test test/
```

Tests are pure-function Node test runner files (`*.test.mjs`). They import from `lib/*.js` (NOT from `lib/use-store.js` — that pulls in zustand and a `./company-utils` extensionless import that Node ESM rejects). If you need to test logic that lives in the store, extract it to a pure helper first.

## Required env vars

`.env.example` lists them:

- `DATABASE_URL` — Postgres connection string (Neon). Required by `lib/neon.js`; throws at module load if missing.
- `UNIRATE_API_KEY` — used by `app/api/exchange/route.js` to fetch GBP→USD rates.

## Codebase layout

```
app/
  layout.jsx              root layout (note: <html suppressHydrationWarning> for browser extensions)
  page.jsx                client root; switches between pages based on store.currentPage
  components/
    Sidebar.jsx           navigation; reads getLaidOff/getDefaulters counts from store
    payment/              PaymentCalcPage, CreateEntryModal, QuickEntryModal, FilterBar
    placement/            NewPlacementPage (form for adding new placements)
    special/              SpecialSheetPage — reused for Laid Off and Defaulter pages
    podetails/            PODetailsPage
    dashboard/            PaymentDashboardPage (KPIs/charts)
    monthly/              MonthlySummaryPage
    history/              CandidateHistoryPage, NOCModal
    expense/              ExpensePage
  api/
    entries/route.js            GET / POST (bulk upsert)
    entries/[id]/route.js       GET (history) / PATCH / DELETE
    expenses/...                same shape
    exchange/route.js           GBP→USD proxy (uses UNIRATE_API_KEY)
    admin/settings/route.js     admin page settings
    state/route.js              dashboard_state JSONB blob
lib/
  use-store.js            Zustand store: entries, expenses, navigation, toasts. CLIENT ONLY.
  status-utils.js         ALL_STATUSES, LAIDOFF_STATUSES, ROUTED_STATUSES; normalize*; routeBucketForEntry; scopeForStatusUpdate
  status-cascade.js       pure planStatusUpdate(entries, id, newStatus) — the cascade planner
  schemas.js              Zod EntrySchema / EntryPatchSchema / BulkEntrySchema / ExpenseSchema
  dashboard-store.js      Postgres CRUD (ensureTables, toRow/fromRow snake_case <-> camelCase, listEntries, createEntry, updateEntry, deleteEntry, getHistory)
  company-utils.js        normalizeCompanyName (alias map: SST→SilverSpace, VCS/Vizva→Vizva Inc, etc.)
  payment-import-utils.js normalizePaymentImportAmounts — recomputes paid/due from {amount, paid, due, status}
  po-details-utils.js     page-routing helpers (sheetScope=po-details is pinned)
  period-utils.js         month/year/instance helpers
  neon.js                 `sql = neon(DATABASE_URL)` — throws if DATABASE_URL missing
  admin-store.js          dashboard_state JSON helpers
  expense-store.js        expenses CRUD
  noc-defaults.js         NOC modal defaults
test/
  *.test.mjs              node:test specs for pure helpers only
```

## Key concepts

### Status routing: `sheetScope` vs `status`

The two fields serve different roles:

- **`status`** is the user-facing label (drives the Status filter dropdown on each page).
- **`sheetScope`** is the authoritative routing field — it tells the UI which page the row lives on.

`routeBucketForEntry(entry)` in `lib/status-utils.js` returns one of `"po-details" | "payment" | "laidoff" | "defaulter"` by checking `sheetScope` first, then falling back to `status`. Any new entry should set both fields consistently. `scopeForStatusUpdate(currentScope, nextStatus)` in the same file computes the right `sheetScope` for a status transition.

### The cascade planner (`lib/status-cascade.js`)

`planStatusUpdate(entries, clickedId, newStatus)` is a **pure function** that returns a new entries array with cascade effects applied. Used by `updateStatus` in the store, which compares prev vs new arrays by reference and only writes the rows that actually changed.

Rules:

- **Laid Off** (or any `LAIDOFF_STATUSES` — Laid Off, Offer Revoke, No Offer, Resigned, Contract End, BGV Fail): the clicked row takes the chosen terminal status; every other *Pending* row for the same candidate (case-insensitive name match) is swept onto the Laid Off sheet with the **same** terminal status and `sheetScope="laidoff"`, `paid=0`, `due=amount`. Received and Move rows are untouched.
- **Default**: same sweep, but swept rows get `status="Default"`, `sheetScope="defaulter"`.
- **Pending / Received / Move / anything else**: only the clicked row changes; `scopeForStatusUpdate` reroutes it. A row that was previously swept to the Laid Off / Defaulter sheet comes back to payment when flipped to "Pending" or "Received".

Untouched rows are returned reference-equal so the caller can detect changes by identity (`prev[i] !== cascaded[i]`). Tests live in `test/update-status-cascade.test.mjs`.

### Store ↔ DB row conversion

`lib/dashboard-store.js` has `toRow(entry)` / `fromRow(row)` that bridge camelCase (UI/store) ↔ snake_case (Postgres). The Zod schemas in `lib/schemas.js` are the single source of truth for what an entry looks like — fields like `sheetScope` ↔ `sheet_scope`, `poDate` ↔ `po_date`, `paid`/`due`/`actual` as `NUMERIC(14,2)`. All API routes (`app/api/entries/route.js`, `app/api/entries/[id]/route.js`) validate with these schemas and return `formatValidationErrors` on failure.

### Currency

`currencyOf(entryOrCompany)` in `lib/use-store.js` resolves "USD" or "GBP". It prefers an explicit `entry.currency` (used when a new placement is created via the Create-Entry modal), otherwise it derives from the company name: "vizva-uk" / "vizva uk ltd" → GBP, everything else → USD.

### Company normalization

`normalizeCompanyName` in `lib/company-utils.js` collapses aliases (case- and punctuation-insensitive) to canonical names: SST/SilverSpace → "SilverSpace Inc", VCS/Vizva → "Vizva Inc", etc. Run on every entry through `normalizeEntryCompany` before persisting.

### Optimistic UI

The store applies optimistic updates locally first (`set({ entries: cascaded })`), then POSTs to the API. On failure, it rolls back to `prev` and shows a toast. `updateStatus` uses a single bulk POST for the whole cascade (atomic). `bulkDelete` chunks into 500-row requests.

## Conventions

- Path alias: `@/*` → project root (set in `jsconfig.json` and mirrored in `next.config.mjs` for both Turbopack and webpack).
- All component files start with `"use client"` — this is a client-only SPA, no server components.
- All dates are stored as `MM-DD-YYYY` strings throughout the data layer. `lib/schemas.js` has a `normalizeDateToMMDDYYYY` that also accepts ISO (`YYYY-MM-DD`), Excel serial numbers, and `Date` instances.
- Toast helper: `showToast(text, duration)` — sticky (non-dismissing) when the text matches `/failed|error|invalid|could not|network|validation|import failed|save failed|update failed|delete failed/i`.
- `localStorage` is used for `currentPage` and `notifications` only — try/catch around all reads/writes (SSR/private-mode safety).
- When adding a new status to `LAIDOFF_STATUSES` or `ROUTED_STATUSES`, also update the relevant test files (`test/status-routing.test.mjs`, `test/update-status-cascade.test.mjs`).
- Playwright is in devDependencies but not currently wired into a `test:e2e` script — keep e2e specs out unless adding the runner setup.
