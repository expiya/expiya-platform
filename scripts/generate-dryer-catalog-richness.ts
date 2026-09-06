import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { projectAdvisorRead, projectComparisonEvidence } from "../features/xpy/catalog/readProjections";
import {
  buildDryerRichnessRelease,
  DRYER_COMPARISON_DIMENSIONS,
  DRYER_PARENT_ARTIFACT_SHA256,
  DRYER_PARENT_RELEASE_VERSION,
  DRYER_REVIEWED_AT,
  DRYER_RICHNESS_COUNTS,
  DRYER_RICHNESS_RELEASE_VERSION,
  DRYER_SEMANTIC_AUTHORITY_VERSION,
} from "../features/xpy/catalog/dryerRichness";

const root = process.cwd();
const output = path.join(root, "data/production/appliances/dryers/richness/releases", DRYER_RICHNESS_RELEASE_VERSION);
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const stable = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

async function main(): Promise<void> {
  const release = buildDryerRichnessRelease();
  const semantic = {
    schemaVersion: DRYER_SEMANTIC_AUTHORITY_VERSION,
    releaseVersion: DRYER_RICHNESS_RELEASE_VERSION,
    market: "TR",
    parentRelease: DRYER_PARENT_RELEASE_VERSION,
    usageSemantics: release.layers.l3UsageSemantics,
    needs: release.layers.l4Needs,
    needEvidenceMappings: release.layers.l4NeedEvidenceMappings,
    personaPlanningSignals: release.layers.l5PersonaSignals,
    dailyLifeInterpretations: release.layers.l6DailyLifeInterpretations,
    comparisonDimensions: DRYER_COMPARISON_DIMENSIONS,
    boundaries: { experience: "ABSENT_NO_GOVERNED_AUTHORITY", manualDecisionAuthority: "NONE", personaDecisionUse: "NONE", unknownTreatment: "NEUTRAL_NO_PENALTY", carsSemantics: "FORBIDDEN" },
  };
  const comparison = projectComparisonEvidence({ release, authorization: { purchaseStatus: "PURCHASED", entitlementId: "GOVERNANCE-VERIFICATION-NON-PRODUCTION", comparisonSetId: "DRYER-THREE-EXACT-GOVERNANCE-VERIFICATION", exactOfferingIds: release.offerings.map((item) => item.offeringId) }, dimensions: DRYER_COMPARISON_DIMENSIONS });
  const advisors = release.offerings.map((offering) => projectAdvisorRead({ release, authorizedDecision: { decisionId: `GOVERNANCE-VERIFICATION:${offering.offeringId}`, exactOfferingId: offering.offeringId } }));
  const projections = { schemaVersion: "dryer-read-projection-verification/v1", status: "NON_PRODUCTION_GOVERNANCE_VERIFICATION", entitlementAuthority: "SYNTHETIC_TEST_ONLY_NOT_USER_ACCESS", comparison, advisors };
  const layerAfter = { L0: "COMPLETE", L1: "PARTIAL", L2: "COMPLETE", L3: "COMPLETE", L4: "COMPLETE", L5: "COMPLETE", L6: "COMPLETE", L7: "ABSENT", L8: "COMPLETE", L9: "PARTIAL", L10: "PARTIAL" } as const;
  const before = { L0: "COMPLETE", L1: "PARTIAL", L2: "PARTIAL", L3: "PARTIAL", L4: "PARTIAL", L5: "ABSENT", L6: "ABSENT", L7: "ABSENT", L8: "PARTIAL", L9: "ABSENT", L10: "PARTIAL" } as const;
  const perProduct = release.offerings.map((item) => ({
    offeringId: item.offeringId,
    label: item.identity.kind === "PRODUCT" ? `${item.identity.manufacturer} ${item.identity.model}` : item.offeringId,
    before,
    after: { ...layerAfter, L9: release.layers.l9AdvisorKnowledge.some((entry) => entry.offeringId === item.offeringId) ? "PARTIAL" : "ABSENT" },
    dispositions: {
      objectiveFacts: release.layers.l1Facts.filter((entry) => entry.offeringId === item.offeringId).length,
      capabilities: release.layers.l2Capabilities.filter((entry) => entry.offeringId === item.offeringId).length,
      dailyLifeInterpretations: release.layers.l6DailyLifeInterpretations.filter((entry) => entry.offeringId === item.offeringId).length,
      advisorKnowledge: release.layers.l9AdvisorKnowledge.filter((entry) => entry.offeringId === item.offeringId).length,
      unresolved: item.offeringId === "BEKO_KM_99_TR" ? ["EXACT_MANUAL_NOT_PROVEN", "ENERGY_REGIME_UNKNOWN", "NOISE_REGIME_UNKNOWN", "MAINTENANCE_TASK_SET_UNKNOWN"] : item.offeringId === "BEKO_KMX_82_TR" ? ["DOOR_STATE_DIMENSIONS_UNKNOWN"] : ["ENERGY_FACT_REMAINS_L9_NOT_PROMOTED", "STANDARDIZED_NOISE_UNKNOWN"],
    },
  }));
  const coverage = {
    schemaVersion: "dryer-catalog-richness-coverage/v1",
    workUnitId: "WU-XPY-APPL-DRYER-CATALOG-RICHNESS-01",
    generatedAt: DRYER_REVIEWED_AT,
    verdict: "PARTIAL",
    before,
    after: layerAfter,
    counts: { ...DRYER_RICHNESS_COUNTS, evidence: release.evidence.length, assertionLevelEvidence: release.evidence.filter((item) => item.assertion).length, comparisonDimensions: DRYER_COMPARISON_DIMENSIONS.length, advisorReadProjectionsGenerated: advisors.length, comparisonEvidenceProjectionsGenerated: 1 },
    perProduct,
    unresolvedGlobal: ["L7 remains absent because no governed experience authority exists.", "L9 is partial because KM 99 has no checksum-bound exact-applicability manual.", "L1 is partial because unresolved door-state, energy-regime and noise-regime fields remain unknown rather than guessed.", "L10 remains governed external volatile authority and is outside the frozen release."],
    nonRegression: { dryerAsama1AuthorityPointerChanged: false, candidateSelectionChanged: false, yAuthorizationChanged: false, commerceOrderingChanged: false },
    nextBoundedWorkUnit: { workUnitId: "WU-XPY-APPL-REFRIGERATOR-CATALOG-RICHNESS-01", objective: "Apply XPY_CATALOG/v0.1 assertion-level provenance and Dryer-proven semantic/read-projection discipline to the exact Türkiye Refrigerator products without copying Dryer or Cars meanings." },
  };
  const releaseRaw = stable(release);
  const semanticRaw = stable(semantic);
  const coverageRaw = stable(coverage);
  const projectionsRaw = stable(projections);
  const parentRaw = await readFile(path.join(root, `data/production/appliances/dryers/releases/${DRYER_PARENT_RELEASE_VERSION}/domain-pack.json`), "utf8");
  if (sha256(parentRaw) !== DRYER_PARENT_ARTIFACT_SHA256) throw new Error("DRYER_PARENT_DIGEST_MISMATCH");
  const membershipDigest = sha256(release.offerings.map((item) => item.offeringId).sort().join("\n"));
  const manifest = {
    schemaVersion: "dryer-richness-manifest/v1",
    workUnitId: "WU-XPY-APPL-DRYER-CATALOG-RICHNESS-01",
    releaseVersion: DRYER_RICHNESS_RELEASE_VERSION,
    parent: { releaseVersion: DRYER_PARENT_RELEASE_VERSION, artifactSha256: DRYER_PARENT_ARTIFACT_SHA256, relationship: "IMMUTABLE_CHILD_NO_OVERWRITE" },
    compatibility: release.compatibility,
    releaseDigest: release.releaseDigest,
    catalogArtifactSha256: sha256(releaseRaw),
    semanticArtifactSha256: sha256(semanticRaw),
    coverageArtifactSha256: sha256(coverageRaw),
    projectionsArtifactSha256: sha256(projectionsRaw),
    membershipDigest,
    memberCount: release.offerings.length,
    counts: coverage.counts,
    reviewerStatus: "AWAITING_PRODUCT_OWNER_ACTIVATION_APPROVAL",
    activation: { performed: false, activePointerRelease: DRYER_PARENT_RELEASE_VERSION, blocker: "The active Dryer loader/pointer authorizes only APPLIANCES-DRYER-TR-v0.1; this semantic child requires explicit Product-owner approval and a versioned composite activation workflow." },
  };
  await mkdir(output, { recursive: true });
  await Promise.all([
    writeFile(path.join(output, "catalog-release.json"), releaseRaw, "utf8"),
    writeFile(path.join(output, "semantic-registry.json"), semanticRaw, "utf8"),
    writeFile(path.join(output, "coverage-report.json"), coverageRaw, "utf8"),
    writeFile(path.join(output, "read-projections.json"), projectionsRaw, "utf8"),
    writeFile(path.join(output, "manifest.json"), stable(manifest), "utf8"),
  ]);
  console.log(`${DRYER_RICHNESS_RELEASE_VERSION} generated with ${release.evidence.length} assertions; activation intentionally not performed.`);
}

void main();

