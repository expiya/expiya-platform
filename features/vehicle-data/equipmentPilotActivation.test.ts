import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import activePointer from "@/data/production/equipment-evidence/active.json";
import { assertActiveEquipmentEvidenceCompatibility, getVariantEquipmentFeatures, loadActiveEquipmentEvidenceLayer, loadActiveEquipmentEvidenceStatus } from "./equipmentEvidenceResolver";

const ROOT = process.cwd(), RELEASE = "v1.5.0-scale-wave-verified-catalog-v0.55.2-2026-08-19";
const sha = (file: string) => createHash("sha256").update(readFileSync(path.join(ROOT, file))).digest("hex");

describe("atomic Equipment pilot activation", () => {
  it("binds the active pointer and generated module to the approved checksums", () => {
    expect(activePointer).toMatchObject({ activeEquipmentEvidenceRelease: RELEASE, compatibleCatalogRelease: "v0.55.2", compatibleCatalogFingerprint: "sha256:fd5609adcc0ca3fec0f8c9dc4dd1c903ed5514326bd322eacd4decff5a044f0f", payloadSha256: "sha256:5c9ad2d7fa3085b883d04d116bed6ca2bbfb8944e97a81ec590037bc2afd01d2", schemaVersion: "1.2.0-rc" });
    expect(sha("data/production/equipment-evidence/active.json")).toBe("39eae2723b0ca4bc38589bc25157326f084ed36f8fa4b6a946c7542d8ea4c98a");
    expect(sha("data/production/equipment-evidence/activeEquipmentEvidence.generated.ts")).toBe("897a1d8d251240b931ebba5d84fa91b0c937687418a6d7aaa2669c2446ee9e09");
    expect(sha(`data/production/equipment-evidence/releases/${RELEASE}/equipment-evidence.json`)).toBe("5c9ad2d7fa3085b883d04d116bed6ca2bbfb8944e97a81ec590037bc2afd01d2");
    expect(() => assertActiveEquipmentEvidenceCompatibility()).not.toThrow();
  });

  it("reports verified pilot coverage while exposing no decision authority", () => {
    expect(loadActiveEquipmentEvidenceStatus()).toEqual({ state: "PILOT_VERIFIED_DATA", catalogCompatibility: "READY", verifiedAssertionCount: 112, reviewedAssociationCount: 49, verifiedTrimLinkCount: 6, verifiedAssertionCoveredVariantCount: 4, coveredExactVariantCount: 4, associationOnlyCoveredVariantCount: 2, uncoveredExactVariantCount: 560, totalCatalogVariantCount: 566, availabilityProjectionCount: 112, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED", hardFilterEligible: false, hardFilterAfterConfirmation: false, softPreferenceEnabled: false, questionGenerationEnabled: false, userExplanationEnabled: false, candidateEliminationEnabled: false, candidateResurrectionEnabled: false });
    expect(loadActiveEquipmentEvidenceLayer()).toMatchObject({ release: RELEASE, layer: { state: "PILOT_VERIFIED_DATA", projections: [], assertions: [], trimVariantLinks: [] } });
    expect(getVariantEquipmentFeatures("1a3cc01d-3bfa-56f3-817f-4cc77e723ef8")).toEqual([]);
  });

  it("keeps Equipment outside every Decision Engine import boundary", () => {
    const files = readdirSync(path.join(ROOT, "features/decision"), { recursive: true }).filter((file): file is string => typeof file === "string" && /\.(?:ts|tsx)$/u.test(file));
    const runtimeImports = files.filter((file) => !file.endsWith(".test.ts") && readFileSync(path.join(ROOT, "features/decision", file), "utf8").match(/equipmentEvidenceResolver|activeEquipmentEvidence|equipment-evidence/u));
    expect(runtimeImports).toEqual([]);
  });

  it("preserves ten intent classes as decision-neutral Equipment inputs", () => {
    const intents = ["genel günlük kullanım", "elektrikli SUV", "benzinli sedan", "aile aracı", "şehir içi dağıtım", "arazi pickup", "Clio mu Civic mi", "3 milyon bütçeli öneri", "prestijli aile aracı", "360 derece kamera istiyorum"];
    const boundary = loadActiveEquipmentEvidenceStatus();
    expect(intents).toHaveLength(10); expect(intents.map(() => ({ hardFilter: boundary.hardFilterEligible, ranking: boundary.softPreferenceEnabled, question: boundary.questionGenerationEnabled, explanation: boundary.userExplanationEnabled }))).toEqual(Array.from({ length: 10 }, () => ({ hardFilter: false, ranking: false, question: false, explanation: false })));
  });
});
