import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateVehiclePersonaSafeTraitRelease, vehiclePersonaSafeTraitManifestSchema, vehiclePersonaSafeTraitReleaseSchema } from "./vehiclePersonaSafeTraits";

const root = process.cwd();
const releaseVersion = "v1.1.0-persona-evidence-v3.9-catalog-v0.55.4-2026-08-24";
const releaseRoot = path.join(root, "data/production/personas/safe-traits/release-candidates", releaseVersion);
const payloadRaw = readFileSync(path.join(releaseRoot, "vehicle-persona-safe-traits.json"), "utf8");
const payload = vehiclePersonaSafeTraitReleaseSchema.parse(JSON.parse(payloadRaw));
const manifest = vehiclePersonaSafeTraitManifestSchema.parse(JSON.parse(readFileSync(path.join(releaseRoot, "manifest.json"), "utf8")));
const packageRoot = path.join(root, "data/production/personas/evidence/activation-preparations/PERSONA-V39-ACTIVATION-PREP-2026-08-24-01");
const request = JSON.parse(readFileSync(path.join(packageRoot, "activation-request.json"), "utf8"));
const rollbackPlan = JSON.parse(readFileSync(path.join(packageRoot, "rollback-plan.json"), "utf8"));

describe("persona V3.9 activation preparation", () => {
  it("materializes the 595 approved claims over full exact catalog coverage", () => {
    expect(payload.families).toHaveLength(385);
    expect(payload.variants).toHaveLength(549);
    expect(payload.families.reduce((count, family) => count + family.traits.length, 0)).toBe(595);
    expect(new Set(payload.variants.map((variant) => variant.exactVariantId)).size).toBe(549);
    expect(payload.approval?.reference).toBe("PERSONA-V39-OWNER-APPROVAL-2026-08-24-01");
  });

  it("excludes all five rejected claims", () => {
    const traits = new Map(payload.families.map((family) => [`${family.canonicalBrand} ${family.canonicalModel}`, family.traits]));
    expect(traits.get("DS Automobiles N°4")).not.toContain("COMFORT");
    expect(traits.get("DS Automobiles N°4")).not.toContain("PRESTIGE");
    expect(traits.get("Kia Stonic")).not.toContain("PRESTIGE");
    expect(traits.get("Dacia Logan")).not.toContain("ADVENTURE");
    expect(traits.get("Land Rover Range Rover")).not.toContain("TECHNOLOGY");
  });

  it("passes the safe-traits schema and catalog coverage validator", () => {
    const families = payload.families.map((family) => ({ familyId: family.familyId, variantIds: payload.variants.filter((variant) => variant.familyId === family.familyId).map((variant) => variant.exactVariantId) }));
    expect(validateVehiclePersonaSafeTraitRelease({ release: payload, manifest, rawPayload: payloadRaw, catalogRelease: "v0.55.4", catalogFingerprint: payload.compatibleCatalogFingerprint, catalogVariantIds: payload.variants.map((variant) => variant.exactVariantId), catalogFamilies: families })).toEqual([]);
    expect(manifest.payloadSha256).toBe(`sha256:${createHash("sha256").update(payloadRaw).digest("hex")}`);
  });

  it("keeps activation and all non-ranking authorities disabled", () => {
    expect(request).toMatchObject({ status: "AWAITING_EXPLICIT_OWNER_ACTIVATION_AUTHORIZATION", activationAuthorized: false, activationPerformed: false, invariants: { hardFilterEffect: "ZERO", candidateCountEffect: "ZERO", affordabilityEffect: "ZERO", offerGovernanceEffect: "ZERO", technicalFactAuthority: "NONE", equipmentAuthority: "NONE" } });
    expect(request.rankingPolicy.personaScoreCap).toBe(0.75);
    expect(rollbackPlan.rollbackReleaseVersion).toBe("v1.0.6-catalog-v0.55.4-2026-08-20");
    expect(rollbackPlan.rollbackOnPostValidationFailure).toBe(true);
  });
});
