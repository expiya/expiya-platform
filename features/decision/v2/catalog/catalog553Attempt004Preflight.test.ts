import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read = (file: string) => JSON.parse(readFileSync(file, "utf8")) as unknown;

describe("Catalog 0.55.3 attempt-004 real schema preflight", () => {
  it("preserves the historical failed production-loader simulation", () => {
    expect(read("data/production/catalog/release-candidates/v0.55.3/activation-dry-run-attempt-004/runtime-simulation-result.json")).toMatchObject({ status: "FAILED_FAIL_CLOSED", activationReady: false });
    expect(read("data/production/catalog/release-candidates/v0.55.3/activation-dry-run-attempt-004/atomic-activation-plan.json")).toMatchObject({ status: "BLOCKED_CATALOG_RUNTIME_TIMESTAMP_SCHEMA", activationPerformed: false });
  });
});
