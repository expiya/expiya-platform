import { createHash } from "node:crypto";

export type EvidenceScope = "EXACT_PRODUCT" | "FAMILY_SCOPED";

export interface GlobalEvidenceAssertion {
  readonly assertionId: string;
  readonly productId: string;
  readonly sourceId: string;
  readonly scope: EvidenceScope;
  readonly decisionUse: "EXPLANATION_ONLY";
  readonly market: string;
  readonly targetKey: string;
  readonly value: unknown;
  readonly applicabilityReason: string;
}

export interface GlobalEvidenceSource {
  readonly sourceId: string;
  readonly url: string;
  readonly publisher: string;
  readonly sourceType: "MANUFACTURER_PRODUCT_PAGE" | "MANUFACTURER_SUPPORT_PAGE" | "MANUFACTURER_DOCUMENT" | "REGULATORY_PRODUCT_FICHE";
  readonly market: string;
  readonly retrievedAt: string;
  readonly documentVersion?: string | null;
  readonly applicability: EvidenceScope;
  readonly exactModelCodeObserved: string;
  readonly disposition: "ADMITTED" | "EXPLANATION_ONLY" | "EXCLUDED_CONFLICT";
}

export interface CandidateManual {
  readonly productId: string;
  readonly exactProductCode: string;
  readonly sourceUrl: string;
  readonly officialPublisher: boolean;
  readonly market: string;
  readonly language: string;
  readonly retrievedAt: string;
  readonly documentVersion: string | null;
  readonly artifactSha256: string;
  readonly immutableBytesPath: string;
  readonly applicabilityDetermination: "EXACT_TR_VERIFIED";
  readonly disposition: "ADMITTED_EXACT_TR";
  readonly byteLength: number;
  readonly pageCount: number;
  readonly identityLocator: { readonly page: number; readonly section: string };
  readonly knowledgeLocators: readonly { readonly page: number; readonly section: string; readonly kind: "SAFETY" | "MAINTENANCE" | "INSTALLATION" | "PROGRAM_BEHAVIOR" }[];
}

export interface ActiveManualReference {
  readonly productId: string;
  readonly artifactSha256: string;
}

export interface ActiveL9Reference {
  readonly productId: string;
  readonly locator: { readonly page: number; readonly section: string };
}

export interface CandidateL9Record {
  readonly productId: string;
  readonly manualArtifactSha256: string;
  readonly locator: CandidateManual["knowledgeLocators"][number];
}

function normalizeLocatorSection(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function locatorsOverlap(
  left: { readonly page: number; readonly section: string },
  right: { readonly page: number; readonly section: string },
): boolean {
  if (left.page !== right.page) return false;
  const leftSection = normalizeLocatorSection(left.section);
  const rightSection = normalizeLocatorSection(right.section);
  return leftSection === rightSection || leftSection.includes(rightSection) || rightSection.includes(leftSection);
}

export function reconcileCandidateManualEvidence(input: {
  readonly activeManuals: readonly ActiveManualReference[];
  readonly activeL9: readonly ActiveL9Reference[];
  readonly candidateManuals: readonly CandidateManual[];
}): {
  readonly newManuals: readonly CandidateManual[];
  readonly newL9: readonly CandidateL9Record[];
  readonly newlyCoveredManualProductIds: readonly string[];
  readonly newlyCoveredL9ProductIds: readonly string[];
} {
  const activeManualKeys = new Set(input.activeManuals.map((manual) => `${manual.productId}|${manual.artifactSha256}`));
  const activeManualProducts = new Set(input.activeManuals.map((manual) => manual.productId));
  const activeL9Products = new Set(input.activeL9.map((entry) => entry.productId));
  const newManuals = input.candidateManuals.filter(
    (manual) => !activeManualKeys.has(`${manual.productId}|${manual.artifactSha256}`),
  );
  const newL9: CandidateL9Record[] = [];

  for (const manual of input.candidateManuals) {
    for (const locator of manual.knowledgeLocators) {
      const duplicatesActive = input.activeL9.some(
        (entry) => entry.productId === manual.productId && locatorsOverlap(entry.locator, locator),
      );
      const duplicatesCandidate = newL9.some(
        (entry) => entry.productId === manual.productId && locatorsOverlap(entry.locator, locator),
      );
      if (!duplicatesActive && !duplicatesCandidate) {
        newL9.push({ productId: manual.productId, manualArtifactSha256: manual.artifactSha256, locator });
      }
    }
  }

  return {
    newManuals,
    newL9,
    newlyCoveredManualProductIds: [...new Set(newManuals.map((manual) => manual.productId).filter((productId) => !activeManualProducts.has(productId)))].sort(),
    newlyCoveredL9ProductIds: [...new Set(newL9.map((entry) => entry.productId).filter((productId) => !activeL9Products.has(productId)))].sort(),
  };
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function verifySha256(expected: string, value: string | Buffer): boolean {
  return expected.replace(/^sha256:/, "") === sha256(value);
}

export function validateGlobalEvidenceCandidate(input: {
  readonly assertions: readonly GlobalEvidenceAssertion[];
  readonly sources: readonly GlobalEvidenceSource[];
  readonly manuals: readonly CandidateManual[];
  readonly conflicts: readonly { readonly productId: string; readonly targetKey: string; readonly disposition: string }[];
  readonly boundaries: Record<string, string | boolean>;
}): readonly string[] {
  const issues: string[] = [];
  const sourceById = new Map(input.sources.map((source) => [source.sourceId, source]));
  for (const assertion of input.assertions) {
    const source = sourceById.get(assertion.sourceId);
    if (!source) issues.push(`ASSERTION_SOURCE_MISSING:${assertion.assertionId}`);
    if (assertion.decisionUse !== "EXPLANATION_ONLY") issues.push(`DECISION_USE_FORBIDDEN:${assertion.assertionId}`);
    if (assertion.scope === "EXACT_PRODUCT" && source?.applicability !== "EXACT_PRODUCT") issues.push(`EXACT_ASSERTION_FROM_FAMILY_SOURCE:${assertion.assertionId}`);
    if (assertion.scope === "FAMILY_SCOPED" && !assertion.applicabilityReason) issues.push(`FAMILY_SCOPE_REASON_MISSING:${assertion.assertionId}`);
  }
  for (const conflict of input.conflicts) {
    if (conflict.disposition !== "UNKNOWN_EXCLUDED") issues.push(`CONFLICT_NOT_UNKNOWN:${conflict.productId}:${conflict.targetKey}`);
  }
  for (const manual of input.manuals) {
    if (!manual.officialPublisher) issues.push(`MANUAL_NOT_OFFICIAL:${manual.productId}`);
    if (!manual.retrievedAt || manual.disposition !== "ADMITTED_EXACT_TR") issues.push(`MANUAL_PROVENANCE_INVALID:${manual.productId}`);
    if (!/^sha256:[a-f0-9]{64}$/.test(manual.artifactSha256)) issues.push(`MANUAL_CHECKSUM_INVALID:${manual.productId}`);
    if (!manual.immutableBytesPath || manual.applicabilityDetermination !== "EXACT_TR_VERIFIED") issues.push(`MANUAL_APPLICABILITY_INVALID:${manual.productId}`);
    if (manual.byteLength <= 0 || manual.pageCount <= 0) issues.push(`MANUAL_BYTES_OR_PAGES_INVALID:${manual.productId}`);
    if (manual.identityLocator.page < 1 || !manual.identityLocator.section) issues.push(`MANUAL_IDENTITY_LOCATOR_INVALID:${manual.productId}`);
    if (manual.knowledgeLocators.some((locator) => locator.page < 1 || locator.page > manual.pageCount || !locator.section)) issues.push(`MANUAL_KNOWLEDGE_LOCATOR_INVALID:${manual.productId}`);
  }
  const requiredNeutral = ["candidateSelection", "hardFilters", "questions", "sufficiency", "ranking", "recommendation", "yAuthorization", "commerceOrdering"];
  for (const key of requiredNeutral) if (input.boundaries[key] !== "NONE") issues.push(`DECISION_NEUTRALITY_VIOLATION:${key}`);
  return issues;
}
