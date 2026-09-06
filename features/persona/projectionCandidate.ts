export const PERSONA_PROJECTION_CANDIDATE_SCHEMA = "xpy-universal-persona-projection-candidate/v1" as const;

export type PersonaCandidateBindingStatus =
  | "INACTIVE_CANDIDATE_USABLE_MAPPING"
  | "INACTIVE_CANDIDATE_FAIL_CLOSED_NO_USABLE_PERSONA_MAPPING";

export interface PersonaCategoryCandidateBinding {
  readonly departmentId: "APPLIANCES" | "ELECTRONICS" | "BABY_AND_CHILD";
  readonly categoryId: string;
  readonly sourceDomainPack: { readonly file: string; readonly sha256: string };
  readonly exactProductIds: readonly string[];
  readonly projectedProductIds: readonly string[];
  readonly mappedTraits: readonly string[];
  readonly status: PersonaCandidateBindingStatus;
  readonly activationState: "NOT_ACTIVE";
  readonly unrelatedCategoryBlockingEffect: "NONE";
}

export interface PersonaProjectionCandidate {
  readonly schemaVersion: typeof PERSONA_PROJECTION_CANDIDATE_SCHEMA;
  readonly releaseId: string;
  readonly records: readonly {
    readonly exactProductId: string;
    readonly departmentId: string;
    readonly categoryId: string;
    readonly status: "GOVERNED_INHERITED" | "PERSONA_EVIDENCE_UNKNOWN" | "CONFLICTED";
    readonly score: number;
    readonly membershipEffect: "NONE";
    readonly selectionAuthority: "NONE";
  }[];
  readonly categoryBindings: readonly PersonaCategoryCandidateBinding[];
  readonly activation: {
    readonly state: "OWNER_REVIEW_REQUIRED_NOT_ACTIVE";
    readonly activePointerChanged: false;
    readonly rankingChanged: false;
    readonly catalogMembershipChanged: false;
  };
}

export function validatePersonaProjectionCandidate(candidate: PersonaProjectionCandidate): readonly string[] {
  const issues: string[] = [];
  const ids = candidate.records.map((record) => record.exactProductId);
  const boundIds = candidate.categoryBindings.flatMap((binding) => binding.exactProductIds);
  if (candidate.schemaVersion !== PERSONA_PROJECTION_CANDIDATE_SCHEMA) issues.push("SCHEMA_VERSION_INVALID");
  if (ids.length !== 169 || new Set(ids).size !== 169) issues.push("EXACT_PRODUCT_COVERAGE_INVALID");
  if (boundIds.length !== 169 || new Set(boundIds).size !== 169) issues.push("CATEGORY_BINDING_COVERAGE_INVALID");
  if (candidate.categoryBindings.length !== 49) issues.push("CATEGORY_BINDING_COUNT_INVALID");
  if (candidate.records.some((record) => record.score < 0 || record.score > 0.75)) issues.push("SCORE_CAP_INVALID");
  if (candidate.records.some((record) => record.membershipEffect !== "NONE" || record.selectionAuthority !== "NONE")) {
    issues.push("DECISION_BOUNDARY_INVALID");
  }
  if (
    candidate.categoryBindings.some(
      (binding) =>
        binding.activationState !== "NOT_ACTIVE" ||
        binding.unrelatedCategoryBlockingEffect !== "NONE" ||
        (binding.projectedProductIds.length === 0) !==
          (binding.status === "INACTIVE_CANDIDATE_FAIL_CLOSED_NO_USABLE_PERSONA_MAPPING"),
    )
  ) {
    issues.push("CATEGORY_FAIL_CLOSED_POLICY_INVALID");
  }
  if (
    candidate.activation.state !== "OWNER_REVIEW_REQUIRED_NOT_ACTIVE" ||
    candidate.activation.activePointerChanged ||
    candidate.activation.rankingChanged ||
    candidate.activation.catalogMembershipChanged
  ) {
    issues.push("CANDIDATE_ACTIVATION_BOUNDARY_INVALID");
  }
  return issues;
}
