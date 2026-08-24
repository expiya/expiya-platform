import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const evidencePath = path.join(root, "data/production/personas/evidence/release-candidates/v3.9.0-catalog-v0.55.4-2026-08-24/persona-evidence.json");
const ownerPath = path.join(root, "data/production/personas/evidence/owner-reviewed/release-candidates/v3.9.0-catalog-v0.55.4-2026-08-24-evidence-sufficient-only/owner-reviewed-candidate.json");
const discoveryPath = path.join(root, "data/production/personas/evidence/research-discovery/regional-150-2026-08-24/discovery-input.json");
const outDir = path.join(root, "data/production/personas/evidence/research-completion/release-candidates/v3.9.0-deferred-150-2026-08-24");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const owner = JSON.parse(readFileSync(ownerPath, "utf8"));
const discovery = JSON.parse(readFileSync(discoveryPath, "utf8"));
const deferred = owner.families.filter((family) => family.deferredTraits.length > 0);
const evidenceByFamily = new Map(evidence.families.map((family) => [family.familyId, family]));
const discoveryByFamily = new Map(discovery.families.map((family) => [family.familyId, family]));

const sourceCandidates = (row) => [row?.source, row?.source2, row?.source3, ...(row?.sources ?? [])].filter(Boolean);
const payload = {
  schemaVersion: "3.9.0-research-completion.1",
  releaseVersion: "v3.9.0-deferred-150-2026-08-24-rc.1",
  generatedAt: "2026-08-24T00:00:00.000Z",
  compatiblePersonaEvidenceChecksum: evidence.payloadSha256 ?? owner.compatiblePersonaEvidenceChecksum,
  compatibleCatalogRelease: owner.compatibleCatalogRelease,
  purpose: "DEFERRED_FAMILY_RESEARCH_COMPLETION_AND_OWNER_REVIEW_INPUT",
  authority: "OWNER_REVIEW_INPUT_ONLY",
  activationPerformed: false,
  rankingMutationAllowed: false,
  technicalAuthority: false,
  researchPolicy: {
    existingEvidenceRequired: true,
    minimumExistingIndependentSourcesPerClaim: 2,
    regionalDiscoveryIsAuthority: false,
    exactFamilyGenerationMarketReviewRequiredBeforeRegionalPromotion: true,
    mismatchedDiscoveryNeverBackfillsTrait: true
  },
  families: deferred.map((decisionFamily) => {
    const family = evidenceByFamily.get(decisionFamily.familyId);
    const discovered = discoveryByFamily.get(decisionFamily.familyId);
    if (!family) throw new Error(`Missing evidence family ${decisionFamily.familyId}`);
    const claims = decisionFamily.deferredClaimIds.map((claimId) => {
      const claim = family.claims.find((item) => item.claimId === claimId);
      if (!claim) throw new Error(`Missing claim ${claimId}`);
      const sources = claim.sourceIds.map((sourceId) => family.sources.find((source) => source.sourceId === sourceId));
      if (sources.some((source) => !source)) throw new Error(`Missing source for ${claimId}`);
      if (sources.length < 2) throw new Error(`Insufficient independent evidence for ${claimId}`);
      return {
        claimId,
        trait: claim.trait,
        neutralSummary: claim.neutralSummary,
        supportedSpanOrTimestamp: claim.supportedSpanOrTimestamp,
        exactVariantIds: claim.exactVariantIds,
        sourceIds: claim.sourceIds,
        sourceCount: new Set(sources.map((source) => source.publisher)).size,
        derivationPolicy: claim.derivationPolicy,
        conflictStatus: claim.conflictStatus,
        researchStatus: "RESEARCH_COMPLETE_OWNER_DECISION_PENDING"
      };
    });
    return {
      familyId: family.familyId,
      canonicalBrand: family.canonicalBrand,
      canonicalModel: family.canonicalModel,
      exactVariantIds: family.exactVariantIds,
      contaminationChecks: family.contaminationChecks,
      sources: family.sources,
      claims,
      regionalDiscoveryCandidates: sourceCandidates(discovered).map((source) => ({
        url: source.url,
        publisher: source.publisher,
        title: source.title,
        publicationDate: source.publicationDate ?? source.publicationDateRaw ?? null,
        market: source.market ?? null,
        status: "DISCOVERED_NOT_PROMOTED",
        authority: "NONE_UNTIL_EXACT_REVIEW"
      })),
      familyResearchStatus: "RESEARCH_COMPLETE_OWNER_DECISION_PENDING",
      ownerReviewRequired: true,
      rankingMutationAllowed: false
    };
  })
};

const serialized = `${JSON.stringify(payload, null, 2)}\n`;
const checksum = `sha256:${createHash("sha256").update(serialized).digest("hex")}`;
const claimCount = payload.families.reduce((count, family) => count + family.claims.length, 0);
const manifest = {
  releaseVersion: payload.releaseVersion,
  payloadSha256: checksum,
  familyCount: payload.families.length,
  claimCount,
  variantCount: new Set(payload.families.flatMap((family) => family.exactVariantIds)).size,
  researchCompleteFamilyCount: payload.families.filter((family) => family.familyResearchStatus === "RESEARCH_COMPLETE_OWNER_DECISION_PENDING").length,
  researchCompleteClaimCount: payload.families.flatMap((family) => family.claims).filter((claim) => claim.researchStatus === "RESEARCH_COMPLETE_OWNER_DECISION_PENDING").length,
  emptyTraitCount: payload.families.flatMap((family) => family.claims).filter((claim) => !claim.neutralSummary || !claim.supportedSpanOrTimestamp || claim.sourceIds.length < 2).length,
  ownerReviewRequired: true,
  activationPerformed: false,
  rankingMutationAllowed: false
};

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "research-completion.json"), serialized);
writeFileSync(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
