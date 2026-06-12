import assert from "node:assert/strict";
import { test } from "node:test";
import { isPoDetailsEntry } from "../lib/po-details-utils.js";

test("PO Details includes explicitly scoped PO rows", () => {
  assert.equal(
    isPoDetailsEntry({
      sheetScope: "po-details",
      candidate: "Scoped Candidate",
    }),
    true
  );
});

test("PO Details includes generated placement installments without PO scope", () => {
  const base = {
    candidate: "Generated Candidate",
    type: "12% in 4 months",
    status: "Pending",
  };

  assert.equal(isPoDetailsEntry({ ...base, serviceType: "Placement", notes: "Non Upfront" }), true);
  assert.equal(isPoDetailsEntry({ ...base, serviceType: "Payment Collection", notes: "Installment 1" }), true);
  assert.equal(isPoDetailsEntry({ ...base, serviceType: "Placement", notes: "$500 (NR)" }), true);
});

test("PO Details excludes unrelated one-off payment rows", () => {
  assert.equal(
    isPoDetailsEntry({
      sheetScope: "payment",
      candidate: "One Off",
      serviceType: "Placement",
      type: "",
      notes: "",
    }),
    false
  );

  assert.equal(
    isPoDetailsEntry({
      candidate: "Manual Payment",
      serviceType: "Consulting",
      type: "12% in 4 months",
      notes: "Retainer",
    }),
    false
  );
});
