import type {
  ContextCandidateId,
  ContextProvenance,
  ContextTarget,
} from "@/types/contextCandidate";
import type {
  PopulationRejection,
  PopulationResult,
} from "@/types/contextPopulation";

export type CarsDecisionType =
  | "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION"
  | "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON";

export type CarsDecisionTypeClassification =
  | {
      status: "CLASSIFIED";
      decisionType: CarsDecisionType;
    }
  | {
      status: "AMBIGUOUS";
    }
  | {
      status: "UNSUPPORTED";
    }
  | {
      status: "FAILED";
    };

export type RequirementMode =
  | "REQUIRED"
  | "CONDITIONAL"
  | "OPTIONAL";

export type MaterialityOutcome =
  | "MATERIAL"
  | "NOT_MATERIAL"
  | "UNRESOLVED";

export interface MaterialityAssessment {
  requirementId: string;
  outcome: MaterialityOutcome;
  supportingCandidateIds: ContextCandidateId[];
  limitations: string[];
}

export interface ContextConfirmationEvidence {
  inferredCandidateId: ContextCandidateId;
  confirmed: boolean;
  confirmationSource: "EXPLICIT_USER";
}

export interface SufficiencyRequirement {
  requirementId: string;
  target: ContextTarget;
  mode: RequirementMode;
  acceptedProvenance: ContextProvenance[];
  confirmationRequiredForInference: boolean;
}

export interface CarsSufficiencyPolicy {
  policyId: string;
  version: string;
  decisionType: CarsDecisionType;
  requirements: SufficiencyRequirement[];
  decisionOptionsRule:
    | "USER_PROVIDED_NOT_REQUIRED"
    | "REQUIRED";
}

export type DomainSufficiencyOutcome =
  | "SUFFICIENT"
  | "INSUFFICIENT"
  | "UNRESOLVED";

export type CarsDomainSufficiencyDiagnosticReason =
  | "MISSING_AUTHORITATIVE_EVIDENCE"
  | "EVIDENCE_UNRESOLVED"
  | "NEGATIVE_RELATION_RESULT"
  | "CONSTRAINT_MISMATCH"
  | "UNSUPPORTED_RELATION_EVALUATION"
  | "UNRESOLVED_REQUIREMENT_RESOLUTION"
  | "UNRESOLVED_CONFLICT";

export interface CarsDomainSufficiencyDiagnostic {
  requirementId: string;
  optionId?: string;
  evidenceIds: string[];
  reason: CarsDomainSufficiencyDiagnosticReason;
}

export interface CarsDomainSufficiencyAssessment {
  policyId: string;
  decisionType: CarsDecisionType;
  evaluableOptionIds: string[];
  outcome: DomainSufficiencyOutcome;
  missingDomainRequirements: string[];
  evidenceLimitations: string[];
  relevantConflicts: string[];
  diagnostics?: CarsDomainSufficiencyDiagnostic[];
}

export interface SatisfiedRequirement {
  requirementId: string;
  candidateIds: ContextCandidateId[];
}

export interface UnsatisfiedRequirement {
  requirementId: string;
  reason: string;
}

export interface ContextSufficiencyInput {
  populationResult: PopulationResult;
  classification: CarsDecisionTypeClassification;
  policy: CarsSufficiencyPolicy;
  confirmations: ContextConfirmationEvidence[];
  materialityAssessments: MaterialityAssessment[];
  domainAssessment: CarsDomainSufficiencyAssessment;
  rejectionAssessments: RejectionRelevanceAssessment[];
  limitedSupportAssessment: LimitedSupportAssessment;
}

export interface ContextSufficiencyResult {
  decisionType: CarsDecisionType | null;
  policyId: string | null;

  decisionEngineAuthorized: boolean;
  reliableRecommendationAuthorized: boolean;

  additionalContextRequired: boolean;
  limitedSupportPermitted: boolean;

  satisfiedRequirements: SatisfiedRequirement[];
  unsatisfiedRequirements: UnsatisfiedRequirement[];

  limitations: string[];
  relevantRejections: PopulationRejection[];
}

export type RequirementEvaluationStatus =
  | "SATISFIED"
  | "UNSATISFIED"
  | "NOT_REQUIRED"
  | "UNRESOLVED";

export interface RequirementEvaluationResult {
  requirementId: string;
  status: RequirementEvaluationStatus;
  candidateIds: ContextCandidateId[];
  limitations: string[];
}

export interface PolicyRequirementEvaluationResult {
  evaluations: RequirementEvaluationResult[];
  satisfiedRequirements: SatisfiedRequirement[];
  unsatisfiedRequirements: UnsatisfiedRequirement[];
  unresolvedRequirementIds: string[];
}

export type RejectionRelevanceOutcome =
  | "BLOCKING"
  | "NON_BLOCKING"
  | "UNRESOLVED";

export interface RejectionRelevanceAssessment {
  candidateId: ContextCandidateId;
  outcome: RejectionRelevanceOutcome;
  affectedRequirementIds: string[];
  limitations: string[];
}

export type LimitedSupportOutcome =
  | "PERMITTED"
  | "NOT_PERMITTED"
  | "UNRESOLVED";

export interface LimitedSupportAssessment {
  outcome: LimitedSupportOutcome;
  limitations: string[];
}
