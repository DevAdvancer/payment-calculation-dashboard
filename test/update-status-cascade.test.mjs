import assert from "node:assert/strict";
import { test } from "node:test";
import { planStatusUpdate } from "../lib/status-cascade.js";

/* Helper: build a candidate with a mix of statuses. */
function buildCandidate(prefix = "row") {
  return [
    { id: `${prefix}-1`, candidate: "Alex", client: "X", status: "Pending",  sheetScope: "payment", amount: 1000, paid: 0,    due: 1000, poDate: "01-01-2026" },
    { id: `${prefix}-2`, candidate: "Alex", client: "X", status: "Pending",  sheetScope: "payment", amount: 1000, paid: 0,    due: 1000, poDate: "02-01-2026" },
    { id: `${prefix}-3`, candidate: "Alex", client: "X", status: "Received", sheetScope: "payment", amount: 1000, paid: 1000, due: 0,    poDate: "03-01-2026" },
    { id: `${prefix}-4`, candidate: "Alex", client: "X", status: "Move",     sheetScope: "payment", amount: 1000, paid: 0,    due: 1000, poDate: "04-01-2026" },
    /* Different candidate — should never be touched. */
    { id: `${prefix}-5`, candidate: "Sam",  client: "Y", status: "Pending",  sheetScope: "payment", amount: 1000, paid: 0,    due: 1000, poDate: "01-01-2026" },
  ];
}

const byId = (rows, id) => rows.find(r => String(r.id) === String(id));

test("Received → Pending on one row only changes that single row", () => {
  const entries = buildCandidate("p1");
  const result = planStatusUpdate(entries, "p1-3", "Pending");

  // The clicked row is the only one whose status changed.
  assert.equal(result.find(r => r.id === "p1-3").status, "Pending", "clicked row should become Pending");
  assert.equal(result.find(r => r.id === "p1-3").paid, 0);
  assert.equal(result.find(r => r.id === "p1-3").due, 1000);

  // Every other row for the same candidate must be untouched.
  for (const id of ["p1-1", "p1-2", "p1-4"]) {
    assert.equal(result.find(r => r.id === id).status, entries.find(r => r.id === id).status,
      `${id} status should not change when flipping a Received row to Pending`);
    assert.equal(result.find(r => r.id === id), entries.find(r => r.id === id),
      `${id} should be reference-equal to its previous row (no cascade)`);
  }

  // Different candidate: untouched.
  assert.equal(result.find(r => r.id === "p1-5"), entries.find(r => r.id === "p1-5"));

  // The clicked row should be the only changed row.
  const changed = result.filter((r, i) => r !== entries[i]);
  assert.equal(changed.length, 1, "exactly one row should change");
});

test("Pending → Received only changes the clicked row, no cascade", () => {
  const entries = buildCandidate("p2");
  const result = planStatusUpdate(entries, "p2-1", "Received");

  // The clicked row becomes Received.
  const clicked = result.find(r => r.id === "p2-1");
  assert.equal(clicked.status, "Received");
  assert.equal(clicked.paid, 1000);
  assert.equal(clicked.due, 0);

  // Every other row for the same candidate is untouched.
  const changed = result.filter((r, i) => r !== entries[i]);
  assert.equal(changed.length, 1, "exactly one row should change");

  // Different candidate is untouched.
  const sam = result.find(r => r.id === "p2-5");
  assert.equal(sam.status, "Pending");
});

test("Pending → Laid Off marks the clicked row; other Pending rows for the candidate also become Laid Off on the laidoff sheet", () => {
  /* Fixture where the clicked row (a Pending row) is distinct from
     the Move row, so we can assert each independently. */
  const entries = [
    { id: "p-1", candidate: "Alex", status: "Pending",  sheetScope: "payment", amount: 1000, paid: 0,    due: 1000, poDate: "01-01-2026" },
    { id: "p-2", candidate: "Alex", status: "Pending",  sheetScope: "payment", amount: 1000, paid: 0,    due: 1000, poDate: "02-01-2026" },
    { id: "p-3", candidate: "Alex", status: "Received", sheetScope: "payment", amount: 1000, paid: 1000, due: 0,    poDate: "03-01-2026" },
    { id: "p-4", candidate: "Alex", status: "Move",     sheetScope: "payment", amount: 1000, paid: 0,    due: 1000, poDate: "04-01-2026" },
    /* Different candidate — should never be touched. */
    { id: "p-5", candidate: "Sam",  status: "Pending",  sheetScope: "payment", amount: 1000, paid: 0,    due: 1000, poDate: "01-01-2026" },
  ];
  const result = planStatusUpdate(entries, "p-1", "Laid Off");

  // The clicked Pending row becomes Laid Off.
  const clicked = result.find(r => r.id === "p-1");
  assert.equal(clicked.status, "Laid Off");
  assert.equal(clicked.paid, 0);
  assert.equal(clicked.due, 1000);
  assert.equal(clicked.sheetScope, "laidoff");

  // The other Pending row for Alex is swept to the laidoff sheet
  // AND its status becomes "Laid Off" (the terminator), not "Pending".
  const otherPending = result.find(r => r.id === "p-2");
  assert.equal(otherPending.status, "Laid Off", "p-2 status should become Laid Off");
  assert.equal(otherPending.sheetScope, "laidoff", "p-2 sheetScope should be laidoff");
  assert.equal(otherPending.paid, 0);
  assert.equal(otherPending.due, 1000);

  // The previously-Received row for Alex is LEFT ALONE — Received is
  // a settled status and shouldn't be dragged onto the Laid Off sheet
  // just because another row for the same candidate was terminated.
  const receivedRow = result.find(r => r.id === "p-3");
  assert.equal(receivedRow.status, "Received");
  assert.equal(receivedRow.sheetScope, "payment",
    "received row's sheetScope should stay on payment");

  // The Move row for Alex is also LEFT ALONE.
  const moveRow = result.find(r => r.id === "p-4");
  assert.equal(moveRow, entries.find(r => r.id === "p-4"),
    "Move row should be untouched (reference-equal)");

  // Different candidate untouched.
  const sam = result.find(r => r.id === "p-5");
  assert.equal(sam.status, "Pending");
  assert.equal(sam.sheetScope, "payment");
});

test("Received row clicked → Laid Off leaves other Received and Move rows for the candidate alone; only Pending rows are swept to Laid Off", () => {
  /* Fixture where the clicked row (a Received row) is distinct from
     the Move row, so we can assert each independently. */
  const entries = [
    { id: "q-1", candidate: "Alex", status: "Pending",  sheetScope: "payment", amount: 1000, paid: 0,    due: 1000, poDate: "01-01-2026" },
    { id: "q-2", candidate: "Alex", status: "Pending",  sheetScope: "payment", amount: 1000, paid: 0,    due: 1000, poDate: "02-01-2026" },
    { id: "q-3", candidate: "Alex", status: "Received", sheetScope: "payment", amount: 1000, paid: 1000, due: 0,    poDate: "03-01-2026" }, // ← clicked
    { id: "q-4", candidate: "Alex", status: "Move",     sheetScope: "payment", amount: 1000, paid: 0,    due: 1000, poDate: "04-01-2026" },
    /* Different candidate — should never be touched. */
    { id: "q-5", candidate: "Sam",  status: "Pending",  sheetScope: "payment", amount: 1000, paid: 0,    due: 1000, poDate: "01-01-2026" },
  ];
  const result = planStatusUpdate(entries, "q-3", "Laid Off");

  // The clicked Received row becomes Laid Off.
  const clicked = result.find(r => r.id === "q-3");
  assert.equal(clicked.status, "Laid Off");
  assert.equal(clicked.sheetScope, "laidoff");

  // Other Pending rows for the same candidate ARE swept — and their
  // status is normalized to "Laid Off" so they surface under the
  // Laid Off filter on the Laid Off page.
  for (const id of ["q-1", "q-2"]) {
    const row = result.find(r => r.id === id);
    assert.equal(row.sheetScope, "laidoff", `${id} should be moved to laidoff sheet`);
    assert.equal(row.status, "Laid Off", `${id} status should become Laid Off`);
  }

  // The Move row for the same candidate is LEFT ALONE.
  const moveRow = result.find(r => r.id === "q-4");
  assert.equal(moveRow, entries.find(r => r.id === "q-4"),
    "Move row should be untouched (reference-equal)");

  // Different candidate untouched.
  const sam = result.find(r => r.id === "q-5");
  assert.equal(sam, entries.find(r => r.id === "q-5"));
});

test("Laid Off → Received on a single row only moves that row back to payment; other laidoff-sheet rows stay put", () => {
  /* Two rows on the laidoff sheet (swept earlier, status="Laid Off"
     since the cascade uses the terminal status), plus one Received
     row on payment. Click the laidoff-sheet row and flip it to
     Received. */
  const entries = [
    { id: "r-1", candidate: "Alex", status: "Laid Off", sheetScope: "laidoff", amount: 1000, paid: 0,    due: 1000, poDate: "01-01-2026" }, // ← clicked
    { id: "r-2", candidate: "Alex", status: "Laid Off", sheetScope: "laidoff", amount: 1000, paid: 0,    due: 1000, poDate: "02-01-2026" }, // swept before
    { id: "r-3", candidate: "Alex", status: "Received", sheetScope: "payment", amount: 1000, paid: 1000, due: 0,    poDate: "03-01-2026" },
  ];
  const result = planStatusUpdate(entries, "r-1", "Received");

  // Clicked row flips to Received and goes back to the payment sheet.
  const clicked = result.find(r => r.id === "r-1");
  assert.equal(clicked.status, "Received");
  assert.equal(clicked.sheetScope, "payment");
  assert.equal(clicked.paid, 1000);
  assert.equal(clicked.due, 0);

  // The other laidoff-sheet row STAYS on the laidoff sheet — only the
  // clicked row moves back.
  const sweptRow = result.find(r => r.id === "r-2");
  assert.equal(sweptRow, entries.find(r => r.id === "r-2"),
    "non-clicked laidoff row should be untouched (reference-equal)");

  // Received row is unchanged.
  const receivedRow = result.find(r => r.id === "r-3");
  assert.equal(receivedRow, entries.find(r => r.id === "r-3"));
});

test("Laid Off → Pending on a single row only moves that row back to payment; other laidoff-sheet rows stay put", () => {
  const entries = [
    { id: "s-1", candidate: "Alex", status: "Laid Off", sheetScope: "laidoff", amount: 1000, paid: 0, due: 1000, poDate: "01-01-2026" }, // ← clicked
    { id: "s-2", candidate: "Alex", status: "Laid Off", sheetScope: "laidoff", amount: 1000, paid: 0, due: 1000, poDate: "02-01-2026" }, // swept before
  ];
  const result = planStatusUpdate(entries, "s-1", "Pending");

  // Clicked row → Pending on payment sheet.
  const clicked = result.find(r => r.id === "s-1");
  assert.equal(clicked.status, "Pending");
  assert.equal(clicked.sheetScope, "payment");
  assert.equal(clicked.paid, 0);
  assert.equal(clicked.due, 1000);

  // Other laidoff-sheet row stays put.
  const sweptRow = result.find(r => r.id === "s-2");
  assert.equal(sweptRow, entries.find(r => r.id === "s-2"),
    "non-clicked laidoff row should be untouched (reference-equal)");
});

test("Pending → Default sweeps other Pending rows for the candidate to the defaulter sheet with status=Default", () => {
  const entries = buildCandidate("p5");
  const result = planStatusUpdate(entries, "p5-2", "Default");

  // Clicked row → Default.
  const clicked = result.find(r => r.id === "p5-2");
  assert.equal(clicked.status, "Default");
  assert.equal(clicked.sheetScope, "defaulter");
  assert.equal(clicked.paid, 0);
  assert.equal(clicked.due, 1000);

  // Other Pending rows for the same candidate are swept to the
  // defaulter sheet with status=Default.
  for (const id of ["p5-1"]) {
    const row = result.find(r => r.id === id);
    assert.equal(row.status, "Default", `${id} status should become Default`);
    assert.equal(row.sheetScope, "defaulter", `${id} sheetScope should be defaulter`);
  }
  /* Note: p5-2 itself was clicked, so it's the only one in the
     fixture with a "Pending" sibling at p5-1 (p5-3 is Received and
     p5-4 is Move, both untouched). */

  // Received and Move rows for the same candidate are untouched.
  for (const id of ["p5-3", "p5-4"]) {
    const row = result.find(r => r.id === id);
    assert.equal(row, entries.find(r => r.id === id),
      `${id} should be untouched (reference-equal)`);
  }

  // Different candidate untouched.
  const sam = result.find(r => r.id === "p5-5");
  assert.equal(sam, entries.find(r => r.id === "p5-5"));
});

test("Default → Pending on a single swept row only moves that row back to payment; other defaulter-sheet rows stay put", () => {
  /* Two rows on the defaulter sheet (swept earlier with status
     "Default"), one Pending row on payment. Click a defaulter-sheet
     row and flip it to Pending. */
  const entries = [
    { id: "d-1", candidate: "Alex", status: "Default", sheetScope: "defaulter", amount: 1000, paid: 0,    due: 1000, poDate: "01-01-2026" }, // ← clicked
    { id: "d-2", candidate: "Alex", status: "Default", sheetScope: "defaulter", amount: 1000, paid: 0,    due: 1000, poDate: "02-01-2026" }, // swept before
    { id: "d-3", candidate: "Alex", status: "Pending", sheetScope: "payment",  amount: 1000, paid: 0,    due: 1000, poDate: "03-01-2026" },
  ];
  const result = planStatusUpdate(entries, "d-1", "Pending");

  // Clicked row → Pending on payment sheet.
  const clicked = result.find(r => r.id === "d-1");
  assert.equal(clicked.status, "Pending");
  assert.equal(clicked.sheetScope, "payment");
  assert.equal(clicked.paid, 0);
  assert.equal(clicked.due, 1000);

  // Other defaulter-sheet row stays put.
  const sweptRow = result.find(r => r.id === "d-2");
  assert.equal(sweptRow, entries.find(r => r.id === "d-2"),
    "non-clicked defaulter row should be untouched (reference-equal)");

  // Pending payment row is unchanged.
  const pendingRow = result.find(r => r.id === "d-3");
  assert.equal(pendingRow, entries.find(r => r.id === "d-3"));
});

test("Default → Received on a single swept row only moves that row back to payment", () => {
  const entries = [
    { id: "e-1", candidate: "Alex", status: "Default", sheetScope: "defaulter", amount: 1000, paid: 0,    due: 1000, poDate: "01-01-2026" }, // ← clicked
    { id: "e-2", candidate: "Alex", status: "Default", sheetScope: "defaulter", amount: 1000, paid: 0,    due: 1000, poDate: "02-01-2026" },
  ];
  const result = planStatusUpdate(entries, "e-1", "Received");

  // Clicked row → Received on payment sheet.
  const clicked = result.find(r => r.id === "e-1");
  assert.equal(clicked.status, "Received");
  assert.equal(clicked.sheetScope, "payment");
  assert.equal(clicked.paid, 1000);
  assert.equal(clicked.due, 0);

  // Other defaulter-sheet row stays put.
  const sweptRow = result.find(r => r.id === "e-2");
  assert.equal(sweptRow, entries.find(r => r.id === "e-2"));
});

test("Pending → Move on one row only changes that single row", () => {
  const entries = buildCandidate("p6");
  const result = planStatusUpdate(entries, "p6-1", "Move");

  const clicked = result.find(r => r.id === "p6-1");
  assert.equal(clicked.status, "Move");

  const changed = result.filter((r, i) => r !== entries[i]);
  assert.equal(changed.length, 1, "exactly one row should change");
});

test("Unknown id returns the input list unchanged", () => {
  const entries = buildCandidate("p7");
  const result = planStatusUpdate(entries, "does-not-exist", "Laid Off");
  assert.equal(result, entries);
});

test("Candidate-name matching is case-insensitive", () => {
  const entries = [
    { id: "a", candidate: "Alex Patel", status: "Pending", sheetScope: "payment", amount: 100, paid: 0, due: 100, poDate: "01-01-2026" },
    { id: "b", candidate: "alex patel", status: "Pending", sheetScope: "payment", amount: 100, paid: 0, due: 100, poDate: "02-01-2026" },
  ];
  const result = planStatusUpdate(entries, "a", "Laid Off");
  assert.equal(result.find(r => r.id === "a").status, "Laid Off");
  assert.equal(result.find(r => r.id === "a").sheetScope, "laidoff");
  /* Swept sibling: same candidate, gets status=Laid Off (the
     terminator) so the Laid Off filter on the Laid Off page picks
     it up. */
  assert.equal(result.find(r => r.id === "b").status, "Laid Off");
  assert.equal(result.find(r => r.id === "b").sheetScope, "laidoff");
});

test("Laid Off cascade preserves the user's chosen terminal status (Offer Revoke, No Offer, …) on swept rows", () => {
  /* When the user picks a non-Laid-Off terminal status on the clicked
     row, swept rows take that same terminal status — so they surface
     under that status's filter on the Laid Off page. */
  const entries = [
    { id: "t-1", candidate: "Alex", status: "Pending", sheetScope: "payment", amount: 1000, paid: 0, due: 1000, poDate: "01-01-2026" },
    { id: "t-2", candidate: "Alex", status: "Pending", sheetScope: "payment", amount: 1000, paid: 0, due: 1000, poDate: "02-01-2026" },
  ];
  const result = planStatusUpdate(entries, "t-1", "Offer Revoke");
  const clicked = result.find(r => r.id === "t-1");
  const swept   = result.find(r => r.id === "t-2");
  assert.equal(clicked.status, "Offer Revoke");
  assert.equal(clicked.sheetScope, "laidoff");
  assert.equal(swept.status, "Offer Revoke", "swept row inherits the terminal status");
  assert.equal(swept.sheetScope, "laidoff");
});