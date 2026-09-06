import { createHash } from "node:crypto";
import type { OwnerManualAssertion, OwnerManualAuthorityLevel } from "@/types/ownerManualEvidence";

const CONDITIONAL_PATTERNS = [
  /\b(if|where|when) (fitted|equipped|provided|available)\b/i,
  /\bdepending on (the )?(version|trim|equipment|country|market)\b/i,
  /\baccording to (the )?(version|trim|equipment|country|market)\b/i,
  /\bmay be (fitted|equipped|available)\b/i,
  /\b(varsa|mevcutsa|donanıma göre|modele göre|versiyona göre|ülkeye göre|pazara göre)\b/i,
  /\b(falls? (vorhanden|ausgestattet)|je nach (ausstattung|modell|land)|ausstattungsabhängig)\b/i,
  /\b(si équipé|selon (la )?(version|finition|pays|équipement))\b/i,
  /\b(se in dotazione|a seconda (della|del) (versione|allestimento|paese))\b/i,
  /\b(si está equipado|según (la|el) (versión|equipamiento|país))\b/i,
] as const;

export function detectConditionalOwnerManualLanguage(text: string): boolean {
  return CONDITIONAL_PATTERNS.some((pattern) => pattern.test(text.normalize("NFKC")));
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
}

export function ownerManualFingerprint(value: unknown): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

export function isHardFilterAuthority(level: OwnerManualAuthorityLevel): boolean {
  return level === "EXACT_VARIANT_VERIFIED";
}

export function assertOwnerManualCatalogCompatibility(input: { catalogRelease: string; catalogFingerprint: string }, active: { release: string; fingerprint: string }): void {
  if (input.catalogRelease !== active.release || input.catalogFingerprint !== active.fingerprint) throw new TypeError("OWNER_MANUAL_CATALOG_FINGERPRINT_MISMATCH");
}

export function validateOwnerManualAssertion(assertion: OwnerManualAssertion): readonly string[] {
  const issues: string[] = [];
  if (assertion.authorityLevel === "EXACT_VARIANT_VERIFIED" && !assertion.exactVariantId) issues.push("EXACT_AUTHORITY_REQUIRES_VARIANT_ID");
  if (assertion.authorityLevel === "EXACT_VARIANT_VERIFIED" && assertion.applicability.market !== "TR") issues.push("EXACT_AUTHORITY_REQUIRES_TR_MARKET");
  if (assertion.authorityLevel === "EXACT_VARIANT_VERIFIED" && assertion.applicability.conditionalEquipment) issues.push("CONDITIONAL_EQUIPMENT_CANNOT_BE_EXACT_VERIFIED");
  if (assertion.authorityLevel === "MODEL_FAMILY_CAPABILITY" && assertion.exactVariantId) issues.push("FAMILY_CAPABILITY_CANNOT_BIND_VARIANT");
  if (assertion.polarity === "NEGATIVE" && assertion.normalizedValue !== false) issues.push("NEGATIVE_POLARITY_REQUIRES_FALSE_VALUE");
  if (assertion.polarity === "NEGATIVE" && assertion.authorityLevel !== "EXACT_VARIANT_VERIFIED") issues.push("NEGATIVE_REQUIRES_EXACT_OFFICIAL_AUTHORITY");
  if (!assertion.provenance.rawSha256.startsWith("sha256:") || assertion.provenance.rawSha256.length !== 71) issues.push("INVALID_RAW_SHA256");
  if (!assertion.provenance.sectionHeading.trim()) issues.push("LOCATOR_SECTION_REQUIRED");
  return issues;
}

export function projectOwnerManualAssertion(assertion: OwnerManualAssertion): { hardFilterEligible: boolean; filterEligible: boolean; softSignal: boolean; warning?: string } {
  const issues = validateOwnerManualAssertion(assertion);
  const valid = issues.length === 0;
  const provisionalValid = issues.every((issue) => ["EXACT_AUTHORITY_REQUIRES_VARIANT_ID", "EXACT_AUTHORITY_REQUIRES_TR_MARKET", "CONDITIONAL_EQUIPMENT_CANNOT_BE_EXACT_VERIFIED"].includes(issue));
  const hardFilterEligible = valid && assertion.polarity !== "UNRESOLVED" && isHardFilterAuthority(assertion.authorityLevel);
  const filterEligible = provisionalValid && assertion.polarity === "POSITIVE" && assertion.authorityLevel !== "RESEARCHED_INCONCLUSIVE";
  return {
    hardFilterEligible,
    filterEligible,
    softSignal: valid && assertion.polarity === "POSITIVE" && assertion.authorityLevel === "MODEL_FAMILY_CAPABILITY",
    ...(filterEligible && !hardFilterEligible ? { warning: "Model ailesi veya yabancı pazar el kitabında açıklanır; Türkiye'deki bu varyant için doğrulanması gerekir." } : {}),
  };
}
