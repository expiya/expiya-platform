import { describe, expect, it } from "vitest";

import { EQUIPMENT_FEATURE_CODES } from "@/types/equipmentEvidence";
import type { EquipmentDailyLifeEntry } from "@/types/equipmentDailyLife";
import { compareEquipmentShadowOnOff, evaluateEquipmentDailyLifeCandidates, evaluateEquipmentDailyLifeShadow,
  loadActiveEquipmentDailyLifeShadowContext, summarizeEquipmentDailyLifeShadow, type EquipmentShadowContext, type ShadowEvidence } from "./equipmentDailyLifeShadowAdapter.server";

const ID = "active-exact";
const FEATURE = "REAR_VIEW_CAMERA";
const entry = Object.freeze({ featureCode: FEATURE, labelTr: "Geri görüş kamerası", category: "PARKING", usageContexts: ["PARKING"],
  dailyLifeBenefit: "Manevrayı destekler.", userFacingExplanation: "Dar alanlarda arkayı görmeyi kolaylaştırabilir.", caveat: "Çevre kontrolü sürücüdedir.",
  authority: "OWNER_EDITORIAL", decisionUse: "EXPLANATION_ONLY" } as EquipmentDailyLifeEntry);
const evidence = (overrides: Partial<ShadowEvidence> = {}): ShadowEvidence => ({ exactVariantId: ID, featureCode: FEATURE, availabilityStatus: "STANDARD",
  provisionMode: "INCLUDED", verificationState: "VERIFIED", conflictState: "CLEAR", sourceApplicability: "EXACT_VARIANT", evidencePolarity: "POSITIVE", ...overrides });
const context = (items: readonly ShadowEvidence[] = [evidence()], overrides: Partial<EquipmentShadowContext> = {}): EquipmentShadowContext => ({
  catalogRelease: "v0.55.4", catalogFingerprint: "sha256:catalog", activeVariantIds: new Set([ID, "other-powertrain"]), quarantineVariantIds: new Set(["quarantine-id"]),
  featureCodes: new Set(EQUIPMENT_FEATURE_CODES), equipmentRelease: "equipment", expectedEquipmentRelease: "equipment", equipmentCatalogRelease: "v0.55.4",
  equipmentCatalogFingerprint: "sha256:catalog", equipmentPayloadChecksumValid: true, equipmentLifecycleAuthorityValid: true,
  dailyLifeRelease: "daily", expectedDailyLifeRelease: "daily", dailyLifeCatalogRelease: "v0.55.4", dailyLifeCatalogFingerprint: "sha256:catalog",
  dailyLifePayloadChecksumValid: true, dailyLifeLifecycleAuthorityValid: true, dailyLifeEntries: new Map([[FEATURE, entry]]), evidence: items, ...overrides,
});

describe("equipment evidence -> daily-life shadow adapter", () => {
  it("allows only exact verified clear STANDARD + INCLUDED owner text", () => {
    const result = evaluateEquipmentDailyLifeShadow(context(), ID, FEATURE);
    expect(result.disposition).toBe("CONFIRMED_INCLUDED_EXPLANATION_ELIGIBLE");
    expect(result.controlledExplanation).toBe(entry.userFacingExplanation);
    expect(result.publicClaimAllowed).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.reasonCodes)).toBe(true);
  });

  it.each([
    [evidence({ provisionMode: undefined }), "LEGACY_PROVISION_UNRESOLVED"],
    [evidence({ availabilityStatus: "OPTIONAL", provisionMode: "FACTORY_OPTION" }), "OPTIONAL_STOCK_CONFIRMATION_REQUIRED"],
    [evidence({ availabilityStatus: "PACKAGE_DEPENDENT", provisionMode: "PACKAGE_OPTION" }), "PACKAGE_CONFIRMATION_REQUIRED"],
    [evidence({ availabilityStatus: "PACKAGE_DEPENDENT", provisionMode: "PACKAGE_OPTION", packageName: "Tech", packageLinkVerified: true }), "PACKAGE_CONFIRMATION_REQUIRED"],
    [evidence({ associationOnly: true, sourceApplicability: "EXACT_TRIM", provisionMode: undefined }), "ASSOCIATION_PROVISION_UNRESOLVED"],
    [evidence({ availabilityStatus: "UNKNOWN", provisionMode: "UNRESOLVED" }), "UNKNOWN_NO_CLAIM"],
  ] as const)("maps bounded evidence semantics", (item, expected) => expect(evaluateEquipmentDailyLifeShadow(context([item]), ID, FEATURE).disposition).toBe(expected));

  it("requires explicit verified negative evidence", () => {
    expect(evaluateEquipmentDailyLifeShadow(context([evidence({ availabilityStatus: "NOT_AVAILABLE", provisionMode: "NOT_OFFERED", evidencePolarity: "NEGATIVE", negativeEvidenceReason: "OFFICIAL_DOCUMENT_EXPLICIT_NOT_OFFERED" })]), ID, FEATURE).disposition).toBe("VERIFIED_NOT_AVAILABLE");
    expect(evaluateEquipmentDailyLifeShadow(context([]), ID, FEATURE).disposition).toBe("UNKNOWN_NO_CLAIM");
  });

  it("fails conflicts and duplicate evidence closed", () => {
    expect(evaluateEquipmentDailyLifeShadow(context([evidence({ conflictState: "CONFLICTING" })]), ID, FEATURE).disposition).toBe("CONFLICT_NO_CLAIM");
    expect(evaluateEquipmentDailyLifeShadow(context([evidence(), evidence()]), ID, FEATURE).reasonCodes).toContain("DUPLICATE_EVIDENCE");
  });

  it.each([
    ["wrong", FEATURE, {}, "EXACT_VARIANT_NOT_ACTIVE"], ["quarantine-id", FEATURE, {}, "EXACT_VARIANT_QUARANTINED"],
    [ID, "NOT_A_FEATURE", {}, "FEATURE_VOCABULARY_INCOMPATIBLE"], [ID, FEATURE, { catalogFingerprint: "sha256:wrong" }, "CATALOG_FINGERPRINT_MISMATCH"],
    [ID, FEATURE, { equipmentRelease: "wrong" }, "EQUIPMENT_RELEASE_MISMATCH"], [ID, FEATURE, { dailyLifeRelease: "wrong" }, "EQUIPMENT_DAILY_LIFE_RELEASE_MISMATCH"],
  ] as const)("fails compatibility closed", (variant, feature, overrides, reason) => {
    const result = evaluateEquipmentDailyLifeShadow(context([], overrides), variant, feature);
    expect(result.disposition).toBe("INCOMPATIBLE_NO_CLAIM"); expect(result.reasonCodes).toContain(reason);
  });

  it("does not invent copy when daily-life entry is missing", () => {
    const result = evaluateEquipmentDailyLifeShadow(context([evidence()], { dailyLifeEntries: new Map() }), ID, FEATURE);
    expect(result.disposition).toBe("UNKNOWN_NO_CLAIM"); expect(result.controlledExplanation).toBeNull();
  });

  it("forbids cross-powertrain and family inheritance", () => {
    const other = evidence({ exactVariantId: "other-powertrain" });
    expect(evaluateEquipmentDailyLifeShadow(context([other]), ID, FEATURE).disposition).toBe("UNKNOWN_NO_CLAIM");
    const family = evidence({ sourceApplicability: "MODEL_FAMILY" });
    expect(evaluateEquipmentDailyLifeShadow(context([family]), ID, FEATURE).disposition).toBe("ASSOCIATION_PROVISION_UNRESOLVED");
  });

  it("keeps candidate order and all public decision fields byte-equivalent", () => {
    const decision = Object.freeze({ eligibleCandidateIds: [ID, "other-powertrain"], rankedCandidateIds: ["other-powertrain", ID], readiness: "READY",
      selectedQuestion: null, action: "OFFER", offerCandidateIds: ["other-powertrain", ID], consentLifecycle: { state: "GRANTED" },
      revealedCardIds: ["other-powertrain"], publicMessage: "Aynı mesaj", publicAuthorizedFacts: ["fact-a"] });
    const comparison = compareEquipmentShadowOnOff({ decision, context: context(), candidateIds: decision.rankedCandidateIds, featureCodes: [FEATURE] });
    expect(comparison.equivalent).toBe(true); expect(comparison.on).toBe(comparison.off);
    expect(comparison.diagnostics.map((item) => item.exactVariantId)).toEqual(decision.rankedCandidateIds);
  });

  it("active stack passes compatibility, vocabulary and safety wording gates", () => {
    const active = loadActiveEquipmentDailyLifeShadowContext();
    expect(active.featureCodes.size).toBe(51); expect(active.dailyLifeEntries.size).toBe(51);
    for (const item of active.dailyLifeEntries.values()) expect(`${item.userFacingExplanation} ${item.dailyLifeBenefit}`).not.toMatch(/garanti eder|kesinlikle önler|kaza yaptırmaz|tam güvenlik/iu);
    expect(evaluateEquipmentDailyLifeCandidates(active, [...active.activeVariantIds].slice(0, 2), [FEATURE]).flatMap((item) => item.diagnostics).every((item) => item.disposition !== "INCOMPATIBLE_NO_CLAIM")).toBe(true);
    const summary = summarizeEquipmentDailyLifeShadow(active); expect(Object.values(summary).reduce((a, b) => a + b, 0)).toBe(549 * 51);
  });
});
