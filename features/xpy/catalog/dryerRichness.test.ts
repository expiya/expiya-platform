import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { XpyCatalogRelease, XpyExternalOfferingSnapshot } from "./contract";
import { DRYER_COMPARISON_DIMENSIONS, DRYER_PARENT_ARTIFACT_SHA256, DRYER_RICHNESS_COUNTS, buildDryerRichnessRelease, validateDryerRichnessDiscipline } from "./dryerRichness";
import { loadActiveDryerRichnessRelease, loadPinnedDryerRichnessRelease } from "./dryerRichness.server";
import { loadActiveDryerAuthority } from "@/features/appliances/dryer/authority.server";
import { projectAdvisorRead, projectComparisonEvidence } from "./readProjections";
import { joinExternalOfferingSnapshot, validateXpyCatalogRelease, xpyCatalogReleaseDigest } from "./validation";

const root = path.resolve(process.cwd());
const resign = (release: XpyCatalogRelease): XpyCatalogRelease => ({ ...release, releaseDigest: xpyCatalogReleaseDigest(release) });
const authorization = (release: XpyCatalogRelease) => ({ purchaseStatus: "PURCHASED" as const, entitlementId: "test-entitlement", comparisonSetId: "test-exact-dryer-set", exactOfferingIds: release.offerings.map((item) => item.offeringId) });

describe("Dryer XPY_CATALOG richness child", () => {
  it("preserves the exact three-product membership and gives every fact/capability assertion-level provenance", () => {
    const release = buildDryerRichnessRelease();
    expect(release.offerings.map((item) => item.offeringId)).toEqual(["BEKO_KMX_82_TR", "BEKO_KM_99_TR", "BOSCH_WQG24100TR"]);
    expect(validateXpyCatalogRelease(release)).toEqual([]);
    expect(validateDryerRichnessDiscipline(release)).toEqual([]);
    expect(release.layers.l1Facts).toHaveLength(DRYER_RICHNESS_COUNTS.objectiveFacts);
    expect(release.layers.l2Capabilities).toHaveLength(DRYER_RICHNESS_COUNTS.capabilities);
    expect(release.evidence.every((item) => item.assertion?.locator && item.assertion.applicability.market === "TR")).toBe(true);
    expect(release.evidence.filter((item) => item.kind === "TECHNICAL" || item.kind === "CAPABILITY").every((item) => item.assertion?.unit !== "N/A")).toBe(true);
  });

  it("keeps manuals read-only, optional content unpromoted, persona inert and experience explicitly absent", () => {
    const release = buildDryerRichnessRelease();
    const manualIds = new Set(release.evidence.filter((item) => item.kind === "MANUAL").map((item) => item.evidenceId));
    expect(release.layers.l1Facts.some((item) => manualIds.has(item.evidenceId))).toBe(false);
    expect(release.layers.l2Capabilities.some((item) => manualIds.has(item.evidenceId))).toBe(false);
    expect(release.layers.l8DecisionProjections.some((item) => item.eligibleEvidenceIds.some((id) => manualIds.has(id)))).toBe(false);
    expect(release.layers.l9AdvisorKnowledge.filter((item) => item.offeringId === "BEKO_KM_99_TR")).toEqual([]);
    expect(release.layers.l2Capabilities.filter((item) => item.offeringId === "BOSCH_WQG24100TR" && item.key.startsWith("program."))).toEqual([]);
    expect(release.layers.l5PersonaSignals.every((item) => item.classification === "DERIVED_PLANNING" && item.decisionUse === "NONE" && item.directCandidateEffect === "NONE")).toBe(true);
    expect(release.layers.l7ExperienceRules).toEqual([]);
  });

  it("generates three exact Advisor reads and a purchased comparison with neutral unknowns", () => {
    const release = buildDryerRichnessRelease();
    const comparison = projectComparisonEvidence({ release, authorization: authorization(release), dimensions: DRYER_COMPARISON_DIMENSIONS });
    const doorDepth = comparison.dimensions.find((item) => item.dimensionId === "dryer.door-open-depth")!;
    expect(doorDepth.cells.filter((item) => item.state === "UNKNOWN")).toHaveLength(2);
    expect(doorDepth.cells.filter((item) => item.state === "UNKNOWN").every((item) => item.limitations.join(" ").includes("not worse"))).toBe(true);
    const advisors = release.offerings.map((offering) => projectAdvisorRead({ release, authorizedDecision: { decisionId: `decision:${offering.offeringId}`, exactOfferingId: offering.offeringId } }));
    expect(advisors).toHaveLength(3);
    expect(advisors.find((item) => item.offering.offeringId === "BEKO_KM_99_TR")?.advisorKnowledge).toEqual([]);
    expect(advisors.every((item) => item.forbidden.includes("CHANGE_Y_AUTHORIZATION"))).toBe(true);
  });

  it("fails closed for wrong model/market, dangling source, incompatible units and unauthorized comparison", () => {
    const release = buildDryerRichnessRelease();
    const wrong = structuredClone(release) as XpyCatalogRelease;
    (wrong.evidence[0].assertion!.applicability as { model: string }).model = "Wrong model";
    expect(validateXpyCatalogRelease(resign(wrong))).toContain("ASSERTION_APPLICABILITY_MISMATCH");
    const crossMarket = resign({ ...release, sources: release.sources.map((item, index) => index ? item : { ...item, market: "DE" }) });
    expect(validateXpyCatalogRelease(crossMarket)).toContain("SOURCE_MARKET_MISMATCH");
    const dangling = resign({ ...release, evidence: release.evidence.map((item, index) => index ? item : { ...item, sourceId: "missing" }) });
    expect(validateXpyCatalogRelease(dangling)).toContain("DANGLING_SOURCE");
    const incompatible = structuredClone(release) as XpyCatalogRelease;
    const secondCapacity = incompatible.layers.l1Facts.filter((item) => item.key === "ratedDryLoadCapacity")[1] as { unit?: string };
    secondCapacity.unit = "lb";
    const signedIncompatible = resign(incompatible);
    expect(() => projectComparisonEvidence({ release: signedIncompatible, authorization: authorization(signedIncompatible), dimensions: DRYER_COMPARISON_DIMENSIONS })).toThrow("COMPARISON_DIMENSION_INCOMPARABLE_UNIT");
    expect(() => projectComparisonEvidence({ release, authorization: { ...authorization(release), purchaseStatus: "UNPAID" } as never, dimensions: DRYER_COMPARISON_DIMENSIONS })).toThrow("COMPARISON_AUTHORIZATION_REQUIRED");
  });

  it("detects manual leakage, persona influence and cross-domain semantic leakage", () => {
    const release = buildDryerRichnessRelease();
    const leaked = structuredClone(release) as XpyCatalogRelease;
    const manualEvidence = leaked.evidence.find((item) => item.kind === "MANUAL")!;
    (leaked.layers.l1Facts[0] as { evidenceId: string }).evidenceId = manualEvidence.evidenceId;
    expect(validateDryerRichnessDiscipline(resign(leaked))).toContain("MANUAL_TO_FACT_LEAKAGE");
    const persona = structuredClone(release) as XpyCatalogRelease;
    (persona.layers.l5PersonaSignals[0] as unknown as { directCandidateEffect: string }).directCandidateEffect = "HARD_FILTER";
    expect(validateDryerRichnessDiscipline(resign(persona))).toContain("PERSONA_DECISION_INFLUENCE");
    const automotive = structuredClone(release) as XpyCatalogRelease;
    (automotive.layers.l3UsageSemantics[0] as { meaning: string }).meaning = "Vehicle engine trim meaning";
    expect(validateDryerRichnessDiscipline(resign(automotive))).toContain("CROSS_DOMAIN_SEMANTIC_LEAKAGE");
  });

  it("keeps affiliate/offer changes outside the frozen digest and Y authority", () => {
    const release = buildDryerRichnessRelease();
    const base: XpyExternalOfferingSnapshot = { schemaVersion: "XPY_CATALOG_EXTERNAL_SNAPSHOT/v0.1", snapshotId: "dryer-offers:1", observedAt: "2026-09-04T10:00:00.000Z", expiresAt: "2026-09-05T10:00:00.000Z", market: "TR", offers: [{ offerId: "offer:1", offeringId: release.offerings[0].offeringId, merchant: "Example", amount: 1, currency: "TRY", affiliate: false }], media: [] };
    const first = joinExternalOfferingSnapshot(release, base);
    const changed = joinExternalOfferingSnapshot(release, { ...base, snapshotId: "dryer-offers:2", offers: [{ ...base.offers[0], amount: 999999, affiliate: true }] });
    expect(changed.releaseDigest).toBe(first.releaseDigest);
    expect(changed.yAuthority).toBe("CATALOG_AND_GOVERNED_EVIDENCE_ONLY");
  });

  it("loads the immutable child deterministically after the approved successor activation", async () => {
    const loaded = await loadPinnedDryerRichnessRelease(root);
    expect(loaded.status).toBe("READY");
    const parentRaw = await readFile(path.join(root, "data/production/appliances/dryers/releases/APPLIANCES-DRYER-TR-v0.1/domain-pack.json"), "utf8");
    expect(createHash("sha256").update(parentRaw).digest("hex")).toBe(DRYER_PARENT_ARTIFACT_SHA256);
    const active = JSON.parse(await readFile(path.join(root, "data/production/appliances/dryers/active.json"), "utf8")) as { releaseVersion: string };
    expect(active.releaseVersion).toBe("APPLIANCES-DRYER-TR-v0.2");
    if (loaded.status === "READY") expect(loaded.manifest).toMatchObject({ reviewerStatus: "AWAITING_PRODUCT_OWNER_ACTIVATION_APPROVAL", activation: { performed: false } });
  });

  it("loads the approved catalog and decision successors", async () => {
    const [richness, decision] = await Promise.all([loadActiveDryerRichnessRelease(root), loadActiveDryerAuthority(root)]);
    expect(richness.status).toBe("READY");
    expect(decision.status).toBe("READY");
    if (richness.status !== "READY" || decision.status !== "READY") return;
    expect(richness.release.releaseVersion).toBe("APPLIANCES-DRYER-CATALOG-RICHNESS-TR-v0.3-candidate");
    expect(richness.release.offerings).toHaveLength(7);
    expect(richness.activation).toMatchObject({
      state: "ACTIVE_READ_ONLY_CATALOG_MEMBERSHIP",
      workUnitId: "WU-APPL-AMAZON-P1-MAJOR-APPLIANCE-CATALOG-ACTIVATION-01",
      approvedBatchDigest: "sha256:b3cb67e1dd00dc6c529ae750679e8276c13f9723d4e1d77737a7f39aee441ea2",
    });
    expect(decision.snapshot.catalogDigest).toBe("9e6524963f6d000d637382d377d8deeaac72cad7efeab9c746929540f2a5a5c8");
    expect(decision.snapshot.semanticDigest).toBe("9e6524963f6d000d637382d377d8deeaac72cad7efeab9c746929540f2a5a5c8");
    expect(decision.snapshot.richnessReleaseDigest).toBe(richness.release.releaseDigest);
    expect(decision.snapshot.pack.selectionPolicy).toMatchObject({ scores: false, weights: false, implicitTieBreak: false });
  });
});
