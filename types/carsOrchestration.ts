import type { CarsDomainEvidenceLinkageValidationResult } from "@/types/carsDomainEvidence";
import type { CarsDomainFactRequirementResolutionResult } from "@/types/carsDomainFactRequirement";
import type {
  CarsDecisionTypeClassification,
  CarsDomainSufficiencyAssessment,
  LimitedSupportAssessment,
  MaterialityAssessment,
  RejectionRelevanceAssessment,
} from "@/types/contextSufficiency";

export type CarsOrchestrationStage =
  | "CLASSIFICATION"
  | "TYPE_B_IDENTITY"
  | "MATERIALITY"
  | "REJECTION_RELEVANCE"
  | "LIMITED_SUPPORT"
  | "DOMAIN_BINDING"
  | "EVIDENCE"
  | "CONFLICT"
  | "DOMAIN_SUFFICIENCY"
  | "AUTHORIZATION";

export type CarsOrchestrationReasonCode =
  | "CLASSIFICATION_MISSING"
  | "CLASSIFICATION_FAILED"
  | "CLASSIFICATION_AMBIGUOUS"
  | "CLASSIFICATION_UNSUPPORTED"
  | "TYPE_B_IDENTITY_MISSING"
  | "TYPE_B_IDENTITY_UNRESOLVED"
  | "MATERIALITY_MISSING"
  | "MATERIALITY_UNRESOLVED"
  | "MATERIALITY_INVALID"
  | "REJECTION_RELEVANCE_MISSING"
  | "REJECTION_RELEVANCE_UNRESOLVED"
  | "LIMITED_SUPPORT_MISSING"
  | "LIMITED_SUPPORT_UNRESOLVED"
  | "DOMAIN_BINDING_MISSING"
  | "DOMAIN_BINDING_UNRESOLVED"
  | "DOMAIN_BINDING_FAILED"
  | "EVIDENCE_DEPENDENCY_MISSING"
  | "EVIDENCE_PROVIDER_UNAVAILABLE"
  | "EVIDENCE_LINKAGE_INVALID"
  | "CONFLICT_UNRESOLVED"
  | "DOMAIN_SUFFICIENCY_MISSING"
  | "DOMAIN_SUFFICIENCY_UNRESOLVED"
  | "DOMAIN_SUFFICIENCY_INSUFFICIENT"
  | "NEGATIVE_DIAGNOSTIC_UNRESOLVED"
  | "EVALUATION_UNSUPPORTED"
  | "EXECUTION_CONTEXT_UNAVAILABLE";

export interface CarsTypeBIdentitySnapshot {
  readonly status: "RESOLVED" | "UNRESOLVED";
}

export type CarsEvidenceDependencySnapshot =
  | { readonly status: "UNAVAILABLE" }
  | {
      readonly status: "AVAILABLE";
      readonly linkage: CarsDomainEvidenceLinkageValidationResult;
    };

export interface CarsOrchestrationDependencies {
  readonly classification?: CarsDecisionTypeClassification;
  readonly typeBIdentity?: CarsTypeBIdentitySnapshot;
  readonly materialityAssessments?: readonly MaterialityAssessment[];
  readonly rejectionAssessments?: readonly RejectionRelevanceAssessment[];
  readonly limitedSupportAssessment?: LimitedSupportAssessment;
  readonly domainFactResolution?: CarsDomainFactRequirementResolutionResult;
  readonly evidence?: CarsEvidenceDependencySnapshot;
  readonly domainAssessment?: CarsDomainSufficiencyAssessment;
}

export interface CarsOrchestrationInput {
  readonly requestId: string;
  readonly contextReference: string;
  readonly dependencies: CarsOrchestrationDependencies;
}

export interface CarsOrchestrationReason {
  readonly code: CarsOrchestrationReasonCode;
  readonly stage: CarsOrchestrationStage;
  readonly referenceIds: readonly string[];
}

export interface CarsOrchestrationLineage {
  readonly requestId: string;
  readonly contextReference: string;
  readonly stoppedAt: CarsOrchestrationStage;
  readonly inspectedStages: readonly CarsOrchestrationStage[];
}

interface CarsBlockedOrchestrationResult {
  readonly status: "ADDITIONAL_CONTEXT_REQUIRED" | "UNRESOLVED" | "FAILED";
  readonly reasons: readonly CarsOrchestrationReason[];
  readonly lineage: CarsOrchestrationLineage;
}

export interface CarsAuthorizedOrchestrationResult {
  readonly status: "AUTHORIZED";
  readonly reasons: readonly [];
  readonly lineage: CarsOrchestrationLineage;
}

export type CarsOrchestrationResult =
  | CarsBlockedOrchestrationResult
  | CarsAuthorizedOrchestrationResult;
