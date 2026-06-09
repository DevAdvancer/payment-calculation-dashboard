import assert from "node:assert/strict";
import { test } from "node:test";
import { EntrySchema } from "../lib/schemas.js";
import { normalizeCompanyName } from "../lib/company-utils.js";

test("VCS company aliases normalize to Vizva Inc", () => {
  for (const input of ["VCS", "vcs", " V C S ", "Vizva", "Vizva Inc"]) {
    assert.equal(normalizeCompanyName(input), "Vizva Inc");
  }
});

test("entry schema normalizes company names for every entry source", () => {
  const parsed = EntrySchema.parse({
    id: "company-normalization",
    candidate: "Test Candidate",
    company: "VCS",
  });

  assert.equal(parsed.company, "Vizva Inc");
});
