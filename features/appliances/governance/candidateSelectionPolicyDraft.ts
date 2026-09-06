import { z } from "zod";

export const CANDIDATE_SELECTION_POLICY_ID = "WASHING_MACHINE_CANDIDATE_SELECTION_POLICY/v0.1" as const;
const classification = z.enum(["EXISTING_PRODUCT_AUTHORITY", "EXISTING_SEMANTIC_AUTHORITY", "EXISTING_ARCHITECTURE_CONSTRAINT", "DERIVED_GOVERNANCE_PROPOSAL", "UNRESOLVED_PRODUCT_DECISION"]);
const text = z.string().min(1);
const sha = z.string().regex(/^[a-f0-9]{64}$/u);
const rule = z.strictObject({
  ruleId: z.string().regex(/^CSP-\d{3}$/u), conceptId: text, activeValue: text,
  semanticAuthorityRef: text, evidence: z.array(text).min(1), comparison: text,
  unknownBehavior: text, conflictBehavior: text, tieBehavior: text,
  rationaleRef: text, selectionRole: z.enum(["ACTIVE", "DISCLOSURE_ONLY", "STRUCTURAL"]),
  governanceClassification: classification,
});
const scenario = z.strictObject({ scenarioId: z.string().regex(/^S-\d{2}$/u), name: text, outcome: text, ruleRefs: z.array(text).min(1) });
const decision = z.strictObject({
  decisionId: z.string().regex(/^PDR-\d{3}$/u), topic: text, currentAuthorityEvidence: text,
  proposedDecision: text, alternativesConsidered: z.array(text).min(1), runtimeConsequence: text,
  riskIfUnresolved: text, governanceClassification: classification, approvalRequired: z.boolean(),
});

export const washingMachineCandidateSelectionPolicyDraftSchema = z.strictObject({
  schemaVersion: z.literal("washing-machine-candidate-selection-policy-draft/v1"),
  policyId: z.literal(CANDIDATE_SELECTION_POLICY_ID), governanceStatus: z.literal("READY_FOR_APPROVAL"),
  lifecycle: z.literal("DRAFT"), runtimeActive: z.literal(false), department: z.literal("APPLIANCES"),
  capability: z.literal("WASHING_MACHINE"), market: z.literal("TR"), stage: z.literal("AŞAMA_1"),
  createdAt: z.string().datetime({ offset: true }), creationWorkUnit: z.literal("WU-APPL-CANDIDATE-SELECTION-RANKING-POLICY-01"),
  bindings: z.strictObject({
    catalog: z.strictObject({ release: z.literal("APPLIANCES-WM-TR-v0.1"), releaseDigest: sha, membershipDigest: sha, artifactSha256: sha }),
    semanticRegistry: z.strictObject({ id: z.literal("WASHING_MACHINE_SEMANTIC_REGISTRY/v0.1"), digest: sha }),
    questionPolicy: z.strictObject({ id: z.literal("WASHING_MACHINE_QUESTION_POLICY/v0.1"), digest: sha }),
    sufficiencyPolicy: z.strictObject({ id: z.literal("WASHING_MACHINE_SUFFICIENCY_RECOMMENDATION_ENTRY_POLICY/v0.1"), digest: sha }),
    candidateEvaluationPolicy: z.literal("appliances-candidate-evaluation/v1"),
    selectionInputContract: z.literal("appliances-sufficiency-recommendation-entry-runtime/v1:RECOMMENDATION_POOL_ELIGIBLE"),
  }),
  inputPolicy: z.strictObject({ allowedOutcome: z.literal("RECOMMENDATION_POOL_ELIGIBLE"), acceptedContextStatuses: z.tuple([z.literal("ACCEPTED_EXPLICIT"), z.literal("ACCEPTED_CONFIRMED"), z.literal("ACCEPTED_INTERPRETED")]), rejectOutcomes: z.array(text).length(5), hardEligibilityReevaluation: z.literal("FORBIDDEN"), canonicalOrderEffect: z.literal("NONE"), verifiedProvenanceRequired: z.literal(true) }),
  model: z.strictObject({ kind: z.literal("RULE_BASED_PARETO_DOMINANCE"), prioritySource: z.literal("ACCEPTED_USER_CONTEXT_ONLY"), globalWeights: z.literal("NONE"), contextualWeights: z.literal("NONE"), totalOrderGuaranteed: z.literal(false), incomparableDimensions: z.literal("PRESERVE_NON_DOMINATED_SET"), strictDominance: text }),
  precedence: z.tuple([z.literal("FAILED_CLOSED"), z.literal("INPUT_GATE"), z.literal("SINGLETON"), z.literal("COMPARE_ACTIVE_PREFERENCES"), z.literal("PRESERVE_AMBIGUITY")]),
  outcomes: z.array(z.strictObject({ kind: z.enum(["SELECTED_SINGLE", "TIED_TOP_SET", "NON_DOMINATED_SET", "NO_GOVERNED_SELECTION", "FAILED_CLOSED"]), meaning: text, downstreamPermission: text, downstreamProhibition: text })).length(5),
  evidenceStates: z.strictObject({ UNKNOWN: text, MISSING: text, CONFLICTED: text, NOT_APPLICABLE: text, NON_COMPARABLE: text }),
  pricePolicy: z.strictObject({ postEligibilityRole: z.literal("DISCLOSURE_ONLY"), lowerPricePreference: z.literal("NOT_AUTHORIZED"), unknownPriceTreatment: z.literal("PRESERVED_SEPARATELY_WITHOUT_RANK"), affiliateEffect: z.literal("NONE") }),
  ties: z.strictObject({ singleWinnerRequired: z.literal(false), exactEqualityOutcome: z.literal("TIED_TOP_SET"), crossDimensionOutcome: z.literal("NON_DOMINATED_SET"), noActivePreferenceOutcome: z.literal("NO_GOVERNED_SELECTION"), plannerReentry: z.literal("PERMITTED_ONLY_BY_SEPARATELY_APPROVED_TIE_RESOLUTION_QUESTION_POLICY"), forbiddenTieBreaks: z.array(text).min(6) }),
  rationaleBoundary: z.strictObject({ effect: z.literal("EXPLANATION_ONLY"), countEffect: z.literal("NONE"), evidenceBindingRequired: z.literal(true), limitationsAndUncertaintyDisclosed: z.literal(true) }),
  persona: z.strictObject({ authority: z.literal("DERIVED_PLANNING"), decisionUse: z.literal("NONE"), directCandidateEffect: z.literal("NONE"), selectionEffect: z.literal("NONE"), rankingEffect: z.literal("NONE") }),
  outputContract: z.strictObject({ requiredFields: z.array(text).min(8), authorizesDecisionReady: z.literal(false), authorizesDecisionAuthorization: z.literal(false), authorizesDecisionCard: z.literal(false), authorizesCommerce: z.literal(false) }),
  failClosedRules: z.array(text).min(14), rules: z.array(rule).min(10), scenarios: z.array(scenario).length(16), productDecisionRegister: z.array(decision).min(14),
  scope: z.strictObject({ runtimeRanker: z.literal("OUT_OF_SCOPE"), recommendationConstruction: z.literal("OUT_OF_SCOPE"), decisionAuthorization: z.literal("OUT_OF_SCOPE"), activePointer: z.literal("ABSENT"), frozenRelease: z.literal("ABSENT") }),
});

export type CandidateSelectionPolicyValidation = { readonly status: "VALID_DRAFT" } | { readonly status: "INVALID_DRAFT"; readonly reasons: readonly string[] };
export function validateWashingMachineCandidateSelectionPolicyDraft(input: unknown, knownConceptIds: ReadonlySet<string>, knownFactIds: ReadonlySet<string>, knownCapabilityIds: ReadonlySet<string>): CandidateSelectionPolicyValidation {
  const parsed = washingMachineCandidateSelectionPolicyDraftSchema.safeParse(input);
  if (!parsed.success) return { status: "INVALID_DRAFT", reasons: parsed.error.issues.map((issue) => `SCHEMA:${issue.path.join(".")}`) };
  const p = parsed.data, reasons: string[] = [];
  const ruleIds = p.rules.map((rule) => rule.ruleId), decisionIds = p.productDecisionRegister.map((decision) => decision.decisionId), scenarioIds = p.scenarios.map((scenario) => scenario.scenarioId);
  if (new Set(ruleIds).size !== ruleIds.length) reasons.push("DUPLICATE_RULE_ID");
  if (new Set(decisionIds).size !== decisionIds.length) reasons.push("DUPLICATE_DECISION_ID");
  if (new Set(scenarioIds).size !== scenarioIds.length) reasons.push("DUPLICATE_SCENARIO_ID");
  for (const rule of p.rules) {
    if (rule.selectionRole !== "STRUCTURAL" && !knownConceptIds.has(rule.conceptId)) reasons.push(`UNKNOWN_CONCEPT:${rule.ruleId}`);
    for (const evidence of rule.evidence) {
      if (evidence.startsWith("FACT:") && !knownFactIds.has(evidence.slice(5))) reasons.push(`UNKNOWN_FACT:${rule.ruleId}`);
      if (evidence.startsWith("CAPABILITY:") && !knownCapabilityIds.has(evidence.slice(11))) reasons.push(`UNKNOWN_CAPABILITY:${rule.ruleId}`);
    }
  }
  if (p.rules.some((rule) => /CATALOG_ORDER|PRODUCT_ID_ORDER|AFFILIATE|RATIONALE_COUNT/u.test(rule.comparison))) reasons.push("UNAUTHORIZED_INFLUENCE");
  if (p.productDecisionRegister.some((decision) => decision.governanceClassification === "UNRESOLVED_PRODUCT_DECISION")) reasons.push("MATERIAL_DECISION_UNRESOLVED");
  if (p.scenarios.some((scenario) => scenario.ruleRefs.some((ref) => !ruleIds.includes(ref)))) reasons.push("UNKNOWN_SCENARIO_RULE_REF");
  if (p.persona.selectionEffect !== "NONE" || p.persona.rankingEffect !== "NONE") reasons.push("PERSONA_AUTHORITY_VIOLATION");
  if (p.pricePolicy.affiliateEffect !== "NONE") reasons.push("AFFILIATE_AUTHORITY_VIOLATION");
  if (p.model.globalWeights !== "NONE" || p.model.contextualWeights !== "NONE") reasons.push("UNAUTHORIZED_WEIGHT");
  if (p.scope.activePointer !== "ABSENT" || p.scope.frozenRelease !== "ABSENT" || p.runtimeActive) reasons.push("DRAFT_ACTIVATION_VIOLATION");
  return reasons.length ? { status: "INVALID_DRAFT", reasons } : { status: "VALID_DRAFT" };
}
