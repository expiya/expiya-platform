import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { XpyCatalogRelease } from "./contract";
import { validateXpyCatalogRelease } from "./validation";
import { MAJOR_APPLIANCE_ADOPTION_RELEASE, MAJOR_APPLIANCE_ADOPTION_ROOT } from "./majorApplianceCatalogAdoption.server";
import { validateDecisionActivationPointer } from "@/features/appliances/decisionAdoption/approval.server";
import { MAJOR_APPLIANCE_DECISION_RELEASES } from "@/features/appliances/decisionAdoption/contract";

export const MAJOR_APPLIANCE_ACTIVATION_WORK_UNIT = "WU-APPL-AMAZON-P1-MAJOR-APPLIANCE-CATALOG-ACTIVATION-01" as const;
export const APPROVED_MAJOR_APPLIANCE_BATCH_DIGEST = "sha256:b3cb67e1dd00dc6c529ae750679e8276c13f9723d4e1d77737a7f39aee441ea2" as const;
export const APPROVED_MAJOR_APPLIANCE_PACKAGE_SHA256 = "2e76d621ce5569d7005ea29ab10e70f1807199038d1d973a681baee829210732" as const;

export type MajorApplianceAdoptionCategory = "WASHING_MACHINE" | "DRYER" | "DISHWASHER" | "REFRIGERATOR";

export const MAJOR_APPLIANCE_ADOPTION_CATEGORY_RELEASES = Object.freeze({
  WASHING_MACHINE: "APPLIANCES-WM-CATALOG-RICHNESS-TR-v0.3-candidate",
  DRYER: "APPLIANCES-DRYER-CATALOG-RICHNESS-TR-v0.3-candidate",
  DISHWASHER: "APPLIANCES-DISHWASHER-CATALOG-RICHNESS-TR-v0.3-candidate",
  REFRIGERATOR: "APPLIANCES-REFRIGERATOR-CATALOG-RICHNESS-TR-v0.3-candidate",
} as const);

const configuration = Object.freeze({
  WASHING_MACHINE: { slug: "washing-machines", pointerSchema: "appliances-authority-active-pointer/v2", successorPointerSchema: "appliances-authority-active-pointer/v3", decisionRelease: "APPLIANCES-WM-TR-v0.1", successorDecisionRelease: "APPLIANCES-WM-TR-v0.2", decisionFile: "catalog.json", memberCount: 29 },
  DRYER: { slug: "dryers", pointerSchema: "appliances-dryer-active-pointer/v2", successorPointerSchema: "appliances-dryer-active-pointer/v3", decisionRelease: "APPLIANCES-DRYER-TR-v0.1", successorDecisionRelease: "APPLIANCES-DRYER-TR-v0.2", decisionFile: "domain-pack.json", memberCount: 7 },
  DISHWASHER: { slug: "dishwashers", pointerSchema: "appliances-bounded-active-pointer/v2", successorPointerSchema: "appliances-bounded-active-pointer/v3", decisionRelease: "APPLIANCES-DISHWASHER-TR-v0.1", successorDecisionRelease: "APPLIANCES-DISHWASHER-TR-v0.2", decisionFile: "domain-pack.json", memberCount: 7 },
  REFRIGERATOR: { slug: "refrigerators", pointerSchema: "appliances-refrigerator-active-pointer/v2", successorPointerSchema: "appliances-refrigerator-active-pointer/v3", decisionRelease: "APPLIANCES-REFRIGERATOR-TR-v0.1", successorDecisionRelease: "APPLIANCES-REFRIGERATOR-TR-v0.2", decisionFile: "domain-pack.json", memberCount: 8 },
} satisfies Record<MajorApplianceAdoptionCategory, { slug: string; pointerSchema: string; successorPointerSchema: string; decisionRelease: string; successorDecisionRelease: string; decisionFile: string; memberCount: number }>);

interface BatchBinding {
  readonly categoryId: MajorApplianceAdoptionCategory;
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

interface CategoryManifest {
  readonly schemaVersion: "major-appliance-category-adoption-manifest/v1";
  readonly categoryId: MajorApplianceAdoptionCategory;
  readonly releaseVersion: string;
  readonly releaseDigest: string;
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
  };
}

export interface MajorApplianceCatalogActivationEvent {
  readonly schemaVersion: "major-appliance-catalog-activation/v1";
  readonly activationId: string;
  readonly workUnitId: typeof MAJOR_APPLIANCE_ACTIVATION_WORK_UNIT;
  readonly state: "ACTIVE_READ_ONLY_CATALOG_MEMBERSHIP";
  readonly approvedCandidate: typeof MAJOR_APPLIANCE_ADOPTION_RELEASE;
  readonly approvedBatchDigest: typeof APPROVED_MAJOR_APPLIANCE_BATCH_DIGEST;
  readonly approvedPackageSha256: typeof APPROVED_MAJOR_APPLIANCE_PACKAGE_SHA256;
  readonly approvalArtifact: { readonly path: string; readonly sha256: string };
  readonly rollbackArtifact: { readonly path: string; readonly sha256: string };
  readonly categories: readonly {
    readonly categoryId: MajorApplianceAdoptionCategory;
    readonly activePointerPath: string;
    readonly beforePointerSha256: string;
    readonly decisionReleaseVersion: string;
    readonly decisionArtifactSha256: string;
    readonly releaseVersion: string;
    readonly releaseDigest: string;
    readonly catalogArtifactSha256: string;
    readonly membershipDigest: string;
    readonly memberCount: number;
    readonly admittedOfferingIds: readonly string[];
  }[];
  readonly review: readonly { readonly check: string; readonly status: "PASS"; readonly evidence: string }[];
}

export type ActiveMajorApplianceCatalogLoadResult =
  | { readonly status: "READY"; readonly release: XpyCatalogRelease; readonly manifest: CategoryManifest; readonly activation: MajorApplianceCatalogActivationEvent }
  | { readonly status: "FAILED_CLOSED"; readonly reason: string };

const sha256 = (raw: string) => createHash("sha256").update(raw).digest("hex");
const membershipDigest = (ids: readonly string[]) => sha256([...ids].sort().join("\n"));

function safeUnder(root: string, relative: string, allowed: string): boolean {
  if (path.isAbsolute(relative)) return false;
  const resolved = path.resolve(root, relative);
  return resolved.startsWith(`${path.resolve(root, allowed)}${path.sep}`);
}

export async function loadActiveMajorApplianceCatalogCategory(root: string, categoryId: MajorApplianceAdoptionCategory): Promise<ActiveMajorApplianceCatalogLoadResult> {
  try {
    const config = configuration[categoryId];
    const batchPath = path.join(root, MAJOR_APPLIANCE_ADOPTION_ROOT, "batch-manifest.json");
    const approvalPackagePath = path.join(root, MAJOR_APPLIANCE_ADOPTION_ROOT, "activation-approval-package.json");
    const [batchRaw, approvalPackageRaw] = await Promise.all([readFile(batchPath, "utf8"), readFile(approvalPackagePath, "utf8")]);
    const batch = JSON.parse(batchRaw) as { batchDigest?: string; categories?: readonly BatchBinding[] };
    const recomputedBatchDigest = `sha256:${sha256(JSON.stringify({ ...batch, batchDigest: undefined }))}`;
    if (batch.batchDigest !== APPROVED_MAJOR_APPLIANCE_BATCH_DIGEST || recomputedBatchDigest !== APPROVED_MAJOR_APPLIANCE_BATCH_DIGEST || sha256(approvalPackageRaw) !== APPROVED_MAJOR_APPLIANCE_PACKAGE_SHA256) return { status: "FAILED_CLOSED", reason: "APPROVED_SOURCE_DIGEST_MISMATCH" };
    const binding = batch.categories?.find((item) => item.categoryId === categoryId);
    if (!binding || binding.releaseVersion !== MAJOR_APPLIANCE_ADOPTION_CATEGORY_RELEASES[categoryId] || binding.memberCount !== config.memberCount) return { status: "FAILED_CLOSED", reason: "CATEGORY_BINDING_INVALID" };

    const pointerRaw = await readFile(path.join(root, binding.activePointerPath), "utf8");
    const pointer = JSON.parse(pointerRaw) as {
      schemaVersion?: string;
      releaseVersion?: string;
      artifactSha256?: string;
      decisionArtifactSha256?: string;
      lifecycle?: string;
      decisionActivation?: unknown;
      richness?: { releaseVersion?: string; releaseDigest?: string; catalogArtifactSha256?: string; membershipDigest?: string; activationManifest?: string; activationManifestSha256?: string; lifecycle?: string };
    };
    const legacyDecisionPointer = pointer.schemaVersion === config.pointerSchema
      && pointer.releaseVersion === config.decisionRelease
      && (pointer.artifactSha256 === undefined || pointer.artifactSha256 === binding.activeDecisionArtifactSha256);
    const successorArtifactPath = path.join(root, "data/production/appliances", config.slug, "releases", config.successorDecisionRelease, config.decisionFile);
    const successorArtifactRaw = legacyDecisionPointer ? undefined : await readFile(successorArtifactPath, "utf8");
    const expectedSuccessorSha = categoryId === "WASHING_MACHINE" ? pointer.decisionArtifactSha256 : pointer.artifactSha256;
    const successorDecisionPointer = pointer.schemaVersion === config.successorPointerSchema
      && pointer.releaseVersion === config.successorDecisionRelease
      && config.successorDecisionRelease === MAJOR_APPLIANCE_DECISION_RELEASES[categoryId].successor
      && expectedSuccessorSha === sha256(successorArtifactRaw ?? "")
      && await validateDecisionActivationPointer(root, pointer.decisionActivation);
    if (
      (!legacyDecisionPointer && !successorDecisionPointer)
      || pointer.lifecycle !== "ACTIVE"
      || pointer.richness?.releaseVersion !== binding.releaseVersion
      || pointer.richness.releaseDigest === undefined
      || pointer.richness.catalogArtifactSha256 !== binding.catalogArtifactSha256
      || pointer.richness.membershipDigest !== binding.membershipDigest
      || pointer.richness.lifecycle !== "ACTIVE_READ_ONLY"
    ) return { status: "FAILED_CLOSED", reason: "ACTIVE_POINTER_INVALID" };

    if (!safeUnder(root, binding.releasePath, MAJOR_APPLIANCE_ADOPTION_ROOT) || !safeUnder(root, binding.manifestPath, MAJOR_APPLIANCE_ADOPTION_ROOT) || !safeUnder(root, binding.activeDecisionArtifactPath, "data/production/appliances")) return { status: "FAILED_CLOSED", reason: "UNSAFE_ARTIFACT_PATH" };
    const categoryRoot = path.dirname(path.join(root, binding.manifestPath));
    const [releaseRaw, manifestRaw, decisionRaw, semanticRaw, coverageRaw, projectionsRaw, sourceRaw, unknownRaw] = await Promise.all([
      readFile(path.join(root, binding.releasePath), "utf8"),
      readFile(path.join(root, binding.manifestPath), "utf8"),
      readFile(path.join(root, binding.activeDecisionArtifactPath), "utf8"),
      readFile(path.join(categoryRoot, "semantic-registry.json"), "utf8"),
      readFile(path.join(categoryRoot, "coverage-report.json"), "utf8"),
      readFile(path.join(categoryRoot, "read-projections.json"), "utf8"),
      readFile(path.join(categoryRoot, "source-register.json"), "utf8"),
      readFile(path.join(categoryRoot, "unknown-register.json"), "utf8"),
    ]);
    const release = JSON.parse(releaseRaw) as XpyCatalogRelease;
    const manifest = JSON.parse(manifestRaw) as CategoryManifest;
    if (
      sha256(releaseRaw) !== binding.catalogArtifactSha256
      || sha256(manifestRaw) !== binding.manifestArtifactSha256
      || sha256(decisionRaw) !== binding.activeDecisionArtifactSha256
      || manifest.schemaVersion !== "major-appliance-category-adoption-manifest/v1"
      || manifest.categoryId !== categoryId
      || manifest.releaseVersion !== binding.releaseVersion
      || manifest.releaseDigest !== release.releaseDigest
      || manifest.catalogArtifactSha256 !== binding.catalogArtifactSha256
      || manifest.membershipDigest !== binding.membershipDigest
      || manifest.memberCount !== binding.memberCount
      || manifest.priorMemberCount !== binding.priorMemberCount
      || sha256(semanticRaw) !== manifest.semanticArtifactSha256
      || sha256(coverageRaw) !== manifest.coverageArtifactSha256
      || sha256(projectionsRaw) !== manifest.projectionsArtifactSha256
      || sha256(sourceRaw) !== manifest.sourceRegisterArtifactSha256
      || sha256(unknownRaw) !== manifest.unknownRegisterArtifactSha256
      || validateXpyCatalogRelease(release).length
      || release.offerings.length !== binding.memberCount
      || membershipDigest(release.offerings.map((item) => item.offeringId)) !== binding.membershipDigest
      || binding.admittedOfferingIds.some((id) => !release.offerings.some((item) => item.offeringId === id))
      || release.offerings.some((item) => item.offeringId === "appliances:dishwasher:tr:teka:dfi-46700-ttm")
      || release.externalBoundaries.offerIdentityAuthority !== "NONE"
      || release.externalBoundaries.offerRankingAuthority !== "NONE"
      || release.externalBoundaries.affiliateRankingAuthority !== "NONE"
    ) return { status: "FAILED_CLOSED", reason: "ACTIVE_RELEASE_INVALID" };

    const activationRelative = pointer.richness.activationManifest ?? "";
    const activationRoot = "data/production/appliances/catalog-adoption/governance/activation-events";
    if (!safeUnder(root, activationRelative, activationRoot)) return { status: "FAILED_CLOSED", reason: "UNSAFE_ACTIVATION_PATH" };
    const activationRaw = await readFile(path.join(root, activationRelative), "utf8");
    if (sha256(activationRaw) !== pointer.richness.activationManifestSha256) return { status: "FAILED_CLOSED", reason: "ACTIVATION_DIGEST_MISMATCH" };
    const activation = JSON.parse(activationRaw) as MajorApplianceCatalogActivationEvent;
    const activatedCategory = activation.categories?.find((item) => item.categoryId === categoryId);
    if (
      activation.schemaVersion !== "major-appliance-catalog-activation/v1"
      || activation.workUnitId !== MAJOR_APPLIANCE_ACTIVATION_WORK_UNIT
      || activation.state !== "ACTIVE_READ_ONLY_CATALOG_MEMBERSHIP"
      || activation.approvedCandidate !== MAJOR_APPLIANCE_ADOPTION_RELEASE
      || activation.approvedBatchDigest !== APPROVED_MAJOR_APPLIANCE_BATCH_DIGEST
      || activation.approvedPackageSha256 !== APPROVED_MAJOR_APPLIANCE_PACKAGE_SHA256
      || activation.review.some((item) => item.status !== "PASS")
      || !activatedCategory
      || activatedCategory.releaseVersion !== release.releaseVersion
      || activatedCategory.releaseDigest !== release.releaseDigest
      || activatedCategory.catalogArtifactSha256 !== binding.catalogArtifactSha256
      || activatedCategory.membershipDigest !== binding.membershipDigest
      || activatedCategory.memberCount !== binding.memberCount
      || JSON.stringify(activatedCategory.admittedOfferingIds) !== JSON.stringify(binding.admittedOfferingIds)
      || JSON.stringify(manifest.admittedOfferingIds) !== JSON.stringify(binding.admittedOfferingIds)
    ) return { status: "FAILED_CLOSED", reason: "ACTIVATION_EVENT_INVALID" };

    const approvalRoot = "data/production/appliances/catalog-adoption/governance/approval-events";
    if (!safeUnder(root, activation.approvalArtifact.path, approvalRoot)) return { status: "FAILED_CLOSED", reason: "UNSAFE_APPROVAL_PATH" };
    const approvalRaw = await readFile(path.join(root, activation.approvalArtifact.path), "utf8");
    const approval = JSON.parse(approvalRaw) as { schemaVersion?: string; approved?: boolean; workUnitId?: string; approvedCandidate?: string; approvedBatchDigest?: string; approvedPackageSha256?: string; currentUserApproval?: { granted?: boolean; statement?: string } };
    if (
      sha256(approvalRaw) !== activation.approvalArtifact.sha256
      || approval.schemaVersion !== "major-appliance-product-owner-approval/v1"
      || approval.approved !== true
      || approval.workUnitId !== MAJOR_APPLIANCE_ACTIVATION_WORK_UNIT
      || approval.approvedCandidate !== MAJOR_APPLIANCE_ADOPTION_RELEASE
      || approval.approvedBatchDigest !== APPROVED_MAJOR_APPLIANCE_BATCH_DIGEST
      || approval.approvedPackageSha256 !== APPROVED_MAJOR_APPLIANCE_PACKAGE_SHA256
      || approval.currentUserApproval?.granted !== true
      || approval.currentUserApproval.statement !== "PRODUCT OWNER APPROVAL GRANTED."
    ) return { status: "FAILED_CLOSED", reason: "PRODUCT_OWNER_APPROVAL_INVALID" };
    if (!safeUnder(root, activation.rollbackArtifact.path, activationRoot)) return { status: "FAILED_CLOSED", reason: "UNSAFE_ROLLBACK_PATH" };
    const rollbackRaw = await readFile(path.join(root, activation.rollbackArtifact.path), "utf8");
    if (sha256(rollbackRaw) !== activation.rollbackArtifact.sha256) return { status: "FAILED_CLOSED", reason: "ROLLBACK_ARTIFACT_DIGEST_MISMATCH" };

    return { status: "READY", release: Object.freeze(release), manifest: Object.freeze(manifest), activation: Object.freeze(activation) };
  } catch {
    return { status: "FAILED_CLOSED", reason: "ACTIVE_MAJOR_APPLIANCE_CATALOG_UNAVAILABLE" };
  }
}
