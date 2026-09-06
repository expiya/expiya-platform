import type { XpyRuntimeBinding } from "../runtimeContract";

export const XPY_CATALOG_VERSION = "XPY_CATALOG/v0.1" as const;

export type OfferingKind = "PRODUCT" | "SERVICE";
export type CatalogLayerId = "L0" | "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7" | "L8" | "L9" | "L10";
export type CatalogCoverageStatus = "COMPLETE" | "PARTIAL" | "ABSENT" | "NOT_APPLICABLE";
export type CatalogGapImpact = "ASAMA_1" | "ASAMA_2" | "RICHNESS_ONLY";

export interface ProductOfferingIdentity {
  readonly kind: "PRODUCT";
  readonly manufacturer: string;
  readonly model: string;
  readonly configuration: string;
  readonly identifiers: Readonly<Record<string, string>>;
}

export interface ServiceOfferingIdentity {
  readonly kind: "SERVICE";
  readonly provider: string;
  readonly serviceName: string;
  readonly planName: string;
  readonly scopeId: string;
  readonly serviceVersion: string;
}

export type OfferingIdentity = ProductOfferingIdentity | ServiceOfferingIdentity;

export interface CatalogOffering {
  readonly offeringId: string;
  readonly market: string;
  readonly lifecycle: "ACTIVE" | "FROZEN" | "RETIRED";
  readonly validFrom: string;
  readonly validThrough?: string;
  readonly identity: OfferingIdentity;
}

export interface CatalogSource {
  readonly sourceId: string;
  readonly kind: "OFFICIAL" | "REGULATORY" | "REVIEWED_EDITORIAL" | "EXPERIENCE_AGGREGATE" | "MANUAL";
  readonly uri: string;
  readonly version: string;
  readonly observedAt: string;
  readonly reviewedAt: string;
  readonly market: string;
  readonly applicabilityStatus: "EXACT" | "BOUNDED" | "UNKNOWN" | "STALE";
  readonly status: "VERIFIED" | "REVIEWED" | "WITHDRAWN";
  readonly artifactSha256?: `sha256:${string}`;
  readonly language?: string;
  readonly documentCode?: string;
}

export interface CatalogEvidence {
  readonly evidenceId: string;
  readonly kind: "TECHNICAL" | "CAPABILITY" | "EXPERIENCE" | "MANUAL" | "GOVERNED_PROMOTION";
  readonly sourceId: string;
  readonly assertionId: string;
  readonly offeringIds: readonly string[];
  readonly market: string;
  readonly observedAt: string;
  readonly reviewedAt: string;
  readonly confidence: "HIGH" | "MEDIUM" | "LOW";
  readonly status: "VERIFIED" | "REVIEWED" | "CONFLICTED" | "UNKNOWN";
  readonly limitations: readonly string[];
  readonly promotedFromKnowledgeId?: string;
  readonly promotionAuthority?: string;
  readonly assertion?: {
    readonly locator: string;
    readonly value: string | number | boolean;
    readonly unit?: string;
    readonly applicability: {
      readonly offeringId: string;
      readonly market: string;
      readonly model: string;
      readonly configuration: string;
      readonly status: "EXACT" | "BOUNDED";
    };
  };
}

export interface ObjectiveFact {
  readonly factId: string;
  readonly offeringId: string;
  readonly key: string;
  readonly value: string | number | boolean;
  readonly unit?: string;
  readonly evidenceId: string;
}

export interface Capability {
  readonly capabilityId: string;
  readonly offeringId: string;
  readonly key: string;
  readonly state: "PRESENT" | "ABSENT" | "CONDITIONAL" | "UNKNOWN";
  readonly evidenceId: string;
  readonly limitations: readonly string[];
}

export interface UsageSemantic {
  readonly semanticId: string;
  readonly meaning: string;
  readonly factIds: readonly string[];
  readonly capabilityIds: readonly string[];
}

export interface UserNeed {
  readonly needId: string;
  readonly meaning: string;
}

export interface NeedEvidenceMapping {
  readonly mappingId: string;
  readonly needId: string;
  readonly eligibleFactIds: readonly string[];
  readonly eligibleCapabilityIds: readonly string[];
  readonly policy: "HARD_FILTER" | "SOFT_PREFERENCE" | "QUESTION_INPUT";
}

export interface PersonaPlanningSignal {
  readonly signalId: string;
  readonly needIds: readonly string[];
  readonly authority: "DOMAIN_PLANNING";
  readonly classification: "DERIVED_PLANNING";
  readonly decisionUse: "NONE";
  readonly directCandidateEffect: "NONE";
}

export interface DailyLifeInterpretation {
  readonly interpretationId: string;
  readonly offeringId?: string;
  readonly text: string;
  readonly factIds: readonly string[];
  readonly capabilityIds: readonly string[];
  readonly method: "DETERMINISTIC_REVIEWED_MAPPING" | "BOUNDED_EXPERIENCE_INTERPRETATION";
  readonly reviewedAt: string;
  readonly polarity: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "UNKNOWN";
  readonly limitations: readonly string[];
  readonly nonGuarantees: readonly string[];
}

export interface ExperienceEvidenceRule {
  readonly ruleId: string;
  readonly evidenceIds: readonly string[];
  readonly aggregation: "SINGLE_REVIEW" | "REVIEWED_AGGREGATE";
  readonly technicalTruthAuthority: "NONE";
}

export interface DecisionProjection {
  readonly projectionId: string;
  readonly offeringId: string;
  readonly eligibleEvidenceIds: readonly string[];
  readonly needMappingIds: readonly string[];
  readonly limitations: readonly string[];
  readonly disclosures: readonly string[];
  readonly traceability: "EXACT";
}

export interface AdvisorKnowledge {
  readonly knowledgeId: string;
  readonly offeringId: string;
  readonly offeringVersion: string;
  readonly market: string;
  readonly sourceId: string;
  readonly evidenceId: string;
  readonly sourceSection: string;
  readonly text: string;
  readonly sourceArtifactSha256: `sha256:${string}`;
  readonly language: string;
  readonly applicability: "EXACT_MODEL" | "BOUNDED_MODEL_LIST";
  readonly reviewAuthority: string;
  readonly reviewedAt: string;
  readonly limitations: readonly string[];
  readonly knowledgeKind: "MANUAL" | "MAINTENANCE" | "INSTALLATION" | "USAGE" | "LIMITATION";
  readonly decisionAuthority: "NONE";
}

export interface XpyCatalogRelease {
  readonly schemaVersion: typeof XPY_CATALOG_VERSION;
  readonly releaseId: string;
  readonly releaseVersion: string;
  readonly releaseDigest: `sha256:${string}`;
  readonly departmentId: string;
  readonly categoryId: string;
  readonly market: string;
  readonly lifecycle: "ACTIVE" | "FROZEN";
  readonly effectiveAt: string;
  readonly compatibility: {
    readonly runtime: Pick<XpyRuntimeBinding, "version" | "digest" | "domainPackId">;
    readonly domainPackVersion: string;
    readonly semanticAuthorityVersion: string;
    readonly semanticAuthorityDigest: `sha256:${string}`;
    readonly revisionClass: "EVIDENCE_OR_AVAILABILITY_REFRESH" | "SEMANTIC_POLICY_CHANGE";
    readonly semanticAuthorityChange: "UNCHANGED" | "VERSIONED_CHANGE";
  };
  readonly sources: readonly CatalogSource[];
  readonly evidence: readonly CatalogEvidence[];
  readonly offerings: readonly CatalogOffering[];
  readonly layers: {
    readonly l1Facts: readonly ObjectiveFact[];
    readonly l2Capabilities: readonly Capability[];
    readonly l3UsageSemantics: readonly UsageSemantic[];
    readonly l4Needs: readonly UserNeed[];
    readonly l4NeedEvidenceMappings: readonly NeedEvidenceMapping[];
    readonly l5PersonaSignals: readonly PersonaPlanningSignal[];
    readonly l6DailyLifeInterpretations: readonly DailyLifeInterpretation[];
    readonly l7ExperienceRules: readonly ExperienceEvidenceRule[];
    readonly l8DecisionProjections: readonly DecisionProjection[];
    readonly l9AdvisorKnowledge: readonly AdvisorKnowledge[];
  };
  readonly externalBoundaries: {
    readonly commerce: "EXTERNAL_VOLATILE_EXACT_IDENTITY_JOIN_ONLY";
    readonly media: "EXTERNAL_VOLATILE_EXACT_IDENTITY_JOIN_ONLY";
    readonly offerIdentityAuthority: "NONE";
    readonly offerRankingAuthority: "NONE";
    readonly affiliateRankingAuthority: "NONE";
  };
}

export interface XpyExternalOfferingSnapshot {
  readonly schemaVersion: "XPY_CATALOG_EXTERNAL_SNAPSHOT/v0.1";
  readonly snapshotId: string;
  readonly observedAt: string;
  readonly expiresAt: string;
  readonly market: string;
  readonly offers: readonly {
    readonly offerId: string;
    readonly offeringId: string;
    readonly merchant: string;
    readonly amount: number;
    readonly currency: string;
    readonly affiliate: boolean;
  }[];
  readonly media: readonly { readonly mediaId: string; readonly offeringId: string; readonly uri: string }[];
}

export interface XpyCatalogCoverageLayer {
  readonly layer: CatalogLayerId;
  readonly name: string;
  readonly status: CatalogCoverageStatus;
  readonly authoritativeFiles: readonly string[];
  readonly measuredCount: number;
  readonly missing: readonly string[];
  readonly impact: CatalogGapImpact;
}

export interface XpyCatalogAuthorityAudit {
  readonly departmentId: string;
  readonly categoryId: string;
  readonly offeringKind: OfferingKind;
  readonly referenceRole: "ARCHITECTURE_AND_RICHNESS_REFERENCE_NOT_CONTENT_COMPLETE" | "CATEGORY_AUTHORITY";
  readonly authorityStatus: "READY" | "FAILED_CLOSED";
  readonly failureReasons: readonly string[];
  readonly activeRelease: string;
  readonly activeDigest: string;
  readonly domainPackVersion: string;
  readonly runtimeVersion: string;
  readonly runtimeDigest: string;
  readonly productCount: number;
  readonly sourceCount: number;
  readonly evidenceBearingProductCount: number;
  readonly manualCoveredProductCount: number;
  readonly dailyLifeMappingCount: number;
  readonly personaCoveredProductCount: number;
  readonly advisorArtifactCount: number;
  readonly decisionProjectionCount: number;
  readonly downstreamReadiness: {
    readonly advisorReadProjection: CatalogReadinessAssessment;
    readonly comparisonEvidenceProjection: CatalogReadinessAssessment;
    readonly exampleComparisonTable: CatalogReadinessAssessment;
    readonly paidComparisonReport: CatalogReadinessAssessment;
  };
  readonly layers: readonly XpyCatalogCoverageLayer[];
}

export interface CatalogReadinessAssessment {
  readonly status: "READY" | "PARTIAL" | "BLOCKED";
  readonly blockers: readonly string[];
}

export interface XpyComparisonDimension {
  readonly dimensionId: string;
  readonly humanLabel: string;
  readonly scope: string;
  readonly source: { readonly kind: "FACT"; readonly key: string; readonly unitPolicy: "SAME_UNIT_REQUIRED" } | { readonly kind: "CAPABILITY"; readonly key: string; readonly unitPolicy: "STATE_ONLY" };
  readonly authority: "DOMAIN_PACK";
}

export interface ComparisonEvidenceProjection {
  readonly schemaVersion: "XPY_COMPARISON_EVIDENCE_PROJECTION/v0.1";
  readonly readOnly: true;
  readonly catalogReleaseId: string;
  readonly catalogReleaseDigest: string;
  readonly market: string;
  readonly authorization: {
    readonly purchaseStatus: "PURCHASED";
    readonly entitlementId: string;
    readonly comparisonSetId: string;
    readonly exactOfferingIds: readonly string[];
  };
  readonly offerings: readonly CatalogOffering[];
  readonly evidence: readonly CatalogEvidence[];
  readonly sources: readonly CatalogSource[];
  readonly dailyLifeInterpretations: readonly DailyLifeInterpretation[];
  readonly advisorKnowledge: readonly AdvisorKnowledge[];
  readonly rules: {
    readonly unknownTreatment: "NEUTRAL_NO_PENALTY";
    readonly incomparableTreatment: "FAIL_CLOSED";
    readonly dimensionAndLabelAuthority: "DOMAIN_PACK_ONLY";
    readonly decisionAuthority: "NONE";
  };
  readonly dimensions: readonly {
    readonly dimensionId: string;
    readonly humanLabel: string;
    readonly scope: string;
    readonly cells: readonly {
      readonly offeringId: string;
      readonly state: "KNOWN" | "UNKNOWN" | "NOT_APPLICABLE";
      readonly value?: string | number | boolean;
      readonly unit?: string;
      readonly evidenceIds: readonly string[];
      readonly limitations: readonly string[];
    }[];
  }[];
}

export interface AdvisorReadProjection {
  readonly schemaVersion: "XPY_ADVISOR_READ_PROJECTION/v0.1";
  readonly readOnly: true;
  readonly authority: "EXPLAIN_AND_BOUNDED_ADVICE_ONLY";
  readonly authorizedDecision: { readonly decisionId: string; readonly exactOfferingId: string };
  readonly catalogReleaseId: string;
  readonly catalogReleaseDigest: string;
  readonly offering: CatalogOffering;
  readonly facts: readonly ObjectiveFact[];
  readonly capabilities: readonly Capability[];
  readonly dailyLifeInterpretations: readonly DailyLifeInterpretation[];
  readonly advisorKnowledge: readonly AdvisorKnowledge[];
  readonly evidence: readonly CatalogEvidence[];
  readonly sources: readonly CatalogSource[];
  readonly comparison?: ComparisonEvidenceProjection;
  readonly forbidden: readonly [
    "SELECT_NEW_CANDIDATES",
    "MUTATE_ASAMA_1_CONTEXT",
    "CHANGE_Y_AUTHORIZATION",
    "INTRODUCE_UNAUTHORIZED_OFFERINGS",
    "READ_UNRELATED_CATALOG_ENTITIES",
    "INVENT_CLAIMS",
    "USE_COMMERCE_OR_AFFILIATE_AS_RECOMMENDATION_AUTHORITY",
  ];
}
