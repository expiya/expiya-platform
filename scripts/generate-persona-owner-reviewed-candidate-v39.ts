import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { personaOwnerReviewedCandidateChecksum, personaOwnerReviewedCandidateSchema } from "@/features/vehicle-data/personaOwnerReviewedCandidate";
import { VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY } from "@/types/vehiclePersonaSafeTraits";

const ROOT = process.cwd();
const PERSONA_ROOT = path.join(ROOT, "data/production/personas/evidence/release-candidates/v3.9.0-catalog-v0.55.4-2026-08-24");
const REGIONAL_ROOT = path.join(ROOT, "data/production/personas/evidence/regional-corroboration/release-candidates");
const OUTPUT = path.join(ROOT, "data/production/personas/evidence/owner-reviewed/release-candidates/v3.9.0-catalog-v0.55.4-2026-08-24-evidence-sufficient-only");
const stable = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

interface Claim { claimId: string; trait: (typeof VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY)[number]; derivationPolicy: string; sourceIds: string[] }
interface Family { familyId: string; canonicalBrand: string; canonicalModel: string; exactVariantIds: string[]; claims: Claim[] }

async function main(): Promise<void> {
  const persona = JSON.parse(await readFile(path.join(PERSONA_ROOT, "persona-evidence.json"), "utf8")) as { releaseVersion: string; compatibleCatalogRelease: string; compatibleCatalogFingerprint: string; families: Family[] };
  const manifest = JSON.parse(await readFile(path.join(PERSONA_ROOT, "coverage-manifest.json"), "utf8")) as { payloadSha256: string };
  const corroborated = new Set<string>();
  for (const wave of ["02", "03", "04"]) {
    const release = JSON.parse(await readFile(path.join(REGIONAL_ROOT, `v1.0.0-wave-${wave}-2026-08-24/regional-corroboration.json`), "utf8")) as { families: Array<{ claims: Array<{ personaClaimId: string; status: string }> }> };
    for (const family of release.families) for (const claim of family.claims) if (claim.status === "CORROBORATES") corroborated.add(claim.personaClaimId);
  }
  const canonicalOrder = new Map(VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY.map((value, index) => [value, index]));
  const approved = (claim: Claim): boolean => claim.derivationPolicy.startsWith("EXACT_CATALOG_") || corroborated.has(claim.claimId);
  const claims = persona.families.flatMap((family) => family.claims.map((claim) => ({
    claimId: claim.claimId,
    familyId: family.familyId,
    trait: claim.trait,
    derivationPolicy: claim.derivationPolicy,
    decision: approved(claim) ? "APPROVE" as const : "DEFER_RESEARCH" as const,
    decisionBasis: claim.derivationPolicy.startsWith("EXACT_CATALOG_") ? "EXACT_CATALOG_ARCHITECTURE" as const : corroborated.has(claim.claimId) ? "REGIONAL_PROFESSIONAL_CORROBORATION" as const : "REGIONAL_CORROBORATION_REQUIRED" as const,
    sourceIds: claim.sourceIds,
  })));
  const families = persona.families.map((family) => {
    const approvedClaims = family.claims.filter(approved);
    const deferredClaims = family.claims.filter((claim) => !approved(claim));
    const traits = (items: Claim[]) => [...new Set(items.map((claim) => claim.trait))].sort((a, b) => canonicalOrder.get(a)! - canonicalOrder.get(b)!);
    return {
      familyId: family.familyId,
      canonicalBrand: family.canonicalBrand,
      canonicalModel: family.canonicalModel,
      exactVariantIds: family.exactVariantIds,
      decision: approvedClaims.length === 0 ? "DEFER_RESEARCH" as const : deferredClaims.length === 0 ? "APPROVE_TRAITS" as const : "APPROVE_PARTIAL_TRAITS" as const,
      approvedTraits: traits(approvedClaims),
      deferredTraits: traits(deferredClaims),
      approvedClaimIds: approvedClaims.map((claim) => claim.claimId),
      deferredClaimIds: deferredClaims.map((claim) => claim.claimId),
    };
  });
  const familyById = new Map(families.map((family) => [family.familyId, family]));
  const candidate = personaOwnerReviewedCandidateSchema.parse({
    schemaVersion: "3.9.0-owner-review.1",
    releaseVersion: "v3.9.0-catalog-v0.55.4-2026-08-24-owner-reviewed-rc.1",
    compatiblePersonaEvidenceChecksum: manifest.payloadSha256,
    compatibleCatalogRelease: persona.compatibleCatalogRelease,
    compatibleCatalogFingerprint: persona.compatibleCatalogFingerprint,
    authority: "PRODUCT_OWNER",
    decisionScope: "EVIDENCE_SUFFICIENT_ONLY",
    scorePolicy: { formula: "BASE_SCORE_PLUS_CAPPED_PERSONA", personaScoreCap: 0.75, decisionUse: "BOUNDED_SOFT_RANKING_ONLY" },
    ownerApproval: { reference: "owner-evidence-sufficient-only-2026-08-24", approvedAt: "2026-08-24T22:00:00.000Z", researchRequiredDisposition: "DEFER_RESEARCH" },
    activationPerformed: false,
    families,
    claims,
    variants: persona.families.flatMap((family) => family.exactVariantIds.map((exactVariantId) => ({ exactVariantId, familyId: family.familyId, approvedTraits: familyById.get(family.familyId)!.approvedTraits }))),
  });
  const raw = stable(candidate);
  const summary = {
    releaseVersion: candidate.releaseVersion,
    payloadSha256: personaOwnerReviewedCandidateChecksum(raw),
    familyCount: candidate.families.length,
    approvedFamilyCount: candidate.families.filter((family) => family.decision === "APPROVE_TRAITS").length,
    partiallyApprovedFamilyCount: candidate.families.filter((family) => family.decision === "APPROVE_PARTIAL_TRAITS").length,
    deferredFamilyCount: candidate.families.filter((family) => family.decision === "DEFER_RESEARCH").length,
    approvedClaimCount: candidate.claims.filter((claim) => claim.decision === "APPROVE").length,
    deferredClaimCount: candidate.claims.filter((claim) => claim.decision === "DEFER_RESEARCH").length,
    variantCount: candidate.variants.length,
    scorePolicy: candidate.scorePolicy,
    activationPerformed: false,
  };
  await mkdir(OUTPUT, { recursive: true });
  await Promise.all([
    writeFile(path.join(OUTPUT, "owner-reviewed-candidate.json"), raw),
    writeFile(path.join(OUTPUT, "manifest.json"), stable(summary)),
  ]);
  console.log(JSON.stringify(summary));
}

void main();
