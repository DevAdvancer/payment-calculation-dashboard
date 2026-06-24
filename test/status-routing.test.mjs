import assert from "node:assert/strict";
import { test } from "node:test";
import { EntrySchema } from "../lib/schemas.js";
import {
  routeBucketForEntry,
  normalizePaymentStatus,
  normalizeSpecialSheetStatus,
  scopeForStatusUpdate,
} from "../lib/status-utils.js";

const baseEntry = {
  id: "status-test",
  candidate: "Test Candidate",
  amount: 1000,
};

test("entry schema accepts every status exposed by status controls", () => {
  for (const status of [
    "Received",
    "Pending",
    "Laid Off",
    "Offer Revoke",
    "No Offer",
    "Resigned",
    "Contract End",
    "BGV Fail",
    "Default",
  ]) {
    assert.equal(
      EntrySchema.safeParse({ ...baseEntry, status }).success,
      true,
      `${status} should be accepted`
    );
  }
});

test("spreadsheet status aliases normalize to app statuses", () => {
  assert.equal(normalizePaymentStatus("recievend"), "Received");
  assert.equal(normalizePaymentStatus("paid"), "Received");
  assert.equal(normalizePaymentStatus("bgv fail"), "BGV Fail");
  assert.equal(normalizePaymentStatus("contract end"), "Contract End");
  assert.equal(normalizeSpecialSheetStatus("resigned", true), "Resigned");
  assert.equal(normalizeSpecialSheetStatus("bgv failed", true), "BGV Fail");
  assert.equal(normalizeSpecialSheetStatus("defaulter", false), "Default");
});

test("status changes route entries to the correct page bucket", () => {
  assert.equal(scopeForStatusUpdate("payment", "Received"), "payment");
  assert.equal(scopeForStatusUpdate("payment", "Pending"), "payment");
  assert.equal(scopeForStatusUpdate("payment", "BGV Fail"), "laidoff");
  assert.equal(scopeForStatusUpdate("laidoff", "Received"), "payment");
  assert.equal(scopeForStatusUpdate("", "Received"), "payment");
  assert.equal(scopeForStatusUpdate(null, "Default"), "defaulter");
  assert.equal(scopeForStatusUpdate("po-details", "Pending"), "po-details");

  assert.equal(routeBucketForEntry({ status: "Default" }), "defaulter");
  assert.equal(routeBucketForEntry({ status: "Pending" }), "payment");
  assert.equal(routeBucketForEntry({ status: "Received" }), "payment");
  assert.equal(routeBucketForEntry({ status: "Contract End" }), "laidoff");
  assert.equal(routeBucketForEntry({ status: "BGV Fail" }), "laidoff");
  assert.equal(routeBucketForEntry({ status: "Pending", sheetScope: "po-details" }), "po-details");
});

test("routeBucketForEntry respects sheetScope over status", () => {
  /* When the cascade sweeps a Pending row onto the Laid Off page,
     sheetScope becomes "laidoff" but status stays "Pending". The
     row must surface on the Laid Off page, not the Payment page. */
  assert.equal(
    routeBucketForEntry({ status: "Pending", sheetScope: "laidoff" }),
    "laidoff",
    "Pending row with sheetScope=laidoff must route to the laidoff bucket"
  );
  assert.equal(
    routeBucketForEntry({ status: "Received", sheetScope: "laidoff" }),
    "laidoff",
    "Received row with sheetScope=laidoff must route to the laidoff bucket"
  );
  assert.equal(
    routeBucketForEntry({ status: "Move", sheetScope: "laidoff" }),
    "laidoff",
    "Move row with sheetScope=laidoff must route to the laidoff bucket"
  );
  /* Same idea for the defaulter bucket. */
  assert.equal(
    routeBucketForEntry({ status: "Default", sheetScope: "defaulter" }),
    "defaulter"
  );
  assert.equal(
    routeBucketForEntry({ status: "Pending", sheetScope: "defaulter" }),
    "defaulter"
  );
  /* PO details always wins (it pins rows to the PO Details page). */
  assert.equal(
    routeBucketForEntry({ status: "Pending", sheetScope: "po-details" }),
    "po-details"
  );
});

test("planStatusUpdate + routeBucketForEntry end-to-end: Oct Laid Off sweeps Aug+Sep onto the laidoff bucket", async () => {
  const { planStatusUpdate } = await import("../lib/status-cascade.js");
  const entries = [
    { id: "aug", candidate: "John", status: "Pending", sheetScope: "payment", amount: 1000, paid: 0, due: 1000, poDate: "08-01-2026" },
    { id: "sep", candidate: "John", status: "Pending", sheetScope: "payment", amount: 1000, paid: 0, due: 1000, poDate: "09-01-2026" },
    { id: "oct", candidate: "John", status: "Pending", sheetScope: "payment", amount: 1000, paid: 0, due: 1000, poDate: "10-01-2026" },
  ];
  const result = planStatusUpdate(entries, "oct", "Laid Off");

  /* The clicked row's status becomes "Laid Off". */
  const oct = result.find(e => e.id === "oct");
  assert.equal(oct.status, "Laid Off");
  assert.equal(oct.sheetScope, "laidoff");
  assert.equal(routeBucketForEntry(oct), "laidoff");

  /* The other Pending rows move to the laidoff sheet AND their
     status becomes "Laid Off" (the terminator), so they surface
     under the "Laid Off" filter on the Laid Off page. */
  for (const id of ["aug", "sep"]) {
    const row = result.find(e => e.id === id);
    assert.equal(row.status, "Laid Off", `${id} status should become Laid Off`);
    assert.equal(row.sheetScope, "laidoff", `${id} sheetScope should be laidoff`);
    assert.equal(routeBucketForEntry(row), "laidoff",
      `${id} should route to the laidoff bucket`);
  }
});
