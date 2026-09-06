import { digest, sha256 } from "./canonical";
import {
  CATALOG_INGESTION_FACTORY_VERSION,
  DISCOVERY_SNAPSHOT_SCHEMA_VERSION,
  type CandidateGate,
  type CatalogIngestionResult,
  type DiscoveryCandidateInput,
  type DiscoverySnapshot,
  type GovernedCandidate,
  type GovernedCandidateClaim,
  type ManufacturerEvidenceQueueItem,
  type NormalizedCandidateIdentity,
} from "./contracts";

const MANUFACTURER_SOURCES = new Set(["MANUFACTURER_PRODUCT_PAGE", "MANUFACTURER_DOCUMENT"]);
const SOURCE_CLASSES = new Set(["AMAZON_BESTSELLER", "MARKETPLACE_DISCOVERY", ...MANUFACTURER_SOURCES]);
const GATES: readonly CandidateGate[] = ["DISCOVERY_ONLY", "IDENTITY_VERIFIED", "DECISION_READY"];

function normalizedText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("tr-TR");
}

function normalizedCode(value: string | undefined): string | null {
  const result = value?.normalize("NFKC").trim().replace(/[\s_-]+/gu, "").toLocaleUpperCase("en-US");
  return result || null;
}

export function normalizeCandidateIdentity(identity: DiscoveryCandidateInput["identity"]): NormalizedCandidateIdentity {
  const normalized = {
    department: normalizedText(identity.department),
    category: normalizedText(identity.category),
    manufacturer: normalizedText(identity.manufacturer),
    model: normalizedText(identity.model),
    variant: identity.variant ? normalizedText(identity.variant) : null,
    manufacturerPartNumber: normalizedCode(identity.manufacturerPartNumber),
    gtin: normalizedCode(identity.gtin),
  };
  const strongestVariantKey = normalized.gtin ?? normalized.manufacturerPartNumber ?? normalized.variant ?? "base";
  return {
    ...normalized,
    identityKey: [normalized.department, normalized.category, normalized.manufacturer, normalized.model, strongestVariantKey].join("::"),
  };
}

function validateSnapshots(snapshots: readonly DiscoverySnapshot[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const snapshot of snapshots) {
    if (!snapshot.snapshotId.trim() || ids.has(snapshot.snapshotId)) errors.push(`SNAPSHOT_ID_INVALID_OR_DUPLICATE:${snapshot.snapshotId}`);
    ids.add(snapshot.snapshotId);
    if (snapshot.schemaVersion !== DISCOVERY_SNAPSHOT_SCHEMA_VERSION) errors.push(`SNAPSHOT_SCHEMA_UNSUPPORTED:${snapshot.snapshotId}`);
    if (!SOURCE_CLASSES.has(snapshot.sourceClass)) errors.push(`SNAPSHOT_SOURCE_CLASS_UNSUPPORTED:${snapshot.snapshotId}`);
    if (!/^https:\/\//u.test(snapshot.sourceUrl)) errors.push(`SNAPSHOT_URL_NOT_HTTPS:${snapshot.snapshotId}`);
    if (!Number.isFinite(Date.parse(snapshot.retrievedAt))) errors.push(`SNAPSHOT_RETRIEVED_AT_INVALID:${snapshot.snapshotId}`);
    if (!snapshot.market.trim() || !snapshot.locator.trim() || !snapshot.content) errors.push(`SNAPSHOT_REQUIRED_FIELD_MISSING:${snapshot.snapshotId}`);
    if (snapshot.contentDigest !== sha256(snapshot.content)) errors.push(`SNAPSHOT_CONTENT_DIGEST_MISMATCH:${snapshot.snapshotId}`);
  }
  return errors;
}

function validateCandidates(candidates: readonly DiscoveryCandidateInput[], snapshots: ReadonlyMap<string, DiscoverySnapshot>): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate.candidateId.trim() || ids.has(candidate.candidateId)) errors.push(`CANDIDATE_ID_INVALID_OR_DUPLICATE:${candidate.candidateId}`);
    ids.add(candidate.candidateId);
    const normalized = normalizeCandidateIdentity(candidate.identity);
    if ([normalized.department, normalized.category, normalized.manufacturer, normalized.model].some((part) => !part)) errors.push(`CANDIDATE_IDENTITY_INCOMPLETE:${candidate.candidateId}`);
    const referenced = [...candidate.discoverySnapshotIds, ...candidate.identityEvidenceSnapshotIds, ...candidate.claims.flatMap((claim) => claim.evidenceSnapshotIds)];
    for (const snapshotId of referenced) if (!snapshots.has(snapshotId)) errors.push(`UNKNOWN_SNAPSHOT_REFERENCE:${candidate.candidateId}:${snapshotId}`);
    if (candidate.discoverySnapshotIds.length === 0) errors.push(`DISCOVERY_EVIDENCE_REQUIRED:${candidate.candidateId}`);
    if (new Set(candidate.claims.map((claim) => claim.claimId)).size !== candidate.claims.length) errors.push(`CLAIM_ID_DUPLICATE:${candidate.candidateId}`);
    for (const claim of candidate.claims) {
      if (!claim.claimId.trim() || !claim.field.trim() || claim.evidenceSnapshotIds.length === 0) errors.push(`CLAIM_INVALID:${candidate.candidateId}:${claim.claimId}`);
      if (/price|offer|seller|affiliate|popularity|bestseller|ranking/iu.test(claim.field)) errors.push(`FORBIDDEN_AUTHORITY_CLAIM:${candidate.candidateId}:${claim.claimId}`);
      const claimSources = claim.evidenceSnapshotIds.map((id) => snapshots.get(id)).filter(Boolean) as DiscoverySnapshot[];
      if (claim.decisionMaterial && claimSources.some((source) => !MANUFACTURER_SOURCES.has(source.sourceClass))) {
        errors.push(`DECISION_CLAIM_USES_DISCOVERY_SOURCE:${candidate.candidateId}:${claim.claimId}`);
      }
    }
    for (const snapshotId of candidate.identityEvidenceSnapshotIds) {
      const source = snapshots.get(snapshotId);
      if (source && !MANUFACTURER_SOURCES.has(source.sourceClass)) errors.push(`IDENTITY_EVIDENCE_NOT_MANUFACTURER:${candidate.candidateId}:${snapshotId}`);
    }
  }
  return errors;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "en"));
}

function mergeClaims(candidates: readonly DiscoveryCandidateInput[], snapshots: ReadonlyMap<string, DiscoverySnapshot>): GovernedCandidateClaim[] {
  const claims = new Map<string, GovernedCandidateClaim>();
  for (const claim of candidates.flatMap((candidate) => candidate.claims).sort((left, right) => left.claimId.localeCompare(right.claimId, "en"))) {
    const existing = claims.get(claim.claimId);
    if (existing && (existing.field !== claim.field || JSON.stringify(existing.value) !== JSON.stringify(claim.value) || existing.decisionMaterial !== claim.decisionMaterial)) {
      throw new Error(`CONFLICTING_DUPLICATE_CLAIM:${claim.claimId}`);
    }
    const evidenceSnapshotIds = uniqueSorted([...(existing?.evidenceSnapshotIds ?? []), ...claim.evidenceSnapshotIds]);
    claims.set(claim.claimId, {
      ...claim,
      evidenceSnapshotIds,
      evidenceAuthority: evidenceSnapshotIds.every((id) => MANUFACTURER_SOURCES.has(snapshots.get(id)!.sourceClass))
        ? "MANUFACTURER_VERIFIED"
        : "DISCOVERY_SIGNAL_ONLY",
    });
  }
  return [...claims.values()];
}

function assessCandidate(candidates: readonly DiscoveryCandidateInput[], snapshots: ReadonlyMap<string, DiscoverySnapshot>): GovernedCandidate {
  const identity = candidates
    .map((candidate) => normalizeCandidateIdentity(candidate.identity))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right), "en"))[0]!;
  const identityEvidenceSnapshotIds = uniqueSorted(candidates.flatMap((candidate) => candidate.identityEvidenceSnapshotIds));
  const manufacturerIdentityEvidence = identityEvidenceSnapshotIds.filter((id) => MANUFACTURER_SOURCES.has(snapshots.get(id)!.sourceClass));
  const claims = mergeClaims(candidates, snapshots);
  const uncoveredDecisionClaims = claims.filter((claim) => claim.decisionMaterial && !claim.evidenceSnapshotIds.some((id) => MANUFACTURER_SOURCES.has(snapshots.get(id)!.sourceClass)));
  const blockingReasons: string[] = [];
  let gate: CandidateGate = "DISCOVERY_ONLY";
  if (manufacturerIdentityEvidence.length === 0) blockingReasons.push("EXACT_MANUFACTURER_IDENTITY_EVIDENCE_REQUIRED");
  else {
    gate = "IDENTITY_VERIFIED";
    if (!claims.some((claim) => claim.decisionMaterial)) blockingReasons.push("DECISION_MATERIAL_CLAIMS_REQUIRED");
    else if (uncoveredDecisionClaims.length > 0) blockingReasons.push("MANUFACTURER_EVIDENCE_REQUIRED_FOR_DECISION_MATERIAL_CLAIMS");
    else gate = "DECISION_READY";
  }
  return {
    candidateIds: uniqueSorted(candidates.map((candidate) => candidate.candidateId)),
    identity,
    gate,
    discoverySnapshotIds: uniqueSorted(candidates.flatMap((candidate) => candidate.discoverySnapshotIds)),
    identityEvidenceSnapshotIds,
    claims,
    blockingReasons,
  };
}

function queueItem(candidate: GovernedCandidate): ManufacturerEvidenceQueueItem | null {
  if (candidate.gate === "DECISION_READY") return null;
  const missing = candidate.claims.filter((claim) => claim.decisionMaterial && claim.evidenceAuthority !== "MANUFACTURER_VERIFIED").map((claim) => claim.claimId).sort((a, b) => a.localeCompare(b, "en"));
  return {
    identityKey: candidate.identity.identityKey,
    candidateIds: candidate.candidateIds,
    requestedEvidence: candidate.gate === "DISCOVERY_ONLY" ? "EXACT_MANUFACTURER_IDENTITY" : "DECISION_MATERIAL_TECHNICAL_FACTS",
    missingClaimIds: candidate.gate === "DISCOVERY_ONLY" ? [] : missing.length > 0 ? missing : ["DECISION_MATERIAL_CLAIMS_NOT_DECLARED"],
    status: "OPEN",
  };
}

export function runCatalogIngestionFactory(input: {
  readonly runId: string;
  readonly createdAt: string;
  readonly snapshots: readonly DiscoverySnapshot[];
  readonly candidates: readonly DiscoveryCandidateInput[];
}): CatalogIngestionResult {
  const snapshotErrors = validateSnapshots(input.snapshots);
  const snapshotMap = new Map(input.snapshots.map((snapshot) => [snapshot.snapshotId, snapshot]));
  const errors = [...snapshotErrors, ...validateCandidates(input.candidates, snapshotMap)].sort((a, b) => a.localeCompare(b, "en"));
  if (!input.runId.trim()) errors.push("RUN_ID_REQUIRED");
  if (!Number.isFinite(Date.parse(input.createdAt))) errors.push("CREATED_AT_INVALID");
  if (errors.length > 0) return { status: "FAILED_CLOSED", errors: uniqueSorted(errors) };

  try {
    const groups = new Map<string, DiscoveryCandidateInput[]>();
    for (const candidate of input.candidates) {
      const key = normalizeCandidateIdentity(candidate.identity).identityKey;
      groups.set(key, [...(groups.get(key) ?? []), candidate]);
    }
    const candidates = [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right, "en"))
      .map(([, group]) => assessCandidate(group, snapshotMap));
    const manufacturerEvidenceQueue = candidates.map(queueItem).filter((item): item is ManufacturerEvidenceQueueItem => item !== null);
    const gateCounts = Object.fromEntries(GATES.map((gate) => [gate, candidates.filter((candidate) => candidate.gate === gate).length])) as Record<CandidateGate, number>;
    const snapshots = [...input.snapshots].sort((left, right) => left.snapshotId.localeCompare(right.snapshotId, "en"));
    const manifest = {
      schemaVersion: "catalog-ingestion-manifest/v1" as const,
      factoryVersion: CATALOG_INGESTION_FACTORY_VERSION,
      runId: input.runId,
      createdAt: input.createdAt,
      departmentScope: uniqueSorted(candidates.map((candidate) => candidate.identity.department)),
      inputDigest: digest({ snapshots, candidates: input.candidates }),
      candidateDigest: digest(candidates),
      manufacturerEvidenceQueueDigest: digest(manufacturerEvidenceQueue),
      snapshotCount: snapshots.length,
      inputCandidateCount: input.candidates.length,
      deduplicatedCandidateCount: candidates.length,
      gateCounts,
      activePointersChanged: false as const,
      productionEligibilityGranted: false as const,
      authorityBoundary: "NON_PRODUCTION_CANDIDATE_PREPARATION_ONLY" as const,
    };
    return { status: "READY", snapshots, candidates, manufacturerEvidenceQueue, manifest };
  } catch (error) {
    return { status: "FAILED_CLOSED", errors: [error instanceof Error ? error.message : "UNKNOWN_FACTORY_FAILURE"] };
  }
}
