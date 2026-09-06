import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadActiveDryerAuthority } from "../features/appliances/dryer/authority.server";
import { projectAdvisorRead, projectComparisonEvidence } from "../features/xpy/catalog/readProjections";
import { DRYER_COMPARISON_DIMENSIONS, DRYER_PARENT_ARTIFACT_SHA256, DRYER_PARENT_RELEASE_VERSION, DRYER_RICHNESS_RELEASE_VERSION, validateDryerRichnessDiscipline } from "../features/xpy/catalog/dryerRichness";
import { loadActiveDryerRichnessRelease, loadPinnedDryerRichnessRelease, type DryerRichnessActivationEvent } from "../features/xpy/catalog/dryerRichness.server";
import { validateXpyCatalogRelease } from "../features/xpy/catalog/validation";

const root = process.cwd();
const activatedAt = "2026-09-04T18:30:00.000+03:00";
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const stable = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const activePath = path.join(root, "data/production/appliances/dryers/active.json");

function pass(check: string, evidence: string): DryerRichnessActivationEvent["review"][number] {
  return { check, status: "PASS", evidence };
}

async function main(): Promise<void> {
  const pinned = await loadPinnedDryerRichnessRelease(root);
  if (pinned.status !== "READY") throw new Error(`PINNED_DRYER_RICHNESS_INVALID:${pinned.reason}`);
  const release = pinned.release;
  const [activeRaw, parentRaw, immutableManifestRaw, persistedProjectionsRaw] = await Promise.all([
    readFile(activePath, "utf8"),
    readFile(path.join(root, `data/production/appliances/dryers/releases/${DRYER_PARENT_RELEASE_VERSION}/domain-pack.json`), "utf8"),
    readFile(path.join(root, `data/production/appliances/dryers/richness/releases/${DRYER_RICHNESS_RELEASE_VERSION}/manifest.json`), "utf8"),
    readFile(path.join(root, `data/production/appliances/dryers/richness/releases/${DRYER_RICHNESS_RELEASE_VERSION}/read-projections.json`), "utf8"),
  ]);
  const activeBefore = JSON.parse(activeRaw) as { schemaVersion?: string; releaseVersion?: string; artifactSha256?: string; richness?: { releaseVersion?: string } };
  if (!(["appliances-dryer-active-pointer/v1", "appliances-dryer-active-pointer/v2"].includes(activeBefore.schemaVersion ?? "")) || activeBefore.releaseVersion !== DRYER_PARENT_RELEASE_VERSION || activeBefore.artifactSha256 !== DRYER_PARENT_ARTIFACT_SHA256) throw new Error("DECISION_AUTHORITY_POINTER_UNEXPECTED");
  if (activeBefore.schemaVersion === "appliances-dryer-active-pointer/v2" && activeBefore.richness?.releaseVersion !== DRYER_RICHNESS_RELEASE_VERSION) throw new Error("DIFFERENT_RICHNESS_RELEASE_ALREADY_ACTIVE");
  const parent = JSON.parse(parentRaw) as { products: { productId: string; brand: string; model: string; configurationIdentity: string }[]; market: string; releaseVersion: string };
  if (sha256(parentRaw) !== DRYER_PARENT_ARTIFACT_SHA256) throw new Error("PARENT_BYTES_CHANGED");
  const parentById = new Map(parent.products.map((item) => [item.productId, item]));
  if (release.offerings.length !== parent.products.length || release.offerings.some((item) => {
    const parentProduct = parentById.get(item.offeringId);
    return !parentProduct || item.identity.kind !== "PRODUCT" || item.identity.manufacturer !== parentProduct.brand || item.identity.model !== parentProduct.model || item.identity.configuration !== parentProduct.configurationIdentity;
  })) throw new Error("MEMBERSHIP_OR_IDENTITY_MISMATCH");
  const contractIssues = validateXpyCatalogRelease(release);
  const disciplineIssues = validateDryerRichnessDiscipline(release);
  if (contractIssues.length || disciplineIssues.length) throw new Error(`RELEASE_REVIEW_FAILED:${[...contractIssues, ...disciplineIssues].join(",")}`);
  const sourceIds = new Set(release.sources.map((item) => item.sourceId));
  if (release.evidence.some((item) => !sourceIds.has(item.sourceId) || !item.assertion || item.assertion.applicability.offeringId !== item.offeringIds[0])) throw new Error("ASSERTION_SOURCE_REVIEW_FAILED");
  const nonManualEvidenceIds = new Set(release.evidence.filter((item) => item.kind !== "MANUAL").map((item) => item.evidenceId));
  if (release.layers.l1Facts.some((item) => !nonManualEvidenceIds.has(item.evidenceId)) || release.layers.l2Capabilities.some((item) => !nonManualEvidenceIds.has(item.evidenceId)) || release.layers.l8DecisionProjections.some((item) => item.eligibleEvidenceIds.some((id) => !nonManualEvidenceIds.has(id)))) throw new Error("MANUAL_DECISION_LEAKAGE");
  const authorization = { purchaseStatus: "PURCHASED" as const, entitlementId: "ACTIVATION-REVIEW-NON-PRODUCTION", comparisonSetId: "DRYER-V02-ACTIVATION-REVIEW", exactOfferingIds: release.offerings.map((item) => item.offeringId) };
  const comparison = projectComparisonEvidence({ release, authorization, dimensions: DRYER_COMPARISON_DIMENSIONS });
  const advisors = release.offerings.map((offering) => projectAdvisorRead({ release, authorizedDecision: { decisionId: `ACTIVATION-REVIEW:${offering.offeringId}`, exactOfferingId: offering.offeringId } }));
  const doorCells = comparison.dimensions.find((item) => item.dimensionId === "dryer.door-open-depth")?.cells ?? [];
  if (doorCells.filter((item) => item.state === "UNKNOWN").length !== 2 || doorCells.some((item) => item.state === "UNKNOWN" && !item.limitations.join(" ").includes("not worse"))) throw new Error("NEUTRAL_UNKNOWN_REVIEW_FAILED");
  let unpaidRejected = false;
  try { projectComparisonEvidence({ release, authorization: { ...authorization, purchaseStatus: "UNPAID" } as never, dimensions: DRYER_COMPARISON_DIMENSIONS }); } catch { unpaidRejected = true; }
  if (!unpaidRejected || advisors.length !== 3 || advisors.some((item) => item.authority !== "EXPLAIN_AND_BOUNDED_ADVICE_ONLY")) throw new Error("PROJECTION_BOUNDARY_REVIEW_FAILED");
  const persistedProjections = JSON.parse(persistedProjectionsRaw) as { status?: string; advisors?: unknown[]; comparison?: { catalogReleaseDigest?: string } };
  if (persistedProjections.status !== "NON_PRODUCTION_GOVERNANCE_VERIFICATION" || persistedProjections.advisors?.length !== 3 || persistedProjections.comparison?.catalogReleaseDigest !== release.releaseDigest) throw new Error("PERSISTED_PROJECTION_REVIEW_FAILED");
  const review: DryerRichnessActivationEvent["review"] = [
    pass("PARENT_AND_MEMBERSHIP", `All 3 exact identities match ${DRYER_PARENT_RELEASE_VERSION}; parent sha256:${DRYER_PARENT_ARTIFACT_SHA256}.`),
    pass("IMMUTABLE_ARTIFACT_DIGESTS", `Release ${release.releaseDigest}; catalog ${pinned.manifest.catalogArtifactSha256}; semantic ${pinned.manifest.semanticArtifactSha256}; projections ${pinned.manifest.projectionsArtifactSha256}.`),
    pass("ASSERTION_LEVEL_AUTHORITY", `${release.evidence.length} evidence assertions have registered sources, locators, market and exact/bounded applicability.`),
    pass("SEMANTIC_BOUNDARIES", "Dryer discipline validator passed; Cars/Washing Machine semantics, experience authority, persona influence and manual promotion are absent."),
    pass("UNKNOWN_AND_COMPARABILITY", "Door-open unknowns remain neutral; units fail closed; KM 99 energy/noise regimes remain excluded from comparison dimensions."),
    pass("XPY_RUNTIME_DOMAIN_PACK", `${release.schemaVersion}; runtime ${release.compatibility.runtime.version}/${release.compatibility.runtime.digest}; Domain Pack ${release.compatibility.runtime.domainPackId}.`),
    pass("ADVISOR_AND_COMPARISON", "3 read-only Advisor projections passed; comparison requires PURCHASED exact-set entitlement and rejects UNPAID access."),
    pass("Y_AND_COMMERCE_NEUTRALITY", "Decision authority remains the v0.1 artifact digest; richness has no filtering/ranking/Y or offer/affiliate authority."),
  ];
  const activationId = `DRYER-RICHNESS-ACT-${release.releaseDigest.slice("sha256:".length, "sha256:".length + 20).toUpperCase()}`;
  const relativeActivation = `data/production/appliances/dryers/richness/governance/activation-events/${activationId}/activation.json`;
  const activationPath = path.join(root, relativeActivation);
  const activation: DryerRichnessActivationEvent = {
    schemaVersion: "dryer-richness-activation/v1",
    activationId,
    activatedAt,
    state: "ACTIVE_READ_ONLY_SEMANTIC_COMPOSITE",
    releaseVersion: DRYER_RICHNESS_RELEASE_VERSION,
    releaseDigest: release.releaseDigest,
    catalogArtifactSha256: pinned.manifest.catalogArtifactSha256,
    semanticArtifactSha256: pinned.manifest.semanticArtifactSha256,
    projectionsArtifactSha256: pinned.manifest.projectionsArtifactSha256,
    immutableManifestSha256: sha256(immutableManifestRaw),
    membershipDigest: pinned.manifest.membershipDigest,
    decisionAuthority: { releaseVersion: DRYER_PARENT_RELEASE_VERSION, artifactSha256: DRYER_PARENT_ARTIFACT_SHA256, ySemantics: "UNCHANGED" },
    productOwnerApproval: { approved: true, workUnitId: "WU-XPY-APPL-DRYER-CATALOG-RICHNESS-01", scope: "COMPOSITE_READ_ONLY_RICHNESS_ACTIVATION" },
    review,
    remainingUnknowns: ["BEKO_KMX_82_TR: door-state dimensions unknown", "BEKO_KM_99_TR: exact manual, energy/noise regimes and maintenance task set unresolved", "BOSCH_WQG24100TR: standardized noise unknown; manual energy remains L9 without governed promotion", "L7 governed experience authority absent", "L10 commerce/media remain external volatile joins"],
  };
  const activationRaw = stable(activation);
  const pointer = {
    schemaVersion: "appliances-dryer-active-pointer/v2",
    releaseVersion: DRYER_PARENT_RELEASE_VERSION,
    artifactSha256: DRYER_PARENT_ARTIFACT_SHA256,
    lifecycle: "ACTIVE",
    richness: { releaseVersion: DRYER_RICHNESS_RELEASE_VERSION, releaseDigest: release.releaseDigest, catalogArtifactSha256: pinned.manifest.catalogArtifactSha256, membershipDigest: pinned.manifest.membershipDigest, activationManifest: relativeActivation, activationManifestSha256: sha256(activationRaw), lifecycle: "ACTIVE_READ_ONLY" },
  };
  await mkdir(path.dirname(activationPath), { recursive: true });
  await writeFile(activationPath, activationRaw, "utf8");
  await writeFile(activePath, stable(pointer), "utf8");
  const [activeRichness, activeAuthority] = await Promise.all([loadActiveDryerRichnessRelease(root), loadActiveDryerAuthority(root)]);
  if (activeRichness.status !== "READY" || activeAuthority.status !== "READY" || activeAuthority.snapshot.catalogDigest !== DRYER_PARENT_ARTIFACT_SHA256 || activeAuthority.snapshot.richnessReleaseDigest !== release.releaseDigest) throw new Error("POST_ACTIVATION_LOAD_FAILED");
  console.log(`${DRYER_RICHNESS_RELEASE_VERSION} activated as read-only richness; Y remains on ${DRYER_PARENT_RELEASE_VERSION}.`);
}

void main();

