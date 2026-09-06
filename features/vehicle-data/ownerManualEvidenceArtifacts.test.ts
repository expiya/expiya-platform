import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = <T>(name: string): T => JSON.parse(readFileSync(`data/research/owner-manual-evidence-v4/${name}`, "utf8")) as T;

describe("Owner Manual Evidence V4 generated artifacts", () => {
  it("is pinned to the active 385-family/549-variant catalog", () => {
    const coverage = read<{ catalogRelease: string; catalogFingerprint: string; modelFamily: { total: number; extracted: number; discoveredPublic: number; accessReviewRequired: number; notResearched: number }; exactVariant: { total: number; exactVerified: number; familyCapabilityOnly: number; unresolved: number } }>("coverage.json");
    expect(coverage).toMatchObject({ catalogRelease: "v0.55.4", catalogFingerprint: "sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9", modelFamily: { total: 385, extracted: 234, discoveredPublic: 0, accessReviewRequired: 151, notResearched: 0 }, exactVariant: { total: 549, exactVerified: 0, familyCapabilityOnly: 352, unresolved: 549 } });
  });

  it("keeps every pilot assertion at family authority", () => {
    const pilot = read<{ artifacts: Array<{ sourceId: string; url: string }>; assertions: Array<{ sourceId: string; authorityLevel: string; exactVariantId?: string; provenance: { rawSha256: string; physicalPdfPage?: number; sectionHeading: string; modelAssistance: null } }> }>("pilot-assertions.json");
    const htmlArtifacts = new Set(pilot.artifacts.filter((item) => !new URL(item.url).pathname.toLowerCase().endsWith(".pdf")).map((item) => item.sourceId));
    expect(pilot.artifacts).toHaveLength(200);
    expect(pilot.assertions).toHaveLength(1015);
    expect(pilot.assertions.every((item) => item.authorityLevel === "MODEL_FAMILY_CAPABILITY" && !item.exactVariantId && /^sha256:[a-f0-9]{64}$/u.test(item.provenance.rawSha256) && ((item.provenance.physicalPdfPage ?? 0) > 0 || htmlArtifacts.has(item.sourceId)) && item.provenance.sectionHeading.length > 0 && item.provenance.modelAssistance === null)).toBe(true);
  });

  it("reports every active brand and isolates VIN-gated access", () => {
    const inventory = read<{ families: Array<{ brand: string }> }>("discovery-inventory.json");
    const report = read<{ brands: Array<{ brand: string; status: string }> }>("brand-access-report.json");
    expect(report.brands.map((item) => item.brand)).toEqual([...new Set(inventory.families.map((item) => item.brand))].sort());
    expect(report.brands).toContainEqual(expect.objectContaining({ brand: "Volkswagen", status: "ACCESS_REVIEW_REQUIRED" }));
    expect(report.brands).toContainEqual(expect.objectContaining({ brand: "BMW", status: "ACCESS_REVIEW_REQUIRED" }));
    expect(report.brands).toContainEqual(expect.objectContaining({ brand: "Hyundai", status: "DISCOVERED_PUBLIC" }));
  });

  it("provides a lawful acquisition route for every access-review family", () => {
    const plan = read<{ familyCount: number; families: Array<{ route: string; acquisitionOwner: string; requestedArtifacts: string[]; fallback: string; acquisitionPriority: string; lawfulActions: string[]; forbiddenActions: string[]; completionEvidenceRequired: string[]; status: string }> }>("access-review-acquisition-plan.json");
    expect(plan.familyCount).toBe(151);
    expect(plan.families).toHaveLength(151);
    expect(plan.families.every((item) => item.status === "ACCESS_REVIEW_REQUIRED" && item.route.length > 0 && item.acquisitionOwner.length > 0 && item.requestedArtifacts.length > 0 && item.fallback.length > 0 && /^P[0-2]$/u.test(item.acquisitionPriority) && item.lawfulActions.length > 0 && item.forbiddenActions.length >= 3 && item.completionEvidenceRequired.includes("SHA-256 checksum"))).toBe(true);
  });

  it("never labels a family extracted without bound artifacts and accepted assertions", () => {
    const inventory = read<{ families: Array<{ discoveryStatus: string; artifactSourceIds: string[]; assertionCount: number }> }>("discovery-inventory.json");
    const extracted = inventory.families.filter((item) => item.discoveryStatus === "EXTRACTED");
    expect(extracted.length).toBeGreaterThan(0);
    expect(extracted.every((item) => item.artifactSourceIds.length > 0 && item.assertionCount > 0)).toBe(true);
  });

  it("does not leak GR Yaris artifacts into the ordinary Yaris families", () => {
    const inventory = read<{ families: Array<{ brand: string; modelFamily: string; artifactSourceIds: string[] }> }>("discovery-inventory.json");
    const toyotaYaris = inventory.families.filter((item) => item.brand === "Toyota" && item.modelFamily.includes("Yaris"));
    expect(toyotaYaris.find((item) => item.modelFamily === "GR Yaris")?.artifactSourceIds).toEqual(["OM-ART-TOYOTA-GR-YARIS-2026-CAMERA-JA-JP-HTML"]);
    expect(toyotaYaris.filter((item) => item.modelFamily !== "GR Yaris").every((item) => item.artifactSourceIds.every((sourceId) => !sourceId.includes("GR-YARIS")))).toBe(true);
  });

  it("does not promote combustion Doblo manuals to E-Doblo Cargo", () => {
    const inventory = read<{ families: Array<{ brand: string; modelFamily: string; discoveryStatus: string; artifactSourceIds: string[] }> }>("discovery-inventory.json");
    const eDoblo = inventory.families.find((item) => item.brand === "Fiat" && item.modelFamily === "E-Doblo Cargo");
    expect(eDoblo).toMatchObject({ discoveryStatus: "EXTRACTED", artifactSourceIds: ["OM-ART-FIAT-E-DOBLO-CARGO-2026-EN"] });
  });

  it("does not promote combustion Citan manuals to eCitan Panelvan", () => {
    const inventory = read<{ families: Array<{ brand: string; modelFamily: string; artifactSourceIds: string[] }> }>("discovery-inventory.json");
    const ecitan = inventory.families.find((item) => item.brand === "Mercedes-Benz" && item.modelFamily === "eCitan Panelvan");
    expect(ecitan?.artifactSourceIds).toEqual(["OM-ART-MERCEDES-ECITAN-PANELVAN-2025-EN"]);
  });

  it("keeps eVito evidence isolated and prepares all exact identities for the Turkey bridge", () => {
    const inventory = read<{ families: Array<{ brand: string; modelFamily: string; artifactSourceIds: string[] }> }>("discovery-inventory.json");
    const vitoFamilies = inventory.families.filter((item) => item.brand === "Mercedes-Benz" && item.modelFamily.includes("Vito"));
    expect(vitoFamilies.find((item) => item.modelFamily === "eVito Panelvan")?.artifactSourceIds).toEqual(["OM-ART-MERCEDES-EVITO-PANELVAN-2026-NO"]);
    expect(vitoFamilies.filter((item) => item.modelFamily !== "eVito Panelvan").every((item) => item.artifactSourceIds.every((sourceId) => !sourceId.includes("EVITO")))).toBe(true);

    const handoff = read<{ catalogRelease: string; catalogFingerprint: string; summary: { modelFamilies: number; exactVariants: number; familiesWithFamilyCapability: number; exactVariantsAwaitingTurkeyBridge: number }; families: Array<{ exactVariantIds: string[]; currentAuthority: string; requiredOutput: Array<{ exactVariantId: string }> }> }>("catalog-exact-tr-bridge-handoff.json");
    expect(handoff).toMatchObject({ catalogRelease: "v0.55.4", catalogFingerprint: "sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9", summary: { modelFamilies: 385, exactVariants: 549, familiesWithFamilyCapability: 234, exactVariantsAwaitingTurkeyBridge: 352 } });
    expect(handoff.families).toHaveLength(385);
    expect(handoff.families.flatMap((family) => family.requiredOutput.map((item) => item.exactVariantId))).toEqual(handoff.families.flatMap((family) => family.exactVariantIds));
    expect(handoff.families.every((family) => family.currentAuthority === "MODEL_FAMILY_CAPABILITY" || family.currentAuthority === "NONE")).toBe(true);
  });

  it("does not leak Range Rover Velar evidence into other Range Rover families", () => {
    const inventory = read<{ families: Array<{ brand: string; modelFamily: string; artifactSourceIds: string[] }> }>("discovery-inventory.json");
    const rangeRovers = inventory.families.filter((item) => item.brand === "Land Rover" && item.modelFamily.startsWith("Range Rover"));
    expect(rangeRovers.find((item) => item.modelFamily === "Range Rover Velar")?.artifactSourceIds).toContain("OM-ART-LAND-ROVER-RANGE-ROVER-VELAR-2024-TAILGATE-EN");
    expect(rangeRovers.filter((item) => item.modelFamily !== "Range Rover Velar").every((item) => item.artifactSourceIds.every((sourceId) => !sourceId.includes("RANGE-ROVER-VELAR")))).toBe(true);
  });

  it("records zero provider spend", () => expect(read("api-cost-ledger.json")).toMatchObject({ budgetUsd: 30, totalCalls: 0, actualCostUsd: 0 }));
});
