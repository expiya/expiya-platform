export const CATALOG_INGESTION_FACTORY_VERSION = "catalog-ingestion-factory/v1" as const;
export const DISCOVERY_SNAPSHOT_SCHEMA_VERSION = "discovery-snapshot/v1" as const;

export type CandidateGate = "DISCOVERY_ONLY" | "IDENTITY_VERIFIED" | "DECISION_READY";

export type DiscoverySourceClass =
  | "AMAZON_BESTSELLER"
  | "MARKETPLACE_DISCOVERY"
  | "MANUFACTURER_PRODUCT_PAGE"
  | "MANUFACTURER_DOCUMENT";

export interface DiscoverySnapshot {
  readonly snapshotId: string;
  readonly schemaVersion: typeof DISCOVERY_SNAPSHOT_SCHEMA_VERSION;
  readonly sourceClass: DiscoverySourceClass;
  readonly sourceUrl: string;
  readonly retrievedAt: string;
  readonly market: string;
  readonly locator: string;
  readonly contentDigest: `sha256:${string}`;
  readonly content: string;
}

export interface CandidateIdentityInput {
  readonly department: string;
  readonly category: string;
  readonly manufacturer: string;
  readonly model: string;
  readonly variant?: string;
  readonly manufacturerPartNumber?: string;
  readonly gtin?: string;
}

export interface NormalizedCandidateIdentity {
  readonly department: string;
  readonly category: string;
  readonly manufacturer: string;
  readonly model: string;
  readonly variant: string | null;
  readonly manufacturerPartNumber: string | null;
  readonly gtin: string | null;
  readonly identityKey: string;
}

export interface CandidateClaim {
  readonly claimId: string;
  readonly field: string;
  readonly value: string | number | boolean;
  readonly evidenceSnapshotIds: readonly string[];
  readonly decisionMaterial: boolean;
}

export interface GovernedCandidateClaim extends CandidateClaim {
  readonly evidenceAuthority: "DISCOVERY_SIGNAL_ONLY" | "MANUFACTURER_VERIFIED";
}

export interface DiscoveryCandidateInput {
  readonly candidateId: string;
  readonly identity: CandidateIdentityInput;
  readonly discoverySnapshotIds: readonly string[];
  readonly identityEvidenceSnapshotIds: readonly string[];
  readonly claims: readonly CandidateClaim[];
}

export interface GovernedCandidate {
  readonly candidateIds: readonly string[];
  readonly identity: NormalizedCandidateIdentity;
  readonly gate: CandidateGate;
  readonly discoverySnapshotIds: readonly string[];
  readonly identityEvidenceSnapshotIds: readonly string[];
  readonly claims: readonly GovernedCandidateClaim[];
  readonly blockingReasons: readonly string[];
}

export interface ManufacturerEvidenceQueueItem {
  readonly identityKey: string;
  readonly candidateIds: readonly string[];
  readonly requestedEvidence: "EXACT_MANUFACTURER_IDENTITY" | "DECISION_MATERIAL_TECHNICAL_FACTS";
  readonly missingClaimIds: readonly string[];
  readonly status: "OPEN";
}

export interface CatalogIngestionManifest {
  readonly schemaVersion: "catalog-ingestion-manifest/v1";
  readonly factoryVersion: typeof CATALOG_INGESTION_FACTORY_VERSION;
  readonly runId: string;
  readonly createdAt: string;
  readonly departmentScope: readonly string[];
  readonly inputDigest: `sha256:${string}`;
  readonly candidateDigest: `sha256:${string}`;
  readonly manufacturerEvidenceQueueDigest: `sha256:${string}`;
  readonly snapshotCount: number;
  readonly inputCandidateCount: number;
  readonly deduplicatedCandidateCount: number;
  readonly gateCounts: Readonly<Record<CandidateGate, number>>;
  readonly activePointersChanged: false;
  readonly productionEligibilityGranted: false;
  readonly authorityBoundary: "NON_PRODUCTION_CANDIDATE_PREPARATION_ONLY";
}

export interface CatalogIngestionArtifacts {
  readonly status: "READY";
  readonly snapshots: readonly DiscoverySnapshot[];
  readonly candidates: readonly GovernedCandidate[];
  readonly manufacturerEvidenceQueue: readonly ManufacturerEvidenceQueueItem[];
  readonly manifest: CatalogIngestionManifest;
}

export interface CatalogIngestionFailure {
  readonly status: "FAILED_CLOSED";
  readonly errors: readonly string[];
}

export type CatalogIngestionResult = CatalogIngestionArtifacts | CatalogIngestionFailure;
