import { STROLLER_AUTHORITY_DIGEST, STROLLER_DOMAIN_PACK } from "@/features/baby/domainPack";
import { STROLLER_PRODUCTS, STROLLER_SOURCES } from "@/features/baby/catalog";
import { MOBILITY_AUTHORITY_DIGEST, MOBILITY_DOMAIN_PACK } from "@/features/mobility/domainPack";
import { MOBILITY_PRODUCTS, MOBILITY_SOURCES } from "@/features/mobility/catalog";
import { CORDLESS_DRILL_AUTHORITY_DIGEST, CORDLESS_DRILL_DOMAIN_PACK } from "@/features/cordless-drill/domainPack";
import { CORDLESS_DRILL_PRODUCTS } from "@/features/cordless-drill/catalog";
import { immutableDigest } from "./canonical";
import type { CandidateEffect, SemanticDecisionProjectionV2, SourceReference, Uncertainty } from "./contract";

type FactValue = string | number | boolean | "UNKNOWN";
interface CoreCandidate { readonly id: string; readonly configurationId: string; readonly fact: FactValue; readonly evidenceIds: readonly string[] }
interface CoreProjectionInput {
  readonly departmentId: string; readonly categoryId: string; readonly authorityVersion: string; readonly authorityDigest: `sha256:${string}`;
  readonly projectionId: string; readonly questionId: string; readonly questionTr: string; readonly needId: string; readonly needTr: string;
  readonly field: string; readonly operator: "EQ" | "GTE" | "LTE"; readonly threshold: string | number | boolean; readonly unit?: string;
  readonly context: string; readonly regime: string; readonly candidates: readonly CoreCandidate[]; readonly sources: readonly SourceReference[];
  readonly qualifies: (value: Exclude<FactValue, "UNKNOWN">) => boolean;
}
const fixedAt = "2026-09-08T00:00:00.000+03:00";
const uncertainty = (fact: FactValue): Uncertainty => fact === "UNKNOWN" ? "UNKNOWN" : "KNOWN";

function effects(input: CoreProjectionInput, answerId: "YES" | "NO" | "UNKNOWN"): readonly CandidateEffect[] {
  return Object.freeze(input.candidates.map((candidate) => {
    if (candidate.fact === "UNKNOWN") return Object.freeze({ exactOfferingId: candidate.id, effect: "unknownRetain" as const, uncertainty: "UNKNOWN" as const, partition: null, evidenceRefs: Object.freeze([]), exactKnownMismatch: false });
    const qualifies = input.qualifies(candidate.fact);
    return Object.freeze({ exactOfferingId: candidate.id, effect: answerId === "YES" && qualifies ? "softOnly" as const : "none" as const, uncertainty: "KNOWN" as const, partition: qualifies ? "DIRECTION_MATCH" : "DIRECTION_OTHER", evidenceRefs: answerId === "YES" ? candidate.evidenceIds : Object.freeze([]), exactKnownMismatch: false });
  }));
}

function projection(input: CoreProjectionInput): SemanticDecisionProjectionV2 {
  return Object.freeze({
    schemaVersion: "SemanticDecisionProjection/v2",
    identity: Object.freeze({ projectionId: input.projectionId, categoryId: input.categoryId, scope: "EXACT_OFFERING" }),
    offerings: Object.freeze(input.candidates.map((candidate) => Object.freeze({ exactOfferingId: candidate.id, categoryId: input.categoryId, market: "TR", configurationId: candidate.configurationId, variantId: candidate.id }))),
    semanticAuthority: Object.freeze({ authorityId: `${input.departmentId}:${input.categoryId}:active-domain-pack`, version: input.authorityVersion, digest: input.authorityDigest }),
    applicability: Object.freeze({ market: "TR", configurationIds: Object.freeze(input.candidates.map((candidate) => candidate.configurationId)), effectiveFrom: fixedAt, explicitlyApplies: true, limitations: Object.freeze(["Yalnız exact aktif Türkiye katalog üyeleri ve kaynakta açıkça bulunan fact kullanılır."]) }),
    factCapabilityRefs: Object.freeze(input.candidates.map((candidate) => Object.freeze({ factId: `${input.projectionId}:${candidate.id}`, capabilityId: input.field, sourceRefs: candidate.evidenceIds }))),
    sources: input.sources,
    technicalPredicate: Object.freeze({ field: input.field, operator: input.operator, value: input.threshold, ...(input.unit ? { unit: input.unit } : {}), context: input.context, regime: input.regime }),
    dailyLifeConsequence: Object.freeze({ statementTr: input.needTr, conditions: Object.freeze([input.context]), limitations: Object.freeze(["Gerçek sonuç kullanım, çevre ve kurulum koşullarına bağlıdır."]), nonGuarantees: Object.freeze(["Bu yön tek ürün kazananı, kalite, güvenlik veya sonuç garantisi değildir."]) }),
    userNeed: Object.freeze({ needId: input.needId, statementTr: input.needTr, decisionUse: "SOFT_PREFERENCE" }),
    materialQuestion: Object.freeze({ questionId: input.questionId, publicTurkishQuestion: input.questionTr, answerDomain: Object.freeze([{ answerId: "YES", labelTr: "Evet, önemli", establishesExplicitRequirement: true }, { answerId: "NO", labelTr: "Hayır, önemli değil", establishesExplicitRequirement: false }, { answerId: "UNKNOWN", labelTr: "Henüz bilmiyorum", establishesExplicitRequirement: false }]), prerequisites: Object.freeze([{ prerequisiteId: `${input.needId}:context`, description: input.context, required: true }]), candidateEffectByAnswer: Object.freeze({ YES: effects(input, "YES"), NO: effects(input, "NO"), UNKNOWN: effects(input, "UNKNOWN") }), decisionUseOnExplicitAnswer: "SOFT_PREFERENCE", predominantlyUnknownSuppressionCode: "SUPPRESSED_PREDOMINANTLY_UNKNOWN" }),
    uncertainty: input.candidates.every((candidate) => uncertainty(candidate.fact) === "KNOWN") ? "KNOWN" : "UNKNOWN",
    inheritance: Object.freeze({ sourceScope: "EXACT_OFFERING", targetScope: "EXACT_OFFERING", allowedPurpose: "TECHNICAL_DECISION", explicitApplicabilityRequired: true, identityBridgeRequired: false, blockedByConflict: false, blockedByConflictRefs: Object.freeze([]), foreignMarketDecisionAuthority: "NONE" }),
    personaDecisionPolicy: Object.freeze({ maximumAggregateScore: 0.75, membershipEffect: "NONE", sufficiencyEffect: "NONE", singleWinnerEffect: "NONE" }),
    honestAllowedOutcomes: Object.freeze(["ASK_ONE_QUESTION", "NO_MATERIAL_QUESTION", "KNOWN_CANDIDATE_PARTITION", "UNKNOWN_CANDIDATES_RETAINED", "SOFT_COMPARISON_ONLY", "NON_RANKED_CANDIDATE_POOL", "NO_SINGLE_WINNER"] as const),
    governedComparison: true,
  });
}

const source = (item: { readonly id: string; readonly url: string; readonly authority: string }): SourceReference => Object.freeze({ sourceId: item.id, authority: "PRIMARY", digest: immutableDigest(item), market: "TR", capturedAt: fixedAt, reliability: item.authority.includes("TR") ? 0.95 : 0.85, locator: item.url });
const drillSources = CORDLESS_DRILL_PRODUCTS.map((item) => source({ id: `DRILL:${item.exactProductId}`, url: item.sourceUrl, authority: item.sourceUrl.includes(".tr") || item.sourceUrl.includes("/tr/") ? "MANUFACTURER_TR" : "MANUFACTURER_REGIONAL" }));

export function buildWave1CoreDomainProjections(): readonly SemanticDecisionProjectionV2[] {
  const strollerCandidates = STROLLER_PRODUCTS.map((item): CoreCandidate => ({ id: item.exactProductId, configurationId: item.configurationIdentity, fact: item.facts.strollerWeightKg, evidenceIds: item.evidenceIds }));
  const mobilitySources = MOBILITY_SOURCES.filter((item) => item.id !== "AMAZON-TR-DISCOVERY").map(source);
  const mobility = (categoryId: string, fact: (item: typeof MOBILITY_PRODUCTS[number]) => FactValue | undefined) => MOBILITY_PRODUCTS.filter((item) => item.categoryId === categoryId).map((item): CoreCandidate => ({ id: item.exactProductId, configurationId: item.configurationIdentity, fact: fact(item) ?? "UNKNOWN", evidenceIds: item.evidenceIds.filter((id) => id !== "AMAZON-TR-DISCOVERY") }));
  const drillCandidates = CORDLESS_DRILL_PRODUCTS.map((item): CoreCandidate => ({ id: item.exactProductId, configurationId: item.configuration, fact: item.technical.impact === "NO" ? false : true, evidenceIds: [`DRILL:${item.exactProductId}`] }));
  return Object.freeze([
    projection({ departmentId: "BABY_AND_CHILD", categoryId: "STROLLER", authorityVersion: STROLLER_DOMAIN_PACK.release, authorityDigest: STROLLER_AUTHORITY_DIGEST, projectionId: "wave1.stroller.carry-weight", questionId: "p.stroller.carry-weight", questionTr: "Puseti merdivende sık taşıyacağınız için 8 kg veya daha hafif olması sizin için önemli mi?", needId: "stroller.daily-carry", needTr: "Merdivende ve bagaja kaldırırken daha düşük taşıma yükü", field: "facts.strollerWeightKg", operator: "LTE", threshold: 8, unit: "kg", context: "Puseti merdivende sık elde taşıma", regime: "MANUFACTURER_EXACT_STROLLER_WEIGHT", candidates: strollerCandidates, sources: Object.freeze(STROLLER_SOURCES.map(source)), qualifies: (value) => typeof value === "number" && value <= 8 }),
    projection({ departmentId: "MOBILITY", categoryId: "ELECTRIC_SCOOTER", authorityVersion: MOBILITY_DOMAIN_PACK.release, authorityDigest: MOBILITY_AUTHORITY_DIGEST, projectionId: "wave1.scooter.route-range", questionId: "p.scooter.route-range", questionTr: "Günlük yaklaşık 25 km rotanız için üreticinin açıkladığı menzilin en az 30 km olması önemli mi?", needId: "scooter.route-buffer", needTr: "Günlük rotada üretici menzil beyanı içinde ek mesafe payı", field: "facts.manufacturerRangeKm", operator: "GTE", threshold: 30, unit: "km", context: "Yaklaşık 25 km günlük rota; gerçek menzil garanti değildir", regime: "MANUFACTURER_RATED_RANGE", candidates: mobility("ELECTRIC_SCOOTER", (item) => typeof item.facts.manufacturerRangeKm === "number" || item.facts.manufacturerRangeKm === "UNKNOWN" ? item.facts.manufacturerRangeKm : "UNKNOWN"), sources: Object.freeze(mobilitySources), qualifies: (value) => typeof value === "number" && value >= 30 }),
    projection({ departmentId: "MOBILITY", categoryId: "ELECTRIC_BICYCLE", authorityVersion: MOBILITY_DOMAIN_PACK.release, authorityDigest: MOBILITY_AUTHORITY_DIGEST, projectionId: "wave1.ebike.hill-torque", questionId: "p.ebike.hill-torque", questionTr: "Rotanız düzenli dik yokuş içerdiği için kanıtlı motor torkunun en az 50 Nm olması önemli mi?", needId: "ebike.hill-assistance", needTr: "Dik yokuşta daha yüksek kanıtlı motor torku yönü", field: "facts.torqueNm", operator: "GTE", threshold: 50, unit: "Nm", context: "Düzenli dik yokuş; tork tırmanma sonucu veya güvenlik garantisi değildir", regime: "MANUFACTURER_RATED_TORQUE", candidates: mobility("ELECTRIC_BICYCLE", (item) => typeof item.facts.torqueNm === "number" || item.facts.torqueNm === "UNKNOWN" ? item.facts.torqueNm : "UNKNOWN"), sources: Object.freeze(mobilitySources), qualifies: (value) => typeof value === "number" && value >= 50 }),
    projection({ departmentId: "MOBILITY", categoryId: "BICYCLE", authorityVersion: MOBILITY_DOMAIN_PACK.release, authorityDigest: MOBILITY_AUTHORITY_DIGEST, projectionId: "wave1.bicycle.fold-storage", questionId: "p.bicycle.fold-storage", questionTr: "Bisikleti küçük evde saklamak için exact ürünün katlanır sınıfta olması önemli mi?", needId: "bicycle.small-home-storage", needTr: "Küçük evde katlanır ürün sınıfıyla saklama alanını yönetme", field: "facts.intendedClass", operator: "EQ", threshold: "Katlanır şehir", context: "Küçük evde saklama; exact katlı ölçüler ayrıca doğrulanır", regime: "EXACT_INTENDED_CLASS", candidates: mobility("BICYCLE", (item) => typeof item.facts.intendedClass === "string" ? item.facts.intendedClass : "UNKNOWN"), sources: Object.freeze(mobilitySources), qualifies: (value) => value === "Katlanır şehir" }),
    projection({ departmentId: "TOOLS", categoryId: "CORDLESS_DRILL", authorityVersion: CORDLESS_DRILL_DOMAIN_PACK.release, authorityDigest: CORDLESS_DRILL_AUTHORITY_DIGEST, projectionId: "wave1.drill.impact-mode", questionId: "p.drill.impact-mode", questionTr: "Beton veya duvar işiniz için exact modelde darbeli delme modu bulunması önemli mi?", needId: "drill.masonry-impact", needTr: "Uygun uç ve güvenlik koşullarıyla darbeli delme moduna erişim", field: "technical.impact", operator: "EQ", threshold: true, context: "Beton veya duvar delme; malzeme, uç ve güvenlik doğrulaması gerekir", regime: "MANUFACTURER_EXACT_IMPACT_MODE", candidates: drillCandidates, sources: Object.freeze(drillSources), qualifies: (value) => value === true }),
  ]);
}
