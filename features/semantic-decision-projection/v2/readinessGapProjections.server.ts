import { immutableDigest } from "./canonical";
import type { ActiveCatalogInventoryEntry } from "./domainPackAdmission";
import type { SemanticDecisionProjectionV2 } from "./contract";

export const READINESS_GAP_CATEGORY_IDS = Object.freeze(["AIR_PURIFIER", "BUILT_IN_MICROWAVE_OVEN", "HEADPHONES", "HOB", "SPLIT_AIR_CONDITIONER", "WASHING_MACHINE"] as const);

function gapProjection(entry: ActiveCatalogInventoryEntry): SemanticDecisionProjectionV2 {
  const effects = Object.freeze(entry.exactOfferingIds.map((exactOfferingId) => Object.freeze({ exactOfferingId, effect: "unknownRetain" as const, uncertainty: "UNKNOWN" as const, partition: null, evidenceRefs: Object.freeze([]), exactKnownMismatch: false })));
  return Object.freeze({
    schemaVersion: "SemanticDecisionProjection/v2",
    identity: Object.freeze({ projectionId: `readiness-gap.${entry.departmentId.toLocaleLowerCase()}.${entry.categoryId.toLocaleLowerCase()}`, categoryId: entry.categoryId, scope: "EXACT_OFFERING" }),
    offerings: Object.freeze(entry.exactOfferingIds.map((exactOfferingId) => Object.freeze({ exactOfferingId, categoryId: entry.categoryId, market: "TR", configurationId: exactOfferingId, variantId: exactOfferingId }))),
    semanticAuthority: Object.freeze({ authorityId: `${entry.departmentId}:${entry.categoryId}:readiness-gap`, version: "INFORMATION_ONLY/v1", digest: immutableDigest(entry) }),
    applicability: Object.freeze({ market: "TR", configurationIds: Object.freeze(entry.exactOfferingIds), effectiveFrom: "2026-09-08T00:00:00.000+03:00", explicitlyApplies: true, limitations: Object.freeze(["Aktif exact kimlikler kapsanır; kanıtlı material decision alanı bulunmadığı için P etkisi yoktur."]) }),
    factCapabilityRefs: Object.freeze([]), sources: Object.freeze([]),
    technicalPredicate: Object.freeze({ field: "UNRESOLVED_P_MATERIALITY", operator: "EXISTS", value: false, context: "Kategori readiness gap", regime: "NO_EVIDENCED_KNOWN_PARTITION" }),
    dailyLifeConsequence: Object.freeze({ statementTr: "Bu exact ürün için P kararına katılabilecek kanıtlı günlük-hayat semantiği henüz bulunamadı; durum UNKNOWN ve nötrdür.", conditions: Object.freeze(["Exact aktif katalog kimliği korunur."]), limitations: Object.freeze(["Kanıt bulunana kadar soru, avantaj, ceza veya sıralama üretilemez."]), nonGuarantees: Object.freeze(["UNKNOWN yokluk, uyumsuzluk veya daha kötü anlamına gelmez."]) }),
    userNeed: Object.freeze({ needId: `${entry.categoryId}.readiness-gap`, statementTr: "Kanıtlı kategoriye özgü günlük-hayat ayrımı", decisionUse: "NONE" }),
    materialQuestion: Object.freeze({ questionId: `suppressed.${entry.categoryId}.no-evidenced-partition`, publicTurkishQuestion: "Bu kategori için kanıtlı bir aday ayrımı bulunmadığından ek soru sorulmaz.", answerDomain: Object.freeze([{ answerId: "UNKNOWN", labelTr: "Kanıt yok", establishesExplicitRequirement: false }]), prerequisites: Object.freeze([]), candidateEffectByAnswer: Object.freeze({ UNKNOWN: effects }), decisionUseOnExplicitAnswer: "NONE", predominantlyUnknownSuppressionCode: "SUPPRESSED_NO_EVIDENCED_KNOWN_PARTITIONS" }),
    uncertainty: "UNKNOWN",
    inheritance: Object.freeze({ sourceScope: "EXACT_OFFERING", targetScope: "EXACT_OFFERING", allowedPurpose: "EXPLANATION", explicitApplicabilityRequired: true, identityBridgeRequired: false, blockedByConflict: false, blockedByConflictRefs: Object.freeze([]), foreignMarketDecisionAuthority: "NONE" }),
    personaDecisionPolicy: Object.freeze({ maximumAggregateScore: 0.75, membershipEffect: "NONE", sufficiencyEffect: "NONE", singleWinnerEffect: "NONE" }),
    honestAllowedOutcomes: Object.freeze(["NO_MATERIAL_QUESTION", "UNKNOWN_CANDIDATES_RETAINED", "INSUFFICIENT_EVIDENCE", "NON_RANKED_CANDIDATE_POOL", "NO_SINGLE_WINNER"] as const), governedComparison: false,
  });
}

export function buildReadinessGapProjections(inventory: readonly ActiveCatalogInventoryEntry[]): readonly SemanticDecisionProjectionV2[] {
  return Object.freeze(READINESS_GAP_CATEGORY_IDS.map((categoryId) => {
    const entry = inventory.find((item) => item.categoryId === categoryId);
    if (!entry) throw new Error(`READINESS_GAP_INVENTORY_MISSING:${categoryId}`);
    return gapProjection(entry);
  }));
}
