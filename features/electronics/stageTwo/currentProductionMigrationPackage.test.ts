import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ELECTRONICS_CATEGORY_IDS } from "../architectureBaseline";
import { ELECTRONICS_STAGE_TWO_COMPARISON_SCHEMAS } from "./handoffAuthorityCandidate";

const directory = "data/research/electronics/stage2-current-production-migration-package-01";
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

describe("Electronics current-production migration package", () => {
  it("binds the exact production base and makes the old package execution-ineligible", () => {
    const packageValue = JSON.parse(readFileSync(`${directory}/owner-review-package.json`, "utf8"));
    expect(packageValue.productionBase).toBe("7d4cce89094b53a1f0b536b40ede19ca6377cf74");
    expect(packageValue.authoritySourceCommit).toBe("f7b0ec71ee7d0cc0a6a1466bac46d235f06b4cb9");
    expect(packageValue.supersedes).toEqual(expect.objectContaining({ packageDigest: "sha256:ac684b0970c3ec1098cabcdb1dd09f650c6fae26d4c61b6a32214752a5f94abc", executionEligibility: "SUPERSEDED_INELIGIBLE" }));
  });

  it("binds every artifact and canonical package digest", () => {
    const packageValue = JSON.parse(readFileSync(`${directory}/owner-review-package.json`, "utf8"));
    for (const [path, digest] of Object.entries(packageValue.artifactSha256)) expect(sha256(readFileSync(path, "utf8"))).toBe(digest);
    const { packageDigest, ...payload } = packageValue;
    expect(packageDigest).toBe(`sha256:${sha256(JSON.stringify(canonical(payload)))}`);
    expect(readFileSync(`${directory}/approval-sentence.txt`, "utf8")).toContain(packageDigest);
  });

  it("covers exactly 24 category-owned schemas and remains inactive", () => {
    const readiness = JSON.parse(readFileSync(`${directory}/activation-readiness.json`, "utf8"));
    expect(ELECTRONICS_CATEGORY_IDS).toHaveLength(24);
    expect(Object.keys(ELECTRONICS_STAGE_TWO_COMPARISON_SCHEMAS)).toHaveLength(24);
    expect(readiness).toMatchObject({ state: "PREPARED_NOT_AUTHORIZED", categoryCount: 24, registration: { sharedAdapterOnly: true, runtimeRegistered: false }, comparison: { categoryOwnedRowsOnly: true, crossCategory: false } });
    expect(readiness.forbidden).toEqual(["STAGE_THREE", "SALES", "PAYMENT"]);
  });

  it("records truthful read-only production counts and no secret values", () => {
    const proof = JSON.parse(readFileSync(`${directory}/dry-run-proof.json`, "utf8"));
    const keyPlan = readFileSync(`${directory}/key-readiness-plan.json`, "utf8");
    expect(proof).toMatchObject({ status: "PASS_READ_ONLY", transactionReadOnly: true, databaseRead: true, databaseWrite: false, migrationApplied: false, rowCounts: { electronics_conversations: 167, comparison_entitlements: 0, comparison_entitlement_events: 0 } });
    expect(keyPlan).not.toMatch(/postgres(?:ql)?:\/\/|password|secret[_-]?key/iu);
    expect(JSON.parse(keyPlan)).toMatchObject({ secretValuesPresentInPackage: false, environmentMutationAuthorized: false });
  });
});
