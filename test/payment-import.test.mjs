import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizePaymentImportAmounts } from "../lib/payment-import-utils.js";
import { normalizePaymentStatus } from "../lib/status-utils.js";

test("received status misspellings normalize to Received", () => {
  for (const input of ["Received", "received", "receved", "recieved", "recievend"]) {
    assert.equal(normalizePaymentStatus(input), "Received");
  }
});

test("received pasted rows count full amount as paid when paid column is missing", () => {
  assert.deepEqual(
    normalizePaymentImportAmounts({ amount: 918, paid: 0, due: 0, status: "Received" }),
    { paid: 918, due: 0 }
  );
});

test("pending pasted rows keep full amount outstanding when due column is missing", () => {
  assert.deepEqual(
    normalizePaymentImportAmounts({ amount: 918, paid: 0, due: 0, status: "Pending" }),
    { paid: 0, due: 918 }
  );
});
