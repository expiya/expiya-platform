import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateVehiclePersonaSafeTraitRelease, vehiclePersonaSafeTraitManifestSchema, vehiclePersonaSafeTraitPointerSchema, vehiclePersonaSafeTraitReleaseSchema } from "./vehiclePersonaSafeTraits";

const root = process.cwd();
const base = path.join(root, "data/production/personas");
const eventRoot = path.join(base, "evidence/activation-events/PERSONA-V39-LOCAL-ACTIVATION-2026-08-24-01");
const pointerRaw = readFileSync(path.join(base, "safe-traits/active.json"), "utf8");
const pointer = vehiclePersonaSafeTraitPointerSchema.parse(JSON.parse(pointerRaw));
const releaseRoot = path.join(base, "safe-traits/releases", pointer.activeReleaseVersion);
const payloadRaw = readFileSync(path.join(releaseRoot, "vehicle-persona-safe-traits.json"), "utf8");
const payload = vehiclePersonaSafeTraitReleaseSchema.parse(JSON.parse(payloadRaw));
const manifest = vehiclePersonaSafeTraitManifestSchema.parse(JSON.parse(readFileSync(path.join(releaseRoot, "manifest.json"), "utf8")));
const event = JSON.parse(readFileSync(path.join(eventRoot, "activation-event.json"), "utf8"));
const result = JSON.parse(readFileSync(path.join(eventRoot, "activation-result.json"), "utf8"));
const postValidation = JSON.parse(readFileSync(path.join(eventRoot, "post-validation.json"), "utf8"));

describe("persona V3.9 local activation", () => {
  it("records the exact explicit authorization and append-only event", () => {
    expect(event.approvalStatement).toBe("PERSONA-V39-ACTIVATION-PREP-2026-08-24-01 paketinin lokal active pointer aktivasyonunu onaylıyorum.");
    expect(event.actor.role).toBe("PRODUCT_OWNER");
    expect(event.appendOnly).toBe(true);
    expect(event.databaseWriteAuthorized).toBe(false);
    expect(event.deploymentAuthorized).toBe(false);
  });

  it("activates the checksum-bound V3.9 safe-traits release", () => {
    expect(pointer.activeReleaseVersion).toBe("v1.1.0-persona-evidence-v3.9-catalog-v0.55.4-2026-08-24");
    expect(pointer.payloadSha256).toBe(`sha256:${createHash("sha256").update(payloadRaw).digest("hex")}`);
    expect(payload.families).toHaveLength(385);
    expect(payload.variants).toHaveLength(549);
    expect(payload.families.reduce((count, family) => count + family.traits.length, 0)).toBe(595);
  });

  it("passes release validation against exact family and variant coverage", () => {
    const families = payload.families.map((family) => ({ familyId: family.familyId, variantIds: payload.variants.filter((variant) => variant.familyId === family.familyId).map((variant) => variant.exactVariantId) }));
    expect(validateVehiclePersonaSafeTraitRelease({ release: payload, manifest, pointer, rawPayload: payloadRaw, catalogRelease: pointer.compatibleCatalogRelease, catalogFingerprint: pointer.compatibleCatalogFingerprint, catalogVariantIds: payload.variants.map((variant) => variant.exactVariantId), catalogFamilies: families })).toEqual([]);
  });

  it("post-validates without rollback and preserves bounded authority", () => {
    expect(result).toMatchObject({ status: "ACTIVATED_AND_POST_VALIDATED", rollbackPerformed: false, databaseWrite: false, deployment: false, commit: false, push: false });
    expect(postValidation).toMatchObject({ status: "PASSED", familyCount: 385, variantCount: 549, approvedTraitCount: 595, scoreCap: 0.75, invariants: { hardFilterEffect: "ZERO", candidateCountEffect: "ZERO", affordabilityEffect: "ZERO", offerGovernanceEffect: "ZERO", technicalFactAuthority: "NONE", equipmentAuthority: "NONE" } });
    expect(existsSync(path.join(eventRoot, "rollback-result.json"))).toBe(false);
  });
});
