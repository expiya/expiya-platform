import { z } from "zod";

export const RECOMMENDATION_CONSTRUCTION_POLICY_ID = "WASHING_MACHINE_RECOMMENDATION_CONSTRUCTION_POLICY/v0.1" as const;
const text = z.string().min(1);
const sha = z.string().regex(/^[a-f0-9]{64}$/u);
const classification = z.enum(["EXISTING_PRODUCT_AUTHORITY", "EXISTING_SEMANTIC_AUTHORITY", "EXISTING_ARCHITECTURE_CONSTRAINT", "DERIVED_GOVERNANCE_PROPOSAL", "UNRESOLVED_PRODUCT_DECISION"]);
const outcome = z.enum(["SELECTED_SINGLE", "TIED_TOP_SET", "NON_DOMINATED_SET", "NO_GOVERNED_SELECTION", "FAILED_CLOSED"]);
const artifactKind = z.enum(["SINGLE_PRODUCT_RECOMMENDATION", "TIED_SET_EXPLANATION", "TRADE_OFF_SET_EXPLANATION", "NO_RECOMMENDATION_CONSTRUCTIBLE", "FAILED_CLOSED"]);
const rule = z.strictObject({
  ruleId: z.string().regex(/^RCP-\d{3}$/u), selectionOutcome: outcome, inputAuthority: z.array(text).min(1),
  allowedContent: text, requiredEvidence: z.array(text), requiredDisclosure: z.array(text), forbiddenClaim: z.array(text).min(1),
  downstreamPermission: text, governanceClassification: classification,
});
const scenario = z.strictObject({
  scenarioId: z.string().regex(/^S-\d{2}$/u), name: text, proposedArtifact: artifactKind,
  reason: text, ruleRefs: z.array(text).min(1),
});
const decision = z.strictObject({
  decisionId: z.string().regex(/^PDR-\d{3}$/u), topic: text, currentAuthorityEvidence: text,
  proposedDecision: text, alternativesConsidered: z.array(text).min(1), runtimeConsequence: text,
  riskIfUnresolved: text, governanceClassification: classification, approvalRequired: z.literal(true),
});

export const washingMachineRecommendationConstructionPolicyDraftSchema = z.strictObject({
  schemaVersion: z.literal("washing-machine-recommendation-construction-policy-draft/v1"),
  policyId: z.literal(RECOMMENDATION_CONSTRUCTION_POLICY_ID), governanceStatus: z.literal("READY_FOR_APPROVAL"),
  lifecycle: z.literal("DRAFT"), runtimeActive: z.literal(false), department: z.literal("APPLIANCES"),
  capability: z.literal("WASHING_MACHINE"), market: z.literal("TR"), stage: z.literal("AŞAMA_1"),
  createdAt: z.string().datetime({ offset: true }), creationWorkUnit: z.literal("WU-APPL-RECOMMENDATION-CONSTRUCTION-POLICY-01"),
  bindings: z.strictObject({
    catalog: z.strictObject({ release: z.literal("APPLIANCES-WM-TR-v0.1"), releaseDigest: sha, membershipDigest: sha, artifactSha256: sha }),
    semanticRegistry: z.strictObject({ id: z.literal("WASHING_MACHINE_SEMANTIC_REGISTRY/v0.1"), digest: sha }),
    questionPolicy: z.strictObject({ id: z.literal("WASHING_MACHINE_QUESTION_POLICY/v0.1"), digest: sha }),
    sufficiencyPolicy: z.strictObject({ id: z.literal("WASHING_MACHINE_SUFFICIENCY_RECOMMENDATION_ENTRY_POLICY/v0.1"), digest: sha }),
    candidateSelectionPolicy: z.strictObject({ id: z.literal("WASHING_MACHINE_CANDIDATE_SELECTION_POLICY/v0.1"), digest: sha }),
    selectionRuntimeInputContract: z.literal("appliances-candidate-selection-runtime/v1"),
  }),
  authorityDiscovery: z.array(z.strictObject({ area: text, finding: z.enum(["EXISTS_FULLY", "EXISTS_PARTIALLY", "EXISTS_NOT_ACTIVE_OR_FROZEN", "DOES_NOT_EXIST"]), evidence: z.array(text).min(1) })).min(7),
  precedence: z.tuple([z.literal("FAILED_CLOSED"), z.literal("VERIFY_DEPENDENCIES"), z.literal("VERIFY_SELECTION_RESULT"), z.literal("RESOLVE_ARTIFACT_KIND"), z.literal("ASSEMBLE_STRUCTURED_CONTENT"), z.literal("VALIDATE_COMPLETENESS"), z.literal("REALIZE_OPTIONAL_PROSE")]),
  outcomePolicy: z.array(z.strictObject({ selectionOutcome: outcome, artifactKind, singleProductAllowed: z.boolean(), behavior: text, constructibleGate: text })).length(5),
  artifactContract: z.strictObject({
    authoritativeForm: z.literal("STRUCTURED_ARTIFACT"), requiredFields: z.array(text).min(20),
    prohibitedFields: z.array(z.enum(["decisionAuthorization", "decisionReady", "decisionCardAuthority", "sellerSelection", "affiliateAction"])).length(5),
    fingerprintAlgorithm: z.literal("SHA256_CANONICAL_JSON_SORTED_KEYS_V1"), fingerprintInputs: z.array(text).min(12),
  }),
  rationaleContract: z.strictObject({
    allowedSources: z.array(text).min(8), forbiddenSources: z.array(text).min(7), minimumPackage: z.array(text).min(8),
    singletonLanguage: text, rationaleEligibilityEffect: z.literal("NONE"), mismatchEffect: z.literal("FAILED_CLOSED"),
    technicalInterpretationSeparation: z.strictObject({ fields: z.tuple([z.literal("technicalEvidenceStatement"), z.literal("capabilityStatement"), z.literal("authorizedDailyLifeInterpretation"), z.literal("userContextRelevance"), z.literal("limitationOrDisclosure")]), semanticAuthorityRequired: z.literal(true), supportingEvidenceRequired: z.literal(true), newTechnicalFactEffect: z.literal("FORBIDDEN") }),
  }),
  uncertaintyPolicy: z.array(z.strictObject({ state: z.enum(["UNKNOWN", "MISSING", "CONFLICTED", "NON_COMPARABLE", "TEMPORARILY_UNAVAILABLE", "CONNECTIVITY_PARAMETERS_INCOMPLETE"]), effect: z.enum(["BLOCK_IF_PARTICIPATING_OR_IDENTITY_CRITICAL", "DISCLOSE", "OMIT_ONLY_IF_PROVABLY_IMMATERIAL"]), rule: text })).length(6),
  disclosurePolicy: z.strictObject({ categories: z.array(text).min(14), catalogIdentityPreferred: z.literal(true), ordering: z.array(text).min(10), deduplication: z.literal("BY_EXACT_DISCLOSURE_ID_THEN_CATEGORY"), materialOmissionEffect: z.literal("FAILED_CLOSED") }),
  pricePolicy: z.strictObject({ authority: z.literal("VOLATILE_COMMERCE_PROJECTION"), hardBudgetClaim: text, partialCoverage: text, noHardBudget: text, staleAfterSelection: text, permanentTruth: z.literal(false), technicalFact: z.literal(false), sellerEffect: z.literal("NONE"), affiliateEffect: z.literal("NONE") }),
  realizationPolicy: z.strictObject({ model: z.literal("STRUCTURED_FACTS_PLUS_BOUNDED_MODEL_REALIZATION"), authoritativeLayer: z.literal("STRUCTURED_ARTIFACT"), language: z.literal("tr-TR"), templateOwner: z.literal("PRODUCT_CONTENT_GOVERNANCE"), realizationVersionRequired: z.literal(true), modelMay: z.array(text).length(2), modelMayNot: z.array(text).min(8), validation: z.literal("SEMANTIC_EQUIVALENCE_AND_MANDATORY_CONTENT_CHECK"), fallback: z.literal("DETERMINISTIC_TEMPLATES_OR_NO_PROSE"), violationEffect: z.literal("NO_PLAUSIBLE_RECOMMENDATION_PROSE") }),
  languagePolicy: z.strictObject({ allowedClaimClasses: z.array(text).min(5), forbiddenClaimClasses: z.array(text).min(8), reviewedTemplateRules: z.array(text).length(4), bestClaimAuthority: z.literal("FORBIDDEN_UNLESS_EXPLICIT_COMPARATIVE_AUTHORITY") }),
  persona: z.strictObject({ rationaleAuthority: z.literal("NONE"), contentEffect: z.literal("NONE"), orderingEffect: z.literal("NONE") }),
  commerce: z.strictObject({ sellerEffect: z.literal("NONE"), retailerEffect: z.literal("NONE"), affiliateEffect: z.literal("NONE") }),
  decisionAuthorizationBoundary: z.strictObject({ chain: z.literal("SELECTION_RESULT != RECOMMENDATION_ARTIFACT != DECISION_READY != DECISION_AUTHORIZATION != DECISION_CARD"), authorizesDecisionReady: z.literal(false), authorizesDecisionAuthorization: z.literal(false), authorizesDecisionCard: z.literal(false), consumableByLaterUnit: z.array(text).min(5), authorizationSufficiencyDefinedHere: z.literal(false) }),
  failClosedRules: z.array(text).min(16), traceabilityMatrix: z.array(rule).min(15), scenarios: z.array(scenario).length(17), productDecisionRegister: z.array(decision).min(17),
  scope: z.strictObject({ recommendationRuntime: z.literal("OUT_OF_SCOPE"), activePointer: z.literal("ABSENT"), frozenRelease: z.literal("ABSENT"), decisionAuthorization: z.literal("OUT_OF_SCOPE"), decisionCard: z.literal("OUT_OF_SCOPE"), advisor: z.literal("OUT_OF_SCOPE"), commerce: z.literal("OUT_OF_SCOPE") }),
});

export type RecommendationConstructionPolicyValidation = { readonly status: "VALID_DRAFT" } | { readonly status: "INVALID_DRAFT"; readonly reasons: readonly string[] };
export function validateWashingMachineRecommendationConstructionPolicyDraft(input: unknown, authority: { productIds: ReadonlySet<string>; factIds: ReadonlySet<string>; capabilityFactIds: ReadonlySet<string>; rationaleIds: ReadonlySet<string>; disclosureIds: ReadonlySet<string>; semanticRefs: ReadonlySet<string> }): RecommendationConstructionPolicyValidation {
  const parsed = washingMachineRecommendationConstructionPolicyDraftSchema.safeParse(input);
  if (!parsed.success) return { status: "INVALID_DRAFT", reasons: parsed.error.issues.map((issue) => `SCHEMA:${issue.path.join(".")}`) };
  const p = parsed.data, reasons: string[] = [];
  const unique = (values: readonly string[], code: string) => { if (new Set(values).size !== values.length) reasons.push(code); };
  const ruleIds = p.traceabilityMatrix.map((item) => item.ruleId);
  unique(ruleIds, "DUPLICATE_RULE_ID"); unique(p.scenarios.map((item) => item.scenarioId), "DUPLICATE_SCENARIO_ID"); unique(p.productDecisionRegister.map((item) => item.decisionId), "DUPLICATE_DECISION_ID");
  if (new Set(p.outcomePolicy.map((item) => item.selectionOutcome)).size !== 5) reasons.push("INCOMPLETE_OUTCOME_HANDLING");
  if (p.outcomePolicy.some((item) => item.singleProductAllowed !== (item.selectionOutcome === "SELECTED_SINGLE"))) reasons.push("UNAUTHORIZED_SINGLE_PRODUCT_ENTRY");
  if (p.scenarios.some((item) => item.ruleRefs.some((ref) => !ruleIds.includes(ref)))) reasons.push("UNKNOWN_SCENARIO_RULE_REF");
  if (p.productDecisionRegister.some((item) => item.governanceClassification === "UNRESOLVED_PRODUCT_DECISION")) reasons.push("MATERIAL_DECISION_UNRESOLVED");
  if (p.runtimeActive || p.scope.activePointer !== "ABSENT" || p.scope.frozenRelease !== "ABSENT") reasons.push("DRAFT_ACTIVATION_VIOLATION");
  if (p.persona.rationaleAuthority !== "NONE" || p.commerce.affiliateEffect !== "NONE") reasons.push("NON_AUTHORITY_INFLUENCE");
  if (p.artifactContract.prohibitedFields.length !== 5 || p.decisionAuthorizationBoundary.authorizesDecisionAuthorization) reasons.push("DECISION_AUTHORIZATION_LEAK");
  if (!p.disclosurePolicy.categories.includes("EVIDENCE_UNKNOWN") || !p.disclosurePolicy.categories.includes("PRICE_SNAPSHOT_VOLATILE")) reasons.push("INCOMPLETE_DISCLOSURE_MAPPING");
  if (p.realizationPolicy.modelMayNot.some((item) => item.length === 0) || p.realizationPolicy.violationEffect !== "NO_PLAUSIBLE_RECOMMENDATION_PROSE") reasons.push("REALIZATION_BOUNDARY_INVALID");
  if (p.languagePolicy.forbiddenClaimClasses.some((item) => !item.startsWith("FORBID:"))) reasons.push("FORBIDDEN_CLAIM_FORMAT_INVALID");
  if (new Set(p.artifactContract.fingerprintInputs).size !== p.artifactContract.fingerprintInputs.length) reasons.push("INVALID_FINGERPRINT_INPUTS");
  // The draft contains authority classes, not concrete product claims. These sets are asserted non-empty to bind validation to the active catalog.
  if ([authority.productIds, authority.factIds, authority.capabilityFactIds, authority.rationaleIds, authority.disclosureIds, authority.semanticRefs].some((set) => set.size === 0)) reasons.push("EMPTY_BOUND_AUTHORITY_SET");
  return reasons.length ? { status: "INVALID_DRAFT", reasons } : { status: "VALID_DRAFT" };
}
