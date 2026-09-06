export const FACTORY_STAGES = [
  "TAXONOMY_INTAKE", "DISCOVERY_OBSERVATION", "IDENTITY_RECONCILIATION",
  "PRIMARY_EVIDENCE_CLOSURE", "SEMANTIC_ENRICHMENT", "PERSONA_ENRICHMENT",
  "COMMERCE_MEDIA_PROJECTION", "DOMAIN_PACK_CANDIDATE",
  "PLATFORM_INTEGRATION_MANIFEST", "GOVERNANCE_ACTIVATION_PLANNING",
] as const;
export type FactoryStage = (typeof FACTORY_STAGES)[number];

export const HIGH_RISK_TAXONOMY_CLASSES = [
  "HEALTH", "COSMETICS", "FOOD_ALLERGENS", "CHILDREN_TOYS", "FASHION_SIZING",
  "AUTOMOTIVE_COMPATIBILITY", "GIFT_CARDS", "BOOKS_CONTENT",
] as const;
export type HighRiskTaxonomyClass = (typeof HIGH_RISK_TAXONOMY_CLASSES)[number];

export type EvidenceClass = "MANUFACTURER_PRODUCT" | "MANUFACTURER_SUPPORT" | "OFFICIAL_MANUAL" | "AUTHORIZED_DEALER" | "RELIABLE_TR_RETAILER" | "AMAZON_TR_COMMERCE";
export type TerminalReconciliation = "EXACT" | "REJECTED" | "UNKNOWN";
export interface TaxonomyIntake { readonly departmentId: string; readonly categoryId: string; readonly publicLabelTr: string; readonly riskFlags: readonly HighRiskTaxonomyClass[] }
export interface DiscoveryObservation {
  readonly observationId: string; readonly departmentId: string; readonly categoryId: string;
  readonly sourceUrl: string; readonly sourceClass: EvidenceClass; readonly observedAt: string;
  readonly freshnessUntil: string; readonly rawLabel: string; readonly identifiers: Readonly<Partial<Record<"brand" | "family" | "model" | "exactVariant" | "sku" | "gtin" | "asin", string>>>;
}
export interface IdentityResolution { readonly observationId: string; readonly outcome: TerminalReconciliation; readonly exactProductId?: string; readonly reasonCode: string }
export interface EvidenceAssertion { readonly exactProductId: string; readonly factKey: string; readonly value: string | number | boolean; readonly sourceObservationIds: readonly string[]; readonly evidenceClasses: readonly EvidenceClass[]; readonly authority: "PRIMARY" | "CORROBORATING" | "COMMERCE_ONLY" }
export interface SemanticProjection { readonly exactProductId: string; readonly factKeys: readonly string[]; readonly dailyLife: string; readonly needs: readonly string[]; readonly possibleHardFilters: readonly string[]; readonly materialDiscriminators: readonly string[]; readonly status: "SUPPORTED" | "UNKNOWN_NEUTRAL" }
export interface PersonaProjection { readonly exactProductId: string; readonly hierarchy: readonly string[]; readonly evidenceClasses: readonly EvidenceClass[]; readonly aggregateSoftScore: number; readonly authority: "SOFT_RANKING_ONLY" | "NEUTRAL" }
export interface CommerceMediaProjection { readonly exactProductId: string; readonly offers: readonly { readonly retailer: string; readonly priceTry?: number; readonly stock: "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN"; readonly observedAt: string; readonly sourceObservationId: string }[]; readonly media: readonly { readonly url: string; readonly sourceObservationId: string }[]; readonly technicalEvidenceDigest: null }
export interface DomainPackCandidate { readonly status: "CANDIDATE_NOT_ACTIVE"; readonly departmentId: string; readonly categories: readonly string[]; readonly xpy: { readonly X: "PROPOSAL_ONLY"; readonly P: "DOMAIN_QUESTIONS"; readonly Y: "AUTHORIZED_DECISION_REQUIRED" }; readonly stageGates: readonly string[]; readonly personaSelectionAuthority: "NONE" }
export interface PlatformIntegrationManifest { readonly status: "PENDING_OWNER_APPROVAL"; readonly consumers: readonly ["DEPARTMENT_REGISTRY", "ROOT_DISCOVERY", "EXPİYA_NEDİR", "SECRETARY_IDENTITY_ROUTING", "UNIVERSAL_CARDS", "PERSISTENCE", "STAGE2_READINESS"]; readonly registryMutation: "FORBIDDEN"; readonly categoryDigests: Readonly<Record<string, string>> }
export interface ActivationPlan { readonly immutable: true; readonly status: "PLANNED_NOT_AUTHORIZED"; readonly ownerApprovalRequired: true; readonly activePointerWrite: false; readonly databaseMigration: false; readonly deployment: false }
export interface ReadinessGate { readonly gate: "catalog" | "identity" | "evidence" | "semantics" | "persona-or-neutral" | "XPY" | "Secretary" | "presentation" | "persistence" | "commerce-incomplete-allowed" | "owner-approval"; readonly status: "PASS" | "FAIL" | "PENDING"; readonly reason: string }
export interface FactoryInput { readonly schemaVersion: "catalog-factory-input/v0.1"; readonly ingestion: import("../catalog-ingestion/contracts").CatalogIngestionArtifacts; readonly taxonomy: readonly TaxonomyIntake[]; readonly observations: readonly DiscoveryObservation[]; readonly identities: readonly IdentityResolution[]; readonly evidence: readonly EvidenceAssertion[]; readonly semantics: readonly SemanticProjection[]; readonly personas: readonly PersonaProjection[]; readonly commerceMedia: readonly CommerceMediaProjection[] }
export interface FactoryCheckpoint { readonly inputDigest: string; readonly completedStages: readonly FactoryStage[]; readonly categoryDigests: Readonly<Record<string, string>>; readonly updatedAt: string }
export interface FactoryOutput { readonly schemaVersion: "catalog-factory-output/v0.1"; readonly digest: string; readonly inputDigest: string; readonly stages: readonly FactoryStage[]; readonly coverage: Readonly<Record<string, Readonly<Record<string, number>>>>; readonly gates: readonly ReadinessGate[]; readonly domainPackCandidates: readonly DomainPackCandidate[]; readonly integrationManifest: PlatformIntegrationManifest; readonly activationPlan: ActivationPlan; readonly checkpoint: FactoryCheckpoint }
