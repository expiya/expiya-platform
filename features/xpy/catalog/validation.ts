import { createHash } from "node:crypto";

import { XPY_RUNTIME_DIGEST, XPY_RUNTIME_VERSION } from "../runtimeContract";
import type { XpyCatalogRelease, XpyExternalOfferingSnapshot } from "./contract";
import { XPY_CATALOG_VERSION } from "./contract";

export type CatalogValidationIssue =
  | "SCHEMA_VERSION_UNSUPPORTED"
  | "RELEASE_DIGEST_MISMATCH"
  | "RUNTIME_COMPATIBILITY_MISMATCH"
  | "DOMAIN_PACK_COMPATIBILITY_MISSING"
  | "SEMANTIC_CHANGE_NOT_VERSIONED"
  | "IDENTITY_SHAPE_INVALID"
  | "IDENTITY_COLLISION"
  | "OFFERING_MARKET_MISMATCH"
  | "SOURCE_MARKET_MISMATCH"
  | "SOURCE_APPLICABILITY_UNSAFE"
  | "SOURCE_DATE_INVALID"
  | "DANGLING_SOURCE"
  | "DANGLING_OFFERING"
  | "DANGLING_EVIDENCE"
  | "DANGLING_FACT"
  | "DANGLING_CAPABILITY"
  | "DANGLING_NEED"
  | "DANGLING_MAPPING"
  | "UNSUPPORTED_SEMANTIC_MAPPING"
  | "MANUAL_PROMOTION_REQUIRED"
  | "MANUAL_APPLICABILITY_MISMATCH"
  | "MANUAL_KNOWLEDGE_EVIDENCE_MISMATCH"
  | "INELIGIBLE_EVIDENCE"
  | "PERSONA_DECISION_AUTHORITY_FORBIDDEN"
  | "DAILY_LIFE_LINEAGE_REQUIRED"
  | "EXPERIENCE_TECHNICAL_AUTHORITY_FORBIDDEN"
  | "DECISION_TRACEABILITY_REQUIRED"
  | "ASSERTION_APPLICABILITY_MISMATCH";

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
    .join(",")}}`;
}

export function xpyCatalogReleaseDigest(release: Omit<XpyCatalogRelease, "releaseDigest"> | XpyCatalogRelease): `sha256:${string}` {
  const { releaseDigest: ignored, ...payload } = release as XpyCatalogRelease;
  void ignored;
  return `sha256:${createHash("sha256").update(canonical(payload)).digest("hex")}`;
}

const push = (issues: CatalogValidationIssue[], issue: CatalogValidationIssue) => {
  if (!issues.includes(issue)) issues.push(issue);
};

const validDate = (value: string) => Number.isFinite(Date.parse(value));

export function validateXpyCatalogRelease(release: XpyCatalogRelease): readonly CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];
  if (release.schemaVersion !== XPY_CATALOG_VERSION) push(issues, "SCHEMA_VERSION_UNSUPPORTED");
  if (release.releaseDigest !== xpyCatalogReleaseDigest(release)) push(issues, "RELEASE_DIGEST_MISMATCH");
  if (release.compatibility.runtime.version !== XPY_RUNTIME_VERSION || release.compatibility.runtime.digest !== XPY_RUNTIME_DIGEST) push(issues, "RUNTIME_COMPATIBILITY_MISMATCH");
  if (!release.compatibility.runtime.domainPackId || !release.compatibility.domainPackVersion || release.compatibility.runtime.domainPackId !== release.compatibility.domainPackVersion) push(issues, "DOMAIN_PACK_COMPATIBILITY_MISSING");
  if (release.compatibility.revisionClass === "EVIDENCE_OR_AVAILABILITY_REFRESH" && release.compatibility.semanticAuthorityChange !== "UNCHANGED") push(issues, "SEMANTIC_CHANGE_NOT_VERSIONED");
  if (release.compatibility.revisionClass === "SEMANTIC_POLICY_CHANGE" && release.compatibility.semanticAuthorityChange !== "VERSIONED_CHANGE") push(issues, "SEMANTIC_CHANGE_NOT_VERSIONED");

  const offerings = new Map(release.offerings.map((item) => [item.offeringId, item]));
  const sources = new Map(release.sources.map((item) => [item.sourceId, item]));
  const evidence = new Map(release.evidence.map((item) => [item.evidenceId, item]));
  const facts = new Map(release.layers.l1Facts.map((item) => [item.factId, item]));
  const capabilities = new Map(release.layers.l2Capabilities.map((item) => [item.capabilityId, item]));
  const needs = new Set(release.layers.l4Needs.map((item) => item.needId));
  const mappings = new Set(release.layers.l4NeedEvidenceMappings.map((item) => item.mappingId));
  const knowledge = new Map(release.layers.l9AdvisorKnowledge.map((item) => [item.knowledgeId, item]));

  const identityKeys = release.offerings.map((item) => item.identity.kind === "PRODUCT"
    ? ["PRODUCT", item.market, item.identity.manufacturer, item.identity.model, item.identity.configuration].join("|")
    : ["SERVICE", item.market, item.identity.provider, item.identity.serviceName, item.identity.planName, item.identity.scopeId, item.identity.serviceVersion].join("|"));
  if (offerings.size !== release.offerings.length || new Set(identityKeys).size !== identityKeys.length) push(issues, "IDENTITY_COLLISION");
  for (const item of release.offerings) {
    const identity = item.identity;
    if (identity.kind === "PRODUCT" && (!identity.manufacturer || !identity.model || !identity.configuration || !Object.keys(identity.identifiers).length)) push(issues, "IDENTITY_SHAPE_INVALID");
    if (identity.kind === "SERVICE" && (!identity.provider || !identity.serviceName || !identity.planName || !identity.scopeId || !identity.serviceVersion)) push(issues, "IDENTITY_SHAPE_INVALID");
    if (!validDate(item.validFrom) || item.validThrough && (!validDate(item.validThrough) || Date.parse(item.validThrough) < Date.parse(item.validFrom))) push(issues, "SOURCE_DATE_INVALID");
  }
  if (release.offerings.some((item) => item.market !== release.market)) push(issues, "OFFERING_MARKET_MISMATCH");

  for (const source of release.sources) {
    if (source.market !== release.market) push(issues, "SOURCE_MARKET_MISMATCH");
    if (source.applicabilityStatus === "UNKNOWN" || source.applicabilityStatus === "STALE" || source.status === "WITHDRAWN") push(issues, "SOURCE_APPLICABILITY_UNSAFE");
    if (!validDate(source.observedAt) || !validDate(source.reviewedAt) || Date.parse(source.reviewedAt) < Date.parse(source.observedAt)) push(issues, "SOURCE_DATE_INVALID");
  }
  for (const item of release.evidence) {
    if (!sources.has(item.sourceId)) push(issues, "DANGLING_SOURCE");
    if (!item.offeringIds.length || item.offeringIds.some((id) => !offerings.has(id))) push(issues, "DANGLING_OFFERING");
    if (item.market !== release.market) push(issues, "OFFERING_MARKET_MISMATCH");
    if (!validDate(item.observedAt) || !validDate(item.reviewedAt) || Date.parse(item.reviewedAt) < Date.parse(item.observedAt)) push(issues, "SOURCE_DATE_INVALID");
    if (item.assertion) {
      const assertionOffering = offerings.get(item.assertion.applicability.offeringId);
      if (!item.assertion.locator.trim() || !assertionOffering || !item.offeringIds.includes(item.assertion.applicability.offeringId) || item.assertion.applicability.market !== release.market || assertionOffering.market !== item.assertion.applicability.market || assertionOffering.identity.kind !== "PRODUCT" || assertionOffering.identity.model !== item.assertion.applicability.model || assertionOffering.identity.configuration !== item.assertion.applicability.configuration) push(issues, "ASSERTION_APPLICABILITY_MISMATCH");
    }
  }
  for (const fact of release.layers.l1Facts) {
    if (!offerings.has(fact.offeringId)) push(issues, "DANGLING_OFFERING");
    const item = evidence.get(fact.evidenceId);
    if (!item) push(issues, "DANGLING_EVIDENCE");
    else if (item.kind === "MANUAL") push(issues, "MANUAL_PROMOTION_REQUIRED");
    else if (item.kind === "GOVERNED_PROMOTION" && (!item.promotedFromKnowledgeId || !item.promotionAuthority || !knowledge.has(item.promotedFromKnowledgeId))) push(issues, "MANUAL_PROMOTION_REQUIRED");
    if (item && (item.status === "CONFLICTED" || item.status === "UNKNOWN")) push(issues, "INELIGIBLE_EVIDENCE");
  }
  for (const capability of release.layers.l2Capabilities) {
    if (!offerings.has(capability.offeringId)) push(issues, "DANGLING_OFFERING");
    const item = evidence.get(capability.evidenceId);
    if (!item) push(issues, "DANGLING_EVIDENCE");
    else if (item.kind === "MANUAL" || item.kind === "GOVERNED_PROMOTION" && (!item.promotedFromKnowledgeId || !item.promotionAuthority || !knowledge.has(item.promotedFromKnowledgeId))) push(issues, "MANUAL_PROMOTION_REQUIRED");
  }
  for (const semantic of release.layers.l3UsageSemantics) {
    if (!semantic.factIds.length && !semantic.capabilityIds.length) push(issues, "UNSUPPORTED_SEMANTIC_MAPPING");
    if (semantic.factIds.some((id) => !facts.has(id))) push(issues, "DANGLING_FACT");
    if (semantic.capabilityIds.some((id) => !capabilities.has(id))) push(issues, "DANGLING_CAPABILITY");
  }
  for (const mapping of release.layers.l4NeedEvidenceMappings) {
    if (!needs.has(mapping.needId)) push(issues, "DANGLING_NEED");
    if (!mapping.eligibleFactIds.length && !mapping.eligibleCapabilityIds.length) push(issues, "UNSUPPORTED_SEMANTIC_MAPPING");
    if (mapping.eligibleFactIds.some((id) => !facts.has(id))) push(issues, "DANGLING_FACT");
    if (mapping.eligibleCapabilityIds.some((id) => !capabilities.has(id))) push(issues, "DANGLING_CAPABILITY");
  }
  if (release.layers.l5PersonaSignals.some((item) => item.classification !== "DERIVED_PLANNING" || item.decisionUse !== "NONE" || item.directCandidateEffect !== "NONE" || item.needIds.some((id) => !needs.has(id)))) push(issues, "PERSONA_DECISION_AUTHORITY_FORBIDDEN");
  for (const interpretation of release.layers.l6DailyLifeInterpretations) {
    if (!interpretation.factIds.length && !interpretation.capabilityIds.length) push(issues, "DAILY_LIFE_LINEAGE_REQUIRED");
    if (interpretation.factIds.some((id) => !facts.has(id))) push(issues, "DANGLING_FACT");
    if (interpretation.capabilityIds.some((id) => !capabilities.has(id))) push(issues, "DANGLING_CAPABILITY");
    if (interpretation.offeringId && !offerings.has(interpretation.offeringId)) push(issues, "DANGLING_OFFERING");
  }
  for (const rule of release.layers.l7ExperienceRules) {
    if (rule.technicalTruthAuthority !== "NONE") push(issues, "EXPERIENCE_TECHNICAL_AUTHORITY_FORBIDDEN");
    if (rule.evidenceIds.some((id) => evidence.get(id)?.kind !== "EXPERIENCE")) push(issues, "DANGLING_EVIDENCE");
  }
  for (const projection of release.layers.l8DecisionProjections) {
    if (!offerings.has(projection.offeringId)) push(issues, "DANGLING_OFFERING");
    if (projection.traceability !== "EXACT" || !projection.limitations.length || !projection.disclosures.length) push(issues, "DECISION_TRACEABILITY_REQUIRED");
    if (projection.needMappingIds.some((id) => !mappings.has(id))) push(issues, "DANGLING_MAPPING");
    for (const id of projection.eligibleEvidenceIds) {
      const item = evidence.get(id);
      if (!item) push(issues, "DANGLING_EVIDENCE");
      else if (item.kind === "MANUAL") push(issues, "MANUAL_PROMOTION_REQUIRED");
      else if (item.kind === "GOVERNED_PROMOTION" && (!item.promotedFromKnowledgeId || !item.promotionAuthority || !knowledge.has(item.promotedFromKnowledgeId))) push(issues, "MANUAL_PROMOTION_REQUIRED");
      if (item && (item.status === "CONFLICTED" || item.status === "UNKNOWN")) push(issues, "INELIGIBLE_EVIDENCE");
    }
  }
  for (const item of release.layers.l9AdvisorKnowledge) {
    const offering = offerings.get(item.offeringId);
    const source = sources.get(item.sourceId);
    const manualEvidence = evidence.get(item.evidenceId);
    if (!offering || !source) push(issues, offering ? "DANGLING_SOURCE" : "DANGLING_OFFERING");
    if (!item.sourceSection.trim() || !item.text.trim() || !item.limitations.length || item.market !== release.market || source?.kind !== "MANUAL" || item.offeringVersion !== release.releaseVersion || source.artifactSha256 !== item.sourceArtifactSha256 || source.language !== item.language || !validDate(item.reviewedAt)) push(issues, "MANUAL_APPLICABILITY_MISMATCH");
    if (!manualEvidence || manualEvidence.kind !== "MANUAL" || manualEvidence.sourceId !== item.sourceId || !manualEvidence.offeringIds.includes(item.offeringId)) push(issues, "MANUAL_KNOWLEDGE_EVIDENCE_MISMATCH");
  }
  return Object.freeze(issues);
}

export function joinExternalOfferingSnapshot(release: XpyCatalogRelease, snapshot: XpyExternalOfferingSnapshot) {
  const ids = new Set(release.offerings.map((item) => item.offeringId));
  if (snapshot.market !== release.market || snapshot.offers.some((item) => !ids.has(item.offeringId)) || snapshot.media.some((item) => !ids.has(item.offeringId))) {
    throw new TypeError("EXTERNAL_SNAPSHOT_IDENTITY_MISMATCH");
  }
  return Object.freeze({ releaseId: release.releaseId, releaseDigest: release.releaseDigest, yAuthority: "CATALOG_AND_GOVERNED_EVIDENCE_ONLY" as const, snapshot });
}
