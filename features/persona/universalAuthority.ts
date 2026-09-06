import { createHash } from "node:crypto";
import { z } from "zod";
import { rankWithBoundedSoftSignals, type XpyBoundedSoftRankingResult, type XpyCandidateSoftSignal, type XpySoftPreference, type XpySoftRankingAuthorityReference } from "@/features/xpy/boundedSoftRanking";

export const UNIVERSAL_PERSONA_SCHEMA_VERSION = "xpy-universal-persona-authority/v1" as const;
export const UNIVERSAL_PERSONA_SCORE_CAP = 0.75 as const;
export const UNIVERSAL_PERSONA_TRAITS = ["ADVENTURE", "CHARISMATIC", "COMFORT", "COMPACT_FEELING", "DESIGN_LED", "DRIVING_ENGAGEMENT", "FAMILY_ORIENTED", "PLAYFUL", "PRACTICALITY", "PREMIUM_POSITIONING", "PROFESSIONAL", "TECHNOLOGY", "UNDERSTATED", "VISUALLY_DISTINCTIVE"] as const;
export type UniversalPersonaTrait = typeof UNIVERSAL_PERSONA_TRAITS[number];

const sha = z.string().regex(/^sha256:[a-f0-9]{64}$/u);
const source = z.strictObject({ sourceId: z.string().min(1), url: z.string().url(), publisher: z.string().min(1), sourceType: z.enum(["INDEPENDENT_SPECIALIST_REVIEW", "EDITORIAL_ASSESSMENT", "MANUFACTURER_POSITIONING", "ADVERTORIAL_POSITIONING", "USER_REVIEW_THEME"]), retrievedAt: z.string().date(), productIdentityMatch: z.enum(["EXACT", "COMPATIBLE_FAMILY_LIMITED", "IDENTITY_ONLY"]), assertionLocator: z.string().min(1), market: z.string().min(1), independenceClass: z.enum(["INDEPENDENT", "FIRST_PARTY_POSITIONING", "COMMERCIALLY_RELATED", "USER_AGGREGATE"]), commercialRelationship: z.string().nullable(), limitations: z.array(z.string().min(1)).min(1), exactProductIds: z.array(z.string().min(1)).min(1) });
const record = z.strictObject({ exactProductId: z.string().min(1), departmentId: z.enum(["APPLIANCES", "ELECTRONICS", "BABY_AND_CHILD"]), categoryId: z.string().min(1), brand: z.string().min(1), model: z.string().min(1), configurationIdentity: z.string().min(1), status: z.enum(["GOVERNED", "PERSONA_EVIDENCE_UNKNOWN", "CONFLICTED"]), traits: z.array(z.enum(UNIVERSAL_PERSONA_TRAITS)), claimIds: z.array(z.string()), unknownReason: z.string().nullable(), conflictIds: z.array(z.string()) });
const claim = z.strictObject({ claimId: z.string().min(1), exactProductId: z.string().min(1), trait: z.enum(UNIVERSAL_PERSONA_TRAITS), sourceIds: z.array(z.string()).min(2), evidenceStrength: z.enum(["LIMITED", "CORROBORATED", "STRONG"]), assertion: z.string().min(1), status: z.enum(["ELIGIBLE_FOR_OWNER_REVIEW", "OWNER_APPROVED", "SUPERSEDED", "INACTIVE"]), limitations: z.array(z.string()) });

export const universalPersonaPackageSchema = z.strictObject({
  schemaVersion: z.literal(UNIVERSAL_PERSONA_SCHEMA_VERSION), releaseId: z.string().min(1), generatedAt: z.string().datetime(), inventoryDigest: sha,
  vocabulary: z.array(z.strictObject({ trait: z.enum(UNIVERSAL_PERSONA_TRAITS), meaning: z.string().min(1), turkishExpressions: z.array(z.string().min(1)).min(1), aliases: z.array(z.string()) })).length(UNIVERSAL_PERSONA_TRAITS.length),
  methodology: z.strictObject({ singleSourceAuthority: z.literal(false), manufacturerRole: z.literal("POSITIONING_ONLY"), technicalFactsCanInferPersona: z.literal(false), userThemeMinimum: z.strictObject({ minimumReviews: z.number().int().min(10), minimumPlatforms: z.number().int().min(2), minimumIndependentAuthors: z.number().int().min(10), personalData: z.literal("EXCLUDED") }), foreignMarketRule: z.literal("EXACT_FAMILY_COMPATIBILITY_AND_EXPLICIT_LIMITATION_REQUIRED"), sourceCountGaming: z.literal("FORBIDDEN") }),
  scoringPolicy: z.strictObject({ status: z.literal("PROPOSED_OWNER_APPROVAL_REQUIRED"), formula: z.literal("BASE_SCORE_PLUS_CAPPED_PERSONA"), decisionUse: z.literal("BOUNDED_SOFT_RANKING_ONLY"), eligibleContributions: z.tuple([z.literal(0.25), z.literal(0.5), z.literal(0.75)]), candidateCap: z.literal(UNIVERSAL_PERSONA_SCORE_CAP), membershipEffect: z.literal("NONE"), unknownEffect: z.literal(0), conflictedEffect: z.literal(0), inactiveEffect: z.literal(0), tiePolicy: z.literal("TIES_REMAIN_TIES"), serializationOrderAuthority: z.literal(false) }),
  sources: z.array(source), claims: z.array(claim), records: z.array(record), conflicts: z.array(z.strictObject({ conflictId: z.string(), exactProductId: z.string(), trait: z.enum(UNIVERSAL_PERSONA_TRAITS), sourceIds: z.array(z.string()).min(2), disposition: z.literal("NEUTRAL_UNTIL_RESOLVED") })),
  ownerApproval: z.strictObject({ state: z.enum(["PENDING", "APPROVED", "REJECTED"]), requiredBindings: z.tuple([z.literal("VOCABULARY"), z.literal("EVIDENCE_RULES"), z.literal("EXPRESSION_MAPPINGS"), z.literal("SCORING_POLICY"), z.literal("EXACT_PRODUCT_RECORDS")]), approvalId: z.string().nullable(), approvedPayloadDigest: sha.nullable() }),
  payloadDigest: sha,
});
export type UniversalPersonaPackage = z.infer<typeof universalPersonaPackageSchema>;

export function canonicalPersonaJson(value: unknown): string { return JSON.stringify(canonical(value)); }
export function personaDigest(value: unknown): `sha256:${string}` { return `sha256:${createHash("sha256").update(canonicalPersonaJson(value)).digest("hex")}`; }
function canonical(value: unknown): unknown { return Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value; }

export function validateUniversalPersonaPackage(input: unknown, expected: readonly { exactProductId: string; departmentId: string; categoryId: string }[]): readonly string[] {
  const parsed = universalPersonaPackageSchema.safeParse(input); if (!parsed.success) return parsed.error.issues.map(issue => `SCHEMA:${issue.path.join(".")}:${issue.message}`);
  const value = parsed.data, issues: string[] = [], ids = value.records.map(row => row.exactProductId), expectedIds = expected.map(row => row.exactProductId).sort();
  if (new Set(ids).size !== ids.length) issues.push("DUPLICATE_PERSONA_RECORD");
  if (JSON.stringify([...ids].sort()) !== JSON.stringify(expectedIds)) issues.push("PERSONA_COVERAGE_INCOMPLETE");
  const recordById = new Map(value.records.map(row => [row.exactProductId, row]));
  if (expected.some(row => { const found = recordById.get(row.exactProductId); return !found || found.departmentId !== row.departmentId || found.categoryId !== row.categoryId; })) issues.push("EXACT_IDENTITY_BINDING_MISMATCH");
  if (value.records.some(row => row.status === "PERSONA_EVIDENCE_UNKNOWN" && (row.traits.length !== 0 || !row.unknownReason))) issues.push("UNKNOWN_RECORD_NOT_NEUTRAL");
  if (value.records.some(row => row.status === "GOVERNED" && row.claimIds.length === 0)) issues.push("GOVERNED_RECORD_WITHOUT_CLAIM");
  const sourceIds = new Set(value.sources.map(row => row.sourceId)); if (value.claims.some(row => row.sourceIds.some(id => !sourceIds.has(id)))) issues.push("CLAIM_SOURCE_MISSING");
  const digestable = { ...value, payloadDigest: undefined }; if (personaDigest(digestable) !== value.payloadDigest) issues.push("PAYLOAD_DIGEST_MISMATCH");
  if (value.ownerApproval.state === "APPROVED" && value.ownerApproval.approvedPayloadDigest !== value.payloadDigest) issues.push("OWNER_APPROVAL_DIGEST_MISMATCH");
  return Object.freeze(issues);
}

export function personaCatalogReadiness(input: { package: UniversalPersonaPackage; expectedExactProductIds: readonly string[] }): { status: "READY" } | { status: "CATALOG_NOT_READY"; reason: "PERSONA_COVERAGE_INCOMPLETE" | "PERSONA_OWNER_APPROVAL_REQUIRED" } {
  const actual = [...new Set(input.package.records.map(row => row.exactProductId))].sort(); const expected = [...new Set(input.expectedExactProductIds)].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) return { status: "CATALOG_NOT_READY", reason: "PERSONA_COVERAGE_INCOMPLETE" };
  if (input.package.ownerApproval.state !== "APPROVED" || input.package.ownerApproval.approvedPayloadDigest !== input.package.payloadDigest) return { status: "CATALOG_NOT_READY", reason: "PERSONA_OWNER_APPROVAL_REQUIRED" };
  return { status: "READY" };
}

export function rankWithApprovedPersona(input: { package: UniversalPersonaPackage; eligibleCandidateIds: readonly string[]; preferences: readonly XpySoftPreference[]; singleSelectionAuthorized: boolean }): XpyBoundedSoftRankingResult {
  const readiness = personaCatalogReadiness({ package: input.package, expectedExactProductIds: input.package.records.map(row => row.exactProductId) }); if (readiness.status !== "READY") throw new TypeError(readiness.reason);
  const authority: XpySoftRankingAuthorityReference = { authorityId: "xpy-universal-persona-authority", version: input.package.releaseId, digest: input.package.payloadDigest, decisionUse: "BOUNDED_SOFT_RANKING_ONLY" };
  const claims = new Map(input.package.claims.filter(row => row.status === "OWNER_APPROVED").map(row => [row.claimId, row])); const signals: XpyCandidateSoftSignal[] = [];
  for (const record of input.package.records.filter(row => input.eligibleCandidateIds.includes(row.exactProductId))) for (const preference of input.preferences) {
    const matched = record.claimIds.map(id => claims.get(id)).filter((row): row is NonNullable<typeof row> => Boolean(row && row.trait === preference.preferenceKey));
    for (const claim of matched) signals.push({ exactCandidateId: record.exactProductId, preferenceKey: preference.preferenceKey, mappingRef: `${input.package.releaseId}:trait:${claim.trait}`, evidenceRef: claim.claimId, evidenceState: "KNOWN_MATCH", contribution: claim.evidenceStrength === "STRONG" ? 0.75 : claim.evidenceStrength === "CORROBORATED" ? 0.5 : 0.25, reasonCode: `PERSONA_${claim.trait}_MATCH`, authority });
    if (record.status === "PERSONA_EVIDENCE_UNKNOWN" || record.status === "CONFLICTED") signals.push({ exactCandidateId: record.exactProductId, preferenceKey: preference.preferenceKey, mappingRef: `${input.package.releaseId}:neutral`, evidenceRef: `persona-record:${record.exactProductId}`, evidenceState: record.status === "CONFLICTED" ? "CONFLICTED" : "UNKNOWN", contribution: 0.25, reasonCode: "PERSONA_NEUTRAL_EVIDENCE", authority });
  }
  return rankWithBoundedSoftSignals({ eligibleCandidateIds: input.eligibleCandidateIds, preferences: input.preferences, signals, scoreCap: UNIVERSAL_PERSONA_SCORE_CAP, singleSelectionAuthorized: input.singleSelectionAuthorized });
}
