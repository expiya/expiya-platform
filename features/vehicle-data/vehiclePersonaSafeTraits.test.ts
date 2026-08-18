import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { loadProductionCatalogSnapshotForTest } from "@/features/decision/v2/catalog/productionSnapshotFixture.testSupport";
import { loadActiveVehiclePersonaSafeTraits } from "./vehiclePersonaSafeTraits.server";
import {
  createVehiclePersonaSafeTraitResolver, validateVehiclePersonaSafeTraitRelease,
  selectOwnerApprovedSafePersonaSignals, vehiclePersonaSafeTraitPayloadHash, vehiclePersonaSafeTraitReleaseSchema,
} from "./vehiclePersonaSafeTraits";

const root = process.cwd();
async function fixture() {
  const snapshotResult = await loadProductionCatalogSnapshotForTest(new Date("2026-08-19T00:00:00.000Z"));
  if (snapshotResult.status !== "READY") throw new Error(snapshotResult.reason);
  const snapshot = snapshotResult.snapshot; const base = path.join(root, "data/production/personas/safe-traits");
  const pointer = JSON.parse(await readFile(path.join(base, "active.json"), "utf8"));
  const releaseRoot = path.join(base, "releases", pointer.activeReleaseVersion);
  const rawPayload = await readFile(path.join(releaseRoot, "vehicle-persona-safe-traits.json"), "utf8");
  const release = JSON.parse(rawPayload); const manifest = JSON.parse(await readFile(path.join(releaseRoot, "manifest.json"), "utf8"));
  const catalogFamilies = snapshot.familyIndex.values().map((family) => ({ familyId: family.familyId, variantIds: family.variantIds }));
  const validate = (changes: { release?: unknown; manifest?: unknown; pointer?: unknown; rawPayload?: string } = {}) => validateVehiclePersonaSafeTraitRelease({
    release: changes.release ?? release, manifest: changes.manifest ?? manifest, pointer: changes.pointer ?? pointer,
    rawPayload: changes.rawPayload ?? rawPayload, catalogRelease: `v${snapshot.authority.releaseVersion}`,
    catalogFingerprint: snapshot.authority.catalogFingerprint, catalogVariantIds: snapshot.variants.map((variant) => variant.id), catalogFamilies,
  });
  return { snapshot, pointer, release, manifest, rawPayload, validate, catalogFamilies };
}

describe("vehicle persona safe trait production release", () => {
  it("uses only the closed vocabulary, canonical order, editorial authority and soft-only decision use", async () => {
    const { release } = await fixture(); expect(() => vehiclePersonaSafeTraitReleaseSchema.parse(release)).not.toThrow();
    expect(release.authority).toBe("OWNER_EDITORIAL"); expect(release.decisionUse).toBe("SOFT_PREFERENCE_ONLY");
    expect(() => vehiclePersonaSafeTraitReleaseSchema.parse({ ...release, families: [{ ...release.families[0], traits: ["DEMOGRAPHIC_STEREOTYPE"] }, ...release.families.slice(1)] })).toThrow();
    expect(() => vehiclePersonaSafeTraitReleaseSchema.parse({ ...release, families: [{ ...release.families[0], traits: ["VALUE", "DESIGN"] }, ...release.families.slice(1)] })).toThrow();
  });

  it("contains no raw editorial fields, prose or prohibited stereotype language", async () => {
    const { rawPayload } = await fixture();
    expect(rawPayload).not.toMatch(/brandPersona|seriesEditorial|brandEditorial|"persona"\s*:/u);
    expect(rawPayload).not.toMatch(/kadın arabası|erkek arabası|aile babası|beyaz yakalı|mafya|makasçı|meslek|sosyal sınıf/iu);
  });

  it("matches the active catalog fingerprint, checksum, family IDs and every exact variant", async () => {
    const data = await fixture(); expect(data.validate()).toEqual([]);
    expect(data.release.variants).toHaveLength(data.snapshot.variants.length); expect(data.release.families).toHaveLength(data.snapshot.familyIndex.size);
    expect(new Set(data.release.variants.map((item: { exactVariantId: string }) => item.exactVariantId)).size).toBe(data.snapshot.variants.length);
    expect(vehiclePersonaSafeTraitPayloadHash(data.rawPayload)).toBe(data.manifest.payloadSha256);
  });

  it("fails closed on checksum and catalog compatibility changes", async () => {
    const data = await fixture();
    expect(data.validate({ rawPayload: `${data.rawPayload} ` })).toContain("PAYLOAD_CHECKSUM_MISMATCH");
    expect(data.validate({ release: { ...data.release, compatibleCatalogRelease: "v9.9.9" } })).toContain("CATALOG_RELEASE_INCOMPATIBLE");
    expect(data.validate({ release: { ...data.release, compatibleCatalogFingerprint: `sha256:${"0".repeat(64)}` } })).toContain("CATALOG_FINGERPRINT_INCOMPATIBLE");
  });

  it("rejects duplicate, unknown, stale and incorrectly linked variants", async () => {
    const data = await fixture(); const first = data.release.variants[0];
    expect(data.validate({ release: { ...data.release, variants: [...data.release.variants, first] } })).toContain("DUPLICATE_VARIANT_ID");
    expect(data.validate({ release: { ...data.release, variants: [{ ...first, exactVariantId: "unknown-variant" }, ...data.release.variants.slice(1)] } })).toContain("VARIANT_COVERAGE_MISMATCH");
    expect(data.validate({ release: { ...data.release, variants: data.release.variants.slice(1) } })).toContain("VARIANT_COVERAGE_MISMATCH");
    expect(data.validate({ release: { ...data.release, variants: [{ ...first, familyId: "family-wrong" }, ...data.release.variants.slice(1)] } })).toContain("VARIANT_FAMILY_MISMATCH");
  });

  it("keeps ambiguous/unmatched visible and traitless while permitting empty safe traits", async () => {
    const { release } = await fixture(); expect(release.families.some((item: { traits: unknown[] }) => item.traits.length === 0)).toBe(true);
    const family = { ...release.families[0], matchStatus: "AMBIGUOUS", sourceSeriesGroup: null, sourceReference: undefined, traits: [], traitDerivations: [], reviewStatus: "OWNER_APPROVED", ownerDecision: "KEEP_EMPTY" };
    expect(() => vehiclePersonaSafeTraitReleaseSchema.parse({ ...release, families: [family, ...release.families.slice(1)] })).not.toThrow();
    expect(() => vehiclePersonaSafeTraitReleaseSchema.parse({ ...release, families: [{ ...family, traits: ["DESIGN"] }, ...release.families.slice(1)] })).toThrow();
  });

  it("resolves only safe family and exact-variant projections and is checksum deterministic", async () => {
    const { release, rawPayload } = await fixture(); const resolver = createVehiclePersonaSafeTraitResolver(release);
    expect(resolver.resolveFamily(release.families[0].familyId)).toEqual(release.families[0]);
    expect(resolver.resolveVariant(release.variants[0].exactVariantId)).toEqual(release.variants[0]);
    expect(resolver.resolveVariant("unknown")).toBeUndefined();
    expect(vehiclePersonaSafeTraitPayloadHash(rawPayload)).toBe(vehiclePersonaSafeTraitPayloadHash(rawPayload));
    expect(JSON.stringify(release)).not.toMatch(/brandPersona|seriesEditorial|brandEditorial/u);
  });

  it("loads the active release READY without granting hard-filter authority", async () => {
    const data = await fixture(); const loaded = await loadActiveVehiclePersonaSafeTraits({
      repositoryRoot: root, catalogRelease: `v${data.snapshot.authority.releaseVersion}`, catalogFingerprint: data.snapshot.authority.catalogFingerprint,
      catalogVariantIds: data.snapshot.variants.map((variant) => variant.id), catalogFamilies: data.catalogFamilies,
    });
    expect(loaded.status).toBe("READY"); if (loaded.status !== "READY") return;
    expect(loaded.release.variants.every((item) => item.decisionUse === "SOFT_PREFERENCE_ONLY")).toBe(true);
    expect(JSON.stringify(loaded.release)).not.toMatch(/HARD_FILTER|DIRECT_FILTER/u);
  });

  it("publishes only non-empty owner-approved family traits as ranking signals", async () => {
    const { release } = await fixture(); const nonEmpty = release.families.find((family: { traits: unknown[] }) => family.traits.length > 0);
    const empty = release.families.find((family: { traits: unknown[] }) => family.traits.length === 0);
    const unapproved = { ...release, families: release.families.map((family: { familyId: string }) => ({ ...family, reviewStatus: "PROGRAMMATIC_DRAFT", ownerDecision: undefined })) };
    expect(selectOwnerApprovedSafePersonaSignals(unapproved)).toEqual({ approvedFamilyCount: 0, signals: [] });
    const approvedNonEmpty = { ...unapproved, families: unapproved.families.map((family: { familyId: string }) => family.familyId === nonEmpty.familyId ? { ...family, reviewStatus: "OWNER_APPROVED" } : family) };
    const enabled = selectOwnerApprovedSafePersonaSignals(approvedNonEmpty); expect(enabled.approvedFamilyCount).toBe(1); expect(enabled.signals.length).toBeGreaterThan(0);
    const approvedEmpty = { ...unapproved, families: unapproved.families.map((family: { familyId: string }) => family.familyId === empty.familyId ? { ...family, reviewStatus: "OWNER_APPROVED" } : family) };
    expect(selectOwnerApprovedSafePersonaSignals(approvedEmpty)).toEqual({ approvedFamilyCount: 1, signals: [] });
  });

  it("keeps runtime resolution generic without vehicle-specific or prose interpretation rules", async () => {
    const runtime = await Promise.all([
      readFile(path.join(root, "features/vehicle-data/vehiclePersonaSafeTraits.server.ts"), "utf8"),
      readFile(path.join(root, "features/decision/v2/layers/productionAdapter.server.ts"), "utf8"),
    ]).then((parts) => parts.join("\n"));
    expect(runtime).not.toMatch(/brandPersona|seriesEditorial|traitRules|personaPayload/u);
    expect(runtime).not.toMatch(/\b(Tesla|BMW|Hyundai|TUCSON|Egea|Clio)\b/u);
  });
});
