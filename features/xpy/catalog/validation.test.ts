import { describe, expect, it } from "vitest";

import { XPY_RUNTIME_DIGEST, XPY_RUNTIME_VERSION } from "../runtimeContract";
import type { OfferingIdentity, ProductOfferingIdentity, ServiceOfferingIdentity, XpyCatalogRelease, XpyComparisonDimension, XpyExternalOfferingSnapshot } from "./contract";
import { XPY_CATALOG_VERSION } from "./contract";
import { projectAdvisorRead, projectComparisonEvidence } from "./readProjections";
import { joinExternalOfferingSnapshot, validateXpyCatalogRelease, xpyCatalogReleaseDigest } from "./validation";

const productIdentity: ProductOfferingIdentity = { kind: "PRODUCT", manufacturer: "Example", model: "Model 1", configuration: "TR-BASE", identifiers: { manufacturerCode: "EX-1-TR" } };
const serviceIdentity: ServiceOfferingIdentity = { kind: "SERVICE", provider: "Example Services", serviceName: "Home setup", planName: "Standard", scopeId: "SETUP-TR-STANDARD", serviceVersion: "2026.1" };

function fixture(identity: OfferingIdentity): XpyCatalogRelease {
  const offeringId = identity.kind === "PRODUCT" ? "product:example:model-1:tr-base" : "service:example:home-setup:standard";
  const unsigned: Omit<XpyCatalogRelease, "releaseDigest"> = {
    schemaVersion: XPY_CATALOG_VERSION,
    releaseId: `fixture:${identity.kind.toLowerCase()}:v1`,
    releaseVersion: "v1",
    departmentId: identity.kind === "PRODUCT" ? "FIXTURE_PRODUCTS" : "FIXTURE_SERVICES",
    categoryId: identity.kind === "PRODUCT" ? "EXAMPLE_PRODUCT" : "EXAMPLE_SERVICE",
    market: "TR",
    lifecycle: "FROZEN",
    effectiveAt: "2026-09-04T00:00:00.000Z",
    compatibility: {
      runtime: { version: XPY_RUNTIME_VERSION, digest: XPY_RUNTIME_DIGEST, domainPackId: "fixture-pack/v1" },
      domainPackVersion: "fixture-pack/v1",
      semanticAuthorityVersion: "fixture-semantics/v1",
      semanticAuthorityDigest: `sha256:${"a".repeat(64)}`,
      revisionClass: "EVIDENCE_OR_AVAILABILITY_REFRESH",
      semanticAuthorityChange: "UNCHANGED",
    },
    sources: [{ sourceId: "source:official", kind: "OFFICIAL", uri: "https://example.test/source", version: "2026.1", observedAt: "2026-09-01T00:00:00.000Z", reviewedAt: "2026-09-02T00:00:00.000Z", market: "TR", applicabilityStatus: "EXACT", status: "VERIFIED" }],
    evidence: [
      { evidenceId: "evidence:technical", kind: "TECHNICAL", sourceId: "source:official", assertionId: "assertion:1", offeringIds: [offeringId], market: "TR", observedAt: "2026-09-01T00:00:00.000Z", reviewedAt: "2026-09-02T00:00:00.000Z", confidence: "HIGH", status: "VERIFIED", limitations: [] },
      { evidenceId: "evidence:capability", kind: "CAPABILITY", sourceId: "source:official", assertionId: "assertion:2", offeringIds: [offeringId], market: "TR", observedAt: "2026-09-01T00:00:00.000Z", reviewedAt: "2026-09-02T00:00:00.000Z", confidence: "HIGH", status: "VERIFIED", limitations: [] },
    ],
    offerings: [{ offeringId, market: "TR", lifecycle: "FROZEN", validFrom: "2026-09-01T00:00:00.000Z", identity }],
    layers: {
      l1Facts: [{ factId: "fact:1", offeringId, key: identity.kind === "PRODUCT" ? "mass" : "appointmentDuration", value: 60, unit: identity.kind === "PRODUCT" ? "kg" : "minute", evidenceId: "evidence:technical" }],
      l2Capabilities: [{ capabilityId: "capability:1", offeringId, key: identity.kind === "PRODUCT" ? "childLock" : "inHomeDelivery", state: "PRESENT", evidenceId: "evidence:capability", limitations: [] }],
      l3UsageSemantics: [{ semanticId: "semantic:1", meaning: "Bounded usage meaning", factIds: ["fact:1"], capabilityIds: ["capability:1"] }],
      l4Needs: [{ needId: "need:1", meaning: "A user need" }],
      l4NeedEvidenceMappings: [{ mappingId: "mapping:1", needId: "need:1", eligibleFactIds: ["fact:1"], eligibleCapabilityIds: ["capability:1"], policy: "SOFT_PREFERENCE" }],
      l5PersonaSignals: [{ signalId: "persona:1", needIds: ["need:1"], authority: "DOMAIN_PLANNING", classification: "DERIVED_PLANNING", decisionUse: "NONE", directCandidateEffect: "NONE" }],
      l6DailyLifeInterpretations: [{ interpretationId: "interpretation:1", offeringId, text: "Reviewed bounded interpretation", factIds: ["fact:1"], capabilityIds: [], method: "DETERMINISTIC_REVIEWED_MAPPING", reviewedAt: "2026-09-02T00:00:00.000Z", polarity: "NEUTRAL", limitations: ["Fixture only"], nonGuarantees: ["No outcome guarantee"] }],
      l7ExperienceRules: [],
      l8DecisionProjections: [{ projectionId: "projection:1", offeringId, eligibleEvidenceIds: ["evidence:technical", "evidence:capability"], needMappingIds: ["mapping:1"], limitations: ["Fixture only"], disclosures: ["Not a production offering"], traceability: "EXACT" }],
      l9AdvisorKnowledge: [],
    },
    externalBoundaries: { commerce: "EXTERNAL_VOLATILE_EXACT_IDENTITY_JOIN_ONLY", media: "EXTERNAL_VOLATILE_EXACT_IDENTITY_JOIN_ONLY", offerIdentityAuthority: "NONE", offerRankingAuthority: "NONE", affiliateRankingAuthority: "NONE" },
  };
  return { ...unsigned, releaseDigest: xpyCatalogReleaseDigest(unsigned) };
}

function resign(release: XpyCatalogRelease): XpyCatalogRelease {
  return { ...release, releaseDigest: xpyCatalogReleaseDigest(release) };
}

function twoOfferingFixture(kind: "PRODUCT" | "SERVICE"): XpyCatalogRelease {
  const release = fixture(kind === "PRODUCT" ? productIdentity : serviceIdentity);
  const secondId = kind === "PRODUCT" ? "product:example:model-1:tr-plus" : "service:example:home-setup:plus";
  const secondIdentity: OfferingIdentity = kind === "PRODUCT"
    ? { ...productIdentity, configuration: "TR-PLUS", identifiers: { manufacturerCode: "EX-1-PLUS-TR" } }
    : { ...serviceIdentity, planName: "Plus", scopeId: "SETUP-TR-PLUS" };
  const technical = { ...release.evidence[0], evidenceId: "evidence:technical:2", assertionId: "assertion:3", offeringIds: [secondId] };
  const capability = { ...release.evidence[1], evidenceId: "evidence:capability:2", assertionId: "assertion:4", offeringIds: [secondId] };
  return resign({
    ...release,
    offerings: [...release.offerings, { offeringId: secondId, market: "TR", lifecycle: "FROZEN", validFrom: "2026-09-01T00:00:00.000Z", identity: secondIdentity }],
    evidence: [...release.evidence, technical, capability],
    layers: {
      ...release.layers,
      l1Facts: [...release.layers.l1Facts, { factId: "fact:2", offeringId: secondId, key: kind === "PRODUCT" ? "mass" : "appointmentDuration", value: 75, unit: kind === "PRODUCT" ? "kg" : "minute", evidenceId: technical.evidenceId }],
      l2Capabilities: [...release.layers.l2Capabilities, { capabilityId: "capability:2", offeringId: secondId, key: kind === "PRODUCT" ? "childLock" : "inHomeDelivery", state: "PRESENT", evidenceId: capability.evidenceId, limitations: [] }],
      l8DecisionProjections: [...release.layers.l8DecisionProjections, { projectionId: "projection:2", offeringId: secondId, eligibleEvidenceIds: [technical.evidenceId, capability.evidenceId], needMappingIds: [], limitations: ["Fixture only"], disclosures: ["Not a production offering"], traceability: "EXACT" }],
    },
  });
}

describe("XPY_CATALOG/v0.1", () => {
  it("accepts product and service-shaped offerings without leaking product identity into services", () => {
    const product = fixture(productIdentity);
    const service = fixture(serviceIdentity);
    expect(validateXpyCatalogRelease(product)).toEqual([]);
    expect(validateXpyCatalogRelease(service)).toEqual([]);
    expect(service.offerings[0].identity).toEqual(serviceIdentity);
    expect("model" in service.offerings[0].identity).toBe(false);
  });

  it.each([
    ["digest mismatch", (release: XpyCatalogRelease): XpyCatalogRelease => ({ ...release, releaseDigest: `sha256:${"0".repeat(64)}` }), "RELEASE_DIGEST_MISMATCH"],
    ["cross-market source", (release: XpyCatalogRelease) => resign({ ...release, sources: [{ ...release.sources[0], market: "US" }] }), "SOURCE_MARKET_MISMATCH"],
    ["stale applicability", (release: XpyCatalogRelease) => resign({ ...release, sources: [{ ...release.sources[0], applicabilityStatus: "STALE" }] }), "SOURCE_APPLICABILITY_UNSAFE"],
    ["dangling evidence", (release: XpyCatalogRelease) => resign({ ...release, layers: { ...release.layers, l1Facts: [{ ...release.layers.l1Facts[0], evidenceId: "missing" }] } }), "DANGLING_EVIDENCE"],
    ["dangling semantic mapping", (release: XpyCatalogRelease) => resign({ ...release, layers: { ...release.layers, l4NeedEvidenceMappings: [{ ...release.layers.l4NeedEvidenceMappings[0], eligibleFactIds: ["missing"] }] } }), "DANGLING_FACT"],
  ] as const)("fails closed for %s", (_name, mutate, issue) => {
    expect(validateXpyCatalogRelease(mutate(fixture(productIdentity)))).toContain(issue);
  });

  it("rejects exact identity collisions", () => {
    const release = fixture(productIdentity);
    const duplicate = resign({ ...release, offerings: [...release.offerings, { ...release.offerings[0], offeringId: "product:duplicate-id" }] });
    expect(validateXpyCatalogRelease(duplicate)).toContain("IDENTITY_COLLISION");
  });

  it("keeps manual knowledge out of L1 and L8 until governed promotion", () => {
    const release = fixture(productIdentity);
    const manualSource = { ...release.sources[0], sourceId: "source:manual", kind: "MANUAL" as const };
    const manualEvidence = { ...release.evidence[0], evidenceId: "evidence:manual", sourceId: manualSource.sourceId, kind: "MANUAL" as const };
    const manual = resign({
      ...release,
      sources: [...release.sources, manualSource],
      evidence: [...release.evidence, manualEvidence],
      layers: {
        ...release.layers,
        l1Facts: [{ ...release.layers.l1Facts[0], evidenceId: manualEvidence.evidenceId }],
        l8DecisionProjections: [{ ...release.layers.l8DecisionProjections[0], eligibleEvidenceIds: [manualEvidence.evidenceId] }],
        l9AdvisorKnowledge: [{ knowledgeId: "knowledge:manual", offeringId: release.offerings[0].offeringId, offeringVersion: release.releaseVersion, market: "TR", sourceId: manualSource.sourceId, evidenceId: manualEvidence.evidenceId, sourceSection: "Installation / p. 12", text: "Fixture manual knowledge", sourceArtifactSha256: `sha256:${"b".repeat(64)}`, language: "tr-TR", applicability: "EXACT_MODEL", reviewAuthority: "FIXTURE_REVIEWER", reviewedAt: "2026-09-02T00:00:00.000Z", limitations: ["Fixture only"], knowledgeKind: "INSTALLATION", decisionAuthority: "NONE" }],
      },
    });
    expect(validateXpyCatalogRelease(manual)).toContain("MANUAL_PROMOTION_REQUIRED");
  });

  it("rejects direct persona authority and unversioned semantic changes", () => {
    const release = fixture(productIdentity);
    const unsafe = structuredClone(release) as unknown as { layers: { l5PersonaSignals: { directCandidateEffect: string }[] }; compatibility: { semanticAuthorityChange: string } };
    unsafe.layers.l5PersonaSignals[0].directCandidateEffect = "HARD_FILTER";
    unsafe.compatibility.semanticAuthorityChange = "VERSIONED_CHANGE";
    const signed = resign(unsafe as unknown as XpyCatalogRelease);
    expect(validateXpyCatalogRelease(signed)).toEqual(expect.arrayContaining(["PERSONA_DECISION_AUTHORITY_FORBIDDEN", "SEMANTIC_CHANGE_NOT_VERSIONED"]));
  });

  it("joins volatile offers/media without changing the frozen digest or Y authority", () => {
    const release = fixture(serviceIdentity);
    const snapshot: XpyExternalOfferingSnapshot = { schemaVersion: "XPY_CATALOG_EXTERNAL_SNAPSHOT/v0.1", snapshotId: "offers:1", observedAt: "2026-09-04T01:00:00.000Z", expiresAt: "2026-09-05T01:00:00.000Z", market: "TR", offers: [{ offerId: "offer:1", offeringId: release.offerings[0].offeringId, merchant: "Example", amount: 100, currency: "TRY", affiliate: true }], media: [{ mediaId: "media:1", offeringId: release.offerings[0].offeringId, uri: "https://example.test/image.jpg" }] };
    const first = joinExternalOfferingSnapshot(release, snapshot);
    const second = joinExternalOfferingSnapshot(release, { ...snapshot, snapshotId: "offers:2", offers: [{ ...snapshot.offers[0], amount: 999 }] });
    expect(second.releaseDigest).toBe(first.releaseDigest);
    expect(second.yAuthority).toBe("CATALOG_AND_GOVERNED_EVIDENCE_ONLY");
  });

  it.each(["PRODUCT", "SERVICE"] as const)("creates a paid, read-only comparison and bounded Advisor projection for %s offerings", (kind) => {
    const release = twoOfferingFixture(kind);
    const dimensions: readonly XpyComparisonDimension[] = [{
      dimensionId: kind === "PRODUCT" ? "product.mass" : "service.appointment-duration",
      humanLabel: kind === "PRODUCT" ? "Ağırlık" : "Randevu süresi",
      scope: kind === "PRODUCT" ? "EXACT_CONFIGURATION" : "EXACT_SERVICE_PLAN_AND_SCOPE",
      source: { kind: "FACT", key: kind === "PRODUCT" ? "mass" : "appointmentDuration", unitPolicy: "SAME_UNIT_REQUIRED" },
      authority: "DOMAIN_PACK",
    }];
    const comparison = projectComparisonEvidence({ release, authorization: { purchaseStatus: "PURCHASED", entitlementId: "entitlement:1", comparisonSetId: "set:1", exactOfferingIds: release.offerings.map((item) => item.offeringId) }, dimensions });
    const advisor = projectAdvisorRead({ release, authorizedDecision: { decisionId: "decision:1", exactOfferingId: release.offerings[0].offeringId }, comparison });
    expect(comparison.rules).toMatchObject({ unknownTreatment: "NEUTRAL_NO_PENALTY", incomparableTreatment: "FAIL_CLOSED", decisionAuthority: "NONE" });
    expect(advisor).toMatchObject({ readOnly: true, authority: "EXPLAIN_AND_BOUNDED_ADVICE_ONLY" });
    expect(advisor.forbidden).toContain("SELECT_NEW_CANDIDATES");
    expect(comparison.offerings.map((item) => item.identity.kind)).toEqual([kind, kind]);
  });

  it("treats missing comparison data as neutral unknown and fails closed on incompatible units", () => {
    const release = twoOfferingFixture("PRODUCT");
    const dimension: XpyComparisonDimension = { dimensionId: "product.mass", humanLabel: "Ağırlık", scope: "EXACT_CONFIGURATION", source: { kind: "FACT", key: "mass", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" };
    const authorization = { purchaseStatus: "PURCHASED" as const, entitlementId: "entitlement:1", comparisonSetId: "set:1", exactOfferingIds: release.offerings.map((item) => item.offeringId) };
    const missing = resign({ ...release, layers: { ...release.layers, l1Facts: release.layers.l1Facts.slice(0, 1) } });
    expect(projectComparisonEvidence({ release: missing, authorization, dimensions: [dimension] }).dimensions[0].cells[1]).toMatchObject({ state: "UNKNOWN", limitations: [expect.stringContaining("not worse")] });
    const incompatible = resign({ ...release, layers: { ...release.layers, l1Facts: release.layers.l1Facts.map((item, index) => index === 1 ? { ...item, unit: "lb" } : item) } });
    expect(() => projectComparisonEvidence({ release: incompatible, authorization, dimensions: [dimension] })).toThrow("COMPARISON_DIMENSION_INCOMPARABLE_UNIT");
  });

  it("rejects unpaid, unknown, or decision-unbound Advisor comparison access", () => {
    const release = twoOfferingFixture("SERVICE");
    const dimension: XpyComparisonDimension = { dimensionId: "service.duration", humanLabel: "Randevu süresi", scope: "EXACT_SERVICE_PLAN_AND_SCOPE", source: { kind: "FACT", key: "appointmentDuration", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" };
    const unpaid = { purchaseStatus: "UNPAID", entitlementId: "", comparisonSetId: "set:1", exactOfferingIds: release.offerings.map((item) => item.offeringId) };
    expect(() => projectComparisonEvidence({ release, authorization: unpaid as never, dimensions: [dimension] })).toThrow("COMPARISON_AUTHORIZATION_REQUIRED");
    expect(() => projectComparisonEvidence({ release, authorization: { purchaseStatus: "PURCHASED", entitlementId: "entitlement:1", comparisonSetId: "set:1", exactOfferingIds: [release.offerings[0].offeringId, "service:unknown"] }, dimensions: [dimension] })).toThrow("COMPARISON_SET_UNAUTHORIZED");
    expect(() => projectAdvisorRead({ release, authorizedDecision: { decisionId: "decision:1", exactOfferingId: "service:unknown" } })).toThrow("ADVISOR_DECISION_AUTHORIZATION_REQUIRED");
  });
});
