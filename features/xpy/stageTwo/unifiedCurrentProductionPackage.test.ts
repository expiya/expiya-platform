import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const directory = "data/research/xpy/stage2-unified-current-production-integration-activation-01";
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

describe("unified current-production Stage Two package", () => {
  it("binds its children and canonical digest", () => {
    const packageValue = JSON.parse(readFileSync(path.join(directory, "package.json"), "utf8"));
    for (const [file, expected] of Object.entries(packageValue.artifactSha256)) expect(digest(readFileSync(path.join(directory, file), "utf8"))).toBe(expected);
    const { packageDigest, ...payload } = packageValue;
    expect(packageDigest).toBe(`sha256:${digest(JSON.stringify(canonical(payload)))}`);
  });

  it("has one root blocker and no executable authorization", () => {
    const packageValue = JSON.parse(readFileSync(path.join(directory, "package.json"), "utf8"));
    const blocker = JSON.parse(readFileSync(path.join(directory, "root-blocker.json"), "utf8"));
    expect(packageValue).toMatchObject({ verdict: "BLOCKED", rootBlocker: blocker.code, executionEligible: false, authorizationSentenceEligible: false });
    expect(packageValue.historicalApprovalInput.status).toBe("SUPERSEDED_BY_SOURCE_CHANGE_NOT_EXECUTABLE");
    expect(blocker.mutationsPerformed).toEqual({ migrationApply: false, secretOrEnvironment: false, adapterActivation: false, push: false, preview: false, deployment: false });
  });

  it("preserves 25 ready surfaces and all unsupported surfaces fail closed", () => {
    const readiness = JSON.parse(readFileSync(path.join(directory, "readiness.json"), "utf8"));
    expect(readiness).toMatchObject({ categoryCount: 54, exactOfferingCount: 813, authorizedExistingRuntime: { count: 25 }, electronics: { count: 24, adapterRegistered: false, readiness: "MISSING_STAGE_TWO_AUTHORITY" }, remainingFailClosed: { count: 5 } });
  });
});
