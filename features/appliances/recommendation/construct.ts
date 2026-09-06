import { evaluateAppliancesCandidates } from "../candidate/evaluate";
import { projectActiveAppliancesContext } from "../context/projection";
import type { AppliancesConversationState } from "../contracts";
import { digestRecommendationConstructionPolicy as fingerprint } from "../governance/recommendationConstructionPolicyAuthority";
import { planAppliancesQuestion } from "../planner/plan";
import { evaluateAppliancesCandidateSelection } from "../selection/evaluate";
import type { AppliancesCandidateSelectionResult } from "../selection/types";
import { evaluateAppliancesSufficiency } from "../sufficiency/evaluate";
import type { RecommendationAuthority } from "./current.server";

export type RecordValue = Readonly<Record<string, unknown>>;
export const records = (value: unknown): RecordValue[] => {
  if (!Array.isArray(value) || value.some(v => !v || typeof v !== "object" || Array.isArray(v))) throw new Error("MALFORMED_RECORDS");
  return value;
};
const refs = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.some(v => typeof v !== "string")) throw new Error("MALFORMED_REFS");
  return value;
};
const exact = (value: unknown): string => { if (typeof value !== "string" || !value) throw new Error("MISSING_IDENTITY"); return value; };
export function evaluateRecommendationChain(bundle: RecommendationAuthority, state: AppliancesConversationState) {
  const { authority, price } = bundle;
  const evaluation = evaluateAppliancesCandidates({ authority, state, price });
  const planner = planAppliancesQuestion({ authority, policy: bundle.question, state, evaluation, price });
  const sufficiency = evaluateAppliancesSufficiency({ authority, state, evaluation, planner, price, policy: bundle.sufficiency });
  const selection = evaluateAppliancesCandidateSelection({ authority, state, evaluation, sufficiency, policy: bundle.selection });
  return { evaluation, planner, sufficiency, selection };
}
export interface ProductIdentity { readonly productId: string; readonly brand: string; readonly model: string; readonly configurationIdentity: string; readonly market: string }
export function productIdentity(catalog: RecordValue, id: string): ProductIdentity {
  const p = records(catalog.products).find(p => p.productId === id);
  if (!p || p.market !== "TR") throw new Error("UNKNOWN_PRODUCT_IDENTITY");
  return { productId: id, brand: exact(p.configurationIdentity).split("|")[0], model: exact(p.manufacturerModelIdentifier), configurationIdentity: exact(p.configurationIdentity), market: exact(p.market) };
}
export interface EvidenceUnit { readonly productId: string; readonly evidenceRef: string; readonly statement: string; readonly evidence: RecordValue }
export interface Disclosure { readonly id: string; readonly category: string; readonly message: string; readonly evidenceRefs: readonly string[] }
export interface RecommendationArtifact {
  readonly artifactSchemaVersion: "appliances-recommendation/v1";
  readonly artifactKind: "SINGLE_PRODUCT_RECOMMENDATION" | "TIED_SET_EXPLANATION" | "TRADE_OFF_SET_EXPLANATION" | "NO_RECOMMENDATION_CONSTRUCTIBLE";
  readonly exactProductIdentities: readonly ProductIdentity[];
  readonly selectionOutcome: Exclude<AppliancesCandidateSelectionResult["outcome"], "FAILED_CLOSED">;
  readonly selectionResultFingerprint: string;
  readonly catalogIdentityAndDigests: RecordValue;
  readonly semanticRegistryIdentityAndDigest: RecordValue;
  readonly questionPolicyIdentityAndDigest: RecordValue;
  readonly sufficiencyPolicyIdentityAndDigest: RecordValue;
  readonly candidateSelectionPolicyIdentityAndDigest: RecordValue;
  readonly selectionRuntimeVersion: string;
  readonly contextRevision: number;
  readonly contextFingerprint: string;
  readonly candidateEvaluationFingerprint: string;
  readonly sufficiencyFingerprint: string;
  readonly candidatePoolFingerprint: string;
  readonly userNeedsAddressed: readonly RecordValue[];
  readonly nonSelectionActiveAcceptedNeeds: readonly RecordValue[];
  readonly hardConstraintsSatisfied: readonly RecordValue[];
  readonly governedReasons: readonly string[];
  readonly technicalEvidenceUnits: readonly EvidenceUnit[];
  readonly capabilityEvidenceUnits: readonly EvidenceUnit[];
  readonly dailyLifeInterpretationUnits: readonly { productId: string; semanticRef: string; evidenceRefs: readonly string[]; statement: string }[];
  readonly limitationsAndTradeoffs: readonly string[];
  readonly unknownConflictedNonComparableEvidence: readonly RecordValue[];
  readonly requiredDisclosures: readonly Disclosure[];
  readonly priceCoverageAndFreshness: { readonly status: string; readonly snapshot: RecordValue | null; readonly products: readonly RecordValue[]; readonly observations: readonly RecordValue[]; readonly budgetUnknownAlternatives: readonly ProductIdentity[] };
  readonly lifecycleAndMarketApplicability: readonly RecordValue[];
  readonly warrantyDisclosure: readonly EvidenceUnit[];
  readonly constructionPolicyIdentity: string;
  readonly constructionPolicyDigest: string;
  readonly realizationPolicyVersion: "appliances-deterministic-realization/v1";
  readonly selectionEvidence: Exclude<AppliancesCandidateSelectionResult, { outcome: "FAILED_CLOSED" }>;
  readonly rationaleBindings: readonly RecordValue[];
  readonly deterministicArtifactFingerprint: string;
}
export type ConstructionResult = { readonly status: "CONSTRUCTED"; readonly artifact: RecommendationArtifact } | { readonly status: "FAILED_CLOSED"; readonly reason: string };

const labels: Record<string, string> = { RATED_CAPACITY_KG: "Anma kapasitesi", BODY_WIDTH_MM: "Gövde genişliği", BODY_HEIGHT_MM: "Gövde yüksekliği", BODY_DEPTH_MM: "Gövde derinliği", SPIN_NOISE_DB: "Standart sıkma gürültüsü", ENERGY_EFFICIENCY_CLASS: "Enerji sınıfı", ENERGY_CONSUMPTION_KWH_100_CYCLES: "Standart enerji tüketimi", SPIN_EFFICIENCY_CLASS: "Sıkma verim sınıfı", WATER_CONSUMPTION_L_CYCLE: "Standart su tüketimi" };
const disclosureCopy: Record<string, string> = {
  LIMITED_EXPERIENCE: "Bu model için doğrulanmış kullanıcı deneyimi bilgisi bulunmuyor.",
  UNKNOWN_INSTALLATION_CLEARANCE: "Gövde ölçüleri güvenli kurulumun tüm boşluklarını kanıtlamaz; kapak, hortum ve arka boşluk ayrıca doğrulanmalıdır.",
  CONNECTIVITY_SCOPE_UNVERIFIED: "Bağlantı özelliği tüm işlevlerin uzaktan kontrol edilebildiğini kanıtlamaz; desteklenen işlemler doğrulanmalıdır.",
  PRICE_SNAPSHOT_VOLATILE: "Fiyat geçici bir gözlemdir; satış teklifi veya kalıcı fiyat garantisi değildir.",
  PRICE_UNKNOWN_ALTERNATIVES_PRESERVED: "Fiyatı bilinmeyen alternatifler korunmuştur; bütçe dışı veya daha kötü sayılmamıştır.",
  PRICE_COVERAGE_LIMITED: "Fiyat kapsamı sınırlıdır; yalnız mevcut fiyat kaydı olan uygun adaylar bütçe bakımından karşılaştırılmıştır.",
  WARRANTY_SCOPE: "Tam ürün garantisi ile parça/motor garantisi farklıdır; kapsam ve koşullar birlikte okunmalıdır.",
  BUDGET_UNKNOWN_CANDIDATES_PRESERVED: "Fiyatı bilinmeyen adaylar ayrı tutuldu; bütçe dışında sayılmadı.",
  HARD_BUDGET_PRICE_COVERAGE_LIMITED: "Bütçe uygunluğu yalnız güncel fiyatı doğrulanmış adaylar için değerlendirildi.",
  SOFT_UNCERTAINTY_PRESENT: "Bazı tercihlerin kanıtı belirsiz; bunlar kesin uygunluk olarak sunulmadı.",
  TEMPORARILY_UNAVAILABLE: "Katalogdaki bazı adaylar geçici olarak bulunamıyor; bu kayıt stok garantisi değildir.",
};

/** Recomputes upstream authority; a caller-supplied selection is never trusted on its hash alone. */
export function constructRecommendation(bundle: RecommendationAuthority, state: AppliancesConversationState, supplied: AppliancesCandidateSelectionResult): ConstructionResult {
  try {
    const chain = evaluateRecommendationChain(bundle, state);
    if (chain.sufficiency.kind !== "RECOMMENDATION_POOL_ELIGIBLE" || chain.evaluation.status !== "READY" || supplied.outcome === "FAILED_CLOSED") throw new Error("NOT_CONSTRUCTIBLE");
    if (fingerprint(supplied) !== fingerprint(chain.selection)) throw new Error("SELECTION_FINGERPRINT_MISMATCH");
    const policy = bundle.construction.snapshot;
    if (fingerprint(policy.payload) !== policy.policyDigest) throw new Error("POLICY_RUNTIME_DIVERGENCE");
    const s = supplied, p = s.provenance, catalog = bundle.authority.catalog;
    const ids = s.outcome === "SELECTED_SINGLE" ? [s.selectedCandidateId] : s.outcome === "TIED_TOP_SET" ? [...s.tiedCandidateIds] : s.outcome === "NON_DOMINATED_SET" ? [...s.nonDominatedCandidateIds] : [];
    if ((s.outcome === "TIED_TOP_SET" || s.outcome === "NON_DOMINATED_SET") && ids.length < 2) throw new Error("IMPOSSIBLE_SET");
    const identities = ids.map(id => productIdentity(catalog, id));
    const bindings = records(catalog.decisionProjectionBindings).filter(b => ids.includes(String(b.productId)));
    const rationaleBindings = records(catalog.rationaleBindings).filter(b => ids.includes(String(b.productId)));
    if (ids.some(id => !bindings.some(b => b.productId === id) || !rationaleBindings.some(b => b.productId === id))) throw new Error("MISSING_REQUIRED_RATIONALE_BINDING");
    const technical = records(catalog.technicalFacts).filter(f => ids.includes(String(f.productId)));
    const capabilities = records(catalog.capabilityFacts).filter(f => ids.includes(String(f.productId)));
    const eligibleTechnical = new Set(bindings.flatMap(b => refs(b.eligibleTechnicalFactRefs)));
    const eligibleCapabilities = new Set(bindings.flatMap(b => [...refs(b.eligibleCapabilityFactRefs), ...refs(b.softPreferenceEligibleRefs)]));
    const technicalEvidenceUnits = technical.filter(f => f.factStatus === "VERIFIED" && eligibleTechnical.has(String(f.factId))).map(f => ({ productId: exact(f.productId), evidenceRef: exact(f.factId), statement: `${labels[String(f.factKey)] ?? f.factKey}: ${f.value} ${f.unit ?? ""}`.trim(), evidence: f }));
    const capabilityEvidenceUnits = capabilities.filter(f => f.status === "PRESENT" && eligibleCapabilities.has(String(f.capabilityFactId))).map(f => ({ productId: exact(f.productId), evidenceRef: exact(f.capabilityFactId), statement: `${f.capabilityId}: üretici tarafından belirtilen işlev mevcut; yalnız kayıtlı kapsam ve koşullarla.`, evidence: f }));
    const evidenceIds = new Set([...technicalEvidenceUnits, ...capabilityEvidenceUnits].map(f => f.evidenceRef));
    const semanticArtifacts = bundle.authority.semanticRegistry.artifacts as Record<string, { records?: unknown }>;
    const usage = semanticArtifacts["washing-machine-usage-semantics/v1"].records as unknown[][];
    const dailyLifeInterpretationUnits = rationaleBindings.map(b => {
      const evidenceRefs = [...refs(b.supportingTechnicalFactRefs), ...refs(b.supportingCapabilityFactRefs)];
      const semanticRef = exact(b.usageSemanticRef), name = semanticRef.split(":").at(-1);
      const row = usage.find(r => r[0] === name);
      if (!row || !evidenceRefs.length || evidenceRefs.some(ref => !evidenceIds.has(ref))) throw new Error("RATIONALE_EVIDENCE_BINDING_MISMATCH");
      return { productId: exact(b.productId), semanticRef, evidenceRefs, statement: name === "CAPACITY_USAGE" ? "Anma kapasitesi yük üst sınırını belirtir; uygunluk yıkama sıklığına, hacme ve büyük parçalara da bağlıdır. Kişi sayısından kesin kg hesabı yapılmaz." : exact(row[4]) };
    });
    const disclosureMap = new Map<string, Disclosure>();
    const add = (category: string, message = disclosureCopy[category] ?? category, id = category, evidenceRefs: readonly string[] = []) => {
      const semanticKey = `${category}\u0000${message}`;
      const prior = disclosureMap.get(semanticKey);
      disclosureMap.set(semanticKey, { id: prior?.id ?? id, category, message, evidenceRefs: [...new Set([...(prior?.evidenceRefs ?? []), ...evidenceRefs])] });
    };
    if (s.outcome === "TIED_TOP_SET") add("TIED_SELECTION", "Etkin ölçütlerde eşit kalan adaylar var; liste sırası tercih veya kazanan anlamına gelmez.");
    if (s.outcome === "NON_DOMINATED_SET") add("NON_DOMINATED_TRADE_OFF", "Ödünleşim veya karşılaştırılamayan kanıt nedeniyle tek kazanan yok; liste sırası sıralama değildir.");
    if (s.outcome === "NO_GOVERNED_SELECTION") add("NO_GOVERNED_SELECTION", "Tek ürün seçimi için yeterli ve açık bir ölçüt bulunmuyor.");
    if (ids.length) add("MARKET_APPLICABILITY_LIMITATION", "Bilgiler Türkiye pazarındaki bu ürün modeli ve yapılandırması için geçerlidir; başka pazar veya benzer model için genellenmez.");
    const requiredRefs = [...new Set([...bindings.flatMap(b => refs(b.requiredDisclosureRefs)), ...rationaleBindings.flatMap(b => [...refs(b.disclosureRefs), ...refs(b.limitationRefs), ...refs(b.tradeoffRefs)]), ...s.requiredDisclosureRefs])];
    for (const ref of requiredRefs) {
      const d = records(catalog.disclosures).find(d => d.disclosureId === ref);
      if (ref.startsWith("disclosure:") && !d) throw new Error("MANDATORY_DISCLOSURE_MISSING");
      if (d) add(exact(d.disclosureType), disclosureCopy[String(d.disclosureType)] ?? exact(d.controlledMeaning), ref, [exact(d.semanticTemplateRef)]);
      else if (ref.startsWith("price:")) add("PRICE_SNAPSHOT_VOLATILE", disclosureCopy.PRICE_SNAPSHOT_VOLATILE, ref);
      else add(ref);
    }
    const unknownConflictedNonComparableEvidence = [...technical.filter(f => f.factStatus !== "VERIFIED"), ...capabilities.filter(f => f.status === "UNKNOWN"), ...s.pairwiseComparisons.flatMap(pair => pair.dimensions.filter(d => d.state === "INDETERMINATE").map(d => ({ ...d, candidateAId: pair.candidateAId, candidateBId: pair.candidateBId })))];
    if (unknownConflictedNonComparableEvidence.length) add("EVIDENCE_UNKNOWN", "Bilinmeyen veya karşılaştırılamayan kanıtlar yokluk ya da olumsuz özellik olarak değerlendirilmedi.");
    if (capabilities.some(f => f.capabilityId === "SMART_CONNECTIVITY" && f.status === "PRESENT" && !Array.isArray((f.parameters as RecordValue)?.supportedActions))) add("CONNECTIVITY_SCOPE_UNVERIFIED");
    add("PRICE_SNAPSHOT_VOLATILE"); add("WARRANTY_SCOPE");
    if (s.budgetUnknownCandidateIds.length) { add("PRICE_UNKNOWN_ALTERNATIVES_PRESERVED"); add("PRICE_COVERAGE_LIMITED"); }
    const lifecycleAndMarketApplicability = ids.map(id => {
      const product = records(catalog.products).find(p => p.productId === id)!;
      const market = records(catalog.marketApplicability).find(m => m.productId === id);
      const lifecycle = records(catalog.lifecycle).find(l => l.productId === id);
      if (!market || market.status !== "VERIFIED" || !lifecycle || lifecycle.toState !== product.lifecycleState) throw new Error("MARKET_OR_LIFECYCLE_BINDING_MISMATCH");
      if (lifecycle.toState === "TEMPORARILY_UNAVAILABLE") add("TEMPORARILY_UNAVAILABLE", "Bu model geçici olarak bulunamıyor; katalogda yer alması stok garantisi değildir.", `${id}:TEMPORARILY_UNAVAILABLE`);
      return { productId: id, market, lifecycle };
    });
    const warrantyDisclosure = records(catalog.warranties).filter(f => ids.includes(String(f.productId))).map(f => ({ productId: exact(f.productId), evidenceRef: exact(f.warrantyId), statement: typeof f.durationMonths === "number" ? `${f.warrantyType === "STANDARD_FULL_PRODUCT_WARRANTY" ? "Standart tam ürün garantisi" : "Parça/koşullu garanti"}: ${f.durationMonths} ay; ${f.territory}, ${f.coveredScope} (${f.status}).` : `Garanti kapsamı veya süresi kesin ürün bağında doğrulanmadı; satın alma tarihinde yeniden kontrol edilmelidir (${f.status}).`, evidence: f }));
    if (ids.some(id => !warrantyDisclosure.some(w => w.productId === id))) throw new Error("WARRANTY_DISCLOSURE_MISSING");
    const active = [...projectActiveAppliancesContext(state.ledger).values()].filter(e=>!(e.conceptId==="BUDGET_SENSITIVITY"&&e.decisionUse==="NONE")).map(e => ({ eventId: e.eventId, conceptId: e.conceptId, value: e.normalizedValue, decisionUse: e.decisionUse }));
    const userNeedsAddressed = active.filter(e => s.activeSelectionDimensions.includes(e.conceptId as typeof s.activeSelectionDimensions[number]));
    const nonSelectionActiveAcceptedNeeds = active.filter(e => !userNeedsAddressed.includes(e));
    const hardConstraintsSatisfied = chain.evaluation.projection.candidates.filter(c => ids.includes(c.productId)).flatMap(c => c.reasons.filter(r => r.result === "COMPATIBLE").map(r => ({ ...r, productId: c.productId })));
    const governedReasons = [s.outcome === "SELECTED_SINGLE" ? s.eligibleInputCandidateIds.length === 1 ? "Uygunluk koşullarından sonra kalan tek aday; bu ifade diğer ürünlerden üstün olduğu anlamına gelmez." : "Kabul edilen tercihlerde, karşılaştırılabilir doğrulanmış kanıtlarla diğer uygun adaylara baskın kalan seçenek." : s.outcome === "TIED_TOP_SET" ? "Bu adaylar etkin seçim ölçütlerinde eşit; tek bir kazanan seçilmedi." : s.outcome === "NON_DOMINATED_SET" ? "Tercihler arasında ödünleşim veya kanıt belirsizliği var; tek bir kazanan seçilmedi." : "Tek ürün seçmek için yeterli ve açık bir ölçüt bulunmuyor; öneri oluşturulmadı."]; 
    if (s.outcome === "SELECTED_SINGLE" && s.eligibleInputCandidateIds.length > 1) {
      for (const dimension of s.activeSelectionDimensions) {
        const name = dimension === "LOW_NOISE_PRIORITY" ? "standart sıkma gürültüsü" : dimension === "DETERGENT_CONVENIENCE" ? "otomatik dozaj" : "desteklenen uzaktan işlemler";
        governedReasons.push(`Belirttiğin ${name} tercihi, bu havuzdaki aynı ölçüt için doğrulanmış kanıtlarla karşılaştırıldı; gerçek kullanım sonucu garantisi değildir.`);
      }
    }
    // Semantic projection permits price presentation in explicit budget mode only.
    const price = bundle.price.status === "UNAVAILABLE" || !p.priceSnapshot ? null : bundle.price.projection;
    const priceCoverageAndFreshness = {
      status: bundle.price.status,
      snapshot: price ? { snapshotId: price.snapshotId, projectionFingerprint: price.projectionFingerprint, publishedAt: price.publishedAt, expiresAt: price.expiresAt, observationTimeDisclosure: price.observationTimeDisclosure } : null,
      products: price ? records(price.products).filter(r => ids.includes(String(r.productId))) : [],
      observations: price ? records(price.observations).filter(r => ids.includes(String(r.productId))).map(r => Object.fromEntries(Object.entries(r).filter(([key]) => key !== "sourceReference"))) : [],
      budgetUnknownAlternatives: s.budgetUnknownCandidateIds.map(id => productIdentity(catalog, id)),
    };
    const artifactKind = s.outcome === "SELECTED_SINGLE" ? "SINGLE_PRODUCT_RECOMMENDATION" : s.outcome === "TIED_TOP_SET" ? "TIED_SET_EXPLANATION" : s.outcome === "NON_DOMINATED_SET" ? "TRADE_OFF_SET_EXPLANATION" : "NO_RECOMMENDATION_CONSTRUCTIBLE";
    const categoryOrder = (category: string): number => /TIED_SELECTION|NON_DOMINATED_TRADE_OFF|NO_GOVERNED_SELECTION/u.test(category) ? 0 : /MARKET|TEMPORARILY/u.test(category) ? 1 : /UNKNOWN|UNCERTAINTY/u.test(category) && !/BUDGET|PRICE|INSTALLATION/u.test(category) ? 3 : /CONFLICT/u.test(category) ? 4 : /NON_COMPARABLE/u.test(category) ? 5 : /CONNECTIVITY/u.test(category) ? 6 : /INSTALLATION/u.test(category) ? 7 : /PRICE|BUDGET/u.test(category) ? /VOLATILE/u.test(category) ? 9 : 8 : /WARRANTY/u.test(category) ? 10 : 11;
    const requiredDisclosures = [...disclosureMap.values()].sort((a, b) => categoryOrder(a.category) - categoryOrder(b.category) || a.id.localeCompare(b.id));
    const core = { artifactSchemaVersion: "appliances-recommendation/v1" as const, artifactKind, exactProductIdentities: identities, selectionOutcome: s.outcome, selectionResultFingerprint: s.deterministicResultFingerprint, catalogIdentityAndDigests: policy.payload.bindings.catalog, semanticRegistryIdentityAndDigest: policy.payload.bindings.semanticRegistry, questionPolicyIdentityAndDigest: policy.payload.bindings.questionPolicy, sufficiencyPolicyIdentityAndDigest: policy.payload.bindings.sufficiencyPolicy, candidateSelectionPolicyIdentityAndDigest: policy.payload.bindings.candidateSelectionPolicy, selectionRuntimeVersion: p.runtimeVersion, contextRevision: state.revision, contextFingerprint: p.contextFingerprint, candidateEvaluationFingerprint: p.candidateEvaluationFingerprint, sufficiencyFingerprint: p.inputSufficiencyResultFingerprint, candidatePoolFingerprint: p.inputPoolFingerprint, userNeedsAddressed, nonSelectionActiveAcceptedNeeds, hardConstraintsSatisfied, governedReasons, technicalEvidenceUnits, capabilityEvidenceUnits, dailyLifeInterpretationUnits, limitationsAndTradeoffs: [...s.uncertaintyDisclosures, ...disclosureMap.values()].map(d => typeof d === "string" ? d : d.message), unknownConflictedNonComparableEvidence, requiredDisclosures, priceCoverageAndFreshness, lifecycleAndMarketApplicability, warrantyDisclosure, constructionPolicyIdentity: policy.payload.policyId, constructionPolicyDigest: policy.policyDigest, realizationPolicyVersion: "appliances-deterministic-realization/v1" as const, selectionEvidence: s, rationaleBindings };
    return { status: "CONSTRUCTED", artifact: { ...core, artifactKind, deterministicArtifactFingerprint: fingerprint(core) } };
  } catch (error) { return { status: "FAILED_CLOSED", reason: error instanceof Error ? error.message : "CONSTRUCTION_FAILURE" }; }
}
