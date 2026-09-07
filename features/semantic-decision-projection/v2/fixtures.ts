import { immutableDigest } from "./canonical";
import type {
  CandidateEffect,
  DecisionUse,
  PredicateOperator,
  ProjectionScope,
  SemanticDecisionProjectionV2,
  Uncertainty,
} from "./contract";

interface FixtureCandidate {
  readonly id: string;
  readonly partition: string | null;
  readonly uncertainty: Uncertainty;
}

interface ProjectionFixtureInput {
  readonly projectionId: string;
  readonly categoryId: string;
  readonly questionId: string;
  readonly questionTr: string;
  readonly needId: string;
  readonly needTr: string;
  readonly field: string;
  readonly operator: PredicateOperator;
  readonly value: string | number | boolean;
  readonly unit?: string;
  readonly context: string;
  readonly regime: string;
  readonly desiredPartition: string;
  readonly candidates: readonly FixtureCandidate[];
  readonly decisionUse?: DecisionUse;
  readonly authorityVersion?: string;
  readonly authorityDigest?: `sha256:${string}`;
  readonly scope?: ProjectionScope;
  readonly suppressionCode?: string;
  readonly fixtureClassification?: SemanticDecisionProjectionV2["fixtureClassification"];
}

const sourceIdFor = (projectionId: string) => `fixture-source:${projectionId}`;

function effectsFor(input: ProjectionFixtureInput, answerId: "YES" | "NO" | "UNKNOWN"): readonly CandidateEffect[] {
  return Object.freeze(input.candidates.map((candidate) => {
    if (candidate.uncertainty !== "KNOWN") return Object.freeze({ exactOfferingId: candidate.id, effect: "unknownRetain" as const, uncertainty: candidate.uncertainty, partition: candidate.partition, evidenceRefs: Object.freeze([]), exactKnownMismatch: false });
    if (answerId !== "YES") return Object.freeze({ exactOfferingId: candidate.id, effect: "none" as const, uncertainty: candidate.uncertainty, partition: candidate.partition, evidenceRefs: Object.freeze([]), exactKnownMismatch: false });
    const retain = candidate.partition === input.desiredPartition;
    return Object.freeze({ exactOfferingId: candidate.id, effect: retain ? "knownRetain" as const : "knownExclude" as const, uncertainty: candidate.uncertainty, partition: candidate.partition, evidenceRefs: Object.freeze([sourceIdFor(input.projectionId)]), exactKnownMismatch: !retain });
  }));
}

function makeProjection(input: ProjectionFixtureInput): SemanticDecisionProjectionV2 {
  const decisionUse = input.decisionUse ?? "HARD_FILTER";
  const sourceId = sourceIdFor(input.projectionId);
  const authorityDigest = input.authorityDigest ?? immutableDigest({ fixtureAuthority: input.projectionId });
  const knownEffects = effectsFor(input, "YES");
  const neutralEffects = Object.freeze(input.candidates.map((candidate) => Object.freeze({ exactOfferingId: candidate.id, effect: candidate.uncertainty === "KNOWN" ? "none" as const : "unknownRetain" as const, uncertainty: candidate.uncertainty, partition: candidate.partition, evidenceRefs: Object.freeze([]), exactKnownMismatch: false })));
  const candidateEffectByAnswer = decisionUse === "QUESTION_INPUT"
    ? Object.freeze({ YES: neutralEffects, NO: neutralEffects, UNKNOWN: neutralEffects })
    : Object.freeze({ YES: knownEffects, NO: effectsFor(input, "NO"), UNKNOWN: effectsFor(input, "UNKNOWN") });
  return Object.freeze({
    schemaVersion: "SemanticDecisionProjection/v2",
    identity: Object.freeze({ projectionId: input.projectionId, categoryId: input.categoryId, scope: input.scope ?? "EXACT_OFFERING" }),
    offerings: Object.freeze(input.candidates.map((candidate) => Object.freeze({ exactOfferingId: candidate.id, categoryId: input.categoryId, market: "TR", configurationId: `${candidate.id}:configuration`, classId: input.categoryId, familyId: `${input.categoryId}:family`, modelId: candidate.id.split(":").slice(0, -1).join(":"), variantId: candidate.id }))),
    semanticAuthority: Object.freeze({ authorityId: `${input.categoryId}:semantic-authority`, version: input.authorityVersion ?? "contract-fixture/v2", digest: authorityDigest }),
    applicability: Object.freeze({ market: "TR", configurationIds: Object.freeze(input.candidates.map((candidate) => `${candidate.id}:configuration`)), effectiveFrom: "2026-09-07T00:00:00.000Z", explicitlyApplies: true, limitations: Object.freeze(["Fixture applicability is exact and synthetic; it is not a production fact."]) }),
    factCapabilityRefs: Object.freeze([{ factId: `${input.projectionId}:fact`, capabilityId: input.field, sourceRefs: Object.freeze([sourceId]) }]),
    sources: Object.freeze([{ sourceId, authority: "CONTRACT_FIXTURE" as const, digest: immutableDigest({ projectionId: input.projectionId, candidates: input.candidates }), market: "TR", capturedAt: "2026-09-07T00:00:00.000Z", reliability: 0.9 }]),
    technicalPredicate: Object.freeze({ field: input.field, operator: input.operator, value: input.value, ...(input.unit ? { unit: input.unit } : {}), context: input.context, regime: input.regime }),
    dailyLifeConsequence: Object.freeze({ statementTr: input.needTr, conditions: Object.freeze([input.context]), limitations: Object.freeze(["Gerçek sonuç kullanım ve ortam koşullarına bağlıdır."]), nonGuarantees: Object.freeze(["Teknik eşik kalite, memnuniyet veya tek kazanan garantisi değildir."]) }),
    userNeed: Object.freeze({ needId: input.needId, statementTr: input.needTr, decisionUse }),
    materialQuestion: Object.freeze({
      questionId: input.questionId,
      publicTurkishQuestion: input.questionTr,
      answerDomain: Object.freeze([
        Object.freeze({ answerId: "YES", labelTr: "Evet, zorunlu", establishesExplicitRequirement: true }),
        Object.freeze({ answerId: "NO", labelTr: "Hayır, zorunlu değil", establishesExplicitRequirement: false }),
        Object.freeze({ answerId: "UNKNOWN", labelTr: "Henüz bilmiyorum", establishesExplicitRequirement: false }),
      ]),
      prerequisites: Object.freeze([{ prerequisiteId: `${input.needId}:context-confirmed`, description: input.context, required: true }]),
      candidateEffectByAnswer,
      decisionUseOnExplicitAnswer: decisionUse,
      ...(input.suppressionCode ? { predominantlyUnknownSuppressionCode: input.suppressionCode } : {}),
    }),
    uncertainty: "KNOWN",
    inheritance: Object.freeze({ sourceScope: input.scope ?? "EXACT_OFFERING", targetScope: "EXACT_OFFERING", allowedPurpose: "TECHNICAL_DECISION", explicitApplicabilityRequired: true, identityBridgeRequired: false, blockedByConflict: false, blockedByConflictRefs: Object.freeze([]), foreignMarketDecisionAuthority: "NONE" }),
    personaDecisionPolicy: Object.freeze({ maximumAggregateScore: 0.75, membershipEffect: "NONE", sufficiencyEffect: "NONE", singleWinnerEffect: "NONE" }),
    honestAllowedOutcomes: Object.freeze(["ASK_ONE_QUESTION", "NO_MATERIAL_QUESTION", "KNOWN_CANDIDATE_PARTITION", "UNKNOWN_CANDIDATES_RETAINED", "CONFLICTED_EVIDENCE_EXCLUDED_FROM_DECISION", "NON_RANKED_CANDIDATE_POOL", "NO_SINGLE_WINNER"] as const),
    governedComparison: decisionUse === "SOFT_PREFERENCE",
    fixtureClassification: input.fixtureClassification ?? "SYNTHETIC_CONTRACT_FIXTURE",
  });
}

const smartphoneCandidates = Object.freeze(Array.from({ length: 34 }, (_, index) => `fixture:smartphone:${String(index + 1).padStart(2, "0")}`));
const candidatesByRanges = (ranges: readonly { readonly through: number; readonly partition: string | null; readonly uncertainty: Uncertainty }[]): readonly FixtureCandidate[] => Object.freeze(smartphoneCandidates.map((id, index) => {
  const range = ranges.find((candidateRange) => index + 1 <= candidateRange.through)!;
  return Object.freeze({ id, partition: range.partition, uncertainty: range.uncertainty });
}));

export const SMARTPHONE_SHADOW_PILOT_LINEAGE = Object.freeze({
  commit: "8b5ee38c5837815ef4ef3e04ba8c435a77579048",
  digest: "sha256:489339776731d2498b2ba115822ab9da95fb13d8b696dfc8d92b1512ffe81f16" as const,
  checkoutArtifactPresence: "ABSENT_CONTRACT_FIXTURE_ONLY" as const,
});

export const SMARTPHONE_SUPPORT_CLOSURE_LINEAGE = Object.freeze({
  commit: "62ea022d528e7c062fecf10c0065e6039ed4efbf",
  digest: "sha256:1f112aba506258f45d01b7fd88ac811a98012834f1a95955dd2308314ce15868" as const,
  checkoutArtifactPresence: "ABSENT_CONTRACT_FIXTURE_ONLY" as const,
});

export function buildSmartphoneProjectionFixtures(): readonly SemanticDecisionProjectionV2[] {
  const shared = { categoryId: "SMARTPHONE", authorityVersion: SMARTPHONE_SHADOW_PILOT_LINEAGE.commit, authorityDigest: SMARTPHONE_SHADOW_PILOT_LINEAGE.digest, fixtureClassification: "PINNED_EXTERNAL_LINEAGE_CONTRACT_FIXTURE" as const };
  return Object.freeze([
    makeProjection({ ...shared, projectionId: "smartphone.tr-5g", questionId: "shadow.smartphone.tr-5g", questionTr: "Telefonu Türkiye’de 5G ile kullanabilmek sizin için zorunlu mu?", needId: "smartphone.network.tr-5g", needTr: "Türkiye’de 5G kullanabilme", field: "cellular.generation", operator: "GTE", value: 5, unit: "generation", context: "Türkiye operatör, bant ve kapsama uygunluğu ayrıca doğrulanır.", regime: "TR_NETWORK", desiredPartition: "5G", candidates: candidatesByRanges([{ through: 22, partition: "5G", uncertainty: "KNOWN" }, { through: 26, partition: "4G_ONLY", uncertainty: "KNOWN" }, { through: 34, partition: null, uncertainty: "UNKNOWN" }]) }),
    makeProjection({ ...shared, projectionId: "smartphone.telephoto", questionId: "shadow.smartphone.telephoto", questionTr: "Uzaktaki kişileri veya sahneleri dijital kırpma yerine telefoto kamerayla çekmeniz gerekiyor mu?", needId: "smartphone.camera.telephoto", needTr: "Uzak konuyu ayrı optik kamerayla kadraja alma", field: "camera.telephoto", operator: "EQ", value: true, context: "Telefoto varlığı görüntü kalitesi sıralaması değildir.", regime: "EXACT_CAMERA_CONFIGURATION", desiredPartition: "TELEPHOTO", candidates: candidatesByRanges([{ through: 10, partition: "TELEPHOTO", uncertainty: "KNOWN" }, { through: 28, partition: "NO_TELEPHOTO", uncertainty: "KNOWN" }, { through: 34, partition: null, uncertainty: "UNKNOWN" }]) }),
    makeProjection({ ...shared, projectionId: "smartphone.charging-80w", questionId: "shadow.smartphone.charging-80w", questionTr: "Gün içinde kısa bir şarj molası için en az 80 W kablolu şarj sizin için zorunlu mu?", needId: "smartphone.charging.short-break", needTr: "Kısa molada şarj kazanma potansiyeli", field: "charging.wiredPower", operator: "GTE", value: 80, unit: "W", context: "Uyumlu adaptör, kablo, sıcaklık ve şarj eğrisi gerçek süreyi değiştirir.", regime: "MANUFACTURER_RATED_WIRED_CHARGING", desiredPartition: "WIRED_80W_PLUS", candidates: candidatesByRanges([{ through: 8, partition: "WIRED_80W_PLUS", uncertainty: "KNOWN" }, { through: 30, partition: "WIRED_UNDER_80W", uncertainty: "KNOWN" }, { through: 34, partition: null, uncertainty: "UNKNOWN" }]) }),
    makeProjection({ categoryId: "SMARTPHONE", authorityVersion: SMARTPHONE_SUPPORT_CLOSURE_LINEAGE.commit, authorityDigest: SMARTPHONE_SUPPORT_CLOSURE_LINEAGE.digest, fixtureClassification: "PINNED_EXTERNAL_LINEAGE_CONTRACT_FIXTURE", projectionId: "smartphone.support-duration", questionId: "shadow.smartphone.support-duration", questionTr: "Telefonu yedi yıl boyunca güvenlik güncellemeleriyle kullanabilmek şart mı?", needId: "smartphone.support.longevity", needTr: "Uzun kullanım boyunca güvenlik desteği", field: "support.securityDuration", operator: "GTE", value: 7, unit: "years", context: "Yalnız model-kodlu üretici yaşam döngüsü taahhüdü süre kanıtıdır.", regime: "MANUFACTURER_TR_SUPPORT_POLICY", desiredPartition: "SEVEN_YEARS", candidates: candidatesByRanges([{ through: 8, partition: "SEVEN_YEARS", uncertainty: "KNOWN" }, { through: 16, partition: "BELOW_SEVEN_YEARS", uncertainty: "KNOWN" }, { through: 34, partition: null, uncertainty: "UNKNOWN" }]), suppressionCode: "SUPPRESSED_PREDOMINANTLY_DURATION_UNKNOWN" }),
  ]);
}

interface RepresentativeDefinition {
  readonly categoryId: string;
  readonly field: string;
  readonly operator: PredicateOperator;
  readonly value: string | number | boolean;
  readonly unit?: string;
  readonly context: string;
  readonly needTr: string;
  readonly questionTr: string;
  readonly passPartition: string;
  readonly failPartition: string;
}

const representativeDefinitions: readonly RepresentativeDefinition[] = Object.freeze([
  { categoryId: "LAPTOP", field: "physical.weight", operator: "LTE", value: 1.5, unit: "kg", context: "Her gün çantada taşıma", needTr: "Günlük taşınabilirlik", questionTr: "Her gün çantada taşıyacağınız için ağırlığın en fazla 1,5 kg olması zorunlu mu?", passPartition: "LTE_1_5_KG", failPartition: "GT_1_5_KG" },
  { categoryId: "HEADPHONES", field: "audio.activeNoiseCancellation", operator: "EQ", value: true, context: "Düzenli uçuşta motor gürültüsü", needTr: "Uçuşta dış sesi azaltma", questionTr: "Düzenli uçuşlarda aktif gürültü engelleme sizin için zorunlu mu?", passPartition: "ANC_PRESENT", failPartition: "ANC_ABSENT" },
  { categoryId: "REFRIGERATOR", field: "physical.width", operator: "LTE", value: 70, unit: "cm", context: "Doğrulanmış kurulum boşluğu", needTr: "Mutfağa fiziksel sığma", questionTr: "Kurulum boşluğu 70 cm’den dar olduğu için gövde genişliği en fazla 70 cm olmalı mı?", passPartition: "LTE_70_CM", failPartition: "GT_70_CM" },
  { categoryId: "ESPRESSO_MACHINE", field: "coffee.integratedGrinder", operator: "EQ", value: true, context: "Ayrı öğütücü kullanmama", needTr: "Çekirdekten fincana tek cihaz akışı", questionTr: "Ayrı öğütücü kullanmak istemediğiniz için dahili öğütücü zorunlu mu?", passPartition: "GRINDER_PRESENT", failPartition: "GRINDER_ABSENT" },
  { categoryId: "STROLLER", field: "physical.weight", operator: "LTE", value: 8, unit: "kg", context: "Merdivende elle taşıma", needTr: "Merdivende taşınabilirlik", questionTr: "Puseti merdivende taşıyacağınız için 8 kg veya daha hafif olması zorunlu mu?", passPartition: "LTE_8_KG", failPartition: "GT_8_KG" },
  { categoryId: "ELECTRIC_SCOOTER", field: "mobility.ratedRange", operator: "GTE", value: 30, unit: "km", context: "25 km günlük rota ve güvenlik payı", needTr: "Rotayı şarjsız tamamlama payı", questionTr: "Günlük rotanız 25 km olduğu için kanıtlı menzilin en az 30 km olması zorunlu mu?", passPartition: "GTE_30_KM", failPartition: "LT_30_KM" },
  { categoryId: "CORDLESS_DRILL", field: "tool.hammerMode", operator: "EQ", value: true, context: "Beton duvar delme", needTr: "Betonda darbeli delme", questionTr: "Beton delmek için darbeli delme modu zorunlu mu?", passPartition: "HAMMER_PRESENT", failPartition: "HAMMER_ABSENT" },
  { categoryId: "CARS", field: "dimensions.seats", operator: "GTE", value: 7, unit: "seats", context: "Düzenli altı yolcu ve sürücü taşıma", needTr: "Yedi kişilik oturma kapasitesi", questionTr: "Düzenli altı yolcu taşıyacağınız için sürücü dahil en az 7 koltuk zorunlu mu?", passPartition: "GTE_7_SEATS", failPartition: "LT_7_SEATS" },
]);

export interface RepresentativeQuestionFixture {
  readonly categoryId: string;
  readonly classification: "SYNTHETIC_CONTRACT_FIXTURE";
  readonly good: SemanticDecisionProjectionV2;
  readonly bad: SemanticDecisionProjectionV2;
}

export function buildRepresentativeQuestionFixtures(): readonly RepresentativeQuestionFixture[] {
  return Object.freeze(representativeDefinitions.map((definition) => {
    const baseCandidates: readonly FixtureCandidate[] = Object.freeze([
      Object.freeze({ id: `fixture:${definition.categoryId.toLocaleLowerCase()}:a`, partition: definition.passPartition, uncertainty: "KNOWN" }),
      Object.freeze({ id: `fixture:${definition.categoryId.toLocaleLowerCase()}:b`, partition: definition.failPartition, uncertainty: "KNOWN" }),
      Object.freeze({ id: `fixture:${definition.categoryId.toLocaleLowerCase()}:c`, partition: null, uncertainty: "UNKNOWN" }),
    ]);
    const common = { categoryId: definition.categoryId, field: definition.field, operator: definition.operator, value: definition.value, ...(definition.unit ? { unit: definition.unit } : {}), context: definition.context, regime: "SYNTHETIC_EXACT_TR", candidates: baseCandidates, desiredPartition: definition.passPartition };
    return Object.freeze({
      categoryId: definition.categoryId,
      classification: "SYNTHETIC_CONTRACT_FIXTURE" as const,
      good: makeProjection({ ...common, projectionId: `representative.${definition.categoryId}.good`, questionId: `fixture.${definition.categoryId}.material`, questionTr: definition.questionTr, needId: `fixture.${definition.categoryId}.need`, needTr: definition.needTr }),
      bad: makeProjection({ ...common, projectionId: `representative.${definition.categoryId}.bad`, questionId: `fixture.${definition.categoryId}.generic`, questionTr: "Bu ürünün performansı sizin için önemli mi?", needId: `fixture.${definition.categoryId}.generic`, needTr: "Tanımsız genel performans", decisionUse: "QUESTION_INPUT" }),
    });
  }));
}

export const REFERENCE_RUNTIME_CHARACTERIZATION = Object.freeze([
  Object.freeze({ runtime: "CARS", sourceRef: "features/decision/v2/action/questionGeneration.ts", behavior: "Candidate facts form known value groups; a question is emitted only when at least two groups remain. Unknown values are omitted from groups without becoming false, current candidate IDs remain compatible, and selection uses deterministic utility and semantic-key tie breaking.", adapterSeam: "Translate generated QuestionCandidate partitions into SemanticDecisionProjection/v2 in shadow after candidate evaluation and before selectMaterialQuestion." }),
  Object.freeze({ runtime: "WASHING_MACHINE", sourceRef: "codex/appliances-stage2-unified-release-20260906:features/appliances/sufficiency/evaluate.ts", behavior: "Hard UNKNOWN or NOT_EVALUATED yields UNRESOLVED_HARD_UNCERTAINTY. NO_AUTHORIZED_MATERIAL_QUESTION is neutral planning absence and does not imply sufficiency; multiple candidates remain a non-ranked pool.", adapterSeam: "Observe candidate partitions and planner output after evaluation; never replace sufficiency precedence." }),
  Object.freeze({ runtime: "ELECTRONICS", sourceRef: "codex/smartphone-v02-production-lineage:features/electronics/conversation.server.ts", behavior: "The generic category policy asks questionPlan entries by order and repeat state. IMPORTANT is stored as QUESTION_INPUT; current generic questions do not themselves contain executable candidateEffectByAnswer partitions.", adapterSeam: "Mirror category questionPlan plus exact catalog facts into the shadow executor; do not activate smartphone candidate flags or rewrite conversation state." }),
]);
