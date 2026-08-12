import type {
  CarsOrchestrationInput,
  CarsOrchestrationReasonCode,
  CarsOrchestrationResult,
  CarsOrchestrationStage,
} from "@/types/carsOrchestration";

type BlockedStatus = CarsOrchestrationResult["status"];

function blocked(
  input: CarsOrchestrationInput,
  status: BlockedStatus,
  stage: CarsOrchestrationStage,
  code: CarsOrchestrationReasonCode,
  inspectedStages: readonly CarsOrchestrationStage[],
  referenceIds: readonly string[] = [],
): CarsOrchestrationResult {
  return {
    status,
    reasons: [{ code, stage, referenceIds: [...referenceIds].sort() }],
    lineage: {
      requestId: input.requestId,
      contextReference: input.contextReference,
      stoppedAt: stage,
      inspectedStages: [...inspectedStages],
    },
  };
}

export function orchestrateCarsDecision(
  input: CarsOrchestrationInput,
): CarsOrchestrationResult {
  const dependencies = input.dependencies;
  const inspected: CarsOrchestrationStage[] = ["CLASSIFICATION"];
  const classification = dependencies.classification;

  if (!classification) {
    return blocked(input, "UNRESOLVED", "CLASSIFICATION", "CLASSIFICATION_MISSING", inspected);
  }
  if (classification.status === "FAILED") {
    return blocked(input, "FAILED", "CLASSIFICATION", "CLASSIFICATION_FAILED", inspected);
  }
  if (classification.status === "AMBIGUOUS") {
    return blocked(input, "ADDITIONAL_CONTEXT_REQUIRED", "CLASSIFICATION", "CLASSIFICATION_AMBIGUOUS", inspected);
  }
  if (classification.status === "UNSUPPORTED") {
    return blocked(input, "UNRESOLVED", "CLASSIFICATION", "CLASSIFICATION_UNSUPPORTED", inspected);
  }

  if (classification.decisionType === "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON") {
    inspected.push("TYPE_B_IDENTITY");
    if (!dependencies.typeBIdentity) {
      return blocked(input, "UNRESOLVED", "TYPE_B_IDENTITY", "TYPE_B_IDENTITY_MISSING", inspected);
    }
    if (dependencies.typeBIdentity.status !== "RESOLVED") {
      return blocked(input, "UNRESOLVED", "TYPE_B_IDENTITY", "TYPE_B_IDENTITY_UNRESOLVED", inspected);
    }
  }

  inspected.push("MATERIALITY");
  const materiality = dependencies.materialityAssessments;
  if (!materiality) {
    return blocked(input, "UNRESOLVED", "MATERIALITY", "MATERIALITY_MISSING", inspected);
  }
  const materialityIds = materiality.map((item) => item.requirementId);
  if (new Set(materialityIds).size !== materialityIds.length) {
    return blocked(input, "FAILED", "MATERIALITY", "MATERIALITY_INVALID", inspected, materialityIds);
  }
  const unresolvedMateriality = materiality
    .filter((item) => item.outcome === "UNRESOLVED")
    .map((item) => item.requirementId);
  if (unresolvedMateriality.length > 0) {
    return blocked(input, "UNRESOLVED", "MATERIALITY", "MATERIALITY_UNRESOLVED", inspected, unresolvedMateriality);
  }

  inspected.push("REJECTION_RELEVANCE");
  const rejections = dependencies.rejectionAssessments;
  if (!rejections) {
    return blocked(input, "UNRESOLVED", "REJECTION_RELEVANCE", "REJECTION_RELEVANCE_MISSING", inspected);
  }
  const unresolvedRejections = rejections
    .filter((item) => item.outcome === "UNRESOLVED")
    .map((item) => item.candidateId);
  if (unresolvedRejections.length > 0) {
    return blocked(input, "UNRESOLVED", "REJECTION_RELEVANCE", "REJECTION_RELEVANCE_UNRESOLVED", inspected, unresolvedRejections);
  }

  inspected.push("LIMITED_SUPPORT");
  if (!dependencies.limitedSupportAssessment) {
    return blocked(input, "UNRESOLVED", "LIMITED_SUPPORT", "LIMITED_SUPPORT_MISSING", inspected);
  }
  if (dependencies.limitedSupportAssessment.outcome === "UNRESOLVED") {
    return blocked(input, "UNRESOLVED", "LIMITED_SUPPORT", "LIMITED_SUPPORT_UNRESOLVED", inspected);
  }

  inspected.push("DOMAIN_BINDING");
  const resolution = dependencies.domainFactResolution;
  if (!resolution) {
    return blocked(input, "UNRESOLVED", "DOMAIN_BINDING", "DOMAIN_BINDING_MISSING", inspected);
  }
  if (resolution.status === "FAILED") {
    return blocked(input, "FAILED", "DOMAIN_BINDING", "DOMAIN_BINDING_FAILED", inspected);
  }
  if (resolution.status === "UNRESOLVED") {
    return blocked(input, "UNRESOLVED", "DOMAIN_BINDING", "DOMAIN_BINDING_UNRESOLVED", inspected);
  }

  inspected.push("EVIDENCE");
  const evidence = dependencies.evidence;
  if (!evidence) {
    return blocked(input, "UNRESOLVED", "EVIDENCE", "EVIDENCE_DEPENDENCY_MISSING", inspected);
  }
  if (evidence.status === "UNAVAILABLE") {
    return blocked(input, "UNRESOLVED", "EVIDENCE", "EVIDENCE_PROVIDER_UNAVAILABLE", inspected);
  }
  if (!evidence.linkage.ok) {
    return blocked(
      input,
      "UNRESOLVED",
      "EVIDENCE",
      "EVIDENCE_LINKAGE_INVALID",
      inspected,
      evidence.linkage.errors.map((item) => `${item.code}:${item.referenceId}`),
    );
  }

  inspected.push("DOMAIN_SUFFICIENCY");
  const domain = dependencies.domainAssessment;
  if (!domain) {
    return blocked(input, "UNRESOLVED", "DOMAIN_SUFFICIENCY", "DOMAIN_SUFFICIENCY_MISSING", inspected);
  }
  if (domain.relevantConflicts.length > 0 || domain.diagnostics?.some((item) => item.reason === "UNRESOLVED_CONFLICT")) {
    inspected.push("CONFLICT");
    return blocked(input, "UNRESOLVED", "CONFLICT", "CONFLICT_UNRESOLVED", inspected, domain.relevantConflicts);
  }
  if (domain.diagnostics?.some((item) => item.reason === "UNSUPPORTED_RELATION_EVALUATION")) {
    return blocked(input, "UNRESOLVED", "DOMAIN_SUFFICIENCY", "EVALUATION_UNSUPPORTED", inspected);
  }
  if (domain.diagnostics?.some((item) => item.reason === "NEGATIVE_RELATION_RESULT" || item.reason === "CONSTRAINT_MISMATCH")) {
    return blocked(input, "UNRESOLVED", "DOMAIN_SUFFICIENCY", "NEGATIVE_DIAGNOSTIC_UNRESOLVED", inspected);
  }
  if (domain.outcome === "UNRESOLVED") {
    return blocked(input, "UNRESOLVED", "DOMAIN_SUFFICIENCY", "DOMAIN_SUFFICIENCY_UNRESOLVED", inspected);
  }
  if (domain.outcome === "INSUFFICIENT") {
    return blocked(input, "ADDITIONAL_CONTEXT_REQUIRED", "DOMAIN_SUFFICIENCY", "DOMAIN_SUFFICIENCY_INSUFFICIENT", inspected);
  }

  inspected.push("AUTHORIZATION");
  return blocked(input, "UNRESOLVED", "AUTHORIZATION", "SCOPE_A_AUTHORIZATION_BLOCKED", inspected);
}
