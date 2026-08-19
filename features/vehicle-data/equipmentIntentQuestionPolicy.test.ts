import { describe, expect, it } from "vitest";

import { EQUIPMENT_FEATURE_CODES } from "@/types/equipmentEvidence";
import type { EquipmentDailyLifeEntry } from "@/types/equipmentDailyLife";
import type { EquipmentShadowContext, ShadowEvidence } from "./equipmentDailyLifeShadowAdapter.server";
import { compareEquipmentIntentQuestionShadowOnOff, createEquipmentExplanationShadowPlan, createEquipmentQuestionCandidate, evaluateEquipmentUserIntent } from "./equipmentIntentQuestionPolicy.server";
import { AMBIGUOUS_EQUIPMENT_PHRASES, EQUIPMENT_INTENT_VOCABULARY_VERSION, EQUIPMENT_TURKISH_ALIASES } from "./equipmentIntentVocabulary";

const utteranceFixtures = EQUIPMENT_FEATURE_CODES.flatMap((code) => {
  const phrase = EQUIPMENT_TURKISH_ALIASES[code][0];
  return [
    { text: `${phrase} istiyorum`, code, intent: "SOFT_PREFERENCE" },
    { text: `kesinlikle ${phrase} olmalı`, code, intent: "EXPLICIT_REQUIREMENT" },
  ] as const;
});

describe("deterministic Turkish equipment intent policy", () => {
  it("uses a complete versioned 51-feature vocabulary", () => {
    expect(EQUIPMENT_INTENT_VOCABULARY_VERSION).toBe("tr-TR-equipment-intent-v1.0.0");
    expect(Object.keys(EQUIPMENT_TURKISH_ALIASES)).toHaveLength(51);
    expect(new Set(Object.values(EQUIPMENT_TURKISH_ALIASES).flat()).size).toBeGreaterThan(90);
  });

  it.each(utteranceFixtures)("classifies fixture: $text", ({ text, code, intent }) => {
    const match = evaluateEquipmentUserIntent(text, { rawAct: "HARD_REQUIREMENT" }).matches[0];
    expect(match).toMatchObject({ featureCode: code, intent, decisionAuthority: "SHADOW_ONLY", publicEffectAllowed: false, conversationScoped: true });
    expect(match?.deterministicStrength).toBe(intent === "EXPLICIT_REQUIREMENT" ? "HARD" : "SOFT");
  });

  it("contains at least 100 unique natural-language fixtures", () => expect(new Set(utteranceFixtures.map((item) => item.text)).size).toBeGreaterThanOrEqual(100));

  it.each([
    ["geri görüş kamerası olsa güzel olur", "REAR_VIEW_CAMERA"], ["CarPlay tercih ederim", "APPLE_CARPLAY"],
    ["ısıtmalı koltuk isterim", "HEATED_FRONT_SEATS"], ["360 kamera iyi olabilir", "SURROUND_VIEW_CAMERA_360"],
    ["adaptif hız sabitleyici istiyorum", "ADAPTIVE_CRUISE_CONTROL"], ["360 kamera olsun abi", "SURROUND_VIEW_CAMERA_360"],
    ["geri gorus kamerasi olsun", "REAR_VIEW_CAMERA"], ["ACC olsun", "ADAPTIVE_CRUISE_CONTROL"],
  ] as const)("does not promote plain desire to hard: %s", (text, code) => expect(evaluateEquipmentUserIntent(text).matches[0]).toMatchObject({ featureCode: code, intent: "SOFT_PREFERENCE", deterministicStrength: "SOFT" }));

  it.each([
    ["kör nokta uyarısı benim için önemli", "BLIND_SPOT_MONITOR"],
    ["adaptif hız sabitleyiciyi özellikle istiyorum", "ADAPTIVE_CRUISE_CONTROL"],
  ] as const)("recognizes explicit importance: %s", (text, code) => expect(evaluateEquipmentUserIntent(text).matches[0]).toMatchObject({ featureCode: code, intent: "STRONG_PREFERENCE", deterministicStrength: "STRONG" }));

  it.each([
    "kesinlikle adaptif hız sabitleyici olmalı", "adaptif cruise şart", "ACC olmazsa olmaz", "ACC mutlaka bulunmalı",
  ])("recognizes only explicit mandatory language: %s", (text) => expect(evaluateEquipmentUserIntent(text).matches[0]).toMatchObject({ featureCode: "ADAPTIVE_CRUISE_CONTROL", intent: "EXPLICIT_REQUIREMENT", deterministicStrength: "HARD", publicEffectAllowed: false }));

  it("scopes negation per feature", () => {
    expect(evaluateEquipmentUserIntent("360 kamera istemiyorum").matches[0]).toMatchObject({ featureCode: "SURROUND_VIEW_CAMERA_360", intent: "NEGATIVE_PREFERENCE" });
    const mixed = evaluateEquipmentUserIntent("park sensörü olsun ama otomatik park gerekmiyor").matches;
    expect(mixed).toContainEqual(expect.objectContaining({ featureCode: "AUTOMATIC_PARK_ASSIST", intent: "CLEAR_PREFERENCE" }));
    const platforms = evaluateEquipmentUserIntent("CarPlay olmasın ama Android Auto olsun").matches;
    expect(platforms).toContainEqual(expect.objectContaining({ featureCode: "APPLE_CARPLAY", intent: "NEGATIVE_PREFERENCE" }));
    expect(platforms).toContainEqual(expect.objectContaining({ featureCode: "ANDROID_AUTO", intent: "SOFT_PREFERENCE" }));
  });

  it("creates local correction supersession without mutating memory", () => {
    const input = Object.freeze({ preferences: ["HEATED_FRONT_SEATS"] }); const before = JSON.stringify(input);
    const correction = evaluateEquipmentUserIntent("ısıtmalı koltuk değil, soğutmalı koltuk demek istedim").matches.find((item) => item.intent === "CORRECTION");
    expect(correction).toMatchObject({ featureCode: "VENTILATED_FRONT_SEATS", correctionTarget: "HEATED_FRONT_SEATS", publicEffectAllowed: false });
    expect(JSON.stringify(input)).toBe(before);
    const cruise = evaluateEquipmentUserIntent("adaptif cruise şart değil, normal hız sabitleyici yeter").matches;
    expect(cruise).toContainEqual(expect.objectContaining({ featureCode: "ADAPTIVE_CRUISE_CONTROL", intent: "CLEAR_PREFERENCE" }));
    expect(cruise).toContainEqual(expect.objectContaining({ featureCode: null, intent: "UNKNOWN_TERM" }));
  });

  it("clears a previously strong statement only for its referenced feature", () => {
    expect(evaluateEquipmentUserIntent("CarPlay şart demiştim ama vazgeçtim").matches[0]).toMatchObject({ featureCode: "APPLE_CARPLAY", intent: "CLEAR_PREFERENCE", deterministicStrength: "CLEAR" });
  });

  it.each([
    ["ACC ne demek?", "CONCEPT_QUESTION"], ["ISOFIX nedir?", "CONCEPT_QUESTION"],
    ["kör nokta uyarısı ne işe yarar?", "BENEFIT_QUESTION"], ["360 kamera gerçekten gerekli mi?", "BENEFIT_QUESTION"],
  ] as const)("does not turn questions into preferences: %s", (text, intent) => expect(evaluateEquipmentUserIntent(text).matches[0]?.intent).toBe(intent));

  it.each(AMBIGUOUS_EQUIPMENT_PHRASES)("does not fan out ambiguous phrase: %s", (text) => {
    const result = evaluateEquipmentUserIntent(text); expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({ featureCode: null, intent: "AMBIGUOUS_EQUIPMENT_INTENT" });
  });

  it("does not guess which camera a generic clear statement targets", () => {
    expect(evaluateEquipmentUserIntent("kamera önemli değil").matches[0]).toMatchObject({ featureCode: null, intent: "AMBIGUOUS_EQUIPMENT_INTENT" });
  });

  it("keeps uncontrolled jargon conversation scoped", () => {
    const match = evaluateEquipmentUserIntent("Arabada hayalet ekran olsun.").matches[0];
    expect(match).toMatchObject({ featureCode: null, intent: "UNKNOWN_TERM", conversationScoped: true, publicEffectAllowed: false });
    expect(match?.clarificationCandidate).toContain("head-up display");
  });

  it("keeps close features distinct", () => {
    expect(evaluateEquipmentUserIntent("geri kamera ve 360 kamera olsun").matches.map((item) => item.featureCode)).toEqual(["REAR_VIEW_CAMERA", "SURROUND_VIEW_CAMERA_360"]);
    expect(evaluateEquipmentUserIntent("kablosuz CarPlay olsun").matches.map((item) => item.featureCode)).toEqual(["WIRELESS_APPLE_CARPLAY"]);
    expect(evaluateEquipmentUserIntent("şerit takip olsun").matches[0]?.featureCode).toBeNull();
  });
});

const FEATURE = "REAR_VIEW_CAMERA" as const; const ids = ["a", "b", "c", "d"];
const dailyEntry = { featureCode: FEATURE, labelTr: "Geri görüş kamerası", category: "PARKING", usageContexts: ["PARKING"], dailyLifeBenefit: "Destek olabilir.",
  userFacingExplanation: "Geri manevrada görüşü destekleyebilir.", caveat: "Çevre kontrolü gerekir.", authority: "OWNER_EDITORIAL", decisionUse: "EXPLANATION_ONLY" } as EquipmentDailyLifeEntry;
const evidence = (id: string, availabilityStatus: ShadowEvidence["availabilityStatus"] = "STANDARD"): ShadowEvidence => ({ exactVariantId: id, featureCode: FEATURE,
  availabilityStatus, provisionMode: availabilityStatus === "STANDARD" ? "INCLUDED" : availabilityStatus === "OPTIONAL" ? "FACTORY_OPTION" : "NOT_OFFERED",
  verificationState: "VERIFIED", conflictState: "CLEAR", sourceApplicability: "EXACT_VARIANT", evidencePolarity: availabilityStatus === "NOT_AVAILABLE" ? "NEGATIVE" : "POSITIVE",
  negativeEvidenceReason: availabilityStatus === "NOT_AVAILABLE" ? "EXPLICIT" : undefined });
const shadowContext = (records: readonly ShadowEvidence[]): EquipmentShadowContext => ({ catalogRelease: "v0.55.4", catalogFingerprint: "sha256:x", activeVariantIds: new Set(ids), quarantineVariantIds: new Set(),
  featureCodes: new Set(EQUIPMENT_FEATURE_CODES), equipmentRelease: "e", expectedEquipmentRelease: "e", equipmentCatalogRelease: "v0.55.4", equipmentCatalogFingerprint: "sha256:x",
  equipmentPayloadChecksumValid: true, equipmentLifecycleAuthorityValid: true, dailyLifeRelease: "d", expectedDailyLifeRelease: "d", dailyLifeCatalogRelease: "v0.55.4",
  dailyLifeCatalogFingerprint: "sha256:x", dailyLifePayloadChecksumValid: true, dailyLifeLifecycleAuthorityValid: true, dailyLifeEntries: new Map([[FEATURE, dailyEntry]]), evidence: records });

describe("coverage-aware equipment shadow question policy", () => {
  it("plans concept/benefit answers from owner-approved daily-life copy without a vehicle presence claim", () => {
    const match = evaluateEquipmentUserIntent("geri görüş kamerası ne işe yarar?").matches[0]!;
    const plan = createEquipmentExplanationShadowPlan(shadowContext([]), match);
    expect(plan).toMatchObject({ controlledExplanation: dailyEntry.userFacingExplanation, caveat: dailyEntry.caveat, vehiclePresenceClaimAllowed: false, publicEffectAllowed: false });
  });
  it("reports cohort disposition counts and remains authority-blocked", () => {
    const question = createEquipmentQuestionCandidate({ context: shadowContext([evidence("a"), evidence("b", "OPTIONAL"), evidence("c", "NOT_AVAILABLE")]), candidateIds: ids, featureCodes: [FEATURE], coreStagesComplete: true, material: true });
    expect(question.coverageDiagnostic[FEATURE]).toMatchObject({ candidateCount: 4, confirmedIncluded: 1, optional: 1, verifiedNotAvailable: 1, unknownUncovered: 1, comparableCoverageRatio: 0.75 });
    expect(question.blockedReasonCodes).toEqual(expect.arrayContaining(["EQUIPMENT_PUBLIC_AUTHORITY_DISABLED", "EXPLANATION_ONLY_NOT_QUESTION_AUTHORITY"]));
    expect(question.eligibleForFuturePublicUse).toBe(false);
  });

  it("blocks unknown-dominated, immaterial and premature questions", () => {
    const question = createEquipmentQuestionCandidate({ context: shadowContext([evidence("a")]), candidateIds: ids, featureCodes: [FEATURE], coreStagesComplete: false, material: false, stage: "FUNCTIONAL_NEEDS" });
    expect(question.blockedReasonCodes).toEqual(expect.arrayContaining(["UNKNOWN_DOMINATES_COHORT", "INSUFFICIENT_COHORT_COVERAGE", "FEATURE_NOT_MATERIAL", "CORE_STAGE_NOT_COMPLETE"]));
  });

  it("makes skip/unknown/not-important mutually exclusive options", () => {
    const question = createEquipmentQuestionCandidate({ context: shadowContext([]), candidateIds: ids, featureCodes: [FEATURE, "APPLE_CARPLAY"], coreStagesComplete: true, material: true });
    expect(question.selectionMode).toBe("MULTIPLE");
    expect(question.options.filter((item) => ["NOT_IMPORTANT", "UNKNOWN", "SKIP"].includes(item.id)).every((item) => item.exclusive)).toBe(true);
  });

  it("keeps all public decision state byte-equivalent", () => {
    const decision = Object.freeze({ memoryEvents: ["e1"], constraints: ["c1"], eligibleCandidateIds: ids, rankedCandidateIds: [...ids].reverse(), readiness: "READY",
      selectedPublicQuestion: "usage", action: "ASK", offer: null, consentLifecycle: "NONE", cards: [], publicMessage: "Aynı", authorizedFacts: [] });
    const comparison = compareEquipmentIntentQuestionShadowOnOff(decision, () => ({ intent: evaluateEquipmentUserIntent("geri kamera olsun"),
      question: createEquipmentQuestionCandidate({ context: shadowContext([evidence("a")]), candidateIds: ids, featureCodes: [FEATURE], coreStagesComplete: true, material: true }) }));
    expect(comparison.equivalent).toBe(true); expect(comparison.on).toBe(comparison.off);
  });
});
