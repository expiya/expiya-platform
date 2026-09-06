import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { XpyCatalogRelease } from "./contract";
import { joinExternalOfferingSnapshot, validateXpyCatalogRelease } from "./validation";

export const MAJOR_APPLIANCE_ADOPTION_RELEASE = "APPLIANCES-MAJOR-CATALOG-ADOPTION-TR-v0.1-candidate" as const;
export const MAJOR_APPLIANCE_ADOPTION_ROOT = `data/production/appliances/catalog-adoption/releases/${MAJOR_APPLIANCE_ADOPTION_RELEASE}` as const;

type AdoptionCategory = "WASHING_MACHINE" | "DRYER" | "DISHWASHER" | "REFRIGERATOR";

interface CategoryCandidateBinding {
  readonly categoryId: AdoptionCategory;
  readonly releasePath: string;
  readonly manifestPath: string;
  readonly releaseVersion: string;
  readonly catalogArtifactSha256: string;
  readonly manifestArtifactSha256: string;
  readonly membershipDigest: string;
  readonly memberCount: number;
  readonly priorMemberCount: number;
  readonly admittedOfferingIds: readonly string[];
  readonly activePointerPath: string;
  readonly activePointerSha256: string;
  readonly activeDecisionReleaseVersion: string;
  readonly activeDecisionArtifactPath: string;
  readonly activeDecisionArtifactSha256: string;
}

interface BoundArtifact {
  readonly path: string;
  readonly sha256: string;
}

interface BatchManifest {
  readonly schemaVersion: "major-appliance-catalog-adoption-batch/v1";
  readonly workUnitId: "WU-APPL-AMAZON-P1-MAJOR-APPLIANCE-CATALOG-ADOPTION-01";
  readonly releaseId: typeof MAJOR_APPLIANCE_ADOPTION_RELEASE;
  readonly lifecycle: "FROZEN_CANDIDATE";
  readonly activation: {
    readonly status: "BLOCKED_MANDATORY_PRODUCT_OWNER_APPROVAL";
    readonly pointersChanged: false;
    readonly approvalArtifact: string;
    readonly approvalArtifactSha256: string;
  };
  readonly aggregateArtifacts: {
    readonly candidateLedger: BoundArtifact;
    readonly sourceRegister: BoundArtifact;
    readonly coverageReport: BoundArtifact;
    readonly approvalPackage: BoundArtifact;
    readonly summary: BoundArtifact;
  };
  readonly categories: readonly CategoryCandidateBinding[];
  readonly l10SnapshotPath: string;
  readonly l10SnapshotSha256: string;
  readonly admittedCount: number;
  readonly blockedEvidenceCount: number;
  readonly batchDigest: string;
}

interface CategoryManifest {
  readonly schemaVersion: "major-appliance-category-adoption-manifest/v1";
  readonly categoryId: AdoptionCategory;
  readonly releaseVersion: string;
  readonly catalogArtifactSha256: string;
  readonly semanticArtifactSha256: string;
  readonly coverageArtifactSha256: string;
  readonly projectionsArtifactSha256: string;
  readonly sourceRegisterArtifactSha256: string;
  readonly unknownRegisterArtifactSha256: string;
  readonly membershipDigest: string;
  readonly memberCount: number;
  readonly priorMemberCount: number;
  readonly admittedOfferingIds: readonly string[];
  readonly parent: {
    readonly activePointerPath: string;
    readonly activePointerSha256: string;
    readonly decisionReleaseVersion: string;
    readonly decisionArtifactPath: string;
    readonly decisionArtifactSha256: string;
    readonly richnessReleaseVersion: string;
    readonly richnessCatalogArtifactSha256: string;
    readonly relationship: "IMMUTABLE_SUCCESSOR_CANDIDATE_NO_OVERWRITE";
  };
  readonly activation: {
    readonly performed: false;
    readonly status: "BLOCKED_MANDATORY_PRODUCT_OWNER_APPROVAL";
  };
}

export type MajorApplianceAdoptionLoadResult =
  | {
    readonly status: "READY_FOR_PRODUCT_OWNER_APPROVAL";
    readonly manifest: BatchManifest;
    readonly releases: Readonly<Record<AdoptionCategory, XpyCatalogRelease>>;
  }
  | { readonly status: "FAILED_CLOSED"; readonly reason: string };

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const membershipDigest = (ids: readonly string[]) => sha256([...ids].sort().join("\n"));
const adoptionCategories: readonly AdoptionCategory[] = ["WASHING_MACHINE", "DRYER", "DISHWASHER", "REFRIGERATOR"];

function isSafeFileUnder(root: string, relative: string, allowedRoot: string): boolean {
  if (path.isAbsolute(relative)) return false;
  const resolvedRoot = path.resolve(root, allowedRoot);
  const resolved = path.resolve(root, relative);
  return resolved.startsWith(`${resolvedRoot}${path.sep}`);
}

function isSafeRelativeFile(root: string, relative: string): boolean {
  return isSafeFileUnder(root, relative, MAJOR_APPLIANCE_ADOPTION_ROOT);
}

function isSafeAppliancesFile(root: string, relative: string): boolean {
  return isSafeFileUnder(root, relative, "data/production/appliances");
}

function retainedExactly<T>(prior: readonly T[], candidate: readonly T[], id: (item: T) => string, normalize: (item: T) => unknown = (item) => item): boolean {
  const byId = new Map(candidate.map((item) => [id(item), item]));
  return prior.every((item) => {
    const next = byId.get(id(item));
    return next !== undefined && JSON.stringify(normalize(next)) === JSON.stringify(normalize(item));
  });
}

export async function loadMajorApplianceCatalogAdoptionCandidate(root: string): Promise<MajorApplianceAdoptionLoadResult> {
  try {
    const batchPath = path.join(root, MAJOR_APPLIANCE_ADOPTION_ROOT, "batch-manifest.json");
    const batchRaw = await readFile(batchPath, "utf8");
    const batch = JSON.parse(batchRaw) as BatchManifest;
    if (
      batch.schemaVersion !== "major-appliance-catalog-adoption-batch/v1"
      || batch.workUnitId !== "WU-APPL-AMAZON-P1-MAJOR-APPLIANCE-CATALOG-ADOPTION-01"
      || batch.releaseId !== MAJOR_APPLIANCE_ADOPTION_RELEASE
      || batch.lifecycle !== "FROZEN_CANDIDATE"
      || batch.activation.status !== "BLOCKED_MANDATORY_PRODUCT_OWNER_APPROVAL"
      || batch.activation.pointersChanged !== false
      || batch.categories.length !== 4
      || batch.admittedCount !== 16
      || batch.blockedEvidenceCount !== 1
    ) return { status: "FAILED_CLOSED", reason: "BATCH_MANIFEST_INVALID" };
    if (
      [...new Set(batch.categories.map((item) => item.categoryId))].sort().join("\n")
      !== [...adoptionCategories].sort().join("\n")
    ) return { status: "FAILED_CLOSED", reason: "BATCH_CATEGORY_SET_INVALID" };

    const digestPayload = { ...batch, batchDigest: undefined };
    if (batch.batchDigest !== `sha256:${sha256(JSON.stringify(digestPayload))}`) return { status: "FAILED_CLOSED", reason: "BATCH_DIGEST_MISMATCH" };

    const aggregateArtifactNames = ["candidateLedger", "sourceRegister", "coverageReport", "approvalPackage", "summary"] as const;
    if (Object.keys(batch.aggregateArtifacts).sort().join("\n") !== [...aggregateArtifactNames].sort().join("\n")) return { status: "FAILED_CLOSED", reason: "AGGREGATE_ARTIFACT_SET_INVALID" };
    const aggregateRaws = {} as Record<(typeof aggregateArtifactNames)[number], string>;
    for (const artifactName of aggregateArtifactNames) {
      const artifact = batch.aggregateArtifacts[artifactName];
      if (!isSafeRelativeFile(root, artifact.path)) return { status: "FAILED_CLOSED", reason: "UNSAFE_AGGREGATE_ARTIFACT_PATH" };
      const artifactRaw = await readFile(path.join(root, artifact.path), "utf8");
      if (sha256(artifactRaw) !== artifact.sha256) return { status: "FAILED_CLOSED", reason: "AGGREGATE_ARTIFACT_DIGEST_MISMATCH" };
      aggregateRaws[artifactName] = artifactRaw;
    }
    if (
      batch.activation.approvalArtifact !== batch.aggregateArtifacts.approvalPackage.path
      || batch.activation.approvalArtifactSha256 !== batch.aggregateArtifacts.approvalPackage.sha256
    ) return { status: "FAILED_CLOSED", reason: "APPROVAL_ARTIFACT_BINDING_MISMATCH" };
    const approval = JSON.parse(aggregateRaws.approvalPackage) as {
      schemaVersion?: string;
      workUnitId?: string;
      releaseId?: string;
      status?: string;
      approved?: boolean;
      candidateBindings?: unknown;
      scope?: { admittedProducts?: number; blockedEvidenceProducts?: number; removals?: number; replacements?: number; rankingChanges?: number };
    };
    if (
      approval.schemaVersion !== "major-appliance-catalog-adoption-approval-package/v1"
      || approval.workUnitId !== batch.workUnitId
      || approval.releaseId !== batch.releaseId
      || approval.status !== "AWAITING_MANDATORY_APPROVAL"
      || approval.approved !== false
      || approval.scope?.admittedProducts !== 16
      || approval.scope.blockedEvidenceProducts !== 1
      || approval.scope.removals !== 0
      || approval.scope.replacements !== 0
      || approval.scope.rankingChanges !== 0
      || JSON.stringify(approval.candidateBindings) !== JSON.stringify(batch.categories)
    ) return { status: "FAILED_CLOSED", reason: "APPROVAL_PACKAGE_INVALID" };
    const ledger = JSON.parse(aggregateRaws.candidateLedger) as readonly { offeringId?: string; disposition?: string; blockers?: readonly string[] }[];
    if (
      !Array.isArray(ledger)
      || ledger.length !== 17
      || ledger.filter((item) => item.disposition === "ADMITTED").length !== 16
      || ledger.filter((item) => item.disposition === "BLOCKED_EVIDENCE" && item.blockers?.length).length !== 1
      || new Set(ledger.map((item) => item.offeringId)).size !== 17
    ) return { status: "FAILED_CLOSED", reason: "CANDIDATE_LEDGER_INVALID" };
    const aggregateSources = JSON.parse(aggregateRaws.sourceRegister) as unknown;
    const aggregateCoverage = JSON.parse(aggregateRaws.coverageReport) as unknown;
    if (!Array.isArray(aggregateSources) || aggregateSources.length !== 16 || !Array.isArray(aggregateCoverage) || aggregateCoverage.length !== 4) return { status: "FAILED_CLOSED", reason: "AGGREGATE_REGISTER_INVALID" };

    const releases = {} as Record<AdoptionCategory, XpyCatalogRelease>;
    const allAdmittedIds = new Set<string>();
    for (const binding of batch.categories) {
      if (
        !isSafeRelativeFile(root, binding.releasePath)
        || !isSafeRelativeFile(root, binding.manifestPath)
        || !isSafeAppliancesFile(root, binding.activePointerPath)
        || !isSafeAppliancesFile(root, binding.activeDecisionArtifactPath)
      ) return { status: "FAILED_CLOSED", reason: "UNSAFE_CANDIDATE_OR_PARENT_PATH" };
      const categoryRoot = path.dirname(path.join(root, binding.manifestPath));
      const [releaseRaw, manifestRaw, activePointerRaw, decisionArtifactRaw, semanticRaw, coverageRaw, projectionsRaw, sourceRegisterRaw, unknownRegisterRaw] = await Promise.all([
        readFile(path.join(root, binding.releasePath), "utf8"),
        readFile(path.join(root, binding.manifestPath), "utf8"),
        readFile(path.join(root, binding.activePointerPath), "utf8"),
        readFile(path.join(root, binding.activeDecisionArtifactPath), "utf8"),
        readFile(path.join(categoryRoot, "semantic-registry.json"), "utf8"),
        readFile(path.join(categoryRoot, "coverage-report.json"), "utf8"),
        readFile(path.join(categoryRoot, "read-projections.json"), "utf8"),
        readFile(path.join(categoryRoot, "source-register.json"), "utf8"),
        readFile(path.join(categoryRoot, "unknown-register.json"), "utf8"),
      ]);
      const release = JSON.parse(releaseRaw) as XpyCatalogRelease;
      const manifest = JSON.parse(manifestRaw) as CategoryManifest;
      const activePointer = JSON.parse(activePointerRaw) as { releaseVersion?: string; artifactSha256?: string; richness?: { releaseVersion?: string; catalogArtifactSha256?: string } };
      if (
        sha256(releaseRaw) !== binding.catalogArtifactSha256
        || sha256(manifestRaw) !== binding.manifestArtifactSha256
        || sha256(activePointerRaw) !== binding.activePointerSha256
        || sha256(decisionArtifactRaw) !== binding.activeDecisionArtifactSha256
        || activePointer.releaseVersion !== binding.activeDecisionReleaseVersion
        || (activePointer.artifactSha256 !== undefined && activePointer.artifactSha256 !== binding.activeDecisionArtifactSha256)
      ) return { status: "FAILED_CLOSED", reason: "ACTIVE_OR_CANDIDATE_DIGEST_MISMATCH" };
      if (
        manifest.schemaVersion !== "major-appliance-category-adoption-manifest/v1"
        || manifest.categoryId !== binding.categoryId
        || manifest.releaseVersion !== binding.releaseVersion
        || manifest.catalogArtifactSha256 !== binding.catalogArtifactSha256
        || manifest.membershipDigest !== binding.membershipDigest
        || manifest.memberCount !== binding.memberCount
        || manifest.priorMemberCount !== binding.priorMemberCount
        || manifest.parent.activePointerPath !== binding.activePointerPath
        || manifest.parent.activePointerSha256 !== binding.activePointerSha256
        || manifest.parent.decisionReleaseVersion !== binding.activeDecisionReleaseVersion
        || manifest.parent.decisionArtifactPath !== binding.activeDecisionArtifactPath
        || manifest.parent.decisionArtifactSha256 !== binding.activeDecisionArtifactSha256
        || manifest.parent.richnessReleaseVersion !== activePointer.richness?.releaseVersion
        || manifest.parent.richnessCatalogArtifactSha256 !== activePointer.richness?.catalogArtifactSha256
        || JSON.stringify(manifest.admittedOfferingIds) !== JSON.stringify(binding.admittedOfferingIds)
        || manifest.activation.performed !== false
        || manifest.activation.status !== "BLOCKED_MANDATORY_PRODUCT_OWNER_APPROVAL"
      ) return { status: "FAILED_CLOSED", reason: "CATEGORY_MANIFEST_BINDING_MISMATCH" };
      if (
        sha256(semanticRaw) !== manifest.semanticArtifactSha256
        || sha256(coverageRaw) !== manifest.coverageArtifactSha256
        || sha256(projectionsRaw) !== manifest.projectionsArtifactSha256
        || sha256(sourceRegisterRaw) !== manifest.sourceRegisterArtifactSha256
        || sha256(unknownRegisterRaw) !== manifest.unknownRegisterArtifactSha256
      ) return { status: "FAILED_CLOSED", reason: "CATEGORY_ARTIFACT_DIGEST_MISMATCH" };
      const semantic = JSON.parse(semanticRaw) as { schemaVersion?: string; categoryId?: string; releaseVersion?: string };
      const coverage = JSON.parse(coverageRaw) as { schemaVersion?: string; categoryId?: string; counts?: { admittedOfferings?: number } };
      const projections = JSON.parse(projectionsRaw) as { schemaVersion?: string; candidateReleaseDigest?: string };
      const sourceRegister = JSON.parse(sourceRegisterRaw) as unknown;
      const unknownRegister = JSON.parse(unknownRegisterRaw) as unknown;
      if (
        semantic.schemaVersion !== "major-appliance-adoption-semantic-registry/v1"
        || semantic.categoryId !== binding.categoryId
        || semantic.releaseVersion !== binding.releaseVersion
        || coverage.schemaVersion !== "major-appliance-category-adoption-coverage/v1"
        || coverage.categoryId !== binding.categoryId
        || coverage.counts?.admittedOfferings !== binding.admittedOfferingIds.length
        || projections.schemaVersion !== "major-appliance-adoption-read-projections/v1"
        || projections.candidateReleaseDigest !== release.releaseDigest
        || !Array.isArray(sourceRegister)
        || sourceRegister.length !== binding.admittedOfferingIds.length
        || !Array.isArray(unknownRegister)
        || unknownRegister.length !== binding.admittedOfferingIds.length
      ) return { status: "FAILED_CLOSED", reason: "CATEGORY_ARTIFACT_SCHEMA_INVALID" };
      if (!activePointer.richness?.releaseVersion || !activePointer.richness.catalogArtifactSha256) return { status: "FAILED_CLOSED", reason: "ACTIVE_RICHNESS_BINDING_MISSING" };
      const parentRichnessPath = path.join(
        path.dirname(binding.activePointerPath),
        "richness",
        "releases",
        activePointer.richness.releaseVersion,
        "catalog-release.json",
      );
      if (!isSafeAppliancesFile(root, parentRichnessPath)) return { status: "FAILED_CLOSED", reason: "UNSAFE_PARENT_RICHNESS_PATH" };
      const parentRichnessRaw = await readFile(path.join(root, parentRichnessPath), "utf8");
      const parentRichness = JSON.parse(parentRichnessRaw) as XpyCatalogRelease;
      if (
        sha256(parentRichnessRaw) !== activePointer.richness.catalogArtifactSha256
        || activePointer.richness.releaseVersion !== manifest.parent.richnessReleaseVersion
        || validateXpyCatalogRelease(parentRichness).length
        || parentRichness.offerings.length !== binding.priorMemberCount
      ) return { status: "FAILED_CLOSED", reason: "ACTIVE_RICHNESS_PARENT_INVALID" };
      const admittedIds = new Set(binding.admittedOfferingIds);
      if (
        release.releaseVersion !== binding.releaseVersion
        || release.categoryId !== binding.categoryId
        || release.market !== "TR"
        || validateXpyCatalogRelease(release).length
        || membershipDigest(release.offerings.map((item) => item.offeringId)) !== binding.membershipDigest
        || release.offerings.length !== binding.memberCount
        || binding.admittedOfferingIds.some((id) => !release.offerings.some((item) => item.offeringId === id))
        || release.layers.l9AdvisorKnowledge.some((item) => admittedIds.has(item.offeringId))
        || release.externalBoundaries.commerce !== "EXTERNAL_VOLATILE_EXACT_IDENTITY_JOIN_ONLY"
        || release.externalBoundaries.media !== "EXTERNAL_VOLATILE_EXACT_IDENTITY_JOIN_ONLY"
        || release.externalBoundaries.offerIdentityAuthority !== "NONE"
        || release.externalBoundaries.offerRankingAuthority !== "NONE"
        || release.externalBoundaries.affiliateRankingAuthority !== "NONE"
      ) return { status: "FAILED_CLOSED", reason: "CATEGORY_RELEASE_INVALID" };
      const retained = (
        retainedExactly(parentRichness.sources, release.sources, (item) => item.sourceId)
        && retainedExactly(parentRichness.evidence, release.evidence, (item) => item.evidenceId)
        && retainedExactly(parentRichness.offerings, release.offerings, (item) => item.offeringId)
        && retainedExactly(parentRichness.layers.l1Facts, release.layers.l1Facts, (item) => item.factId)
        && retainedExactly(parentRichness.layers.l2Capabilities, release.layers.l2Capabilities, (item) => item.capabilityId)
        && retainedExactly(parentRichness.layers.l3UsageSemantics, release.layers.l3UsageSemantics, (item) => item.semanticId)
        && retainedExactly(parentRichness.layers.l4Needs, release.layers.l4Needs, (item) => item.needId)
        && retainedExactly(parentRichness.layers.l4NeedEvidenceMappings, release.layers.l4NeedEvidenceMappings, (item) => item.mappingId)
        && retainedExactly(parentRichness.layers.l5PersonaSignals, release.layers.l5PersonaSignals, (item) => item.signalId)
        && retainedExactly(parentRichness.layers.l6DailyLifeInterpretations, release.layers.l6DailyLifeInterpretations, (item) => item.interpretationId)
        && retainedExactly(parentRichness.layers.l7ExperienceRules, release.layers.l7ExperienceRules, (item) => item.ruleId)
        && retainedExactly(parentRichness.layers.l8DecisionProjections, release.layers.l8DecisionProjections, (item) => item.projectionId)
        && retainedExactly(
          parentRichness.layers.l9AdvisorKnowledge,
          release.layers.l9AdvisorKnowledge,
          (item) => item.knowledgeId,
          (item) => ({ ...item, offeringVersion: release.releaseVersion }),
        )
      );
      const priorOfferingIds = new Set(parentRichness.offerings.map((item) => item.offeringId));
      const addedOfferingIds = release.offerings.filter((item) => !priorOfferingIds.has(item.offeringId)).map((item) => item.offeringId).sort();
      if (
        !retained
        || JSON.stringify(addedOfferingIds) !== JSON.stringify([...binding.admittedOfferingIds].sort())
        || release.offerings.length !== parentRichness.offerings.length + binding.admittedOfferingIds.length
      ) return { status: "FAILED_CLOSED", reason: "EXISTING_PRODUCT_NON_REGRESSION_FAILED" };
      for (const id of binding.admittedOfferingIds) {
        if (allAdmittedIds.has(id)) return { status: "FAILED_CLOSED", reason: "CROSS_CATEGORY_IDENTITY_COLLISION" };
        allAdmittedIds.add(id);
      }
      releases[binding.categoryId] = Object.freeze(release);
    }
    if (allAdmittedIds.size !== batch.admittedCount) return { status: "FAILED_CLOSED", reason: "BATCH_MEMBERSHIP_MISMATCH" };
    const ledgerAdmittedIds = ledger.filter((item) => item.disposition === "ADMITTED").map((item) => item.offeringId).sort();
    const ledgerBlockedIds = ledger.filter((item) => item.disposition === "BLOCKED_EVIDENCE").map((item) => item.offeringId);
    if (
      ledgerAdmittedIds.some((id) => !id)
      || JSON.stringify(ledgerAdmittedIds) !== JSON.stringify([...allAdmittedIds].sort())
      || ledgerBlockedIds.some((id) => !id || Object.values(releases).some((release) => release.offerings.some((item) => item.offeringId === id)))
    ) return { status: "FAILED_CLOSED", reason: "LEDGER_RELEASE_MEMBERSHIP_MISMATCH" };

    if (!isSafeRelativeFile(root, batch.l10SnapshotPath)) return { status: "FAILED_CLOSED", reason: "UNSAFE_L10_PATH" };
    const l10Raw = await readFile(path.join(root, batch.l10SnapshotPath), "utf8");
    if (sha256(l10Raw) !== batch.l10SnapshotSha256) return { status: "FAILED_CLOSED", reason: "L10_SNAPSHOT_DIGEST_MISMATCH" };
    const snapshots = JSON.parse(l10Raw) as Record<AdoptionCategory, Parameters<typeof joinExternalOfferingSnapshot>[1]>;
    if (Object.keys(snapshots).sort().join("\n") !== [...adoptionCategories].sort().join("\n")) return { status: "FAILED_CLOSED", reason: "L10_CATEGORY_SET_INVALID" };
    const joinedL10Ids = new Set<string>();
    for (const category of Object.keys(releases) as AdoptionCategory[]) {
      const snapshot = snapshots[category];
      if (snapshot.media.length || snapshot.offers.some((offer) => offer.affiliate || offer.currency !== "TRY")) return { status: "FAILED_CLOSED", reason: "L10_BOUNDARY_INVALID" };
      joinExternalOfferingSnapshot(releases[category], snapshot);
      snapshot.offers.forEach((offer) => joinedL10Ids.add(offer.offeringId));
    }
    if (joinedL10Ids.size !== allAdmittedIds.size || [...allAdmittedIds].some((id) => !joinedL10Ids.has(id))) return { status: "FAILED_CLOSED", reason: "L10_EXACT_IDENTITY_JOIN_INCOMPLETE" };

    return { status: "READY_FOR_PRODUCT_OWNER_APPROVAL", manifest: Object.freeze(batch), releases: Object.freeze(releases) };
  } catch {
    return { status: "FAILED_CLOSED", reason: "MAJOR_APPLIANCE_ADOPTION_CANDIDATE_MISSING_OR_INVALID" };
  }
}
