import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { activePointerSchema, catalogManifestSchema, catalogPayloadSchema } from "../schema/catalogReleaseSchemas";
import { validateCatalogTemporalInvariant } from "../schema/strictRfc3339Timestamp";

const read = <T>(file: string) => JSON.parse(readFileSync(file, "utf8")) as T;
describe("Catalog 0.55.3 attempt-005 strict offset preflight", () => {
  const pointer = read<{ activated_at: string }>("data/production/catalog/release-candidates/v0.55.3/activation-dry-run-attempt-005/proposed-pointers/catalog.json");
  const manifest = read<{ staging: { at: string }; approval: { at: string }; effective_as_of: string }>("data/production/catalog/releases/v0.55.3/manifest.json");
  it("accepts immutable offset timestamp artifact schemas", () => {
    expect(activePointerSchema.safeParse(pointer).success).toBe(true);
    expect(catalogManifestSchema.safeParse(manifest).success).toBe(true);
    expect(catalogPayloadSchema.safeParse(read("data/production/catalog/releases/v0.55.3/catalog.json")).success).toBe(true);
  });
  it("fails closed on the real instant ordering violation", () => expect(validateCatalogTemporalInvariant({ stagingAt: manifest.staging.at, approvalAt: manifest.approval.at, effectiveAt: manifest.effective_as_of, activatedAt: pointer.activated_at, evaluationAt: "2026-08-20T19:00:00+03:00" })).toContain("TEMPORAL_INVARIANT_VIOLATION"));
  it("records runtime simulation failure rather than activation readiness", () => {
    expect(read<{ status: string }>("data/production/catalog/release-candidates/v0.55.3/activation-dry-run-attempt-005/atomic-activation-plan.json").status).toBe("BLOCKED_CATALOG_TEMPORAL_INVARIANT");
  });
});
