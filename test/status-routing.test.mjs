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
