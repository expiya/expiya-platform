import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  compareHighMaterialityDailyLifeOnOff,
  projectHighMaterialityDailyLife,
  validateHighMaterialityDailyLifeRelease,
  type HighMaterialityDailyLifeRelease,
} from "./highMaterialityEquipmentDailyLife";

type Json = Record<string, unknown>;
const ROOT = process.cwd();
const RELEASE_BASE = "data/production/equipment-daily-life/releases/v1.1.0-high-materiality-exact-applications-catalog-v0.55.4-2026-09-04";
const read = <T>(relative: string): T => JSON.parse(readFileSync(path.join(ROOT, relative), "utf8")) as T;
const object = (value: unknown): Json => value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown): string => typeof value === "string" ? value : "";

const release = read<HighMaterialityDailyLifeRelease>(`${RELEASE_BASE}/equipment-daily-life-exact-applications.json`);
const catalog = read<{ records: Json[] }>("data/production/catalog/releases/v0.55.4/catalog.json");
const equipment = read<Json>("data/production/equipment-evidence/releases/v1.6.0-owner-reviewed-manual-bridges-catalog-v0.55.4-2026-09-04/equipment-evidence.json");
const manual = read<Json>("data/research/owner-manual-evidence-v4/releases/v4.3.0-equipment-owner-review-01/exact-tr-bridge-decisions.json");
const parent = read<Json>("data/production/equipment-daily-life/releases/v1.0.1-catalog-v0.55.4-2026-08-20/equipment-daily-life.json");
const proposalPayload = read<{ proposals: Json[] }>("data/research/owner-manual-evidence-v4/releases/v4.2.0-equipment-evidence-batch-01/exact-equipment-association-proposals.json");
const assertions = list(equipment.verifiedAssertions).map(object);
const proposals = new Map(proposalPayload.proposals.map((item) => [text(item.proposalId), item]));
const manualDecisions = list(manual.variants).map(object).flatMap((variant) => list(variant.decisions).map(object));
const expectedEquipmentLocators = new Map(assertions.map((assertion) => {
  const proposal = proposals.get(text(assertion.sourceAssertionId));
  const own = object(assertion.locator);
  return [text(assertion.materializationId), Object.keys(own).length ? own : object(object(proposal?.source).locator)] as const;
}));
const expectedEquipmentSourceSha256 = new Map(assertions.map((assertion) => {
  const source = object(list(assertion.rawSourceReferences)[0] ?? list(assertion.sourceReferences)[0]);
  return [text(assertion.materializationId), text(source.artifactSha256)] as const;
}));
const validationInput = {
  catalogById: new Map(catalog.records.map((item) => [text(object(item.variant).id), item])),
  equipmentAssertions: assertions,
  manualDecisions,
  parentEntries: new Map(list(parent.entries).map(object).map((item) => [text(item.featureCode), item])),
  expectedEquipmentLocators,
  expectedEquipmentSourceSha256,
};

describe("high-materiality exact equipment daily-life mappings", () => {
  it("validates all inherited semantics and exact evidence bindings", () => {
    expect(validateHighMaterialityDailyLifeRelease({ release, ...validationInput })).toEqual([]);
    expect(release.definitions).toHaveLength(6);
    expect(release.applications).toHaveLength(20);
    expect(new Set(release.applications.map((item) => `${item.exactVariantId}|${item.featureCode}`)).size).toBe(20);
    expect(release.applications.every((item) => item.decisionUse === "NONE" && item.directCandidateEffect === "NONE")).toBe(true);
  });

  it("keeps positive, exact negative, and unknown states distinct and neutral", () => {
    const dolphin = "6cb56615-37ef-51a8-9202-a73e59d4e14b";
    const seal = "11382bb9-bf71-52bf-9d0b-33befe86da7e";
    const projection = projectHighMaterialityDailyLife({ release, exactVariantIds: [dolphin, seal], featureCodes: ["WIRELESS_PHONE_CHARGING", "SURROUND_VIEW_CAMERA_360"] });
    expect(projection.cells.find((item) => item.exactVariantId === dolphin && item.featureCode === "WIRELESS_PHONE_CHARGING")).toMatchObject({ state: "KNOWN_ABSENT", decisionUse: "NONE", directCandidateEffect: "NONE", comparisonSafeStatementTr: expect.stringContaining("genel olarak daha kötü") });
    expect(projection.cells.find((item) => item.exactVariantId === dolphin && item.featureCode === "SURROUND_VIEW_CAMERA_360")).toMatchObject({ state: "KNOWN_PRESENT" });
    expect(projection.cells.find((item) => item.exactVariantId === seal && item.featureCode === "SURROUND_VIEW_CAMERA_360")).toMatchObject({ state: "UNKNOWN_NEUTRAL", consumerStatementTr: null, comparisonSafeStatementTr: null });
  });

  it("filters the read projection by exact authorized variant without cross-variant leakage", () => {
    const yaris = "4c22cb31-e980-4dc8-8525-c47363783d96";
    const projection = projectHighMaterialityDailyLife({ release, exactVariantIds: [yaris], featureCodes: ["ADAPTIVE_CRUISE_CONTROL", "BLIND_SPOT_MONITOR"] });
    expect(projection.cells).toHaveLength(2);
    expect(projection.cells.every((item) => item.exactVariantId === yaris)).toBe(true);
    expect(projection.cells.map((item) => item.state)).toEqual(["KNOWN_PRESENT", "UNKNOWN_NEUTRAL"]);
  });

  it("fails closed for wrong identity, locator, source digest, release digest, and unsupported guarantees", () => {
    const tampered = structuredClone(release) as HighMaterialityDailyLifeRelease;
    const first = tampered.applications[0] as unknown as { identity: { modelYear: number; market: string }; equipmentEvidence: { locator: Json; sourceArtifactSha256: string; payloadSha256: string }; consumerStatementTr: string };
    first.identity.modelYear = 2024;
    first.identity.market = "US";
    first.equipmentEvidence.locator = { pageNumber: 999 };
    first.equipmentEvidence.sourceArtifactSha256 = `sha256:${"b".repeat(64)}`;
    first.equipmentEvidence.payloadSha256 = `sha256:${"c".repeat(64)}`;
    first.consumerStatementTr = "Kusursuz güvenliği garanti eder.";
    expect(validateHighMaterialityDailyLifeRelease({ release: tampered, ...validationInput })).toEqual(expect.arrayContaining([
      "EXACT_VARIANT_IDENTITY_OR_APPLICABILITY_MISMATCH",
      "EQUIPMENT_EVIDENCE_BINDING_MISMATCH",
      "EQUIPMENT_RELEASE_BINDING_MISMATCH",
      "EQUIPMENT_SOURCE_DIGEST_MISMATCH",
      "EQUIPMENT_LOCATOR_MISMATCH",
      "UNSUPPORTED_BENEFIT_OR_GUARANTEE",
    ]));
  });

  it("rejects dangling evidence, parent semantic mutation, and Hilux cross-model-year manual leakage", () => {
    const tampered = structuredClone(release) as HighMaterialityDailyLifeRelease;
    const first = tampered.applications[0] as unknown as { equipmentEvidence: { materializationId: string } };
    first.equipmentEvidence.materializationId = "missing";
    const definition = tampered.definitions[0] as unknown as { dailyLifeMeaningTr: string };
    definition.dailyLifeMeaningTr = "Unreviewed benefit";
    const hilux = tampered.applications.find((item) => item.identity.model === "Hilux") as unknown as { manualEvidence: HighMaterialityDailyLifeRelease["applications"][number]["manualEvidence"] };
    hilux.manualEvidence = release.applications.find((item) => item.manualEvidence)?.manualEvidence ?? null;
    expect(validateHighMaterialityDailyLifeRelease({ release: tampered, ...validationInput })).toEqual(expect.arrayContaining([
      "UNAPPROVED_SEMANTIC_MUTATION",
      "EQUIPMENT_EVIDENCE_BINDING_MISMATCH",
      "HILUX_CROSS_MODEL_YEAR_MANUAL_FORBIDDEN",
      "MANUAL_EVIDENCE_BINDING_MISMATCH",
    ]));
  });

  it("cannot alter the Y decision snapshot", () => {
    const decision = { eligibleCandidateIds: ["a", "b"], rankedCandidateIds: ["b", "a"], selectedId: "b", authorization: "AUTHORIZED" };
    const projection = projectHighMaterialityDailyLife({ release, exactVariantIds: [release.applications[0].exactVariantId], featureCodes: [release.applications[0].featureCode] });
    expect(compareHighMaterialityDailyLifeOnOff(decision, projection)).toMatchObject({ equivalent: true, off: expect.any(String), on: expect.any(String) });
  });
});

