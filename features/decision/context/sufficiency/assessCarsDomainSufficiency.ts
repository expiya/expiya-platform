import type {
  CarsDomainEvidenceRecord,
  ValidatedCarsDomainEvidenceInput,
} from "@/types/carsDomainEvidence";
import type {
  CarsDecisionType,
  CarsDomainSufficiencyAssessment,
  CarsSufficiencyPolicy,
  MaterialityAssessment,
  SufficiencyRequirement,
} from "@/types/contextSufficiency";

export interface AssessCarsDomainSufficiencyInput {
  decisionType: CarsDecisionType;
  policy: CarsSufficiencyPolicy;
  materialityAssessments: MaterialityAssessment[];
  evidenceInput: ValidatedCarsDomainEvidenceInput;
}

function materialityFor(
  assessments: MaterialityAssessment[],
  requirementId: string,
): MaterialityAssessment | undefined {
  return assessments.find(
    (assessment) =>
      assessment.requirementId === requirementId,
  );
}

function isApplicableRequirement(
  requirement: SufficiencyRequirement,
  materialityAssessments: MaterialityAssessment[],
): boolean | null {
  if (requirement.mode === "REQUIRED") {
    return true;
  }

  if (requirement.mode === "OPTIONAL") {
    return false;
  }

  const materiality = materialityFor(
    materialityAssessments,
    requirement.requirementId,
  );

  if (!materiality) {
    return null;
  }

  if (materiality.outcome === "MATERIAL") {
    return true;
  }

  if (materiality.outcome === "NOT_MATERIAL") {
    return false;
  }

  return null;
}

function evidenceFor(
  evidence: CarsDomainEvidenceRecord[],
  optionId: string,
  requirementId: string,
): CarsDomainEvidenceRecord[] {
  return evidence.filter(
    (record) =>
      record.optionId === optionId &&
      record.requirementId === requirementId,
  );
}

function hasUsableAvailableEvidence(
  evidence: CarsDomainEvidenceRecord[],
): boolean {
  return evidence.some(
    (record) =>
      record.availability === "AVAILABLE" &&
      record.provenance !== "UNKNOWN",
  );
}

export function assessCarsDomainSufficiency(
  input: AssessCarsDomainSufficiencyInput,
): CarsDomainSufficiencyAssessment {
  const unresolvedMaterialityRequirementIds =
    input.policy.requirements
      .filter(
        (requirement) =>
          requirement.mode === "CONDITIONAL" &&
          isApplicableRequirement(
            requirement,
            input.materialityAssessments,
          ) === null,
      )
      .map((requirement) => requirement.requirementId);

  const applicableRequirements =
    input.policy.requirements.filter(
      (requirement) =>
        isApplicableRequirement(
          requirement,
          input.materialityAssessments,
        ) === true,
    );

  const unresolvedConflictIds =
    input.evidenceInput.conflicts
      .filter(
        (conflict) =>
          conflict.resolutionStatus === "UNRESOLVED" &&
          applicableRequirements.some(
            (requirement) =>
              requirement.requirementId ===
              conflict.requirementId,
          ),
      )
      .map((conflict) => conflict.conflictId);

  const evidenceLimitations =
    input.evidenceInput.evidence.flatMap(
      (record) => record.limitations,
    );

  const missingDomainRequirements = new Set<string>();
  let hasUnresolvedEvidence = false;

  const evaluableOptionIds =
    input.evidenceInput.optionIds.filter((optionId) => {
      let optionEvaluable = true;

      for (const requirement of applicableRequirements) {
        const records = evidenceFor(
          input.evidenceInput.evidence,
          optionId,
          requirement.requirementId,
        );

        if (
          records.some(
            (record) =>
              record.availability === "UNRESOLVED" ||
              record.provenance === "UNKNOWN",
          )
        ) {
          hasUnresolvedEvidence = true;
          optionEvaluable = false;
          continue;
        }

        if (
          records.length === 0 ||
          records.every(
            (record) =>
              record.availability === "MISSING",
          )
        ) {
          missingDomainRequirements.add(
            requirement.requirementId,
          );
          optionEvaluable = false;
          continue;
        }

        if (!hasUsableAvailableEvidence(records)) {
          hasUnresolvedEvidence = true;
          optionEvaluable = false;
        }
      }

      return optionEvaluable;
    });

  const hasUnresolvedMateriality =
    unresolvedMaterialityRequirementIds.length > 0;

  const hasUnresolvedConflicts =
    unresolvedConflictIds.length > 0;

  const outcome =
    hasUnresolvedMateriality ||
    hasUnresolvedEvidence ||
    hasUnresolvedConflicts
      ? "UNRESOLVED"
      : missingDomainRequirements.size > 0 ||
          evaluableOptionIds.length === 0
        ? "INSUFFICIENT"
        : "SUFFICIENT";

  return {
    policyId: input.policy.policyId,
    decisionType: input.decisionType,
    evaluableOptionIds,
    outcome,
    missingDomainRequirements: [
      ...missingDomainRequirements,
    ],
    evidenceLimitations: [
      ...evidenceLimitations,
      ...unresolvedMaterialityRequirementIds.map(
        (requirementId) =>
          `Materiality unresolved for requirement: ${requirementId}`,
      ),
    ],
    relevantConflicts: unresolvedConflictIds,
  };
}
