import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { canonicalSerialize, generateWave03ImmutableReleaseRepair } from "./generate";

describe("Wave-03 immutable release repair", () => {
  it("locks canonical object ordering while preserving array ordering", () => {
    const fixture = { z: 2, a: { y: 1, b: [3, { d: 4, c: 5 }] } };
    const bytes = canonicalSerialize(fixture);
    expect(bytes).toBe('{"a":{"b":[3,{"c":5,"d":4}],"y":1},"z":2}');
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("6bd844f8a7fc09dcce49ed3a92b71b3ceebd5abda02f6fa2c096ae348fb1d6e6");
  });
  it("deterministically materializes three loader-compatible inactive products", async () => {
    const first = await generateWave03ImmutableReleaseRepair(), second = await generateWave03ImmutableReleaseRepair();
    expect(second).toEqual(first);
    expect(first.release).toMatchObject({ lifecycle: "IMMUTABLE_INACTIVE_NOT_AUTHORIZED", totals: { before: 102, additions: 3, after: 105 }, readiness: { INFORMATION_READY: true, P_READY: false, Y_READY: false }, compatibility: { unifiedLoaderDryRun: "PASS" } });
    expect(first.release.products).toHaveLength(3);
    expect(new Set(first.release.products.map((row: { exactProductId: string }) => row.exactProductId)).size).toBe(3);
    expect(first.preflight).toMatchObject({ status: "OWNER_REVIEW_ELIGIBLE_NOT_AUTHORIZED", gates: { materializedReleaseReread: true, payloadDigestVerified: true, fileDigestVerified: true, exactRecordMembershipVerified: true }, activation: { authorized: false, executed: false }, mutationBoundary: { pointer: false, runtime: false, database: false, production: false, preview: false, deployment: false, push: false } });
    expect(first.supersession.prohibited).toMatchObject({ preflightDigest: "51f64a2b795568941a1e5f0d995b976d639349dadd81585e3f11f35691d9361b", declaredReleaseDigest: "a92a918cdbb2e8f3d2f5607b0d7fe8a67b0422b17aeadec9eb7d68e65b4dcf72" });
  });

  it("keeps the active pointer byte-identical", async () => {
    const before = await readFile("data/production/catalog-factory/active.json");
    await generateWave03ImmutableReleaseRepair();
    expect(await readFile("data/production/catalog-factory/active.json")).toEqual(before);
  });
});
