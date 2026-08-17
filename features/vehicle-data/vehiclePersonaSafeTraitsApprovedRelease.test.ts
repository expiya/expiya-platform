import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import approvedPayload from "@/data/production/personas/safe-traits/releases/v1.0.1-catalog-v0.55.0-2026-08-16/vehicle-persona-safe-traits.json";
import approvedManifest from "@/data/production/personas/safe-traits/releases/v1.0.1-catalog-v0.55.0-2026-08-16/manifest.json";
import draftPayload from "@/data/production/personas/safe-traits/releases/v1.0.0-catalog-v0.55.0-2026-08-16/vehicle-persona-safe-traits.json";
import type { VehiclePersonaSafeTraitRelease } from "@/types/vehiclePersonaSafeTraits";
import { selectOwnerApprovedSafePersonaSignals, vehiclePersonaSafeTraitManifestSchema, vehiclePersonaSafeTraitPayloadHash, vehiclePersonaSafeTraitReleaseSchema } from "./vehiclePersonaSafeTraits";

const release = approvedPayload as VehiclePersonaSafeTraitRelease;
const draft = draftPayload as VehiclePersonaSafeTraitRelease;
describe("approved safe persona v1.0.1 release", () => {
  it("is schema-valid, checksum-valid and scoped to sanitized owner approval", async () => {
    expect(() => vehiclePersonaSafeTraitReleaseSchema.parse(release)).not.toThrow(); expect(() => vehiclePersonaSafeTraitManifestSchema.parse(approvedManifest)).not.toThrow();
    const raw = await readFile(path.join(process.cwd(), "data/production/personas/safe-traits/releases/v1.0.1-catalog-v0.55.0-2026-08-16/vehicle-persona-safe-traits.json"), "utf8");
    expect(vehiclePersonaSafeTraitPayloadHash(raw)).toBe(approvedManifest.payloadSha256);
    expect(release.approval).toMatchObject({ authority: "PRODUCT_OWNER", reference: "owner-approved-safe-persona-projection-v1.0.1", scope: "SANITIZED_PROJECTION_ONLY", approvedSourceRelease: "v1.0.0-catalog-v0.55.0-2026-08-16", sanitizationPolicyVersion: "1.0.0" });
  });
  it("has 397 approved decisions, 232 non-empty approvals and 165 keep-empty decisions", () => {
    expect(release.families).toHaveLength(397); expect(release.variants).toHaveLength(577);
    expect(release.families.filter((family) => family.ownerDecision === "APPROVE" && family.traits.length > 0)).toHaveLength(232);
    expect(release.families.filter((family) => family.ownerDecision === "KEEP_EMPTY" && family.traits.length === 0)).toHaveLength(165);
    expect(release.families.every((family) => family.reviewStatus === "OWNER_APPROVED")).toBe(true);
  });
  it("contains only owner-approved removals from the canonical draft", () => {
    const approvedById = new Map(release.families.map((family) => [family.familyId, family.traits]));
    const removed = draft.families.reduce((sum, family) => sum + family.traits.filter((trait) => !approvedById.get(family.familyId)?.includes(trait)).length, 0);
    const added = release.families.reduce((sum, family) => sum + family.traits.filter((trait) => !draft.families.find((item) => item.familyId === family.familyId)?.traits.includes(trait)).length, 0);
    expect(removed).toBe(29); expect(added).toBe(0);
  });
  it("keeps T-Cross and Model Y free of COMMERCIAL regression", () => {
    for (const [brand, model] of [["Volkswagen", "T-Cross"], ["Tesla", "Model Y"]]) expect(release.families.find((family) => family.canonicalBrand === brand && family.canonicalModel === model)?.traits).not.toContain("COMMERCIAL");
  });
  it("projects only approved non-empty families and excludes all approved empty families", () => {
    const projected = selectOwnerApprovedSafePersonaSignals(release); expect(projected.approvedFamilyCount).toBe(397); expect(projected.signals.length).toBeGreaterThan(0);
    const emptyIds = new Set(release.families.filter((family) => family.ownerDecision === "KEEP_EMPTY").map((family) => family.familyId)); const familyByVariant = new Map(release.variants.map((variant) => [variant.exactVariantId, variant.familyId]));
    expect(projected.signals.some((signal) => emptyIds.has(familyByVariant.get(signal.exactVariantId)!))).toBe(false);
    expect(projected.signals.every((signal) => signal.authority === "OWNER_EDITORIAL" && signal.decisionUse === "SOFT_PREFERENCE_ONLY" && signal.matchStrength === 1)).toBe(true);
  });
  it("contains no raw editorial prose, stereotypes or hard-filter authority", () => {
    const serialized = JSON.stringify(release); expect(serialized).not.toMatch(/brandPersona|seriesEditorial|brandEditorial|kadın arabası|erkek arabası|aile babası|beyaz yakalı|mafya|makasçı/iu); expect(serialized).not.toMatch(/HARD_FILTER|DIRECT_FILTER/u);
  });
  it("declares the unresolved temporal catalog limitation", () => { expect(approvedManifest.declaredLimitations).toContain("compatible-catalog-currently-future-effective-at-2026-08-16-runtime-clock"); });
});
