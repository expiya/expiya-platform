import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { XpyCatalogRelease } from "./contract";
import { DRYER_PARENT_ARTIFACT_SHA256, DRYER_PARENT_RELEASE_VERSION, DRYER_RICHNESS_RELEASE_VERSION } from "./dryerRichness";
import { validateXpyCatalogRelease } from "./validation";
import { loadActiveMajorApplianceCatalogCategory, MAJOR_APPLIANCE_ADOPTION_CATEGORY_RELEASES, type ActiveMajorApplianceCatalogLoadResult } from "./majorApplianceCatalogActivation.server";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const releaseRoot = "data/production/appliances/dryers/richness/releases/APPLIANCES-DRYER-CATALOG-RICHNESS-TR-v0.2";

export interface DryerRichnessManifest {
  readonly schemaVersion: "dryer-richness-manifest/v1";
  readonly releaseVersion: typeof DRYER_RICHNESS_RELEASE_VERSION;
  readonly parent: { readonly releaseVersion: typeof DRYER_PARENT_RELEASE_VERSION; readonly artifactSha256: typeof DRYER_PARENT_ARTIFACT_SHA256; readonly relationship: "IMMUTABLE_CHILD_NO_OVERWRITE" };
  readonly catalogArtifactSha256: string;
  readonly semanticArtifactSha256: string;
  readonly coverageArtifactSha256: string;
  readonly projectionsArtifactSha256: string;
  readonly membershipDigest: string;
  readonly reviewerStatus: "AWAITING_PRODUCT_OWNER_ACTIVATION_APPROVAL";
  readonly activation: { readonly performed: false; readonly activePointerRelease: typeof DRYER_PARENT_RELEASE_VERSION };
}

export interface DryerRichnessActivationEvent {
  readonly schemaVersion: "dryer-richness-activation/v1";
  readonly activationId: string;
  readonly activatedAt: string;
  readonly state: "ACTIVE_READ_ONLY_SEMANTIC_COMPOSITE";
  readonly releaseVersion: typeof DRYER_RICHNESS_RELEASE_VERSION;
  readonly releaseDigest: string;
  readonly catalogArtifactSha256: string;
  readonly semanticArtifactSha256: string;
  readonly projectionsArtifactSha256: string;
  readonly immutableManifestSha256: string;
  readonly membershipDigest: string;
  readonly decisionAuthority: { readonly releaseVersion: typeof DRYER_PARENT_RELEASE_VERSION; readonly artifactSha256: typeof DRYER_PARENT_ARTIFACT_SHA256; readonly ySemantics: "UNCHANGED" };
  readonly productOwnerApproval: { readonly approved: true; readonly workUnitId: "WU-XPY-APPL-DRYER-CATALOG-RICHNESS-01"; readonly scope: "COMPOSITE_READ_ONLY_RICHNESS_ACTIVATION" };
  readonly review: readonly { readonly check: string; readonly status: "PASS"; readonly evidence: string }[];
  readonly remainingUnknowns: readonly string[];
}

export type DryerRichnessLoadResult =
  | { readonly status: "READY"; readonly release: XpyCatalogRelease; readonly manifest: DryerRichnessManifest }
  | { readonly status: "FAILED_CLOSED"; readonly reason: string };

export async function loadPinnedDryerRichnessRelease(root: string): Promise<DryerRichnessLoadResult> {
  try {
    const base = path.join(root, releaseRoot);
    const [manifestRaw, releaseRaw, semanticRaw, coverageRaw, projectionsRaw, parentRaw] = await Promise.all([
      readFile(path.join(base, "manifest.json"), "utf8"),
      readFile(path.join(base, "catalog-release.json"), "utf8"),
      readFile(path.join(base, "semantic-registry.json"), "utf8"),
      readFile(path.join(base, "coverage-report.json"), "utf8"),
      readFile(path.join(base, "read-projections.json"), "utf8"),
      readFile(path.join(root, `data/production/appliances/dryers/releases/${DRYER_PARENT_RELEASE_VERSION}/domain-pack.json`), "utf8"),
    ]);
    const manifest = JSON.parse(manifestRaw) as DryerRichnessManifest;
    const release = JSON.parse(releaseRaw) as XpyCatalogRelease;
    if (manifest.schemaVersion !== "dryer-richness-manifest/v1" || manifest.releaseVersion !== DRYER_RICHNESS_RELEASE_VERSION) return { status: "FAILED_CLOSED", reason: "MANIFEST_INVALID" };
    if (manifest.parent.releaseVersion !== DRYER_PARENT_RELEASE_VERSION || manifest.parent.artifactSha256 !== DRYER_PARENT_ARTIFACT_SHA256 || sha256(parentRaw) !== DRYER_PARENT_ARTIFACT_SHA256) return { status: "FAILED_CLOSED", reason: "PARENT_BINDING_MISMATCH" };
    if (manifest.activation.performed !== false) return { status: "FAILED_CLOSED", reason: "PINNED_RELEASE_ACTIVATION_STATE_INVALID" };
    if (sha256(releaseRaw) !== manifest.catalogArtifactSha256 || sha256(semanticRaw) !== manifest.semanticArtifactSha256 || sha256(coverageRaw) !== manifest.coverageArtifactSha256 || sha256(projectionsRaw) !== manifest.projectionsArtifactSha256) return { status: "FAILED_CLOSED", reason: "ARTIFACT_DIGEST_MISMATCH" };
    if (release.releaseVersion !== DRYER_RICHNESS_RELEASE_VERSION || validateXpyCatalogRelease(release).length) return { status: "FAILED_CLOSED", reason: "CATALOG_RELEASE_INVALID" };
    const ids = release.offerings.map((item) => item.offeringId).sort();
    if (ids.length !== 3 || sha256(ids.join("\n")) !== manifest.membershipDigest) return { status: "FAILED_CLOSED", reason: "MEMBERSHIP_MISMATCH" };
    return { status: "READY", release: Object.freeze(release), manifest: Object.freeze(manifest) };
  } catch {
    return { status: "FAILED_CLOSED", reason: "DRYER_RICHNESS_RELEASE_MISSING_OR_INVALID" };
  }
}

export type ActiveDryerRichnessLoadResult =
  | { readonly status: "READY"; readonly release: XpyCatalogRelease; readonly manifest: DryerRichnessManifest; readonly activation: DryerRichnessActivationEvent }
  | ActiveMajorApplianceCatalogLoadResult
  | { readonly status: "FAILED_CLOSED"; readonly reason: string };

export async function loadActiveDryerRichnessRelease(root: string): Promise<ActiveDryerRichnessLoadResult> {
  try {
    const activeRaw = await readFile(path.join(root, "data/production/appliances/dryers/active.json"), "utf8");
    const active = JSON.parse(activeRaw) as {
      schemaVersion?: string;
      releaseVersion?: string;
      artifactSha256?: string;
      richness?: { releaseVersion?: string; releaseDigest?: string; catalogArtifactSha256?: string; membershipDigest?: string; activationManifest?: string; activationManifestSha256?: string; lifecycle?: string };
    };
    if (active.richness?.releaseVersion === MAJOR_APPLIANCE_ADOPTION_CATEGORY_RELEASES.DRYER) return loadActiveMajorApplianceCatalogCategory(root, "DRYER");
    if (active.schemaVersion !== "appliances-dryer-active-pointer/v2" || active.releaseVersion !== DRYER_PARENT_RELEASE_VERSION || active.artifactSha256 !== DRYER_PARENT_ARTIFACT_SHA256 || active.richness?.releaseVersion !== DRYER_RICHNESS_RELEASE_VERSION || active.richness.lifecycle !== "ACTIVE_READ_ONLY") return { status: "FAILED_CLOSED", reason: "ACTIVE_COMPOSITE_POINTER_INVALID" };
    const pinned = await loadPinnedDryerRichnessRelease(root);
    if (pinned.status !== "READY") return pinned;
    if (active.richness.releaseDigest !== pinned.release.releaseDigest || active.richness.catalogArtifactSha256 !== pinned.manifest.catalogArtifactSha256 || active.richness.membershipDigest !== pinned.manifest.membershipDigest) return { status: "FAILED_CLOSED", reason: "ACTIVE_RELEASE_BINDING_MISMATCH" };
    const relative = active.richness.activationManifest ?? "";
    const governanceRoot = path.resolve(root, "data/production/appliances/dryers/richness/governance/activation-events");
    const activationPath = path.resolve(root, relative);
    if (!activationPath.startsWith(`${governanceRoot}${path.sep}`)) return { status: "FAILED_CLOSED", reason: "UNSAFE_ACTIVATION_MANIFEST_PATH" };
    const activationRaw = await readFile(activationPath, "utf8");
    if (sha256(activationRaw) !== active.richness.activationManifestSha256) return { status: "FAILED_CLOSED", reason: "ACTIVATION_MANIFEST_DIGEST_MISMATCH" };
    const activation = JSON.parse(activationRaw) as DryerRichnessActivationEvent;
    if (activation.schemaVersion !== "dryer-richness-activation/v1" || activation.state !== "ACTIVE_READ_ONLY_SEMANTIC_COMPOSITE" || activation.releaseVersion !== pinned.release.releaseVersion || activation.releaseDigest !== pinned.release.releaseDigest || activation.catalogArtifactSha256 !== pinned.manifest.catalogArtifactSha256 || activation.semanticArtifactSha256 !== pinned.manifest.semanticArtifactSha256 || activation.projectionsArtifactSha256 !== pinned.manifest.projectionsArtifactSha256 || activation.membershipDigest !== pinned.manifest.membershipDigest || activation.decisionAuthority.releaseVersion !== DRYER_PARENT_RELEASE_VERSION || activation.decisionAuthority.artifactSha256 !== DRYER_PARENT_ARTIFACT_SHA256 || activation.decisionAuthority.ySemantics !== "UNCHANGED" || !activation.productOwnerApproval.approved || activation.review.some((item) => item.status !== "PASS")) return { status: "FAILED_CLOSED", reason: "ACTIVATION_MANIFEST_INVALID" };
    return { status: "READY", release: pinned.release, manifest: pinned.manifest, activation: Object.freeze(activation) };
  } catch {
    return { status: "FAILED_CLOSED", reason: "ACTIVE_DRYER_RICHNESS_UNAVAILABLE" };
  }
}
