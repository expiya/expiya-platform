import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import activePointer from "@/data/production/equipment-evidence/active.json";
import { assertActiveEquipmentEvidenceCompatibility, getVariantEquipmentFeatures, loadActiveEquipmentEvidenceLayer, loadActiveEquipmentEvidenceStatus } from "./equipmentEvidenceResolver";

const ROOT = process.cwd(), RELEASE = "v1.5.5-catalog-v0.55.4-2026-08-20";
const sha = (file: string) => createHash("sha256").update(readFileSync(path.join(ROOT, file))).digest("hex");

describe("atomic Equipment pilot activation", () => {
  it("binds the active pointer and generated module to the approved checksums", () => {
    expect(activePointer).toMatchObject({ activeEquipmentEvidenceRelease: RELEASE, compatibleCatalogRelease: "v0.55.4", compatibleCatalogFingerprint: "sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9", payloadSha256: "sha256:0135bbfee468fa955d3d00d3129e0e7e01dae7bf9a980488450d8319ddc98d2e", schemaVersion: "1.2.0-rc" });
    expect(sha("data/production/equipment-evidence/active.json")).toBe("101803fb4195c8cfe724715ece539d5ba88fb797f6a0194657b2166043feee4b");
    expect(sha("data/production/equipment-evidence/activeEquipmentEvidence.generated.ts")).toBe("e282e22700252fd0fe9b45d36be2c2c4953beb916367e8e390dbbb1977466396");
    expect(sha(`data/production/equipment-evidence/releases/${RELEASE}/equipment-evidence.json`)).toBe("0135bbfee468fa955d3d00d3129e0e7e01dae7bf9a980488450d8319ddc98d2e");
    expect(() => assertActiveEquipmentEvidenceCompatibility()).not.toThrow();
  });

  it("reports verified pilot coverage while exposing no decision authority", () => {
    expect(loadActiveEquipmentEvidenceStatus()).toEqual({ state: "PILOT_VERIFIED_DATA", catalogCompatibility: "READY", verifiedAssertionCount: 112, reviewedAssociationCount: 49, verifiedTrimLinkCount: 6, verifiedAssertionCoveredVariantCount: 4, coveredExactVariantCount: 4, associationOnlyCoveredVariantCount: 2, uncoveredExactVariantCount: 543, totalCatalogVariantCount: 549, availabilityProjectionCount: 112, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED", hardFilterEligible: false, hardFilterAfterConfirmation: false, softPreferenceEnabled: false, questionGenerationEnabled: false, userExplanationEnabled: false, candidateEliminationEnabled: false, candidateResurrectionEnabled: false });
    expect(loadActiveEquipmentEvidenceLayer()).toMatchObject({ release: RELEASE, layer: { state: "PILOT_VERIFIED_DATA" } });
    expect(getVariantEquipmentFeatures("1a3cc01d-3bfa-56f3-817f-4cc77e723ef8")).toEqual([]);
  });

  it("limits Equipment access to explicit normalization, card disclosure and the V3 catalog authority boundary", () => {
    const files = readdirSync(path.join(ROOT, "features/decision"), { recursive: true }).filter((file): file is string => typeof file === "string" && /\.(?:ts|tsx)$/u.test(file));
    const runtimeImports = files.filter((file) => !file.endsWith(".test.ts") && readFileSync(path.join(ROOT, "features/decision", file), "utf8").match(/equipmentEvidenceResolver|activeEquipmentEvidence|equipment-evidence/u));
    expect(runtimeImports).toEqual([
      "v3/catalogAdapter.server.ts",
      "v3/catalogQuestion.server.ts",
      "v3/equipmentCardProjection.ts",
      "v3/ledger.ts",
    ]);
    const catalogQuestion = readFileSync(path.join(ROOT, "features/decision/v3/catalogQuestion.server.ts"), "utf8");
    expect(catalogQuestion).toMatch(/v35EquipmentMatchAuthority\(variant, featureCode\) === "VERIFIED"/u);
    expect(catalogQuestion).not.toMatch(/rankV3Candidates|scoreV3Candidate|HARD_FILTER/u);
    const adapter = readFileSync(path.join(ROOT, "features/decision/v3/catalogAdapter.server.ts"), "utf8");
    expect(adapter).toMatch(/getVerifiedEquipmentAssertions/u);
    expect(adapter).not.toMatch(/activeEquipmentEvidence|equipment-evidence\/active/u);
    expect(adapter).toMatch(/verificationState === "VERIFIED" && assertion\.standardOrOptional === "STANDARD"/u);
    expect(adapter).toMatch(/v35EquipmentMatchAuthority\(variant, String\(preference\.normalizedValue\)\) === "VERIFIED"/u);
    const decisionInput = readFileSync(path.join(ROOT, "features/decision/v3/decisionInput.ts"), "utf8");
    expect(decisionInput).toMatch(/item\.field !== "equipmentFeature"/u);
    const ledger = readFileSync(path.join(ROOT, "features/decision/v3/ledger.ts"), "utf8");
    expect(ledger).toMatch(/resolveEquipmentRequirement\(text\)/u);
    expect(ledger).not.toMatch(/getVerifiedEquipmentAssertions|getReviewedEquipmentAssociations/u);
    const cardProjection = readFileSync(path.join(ROOT, "features/decision/v3/equipmentCardProjection.ts"), "utf8");
    expect(cardProjection).toMatch(/badge|warning/u);
    expect(cardProjection).not.toMatch(/candidateIds|rankV3Candidates|scoreV3Candidate/u);
  });

  it("preserves ten intent classes as decision-neutral Equipment inputs", () => {
    const intents = ["genel günlük kullanım", "elektrikli SUV", "benzinli sedan", "aile aracı", "şehir içi dağıtım", "arazi pickup", "Clio mu Civic mi", "3 milyon bütçeli öneri", "prestijli aile aracı", "360 derece kamera istiyorum"];
    const boundary = loadActiveEquipmentEvidenceStatus();
    expect(intents).toHaveLength(10); expect(intents.map(() => ({ hardFilter: boundary.hardFilterEligible, ranking: boundary.softPreferenceEnabled, question: boundary.questionGenerationEnabled, explanation: boundary.userExplanationEnabled }))).toEqual(Array.from({ length: 10 }, () => ({ hardFilter: false, ranking: false, question: false, explanation: false })));
  });
});
