import type { ProductIdentity, EvidenceUnit, Disclosure, RecommendationArtifact } from "./construct";

/** Projection only: no client-supplied card or reference confers decision authority. */
export interface AppliancesDecisionCard {
  readonly schemaVersion: "appliances-public-card/v1";
  readonly identity: ProductIdentity;
  readonly reasons: readonly string[];
  readonly acceptedNeeds: RecommendationArtifact["userNeedsAddressed"];
  readonly nonSelectionNeeds: RecommendationArtifact["nonSelectionActiveAcceptedNeeds"];
  readonly technicalEvidence: readonly EvidenceUnit[];
  readonly capabilities: readonly EvidenceUnit[];
  readonly dailyLife: RecommendationArtifact["dailyLifeInterpretationUnits"];
  readonly limitations: readonly string[];
  readonly disclosures: readonly Disclosure[];
  readonly price: RecommendationArtifact["priceCoverageAndFreshness"];
  readonly lifecycleAndMarket: RecommendationArtifact["lifecycleAndMarketApplicability"];
  readonly warranty: readonly EvidenceUnit[];
  readonly provenance: { readonly authorizationFingerprint: string; readonly artifactFingerprint: string; readonly catalog: RecommendationArtifact["catalogIdentityAndDigests"]; readonly semantic: RecommendationArtifact["semanticRegistryIdentityAndDigest"]; readonly selectionFingerprint: string; readonly constructionPolicyDigest: string; readonly questionPolicy: RecommendationArtifact["questionPolicyIdentityAndDigest"]; readonly sufficiencyPolicy: RecommendationArtifact["sufficiencyPolicyIdentityAndDigest"]; readonly selectionPolicy: RecommendationArtifact["candidateSelectionPolicyIdentityAndDigest"]; readonly contextRevision: number; readonly contextFingerprint: string; readonly candidateEvaluationFingerprint: string; readonly sufficiencyFingerprint: string; readonly candidatePoolFingerprint: string };
  /** Presentation-only volatile authority. Excluded from every Y/authorization fingerprint. */
  readonly currentCommerce?: import("../commerce/types").CurrentProductCommerce;
  /** Read-only presentation media. It is separate from catalog/Y authority and never participates in authorization. */
  readonly currentMedia?: import("../media/types").ApplianceMediaProjection;
}
