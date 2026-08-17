import type { CatalogModelLookupResult } from "./lookup";

export interface CatalogLookupMentionAuthorization {
  readonly catalogFingerprint: string;
  readonly mentionableCandidateIds: readonly string[];
  readonly mentionableFamilyIds: readonly string[];
  readonly disambiguationFamilyIds: readonly string[];
  readonly canonicalNames: readonly string[];
  readonly revealableCandidateIds: readonly [];
  readonly offerAuthorization: null;
}

export function authorizeMentionsFromCatalogLookup(result: CatalogModelLookupResult): CatalogLookupMentionAuthorization {
  if (result.kind === "EXACT_VARIANT") return { catalogFingerprint: result.catalogFingerprint, mentionableCandidateIds: [result.variantId], mentionableFamilyIds: [result.familyId], disambiguationFamilyIds: [], canonicalNames: [`${result.canonicalBrand} ${result.canonicalModel} ${result.canonicalTrim}`], revealableCandidateIds: [], offerAuthorization: null };
  if (result.kind === "EXACT_MODEL_FAMILY") return { catalogFingerprint: result.catalogFingerprint, mentionableCandidateIds: result.variantIds, mentionableFamilyIds: [result.familyId], disambiguationFamilyIds: [], canonicalNames: [`${result.canonicalBrand} ${result.canonicalModel}`], revealableCandidateIds: [], offerAuthorization: null };
  if (result.kind === "AMBIGUOUS") return { catalogFingerprint: result.catalogFingerprint, mentionableCandidateIds: [], mentionableFamilyIds: [], disambiguationFamilyIds: result.familyIds, canonicalNames: result.canonicalOptions, revealableCandidateIds: [], offerAuthorization: null };
  return { catalogFingerprint: result.catalogFingerprint, mentionableCandidateIds: [], mentionableFamilyIds: [], disambiguationFamilyIds: [], canonicalNames: result.kind === "BRAND" ? [result.canonicalBrand] : [], revealableCandidateIds: [], offerAuthorization: null };
}
