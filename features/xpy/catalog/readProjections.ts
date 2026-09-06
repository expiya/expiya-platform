import type { AdvisorReadProjection, ComparisonEvidenceProjection, XpyCatalogRelease, XpyComparisonDimension } from "./contract";
import { validateXpyCatalogRelease } from "./validation";

function requireValidRelease(release: XpyCatalogRelease): void {
  const issues = validateXpyCatalogRelease(release);
  if (issues.length) throw new TypeError(`XPY_CATALOG_RELEASE_INVALID:${issues.join(",")}`);
}

export function projectComparisonEvidence(input: {
  readonly release: XpyCatalogRelease;
  readonly authorization: { readonly purchaseStatus: "PURCHASED"; readonly entitlementId: string; readonly comparisonSetId: string; readonly exactOfferingIds: readonly string[] };
  readonly dimensions: readonly XpyComparisonDimension[];
}): ComparisonEvidenceProjection {
  requireValidRelease(input.release);
  if (input.authorization.purchaseStatus !== "PURCHASED" || !input.authorization.entitlementId || !input.authorization.comparisonSetId || input.authorization.exactOfferingIds.length < 2) throw new TypeError("COMPARISON_AUTHORIZATION_REQUIRED");
  const offeringIds = new Set(input.release.offerings.map((item) => item.offeringId));
  if (new Set(input.authorization.exactOfferingIds).size !== input.authorization.exactOfferingIds.length || input.authorization.exactOfferingIds.some((id) => !offeringIds.has(id))) throw new TypeError("COMPARISON_SET_UNAUTHORIZED");
  if (input.dimensions.some((item) => item.authority !== "DOMAIN_PACK" || !item.dimensionId || !item.humanLabel.trim() || !item.scope.trim())) throw new TypeError("COMPARISON_DIMENSION_AUTHORITY_REQUIRED");
  if (new Set(input.dimensions.map((item) => item.dimensionId)).size !== input.dimensions.length) throw new TypeError("COMPARISON_DIMENSION_AMBIGUOUS");
  const evidence = new Map(input.release.evidence.map((item) => [item.evidenceId, item]));
  const dimensions = input.dimensions.map((dimension) => {
    const cells = input.authorization.exactOfferingIds.map((offeringId) => {
      if (dimension.source.kind === "FACT") {
        const matches = input.release.layers.l1Facts.filter((item) => item.offeringId === offeringId && item.key === dimension.source.key);
        if (!matches.length) return Object.freeze({ offeringId, state: "UNKNOWN" as const, evidenceIds: Object.freeze([]), limitations: Object.freeze(["No governed comparable fact is available; unknown is not worse."]) });
        if (matches.length !== 1) throw new TypeError("COMPARISON_DIMENSION_AMBIGUOUS");
        const fact = matches[0];
        return Object.freeze({ offeringId, state: "KNOWN" as const, value: fact.value, ...(fact.unit ? { unit: fact.unit } : {}), evidenceIds: Object.freeze([fact.evidenceId]), limitations: Object.freeze([...(evidence.get(fact.evidenceId)?.limitations ?? [])]) });
      }
      const matches = input.release.layers.l2Capabilities.filter((item) => item.offeringId === offeringId && item.key === dimension.source.key);
      if (!matches.length || matches[0].state === "UNKNOWN") return Object.freeze({ offeringId, state: "UNKNOWN" as const, evidenceIds: Object.freeze([]), limitations: Object.freeze(["No governed capability state is available; unknown is not worse."]) });
      if (matches.length !== 1) throw new TypeError("COMPARISON_DIMENSION_AMBIGUOUS");
      const capability = matches[0];
      return Object.freeze({ offeringId, state: "KNOWN" as const, value: capability.state, evidenceIds: Object.freeze([capability.evidenceId]), limitations: Object.freeze([...capability.limitations, ...(evidence.get(capability.evidenceId)?.limitations ?? [])]) });
    });
    if (dimension.source.kind === "FACT") {
      const units = new Set(cells.filter((cell) => cell.state === "KNOWN").map((cell) => "unit" in cell ? cell.unit ?? "UNITLESS" : "UNITLESS"));
      if (units.size > 1) throw new TypeError("COMPARISON_DIMENSION_INCOMPARABLE_UNIT");
    }
    return Object.freeze({ dimensionId: dimension.dimensionId, humanLabel: dimension.humanLabel, scope: dimension.scope, cells: Object.freeze(cells) });
  });
  const authorizedIds = new Set(input.authorization.exactOfferingIds);
  const offerings = input.release.offerings.filter((item) => authorizedIds.has(item.offeringId));
  const usedEvidenceIds = new Set<string>();
  dimensions.forEach((dimension) => dimension.cells.forEach((cell) => cell.evidenceIds.forEach((id) => usedEvidenceIds.add(id))));
  const selectedKnowledge = input.release.layers.l9AdvisorKnowledge.filter((item) => authorizedIds.has(item.offeringId));
  selectedKnowledge.forEach((item) => usedEvidenceIds.add(item.evidenceId));
  const completeEvidence = input.release.evidence.filter((item) => usedEvidenceIds.has(item.evidenceId) && item.offeringIds.some((id) => authorizedIds.has(id)));
  const usedSourceIds = new Set([...completeEvidence.map((item) => item.sourceId), ...selectedKnowledge.map((item) => item.sourceId)]);
  return Object.freeze({
    schemaVersion: "XPY_COMPARISON_EVIDENCE_PROJECTION/v0.1",
    readOnly: true,
    catalogReleaseId: input.release.releaseId,
    catalogReleaseDigest: input.release.releaseDigest,
    market: input.release.market,
    authorization: Object.freeze({ ...input.authorization, exactOfferingIds: Object.freeze([...input.authorization.exactOfferingIds]) }),
    offerings: Object.freeze(offerings),
    evidence: Object.freeze(completeEvidence),
    sources: Object.freeze(input.release.sources.filter((item) => usedSourceIds.has(item.sourceId))),
    dailyLifeInterpretations: Object.freeze(input.release.layers.l6DailyLifeInterpretations.filter((item) => !item.offeringId || authorizedIds.has(item.offeringId))),
    advisorKnowledge: Object.freeze(selectedKnowledge),
    rules: Object.freeze({ unknownTreatment: "NEUTRAL_NO_PENALTY", incomparableTreatment: "FAIL_CLOSED", dimensionAndLabelAuthority: "DOMAIN_PACK_ONLY", decisionAuthority: "NONE" }),
    dimensions: Object.freeze(dimensions),
  });
}

const forbidden: AdvisorReadProjection["forbidden"] = Object.freeze([
  "SELECT_NEW_CANDIDATES",
  "MUTATE_ASAMA_1_CONTEXT",
  "CHANGE_Y_AUTHORIZATION",
  "INTRODUCE_UNAUTHORIZED_OFFERINGS",
  "READ_UNRELATED_CATALOG_ENTITIES",
  "INVENT_CLAIMS",
  "USE_COMMERCE_OR_AFFILIATE_AS_RECOMMENDATION_AUTHORITY",
]);

export function projectAdvisorRead(input: {
  readonly release: XpyCatalogRelease;
  readonly authorizedDecision: { readonly decisionId: string; readonly exactOfferingId: string };
  readonly comparison?: ComparisonEvidenceProjection;
}): AdvisorReadProjection {
  requireValidRelease(input.release);
  const offering = input.release.offerings.find((item) => item.offeringId === input.authorizedDecision.exactOfferingId);
  const decisionProjection = input.release.layers.l8DecisionProjections.find((item) => item.offeringId === input.authorizedDecision.exactOfferingId);
  if (!offering || !decisionProjection) throw new TypeError("ADVISOR_DECISION_AUTHORIZATION_REQUIRED");
  if (input.comparison) {
    if (input.comparison.catalogReleaseId !== input.release.releaseId || input.comparison.catalogReleaseDigest !== input.release.releaseDigest || input.comparison.authorization.purchaseStatus !== "PURCHASED" || !input.comparison.authorization.exactOfferingIds.includes(offering.offeringId)) throw new TypeError("ADVISOR_COMPARISON_UNAUTHORIZED");
  }
  const facts = input.release.layers.l1Facts.filter((item) => item.offeringId === offering.offeringId);
  const capabilities = input.release.layers.l2Capabilities.filter((item) => item.offeringId === offering.offeringId);
  const dailyLifeInterpretations = input.release.layers.l6DailyLifeInterpretations.filter((item) => !item.offeringId || item.offeringId === offering.offeringId);
  const advisorKnowledge = input.release.layers.l9AdvisorKnowledge.filter((item) => item.offeringId === offering.offeringId);
  const evidenceIds = new Set([...facts.map((item) => item.evidenceId), ...capabilities.map((item) => item.evidenceId), ...advisorKnowledge.map((item) => item.evidenceId), ...decisionProjection.eligibleEvidenceIds, ...input.comparison?.dimensions.flatMap((dimension) => dimension.cells.flatMap((cell) => cell.evidenceIds)) ?? []]);
  const authorizedIds = new Set(input.comparison?.authorization.exactOfferingIds ?? [offering.offeringId]);
  const evidence = input.release.evidence.filter((item) => evidenceIds.has(item.evidenceId) && item.offeringIds.some((id) => authorizedIds.has(id)));
  const sourceIds = new Set([...evidence.map((item) => item.sourceId), ...advisorKnowledge.map((item) => item.sourceId), ...input.comparison?.advisorKnowledge.map((item) => item.sourceId) ?? []]);
  const sources = input.release.sources.filter((item) => sourceIds.has(item.sourceId));
  return Object.freeze({
    schemaVersion: "XPY_ADVISOR_READ_PROJECTION/v0.1",
    readOnly: true,
    authority: "EXPLAIN_AND_BOUNDED_ADVICE_ONLY",
    authorizedDecision: Object.freeze({ ...input.authorizedDecision }),
    catalogReleaseId: input.release.releaseId,
    catalogReleaseDigest: input.release.releaseDigest,
    offering,
    facts: Object.freeze(facts),
    capabilities: Object.freeze(capabilities),
    dailyLifeInterpretations: Object.freeze(dailyLifeInterpretations),
    advisorKnowledge: Object.freeze(advisorKnowledge),
    evidence: Object.freeze(evidence),
    sources: Object.freeze(sources),
    ...(input.comparison ? { comparison: input.comparison } : {}),
    forbidden,
  });
}
