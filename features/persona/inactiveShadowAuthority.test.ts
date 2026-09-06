import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const directory = path.join(
  process.cwd(),
  "data/production/personas/universal/projection-materialization/XPY-UNIVERSAL-PERSONA-PROJECTION-TR-v0.1-owner-review/governance",
);
const read = <T>(file: string): T => JSON.parse(readFileSync(path.join(directory, file), "utf8"));
const rawSha = (file: string) =>
  `sha256:${createHash("sha256").update(readFileSync(path.join(directory, file), "utf8")).digest("hex")}`;

describe("inactive universal Persona shadow authority", () => {
  it("records the exact approval without granting runtime or pointer authority", () => {
    const event = read<Record<string, unknown>>("owner-approval/owner-approval-event.json");
    expect(event).toMatchObject({
      approvedPackageDigest: "sha256:62d2d5f23cb92b337052fdb0e3eb16c8b96126e3bc156fa16ebaac11be03f4aa",
      authority: "INACTIVE_BINDING_AND_SHADOW_ORDERING_ONLY",
      runtimeConsumptionAuthorized: false,
      activePointerMutationAuthorized: false,
      deploymentAuthorized: false,
    });
  });

  it("materializes all bindings only in shadow and preserves runtime semantics", () => {
    const event = read<Record<string, unknown>>("shadow-activation/shadow-authority-event.json");
    expect(event).toMatchObject({
      state: "MATERIALIZED_INACTIVE_SHADOW_ONLY",
      records: { total: 169, governed: 4, unknownNeutral: 165, conflicted: 0 },
      categoryBindings: { total: 49, usableInShadow: 4, failClosedLocally: 45 },
      runtimeConsumption: "UNCHANGED_DISABLED",
      rankingMutation: false,
      membershipMutation: false,
      technicalEligibilityMutation: false,
      sufficiencyMutation: false,
      standaloneSelectionAuthority: false,
      carsV39Mutation: false,
      activePointerMutation: false,
      deploymentPerformed: false,
    });
  });

  it("verifies the no-op rollback and immutable governance artifact digests", () => {
    const rollback = read<Record<string, unknown>>("shadow-activation/rollback-verification.json");
    expect(rollback).toMatchObject({
      mutableRuntimeStateChanged: false,
      rollbackRequiredNow: false,
      activePointersMatchPreExecutionSnapshot: true,
      carsV39MatchesPreExecutionSnapshot: true,
      runtimeRegistrationMatchesPreExecutionSnapshot: true,
      immutableEvidenceRetained: true,
    });
    const manifest = read<Record<string, string>>("manifest.json");
    expect(rawSha("owner-approval/owner-approval-event.json")).toBe(manifest.approvalEventSha256);
    expect(rawSha("shadow-activation/shadow-authority-event.json")).toBe(manifest.shadowEventSha256);
    expect(rawSha("shadow-activation/plan-execution.json")).toBe(manifest.planExecutionSha256);
    expect(rawSha("shadow-activation/rollback-verification.json")).toBe(manifest.rollbackVerificationSha256);
  });
});
