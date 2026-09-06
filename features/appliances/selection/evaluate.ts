import { createHash } from "node:crypto";
import { fingerprintActiveAppliancesContext } from "../candidate/evaluate";
import { APPLIANCES_CANDIDATE_EVALUATION_POLICY_VERSION } from "../candidate/types";
import { projectActiveAppliancesContext } from "../context/projection";
import { CANDIDATE_SELECTION_POLICY_ID } from "../governance/candidateSelectionPolicyAuthority";
import { APPLIANCES_QUESTION_SELECTION_POLICY_VERSION } from "../planner/types";
import { APPLIANCES_SUFFICIENCY_RUNTIME_VERSION } from "../sufficiency/types";
import { APPLIANCES_CANDIDATE_SELECTION_RUNTIME_VERSION, type AppliancesCandidateSelectionInput, type AppliancesCandidateSelectionResult, type DimensionComparison, type DominanceRecord, type PairwiseComparisonRecord, type SelectionDimension, type SelectionFailureReason } from "./types";

type Json = Record<string, unknown>;
const ACTIVE: Readonly<Record<SelectionDimension, string>> = Object.freeze({ REMOTE_CONTROL: "WANTED", DETERGENT_CONVENIENCE: "WANTED", LOW_NOISE_PRIORITY: "IMPORTANT" });
const SUPPORTED_POLICY_DIGESTS = new Set([
  "86f88ae227d4d59e1866f18ef5663a5432b571f07360e9942ec8706ac46dbfaf",
  "d6665b24f8097fee1c99cd84c9855f777d2d8241be05f3417aa2cc2bd6af9ea6",
]);
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value as Json).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
const fingerprint = (value: unknown): string => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
const sortedUnique = (values: readonly string[]): string[] => [...new Set(values)].sort((a, b) => a.localeCompare(b));
const fail = (reason: SelectionFailureReason): AppliancesCandidateSelectionResult => ({ outcome: "FAILED_CLOSED", reason, deterministicResultFingerprint: fingerprint({ outcome: "FAILED_CLOSED", reason }) });
const reverse = (state: DimensionComparison["state"]): DimensionComparison["state"] => state === "BETTER" ? "WORSE" : state === "WORSE" ? "BETTER" : state;

export function evaluateAppliancesCandidateSelection(input: AppliancesCandidateSelectionInput): AppliancesCandidateSelectionResult {
  if (input.policy.status !== "READY") return fail("SELECTION_POLICY_AUTHORITY_FAILURE");
  const policy = input.policy.snapshot, bindings = policy.payload.bindings;
  if (policy.payload.policyId !== CANDIDATE_SELECTION_POLICY_ID || !SUPPORTED_POLICY_DIGESTS.has(policy.policyDigest) || policy.payload.model.kind !== "RULE_BASED_PARETO_DOMINANCE" || policy.payload.model.globalWeights !== "NONE" || policy.payload.model.contextualWeights !== "NONE" || policy.payload.model.totalOrderGuaranteed) return fail("POLICY_RUNTIME_DIVERGENCE");
  if (bindings.candidateEvaluationPolicy !== APPLIANCES_CANDIDATE_EVALUATION_POLICY_VERSION || bindings.questionSelectionPolicy !== APPLIANCES_QUESTION_SELECTION_POLICY_VERSION || bindings.selectionInputContract !== `${APPLIANCES_SUFFICIENCY_RUNTIME_VERSION}:RECOMMENDATION_POOL_ELIGIBLE`) return fail("DEPENDENCY_BINDING_MISMATCH");
  if (input.sufficiency.kind !== "RECOMMENDATION_POOL_ELIGIBLE") return fail("INPUT_NOT_RECOMMENDATION_POOL_ELIGIBLE");
  if (input.evaluation.status !== "READY") return fail("CANDIDATE_EVALUATION_FINGERPRINT_MISMATCH");
  const sufficiency = input.sufficiency;
  const pool = sufficiency.candidatePool.candidateIds, ids = [...pool].sort((a, b) => a.localeCompare(b));
  if (new Set(pool).size !== pool.length) return fail("DUPLICATE_CANDIDATE_ID");
  if (ids.some((id) => !input.authority.productIds.has(id))) return fail("UNKNOWN_CANDIDATE_ID");
  if (sufficiency.candidatePool.poolFingerprint !== fingerprint({ candidateIds: ids, canonicalOrderMeaning: "SERIALIZATION_ONLY" })) return fail("POOL_FINGERPRINT_MISMATCH");
  const { evaluationFingerprint: suppliedSufficiencyFingerprint, ...sufficiencyCore } = sufficiency;
  if (suppliedSufficiencyFingerprint !== fingerprint({ ...sufficiencyCore, evaluationFingerprint: "" })) return fail("SUFFICIENCY_FINGERPRINT_MISMATCH");
  const evaluation = input.evaluation.projection, provenance = sufficiency.provenance;
  if (input.state.revision !== evaluation.contextRevision || provenance.contextRevision !== evaluation.contextRevision) return fail("CONTEXT_REVISION_MISMATCH");
  if (fingerprintActiveAppliancesContext(input.state) !== evaluation.contextFingerprint || provenance.contextFingerprint !== evaluation.contextFingerprint) return fail("CONTEXT_FINGERPRINT_MISMATCH");
  if (provenance.evaluationFingerprint !== evaluation.evaluationFingerprint || provenance.candidatePolicy !== evaluation.policyVersion) return fail("CANDIDATE_EVALUATION_FINGERPRINT_MISMATCH");
  if (provenance.policyId !== bindings.sufficiencyPolicy.id || provenance.policyDigest !== bindings.sufficiencyPolicy.digest || provenance.questionPolicyId !== bindings.questionPolicy.id || provenance.questionPolicyDigest !== bindings.questionPolicy.digest || evaluation.catalogRelease !== bindings.catalog.release || evaluation.catalogDigest !== bindings.catalog.releaseDigest || evaluation.membershipDigest !== bindings.catalog.membershipDigest || evaluation.semanticRegistryVersion !== bindings.semanticRegistry.id || evaluation.semanticDigest !== bindings.semanticRegistry.digest) return fail("DEPENDENCY_BINDING_MISMATCH");
  if (ids.some((id) => !sufficiency.candidatePartitions.knownEligibleCandidateIds.includes(id) || sufficiency.candidatePartitions.budgetUnknownCandidateIds.includes(id) || sufficiency.candidatePartitions.budgetIncompatibleCandidateIds.includes(id))) return fail("CANDIDATE_PARTITION_MISMATCH");
  const evaluatedIds = new Set(evaluation.candidates.filter((candidate) => candidate.eligibility === "ELIGIBLE").map((candidate) => candidate.productId));
  if (ids.some((id) => !evaluatedIds.has(id))) return fail("CANDIDATE_PARTITION_MISMATCH");

  const activeContext = projectActiveAppliancesContext(input.state.ledger), active: { dimension: SelectionDimension; eventId: string; value: "WANTED" | "IMPORTANT" }[] = [];
  for (const dimension of Object.keys(ACTIVE) as SelectionDimension[]) {
    const event = activeContext.get(dimension); if (!event) continue;
    const value = normalizedSelectionValue(dimension, event.normalizedValue);
    if (value === ACTIVE[dimension]) active.push({ dimension, eventId: event.eventId, value: value as "WANTED" | "IMPORTANT" });
    else if (value !== "NOT_IMPORTANT") return fail("UNKNOWN_ACTIVE_CONTEXT_VALUE");
  }
  const catalog = input.authority.catalog as Json;
  const integrity = validateGovernedEvidence(catalog, ids); if (integrity) return fail(integrity);
  const disclosureRefs = sortedUnique([...sufficiency.disclosureCodes, ...evaluation.candidates.filter((candidate) => ids.includes(candidate.productId)).flatMap((candidate) => candidate.disclosureRefs), ...(evaluation.priceSnapshot ? [`price:${evaluation.priceSnapshot.snapshotId}:${evaluation.priceSnapshot.freshness}`] : [])]);
  const base = {
    provenance: { runtimeVersion: APPLIANCES_CANDIDATE_SELECTION_RUNTIME_VERSION, selectionPolicyId: policy.payload.policyId, selectionPolicyDigest: policy.policyDigest, catalogRelease: bindings.catalog.release, catalogDigest: bindings.catalog.releaseDigest, membershipDigest: bindings.catalog.membershipDigest, catalogArtifactSha256: bindings.catalog.artifactSha256, semanticRegistryId: bindings.semanticRegistry.id, semanticDigest: bindings.semanticRegistry.digest, questionPolicyId: bindings.questionPolicy.id, questionPolicyDigest: bindings.questionPolicy.digest, sufficiencyPolicyId: bindings.sufficiencyPolicy.id, sufficiencyPolicyDigest: bindings.sufficiencyPolicy.digest, candidateEvaluationPolicy: bindings.candidateEvaluationPolicy, questionSelectionPolicy: bindings.questionSelectionPolicy, inputSufficiencyResultFingerprint: suppliedSufficiencyFingerprint, inputPoolFingerprint: sufficiency.candidatePool.poolFingerprint, contextRevision: evaluation.contextRevision, contextFingerprint: evaluation.contextFingerprint, candidateEvaluationFingerprint: evaluation.evaluationFingerprint, ...(evaluation.priceSnapshot ? { priceSnapshot: evaluation.priceSnapshot } : {}) },
    eligibleInputCandidateIds: ids, activeSelectionDimensions: active.map((item) => item.dimension), budgetUnknownCandidateIds: sortedUnique(sufficiency.candidatePartitions.budgetUnknownCandidateIds), budgetIncompatibleCandidateIds: sortedUnique(sufficiency.candidatePartitions.budgetIncompatibleCandidateIds), requiredDisclosureRefs: disclosureRefs,
  };
  if (ids.length === 1) return finish({ ...base, outcome: "SELECTED_SINGLE", selectedCandidateId: ids[0]!, pairwiseComparisons: [], dominanceRecords: [], supportingEvidenceRefs: [], uncertaintyDisclosures: [] });
  if (active.length === 0) return finish({ ...base, outcome: "NO_GOVERNED_SELECTION", pairwiseComparisons: [], dominanceRecords: [], supportingEvidenceRefs: [], uncertaintyDisclosures: [] });

  const pairwise: PairwiseComparisonRecord[] = [], dominance: DominanceRecord[] = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const candidateAId = ids[i]!, candidateBId = ids[j]!;
    const dimensions = active.map((item) => compareDimension(catalog, candidateAId, candidateBId, item.dimension, item.eventId, item.value));
    const materialIndeterminacy = dimensions.some((item) => item.state === "INDETERMINATE");
    pairwise.push({ candidateAId, candidateBId, dimensions, materialIndeterminacy });
    if (!materialIndeterminacy) {
      const better = dimensions.filter((item) => item.state === "BETTER").map((item) => item.dimension), worse = dimensions.filter((item) => item.state === "WORSE").map((item) => item.dimension);
      if (better.length > 0 && worse.length === 0) dominance.push({ dominantCandidateId: candidateAId, dominatedCandidateId: candidateBId, betterDimensions: better });
      if (worse.length > 0 && better.length === 0) dominance.push({ dominantCandidateId: candidateBId, dominatedCandidateId: candidateAId, betterDimensions: dimensions.filter((item) => item.state === "WORSE").map((item) => item.dimension) });
    }
  }
  if (dominance.some((record) => dominance.some((other) => other.dominantCandidateId === record.dominatedCandidateId && other.dominatedCandidateId === record.dominantCandidateId))) return fail("INVALID_DOMINANCE_GRAPH");
  const dominatesAll = ids.filter((id) => ids.every((other) => other === id || dominance.some((record) => record.dominantCandidateId === id && record.dominatedCandidateId === other)));
  if (dominatesAll.length > 1) return fail("INVALID_DOMINANCE_GRAPH");
  const supportingEvidenceRefs = sortedUnique(pairwise.flatMap((record) => record.dimensions.flatMap((item) => [...item.evidenceRefsA, ...item.evidenceRefsB])));
  const uncertaintyDisclosures = sortedUnique(pairwise.flatMap((record) => record.dimensions.flatMap((item) => item.limitationCodes.map((code) => `${record.candidateAId}|${record.candidateBId}|${item.dimension}|${code}`))));
  const rationaleFailure = validateRationaleBindings(catalog, ids, active.map((item) => item.dimension), supportingEvidenceRefs); if (rationaleFailure) return fail(rationaleFailure);
  const common = { ...base, pairwiseComparisons: pairwise, dominanceRecords: dominance, supportingEvidenceRefs, uncertaintyDisclosures };
  if (dominatesAll.length === 1) return finish({ ...common, outcome: "SELECTED_SINGLE", selectedCandidateId: dominatesAll[0]! });
  const dominated = new Set(dominance.map((record) => record.dominatedCandidateId)), top = ids.filter((id) => !dominated.has(id));
  const topPairs = pairwise.filter((record) => top.includes(record.candidateAId) && top.includes(record.candidateBId));
  const exactKnownTie = top.length > 1 && topPairs.every((record) => record.dimensions.every((item) => item.state === "EQUAL"));
  return exactKnownTie ? finish({ ...common, outcome: "TIED_TOP_SET", tiedCandidateIds: top }) : finish({ ...common, outcome: "NON_DOMINATED_SET", nonDominatedCandidateIds: top });
}

function finish<T extends Omit<Extract<AppliancesCandidateSelectionResult, { outcome: Exclude<AppliancesCandidateSelectionResult["outcome"], "FAILED_CLOSED"> }>, "deterministicResultFingerprint">>(result: T): AppliancesCandidateSelectionResult { return { ...result, deterministicResultFingerprint: fingerprint(result) } as AppliancesCandidateSelectionResult; }
function normalizedSelectionValue(dimension: SelectionDimension, value: unknown): string | undefined { if (typeof value === "string") return value; if (typeof value === "boolean" && dimension === "LOW_NOISE_PRIORITY") return value ? "IMPORTANT" : "NOT_IMPORTANT"; if (!value || typeof value !== "object") return undefined; const object = value as Json; const raw = object.preference ?? object.priority ?? object.value ?? (typeof object.wanted === "boolean" ? object.wanted ? "WANTED" : "NOT_IMPORTANT" : undefined); return typeof raw === "string" ? raw : undefined; }

function compareDimension(catalog: Json, a: string, b: string, dimension: SelectionDimension, eventId: string, value: "WANTED" | "IMPORTANT"): DimensionComparison {
  const semanticMappingRef = `washing-machine-need-evidence-mappings/v1:${dimension}`;
  if (dimension === "LOW_NOISE_PRIORITY") {
    const facts = catalog.technicalFacts as Json[], fa = facts.find((fact) => fact.productId === a && fact.factKey === "SPIN_NOISE_DB"), fb = facts.find((fact) => fact.productId === b && fact.factKey === "SPIN_NOISE_DB");
    const refsA = fa ? [String(fa.factId), ...((fa.promotedAssertionRefs as string[] | undefined) ?? [])] : [], refsB = fb ? [String(fb.factId), ...((fb.promotedAssertionRefs as string[] | undefined) ?? [])] : [];
    const usable = (fact: Json | undefined): boolean => !!fact && fact.factStatus === "VERIFIED" && typeof fact.value === "number" && fact.unit === "dB" && fact.measurementContext === "SPIN_PHASE" && fact.regime === "EU_2019_2014" && Array.isArray(fact.promotedAssertionRefs) && fact.promotedAssertionRefs.length > 0;
    if (!usable(fa) || !usable(fb)) return { dimension, contextEventId: eventId, contextValue: value, state: "INDETERMINATE", evidenceRefsA: refsA, evidenceRefsB: refsB, semanticMappingRef, limitationCodes: [noiseLimitation(fa), noiseLimitation(fb)].filter((item) => item !== "COMPARABLE") };
    const av = fa!.value as number, bv = fb!.value as number; return { dimension, contextEventId: eventId, contextValue: value, state: av < bv ? "BETTER" : av > bv ? "WORSE" : "EQUAL", evidenceRefsA: refsA, evidenceRefsB: refsB, semanticMappingRef, limitationCodes: [] };
  }
  const capabilityId = dimension === "REMOTE_CONTROL" ? "SMART_CONNECTIVITY" : "AUTO_DOSING", caps = catalog.capabilityFacts as Json[], ca = caps.find((fact) => fact.productId === a && fact.capabilityId === capabilityId), cb = caps.find((fact) => fact.productId === b && fact.capabilityId === capabilityId);
  const stateA = capabilityState(ca, dimension === "REMOTE_CONTROL"), stateB = capabilityState(cb, dimension === "REMOTE_CONTROL");
  const refs = (fact: Json | undefined): string[] => fact ? [String(fact.capabilityFactId), ...((fact.assertionRefs as string[] | undefined) ?? []), ...(typeof fact.absenceEvidenceRef === "string" ? [fact.absenceEvidenceRef] : [])] : [];
  let state: DimensionComparison["state"] = "INDETERMINATE";
  if (stateA !== "UNKNOWN" && stateB !== "UNKNOWN") state = stateA === stateB ? "EQUAL" : stateA === "PRESENT" ? "BETTER" : "WORSE";
  return { dimension, contextEventId: eventId, contextValue: value, state, evidenceRefsA: refs(ca), evidenceRefsB: refs(cb), semanticMappingRef, limitationCodes: state === "INDETERMINATE" ? [stateA === "UNKNOWN" ? `${a}:UNKNOWN_OR_INCOMPLETE` : "", stateB === "UNKNOWN" ? `${b}:UNKNOWN_OR_INCOMPLETE` : ""].filter(Boolean) : [] };
}
function capabilityState(fact: Json | undefined, supportedActionsRequired: boolean): "PRESENT" | "NOT_AVAILABLE" | "UNKNOWN" { if (!fact) return "UNKNOWN"; if (fact.status === "NOT_AVAILABLE" && typeof fact.absenceEvidenceRef === "string" && fact.absenceEvidenceRef.length > 0 && fact.decisionEligibility === "ABSENCE_MATCH_ELIGIBLE") return "NOT_AVAILABLE"; if (fact.status === "PRESENT" && Array.isArray(fact.assertionRefs) && fact.assertionRefs.length > 0 && fact.decisionEligibility === "CONDITIONALLY_DECISION_ELIGIBLE") { if (!supportedActionsRequired) return "PRESENT"; const actions = (fact.parameters as Json | undefined)?.supportedActions; return Array.isArray(actions) && actions.length > 0 && actions.every((action) => typeof action === "string" && action.length > 0) ? "PRESENT" : "UNKNOWN"; } return "UNKNOWN"; }
function noiseLimitation(fact: Json | undefined): string { if (!fact) return "MISSING"; if (fact.factStatus === "CONFLICTED") return "CONFLICTED"; if (fact.factStatus !== "VERIFIED") return "UNKNOWN_OR_UNAUTHORIZED"; if (typeof fact.value !== "number") return "MALFORMED_VALUE"; if (fact.unit !== "dB") return "NON_COMPARABLE_UNIT"; if (fact.measurementContext !== "SPIN_PHASE") return "NON_COMPARABLE_PHASE"; if (fact.regime !== "EU_2019_2014") return "NON_COMPARABLE_REGIME"; if (!Array.isArray(fact.promotedAssertionRefs) || fact.promotedAssertionRefs.length === 0) return "NOT_CURRENT_OR_AUTHORIZED"; return "COMPARABLE"; }

function validateGovernedEvidence(catalog: Json, ids: readonly string[]): SelectionFailureReason | undefined {
  const products = catalog.products as Json[], market = catalog.marketApplicability as Json[], lifecycle = catalog.lifecycle as Json[], facts = catalog.technicalFacts as Json[], caps = catalog.capabilityFacts as Json[], bindings = catalog.decisionProjectionBindings as Json[];
  for (const id of ids) {
    const product = products.find((item) => item.productId === id), marketRecord = market.find((item) => item.productId === id), lifecycleRecord = lifecycle.find((item) => item.productId === id), binding = bindings.find((item) => item.productId === id);
    if (!product || product.market !== "TR" || !marketRecord || marketRecord.market !== "TR" || marketRecord.status !== "VERIFIED" || marketRecord.marketApplicabilityId !== product.marketApplicabilityRef || !lifecycleRecord || lifecycleRecord.toState !== product.lifecycleState || !["CURRENT", "TEMPORARILY_UNAVAILABLE"].includes(String(product.lifecycleState))) return "INVALID_LIFECYCLE_OR_MARKET_APPLICABILITY";
    const eligibleFacts = new Set((binding?.eligibleTechnicalFactRefs as string[] | undefined) ?? []), eligibleCaps = new Set((binding?.softPreferenceEligibleRefs as string[] | undefined) ?? []);
    for (const fact of facts.filter((item) => item.productId === id && item.factKey === "SPIN_NOISE_DB")) if (typeof fact.factId !== "string" || !["VERIFIED", "REPORTED", "UNKNOWN", "CONFLICTED"].includes(String(fact.factStatus)) || (fact.factStatus === "VERIFIED" && (!eligibleFacts.has(String(fact.factId)) || typeof fact.value !== "number" || !Number.isFinite(fact.value)))) return "MALFORMED_TECHNICAL_FACT";
    for (const cap of caps.filter((item) => item.productId === id && ["SMART_CONNECTIVITY", "AUTO_DOSING"].includes(String(item.capabilityId)))) if (typeof cap.capabilityFactId !== "string" || !["PRESENT", "NOT_AVAILABLE", "UNKNOWN"].includes(String(cap.status)) || !Array.isArray(cap.assertionRefs) || !cap.parameters || typeof cap.parameters !== "object" || (cap.status === "PRESENT" && !eligibleCaps.has(String(cap.capabilityFactId))) || (cap.status === "NOT_AVAILABLE" && (typeof cap.absenceEvidenceRef !== "string" || cap.decisionEligibility !== "ABSENCE_MATCH_ELIGIBLE"))) return "MALFORMED_CAPABILITY_EVIDENCE";
  }
}
function validateRationaleBindings(catalog: Json, ids: readonly string[], active: readonly SelectionDimension[], participating: readonly string[]): SelectionFailureReason | undefined { const bindings = ((catalog.rationaleBindings as Json[] | undefined) ?? []).filter((binding) => ids.includes(String(binding.productId)) && active.some((dimension) => String(binding.supportedNeedRef).endsWith(`:${dimension}`))); for (const binding of bindings) { const refs = [...((binding.supportingCapabilityFactRefs as string[] | undefined) ?? []), ...((binding.supportingTechnicalFactRefs as string[] | undefined) ?? [])]; if (refs.length === 0 || refs.some((ref) => !participating.includes(ref))) return "RATIONALE_EVIDENCE_BINDING_MISMATCH"; } }
export const reversePairwiseStateForTests = reverse;
