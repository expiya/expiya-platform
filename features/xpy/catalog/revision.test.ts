import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  bindCatalogRevision,
  createCatalogRevisionManifest,
  determineCatalogRevisionImpact,
  revalidateCatalogBoundArtifact,
  validateCatalogRevisionManifest,
  validateCatalogVolatileSnapshotBinding,
  XPY_REVISION_ARTIFACTS,
  type CatalogRevisionManifest,
} from "./revision";
import { dryRunCarsCatalogRevision, loadAllActiveAppliancesCatalogRevisions, loadCarsCatalogRevision } from "./revisionAdapters.server";

const root = path.resolve(process.cwd());

function revise(manifest: CatalogRevisionManifest, change: Partial<Pick<CatalogRevisionManifest, "release" | "compatibility">>): CatalogRevisionManifest {
  return createCatalogRevisionManifest({
    release: change.release ?? manifest.release,
    scope: manifest.scope,
    compatibility: change.compatibility ?? manifest.compatibility,
    authority: manifest.authority,
    members: manifest.members,
  });
}

describe("XPY catalog revision lifecycle", () => {
  it("adapts the active Cars release through its existing validator", async () => {
    const manifest = await loadCarsCatalogRevision(root, "0.55.4");
    expect(manifest).toMatchObject({ scope: { departmentId: "CARS", categoryId: "NEW_CAR", market: "TR" }, release: { version: "0.55.4", memberCount: 549 }, authority: { domainValidatorId: "cars-buildCatalogSnapshot/v0.1", domainValidationStatus: "PASS" } });
    expect(validateCatalogRevisionManifest(manifest)).toEqual([]);
    expect(new Set(manifest.members.map((member) => member.exactId)).size).toBe(549);
  });

  it("adapts all 24 active Appliances releases and the approved 113 products", async () => {
    const manifests = await loadAllActiveAppliancesCatalogRevisions(root);
    expect(manifests).toHaveLength(24);
    expect(manifests.reduce((total, manifest) => total + manifest.release.memberCount, 0)).toBe(113);
    expect(manifests.every((manifest) => manifest.scope.departmentId === "APPLIANCES" && validateCatalogRevisionManifest(manifest).length === 0)).toBe(true);
    expect(new Set(manifests.flatMap((manifest) => manifest.members.map((member) => member.exactId))).size).toBe(113);
  });

  it("keeps every XPY artifact valid when frozen release digests do not change", async () => {
    const current = await loadCarsCatalogRevision(root, "0.55.4");
    const alias = revise(current, { release: { ...current.release, version: "0.55.4-compatible-alias" } });
    const impact = determineCatalogRevisionImpact(current, alias);
    expect(impact.compatibility).toBe("UNCHANGED");
    expect(XPY_REVISION_ARTIFACTS.every((artifact) => impact.artifacts[artifact] === "REMAINS_VALID")).toBe(true);
  });

  it("preserves semantic context, recomputes X/P/Y derivations, and closes authorizations on compatible content change", async () => {
    const current = await loadCarsCatalogRevision(root, "0.55.4");
    const changed = revise(current, { release: { ...current.release, version: "0.55.5", digest: `sha256:${"a".repeat(64)}` } });
    const impact = determineCatalogRevisionImpact(current, changed);
    expect(impact).toMatchObject({
      compatibility: "COMPATIBLE_CONTENT_CHANGE",
      artifacts: {
        X_INFORMATIONAL_RESPONSE: "REMAINS_VALID",
        Y_VALIDATED_CONTEXT_FACTS: "REMAINS_VALID",
        Y_CANDIDATE_EVALUATION: "RECOMPUTE_REQUIRED",
        P_QUESTIONS: "RECOMPUTE_REQUIRED",
        Y_SUFFICIENCY: "RECOMPUTE_REQUIRED",
        Y_SELECTION: "RECOMPUTE_REQUIRED",
        Y_RECOMMENDATION: "RECOMPUTE_REQUIRED",
        Y_AUTHORIZATION: "FAIL_CLOSED",
        ASAMA_1_CARDS: "FAIL_CLOSED",
        ASAMA_2_ADVISOR: "FAIL_CLOSED",
        ASAMA_2_COMPARISON_ENTITLEMENTS: "FAIL_CLOSED",
        ASAMA_2_SIGNED_HANDOFFS: "FAIL_CLOSED",
        ASAMA_3_SIGNED_HANDOFFS: "FAIL_CLOSED",
        ASAMA_3_ACTIONS: "FAIL_CLOSED",
      },
    });
  });

  it("fails closed across all stages for runtime, Domain Pack, or semantic incompatibility", async () => {
    const current = await loadCarsCatalogRevision(root, "0.55.4");
    const incompatible = revise(current, { compatibility: { ...current.compatibility, semanticAuthorityDigest: `sha256:${"b".repeat(64)}` } });
    const impact = determineCatalogRevisionImpact(current, incompatible);
    expect(impact.compatibility).toBe("INCOMPATIBLE");
    expect(XPY_REVISION_ARTIFACTS.every((artifact) => impact.artifacts[artifact] === "FAIL_CLOSED")).toBe(true);
  });

  it("opens a prior bound release only as historical read-only and otherwise returns a human recovery state", async () => {
    const previous = await loadCarsCatalogRevision(root, "0.55.4");
    const current = revise(previous, { release: { ...previous.release, version: "0.55.5", digest: `sha256:${"c".repeat(64)}` } });
    const binding = bindCatalogRevision(previous, [previous.members[0].exactId]);
    expect(revalidateCatalogBoundArtifact({ artifact: "ASAMA_3_ACTIONS", binding, current, historical: [previous] })).toMatchObject({ status: "HISTORICAL_READ_ONLY", executable: false, releaseVersion: "0.55.4", recoveryMessage: expect.stringContaining("salt okunur") });
    expect(revalidateCatalogBoundArtifact({ artifact: "ASAMA_3_ACTIONS", binding, current })).toMatchObject({ status: "FAILED_CLOSED", executable: false, recoveryMessage: expect.stringContaining("yeni bir değerlendirme") });
  });

  it("keeps volatile price/media/offer data outside the frozen digest and rejects cross-revision exact joins", async () => {
    const current = await loadCarsCatalogRevision(root, "0.55.4");
    const exactId = current.members[0].exactId;
    const binding = { kind: "OFFER" as const, catalogReleaseVersion: current.release.version, catalogReleaseDigest: current.release.digest, membershipDigest: current.release.membershipDigest, exactIds: [exactId] };
    expect(validateCatalogVolatileSnapshotBinding(binding, current)).toEqual({ status: "VALID" });
    expect(validateCatalogVolatileSnapshotBinding({ ...binding, catalogReleaseVersion: "0.55.3" }, current)).toEqual({ status: "REJECTED", reason: "CATALOG_REVISION_MISMATCH" });
    expect(validateCatalogVolatileSnapshotBinding({ ...binding, exactIds: ["unknown"] }, current)).toEqual({ status: "REJECTED", reason: "EXACT_IDENTITY_MISMATCH" });
  });

  it("dry-runs without activation and requires an explicit operator selection", async () => {
    const report = await dryRunCarsCatalogRevision(root, "0.55.4");
    expect(report.validation.status).toBe("PASS");
    expect(report.impact.compatibility).toBe("UNCHANGED");
    expect(report.activationGate).toEqual({ status: "READY_FOR_EXPLICIT_OPERATOR_SELECTION", automaticActivation: false, activePointerMutated: false, reason: expect.stringContaining("explicit operator") });
  });
});
