import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => readFileSync(path.join(root, relative), "utf8");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const write = (directory, name, value) => writeFileSync(path.join(directory, name), typeof value === "string" ? value : json(value));

const ownerReleaseId = "v3.9.0-catalog-v0.55.4-2026-08-24-owner-approved-rc.1";
const ownerRoot = `data/production/personas/evidence/owner-approved/release-candidates/${ownerReleaseId}`;
const ownerRaw = read(`${ownerRoot}/owner-approved-candidate.json`);
const ownerCandidate = JSON.parse(ownerRaw);
const ownerManifest = JSON.parse(read(`${ownerRoot}/manifest.json`));
if (ownerManifest.payloadSha256 !== sha(ownerRaw)) throw new Error("OWNER_APPROVED_CANDIDATE_CHECKSUM_MISMATCH");
if (ownerCandidate.approvalStatus !== "OWNER_APPROVED_NOT_ACTIVE") throw new Error("OWNER_APPROVED_CANDIDATE_STATE_INVALID");
if (ownerCandidate.approvedClaims.length !== 595 || ownerCandidate.rejectedClaims.length !== 5) throw new Error("OWNER_DISPOSITION_INVALID");

const activePointerRaw = read("data/production/personas/safe-traits/active.json");
const activeModuleRaw = read("data/production/personas/safe-traits/activeVehiclePersonaSafeTraits.generated.ts");
const activePointer = JSON.parse(activePointerRaw);
const vocabulary = ["DESIGN","DRIVING_ENGAGEMENT","COMFORT","PRACTICALITY","TECHNOLOGY","PRESTIGE","VALUE","ADVENTURE","FAMILY","URBAN","COMMERCIAL","SUSTAINABILITY","MINIMALISM"];
const vocabularyOrder = new Map(vocabulary.map((trait, index) => [trait, index]));
const approvedByFamily = new Map();
for (const claim of ownerCandidate.approvedClaims) {
  const traits = approvedByFamily.get(claim.familyId) ?? [];
  traits.push(claim.trait);
  approvedByFamily.set(claim.familyId, traits);
}
const orderTraits = (traits) => [...new Set(traits)].sort((a, b) => vocabularyOrder.get(a) - vocabularyOrder.get(b));

const releaseVersion = "v1.1.0-persona-evidence-v3.9-catalog-v0.55.4-2026-08-24";
const approval = {
  authority: "PRODUCT_OWNER",
  reference: ownerCandidate.ownerApproval.eventId,
  approvedSourceRelease: ownerReleaseId,
  approvedProposedSafeTraitsChecksum: ownerManifest.payloadSha256,
  approvedAt: ownerCandidate.ownerApproval.approvedAt,
  sanitizationPolicyVersion: "persona-sanitization-v3.9",
  scope: "SANITIZED_PROJECTION_ONLY",
};
const families = ownerCandidate.families.map((family) => {
  const traits = orderTraits(approvedByFamily.get(family.familyId) ?? []);
  return {
    familyId: family.familyId,
    canonicalBrand: family.canonicalBrand,
    canonicalModel: family.canonicalModel,
    sourceSeriesGroup: family.canonicalModel,
    traits,
    traitDerivations: traits.map((trait) => ({ trait, reasonCode: "OWNER_REVIEWED_EDITORIAL_CHARACTER" })),
    matchAuthority: "DETERMINISTIC_CATALOG_MATCH",
    matchStatus: "MATCHED",
    reviewStatus: "OWNER_APPROVED",
    ownerDecision: traits.length ? "APPROVE" : "KEEP_EMPTY",
    sourceReference: { personaDatasetVersion: "persona-evidence-v3.9", brand: family.canonicalBrand, seriesGroup: family.canonicalModel },
  };
});
const familyById = new Map(families.map((family) => [family.familyId, family]));
const variants = ownerCandidate.families.flatMap((family) => family.exactVariantIds.map((exactVariantId) => ({
  exactVariantId,
  familyId: family.familyId,
  traits: familyById.get(family.familyId).traits,
  authority: "OWNER_EDITORIAL",
  decisionUse: "SOFT_PREFERENCE_ONLY",
}))).sort((a, b) => a.exactVariantId.localeCompare(b.exactVariantId));
const payload = {
  schemaVersion: "1.1.0",
  releaseVersion,
  compatibleCatalogRelease: "v0.55.4",
  compatibleCatalogFingerprint: activePointer.compatibleCatalogFingerprint,
  sourcePersonaDatasetVersion: "persona-evidence-v3.9-owner-approved",
  sourcePersonaSchemaVersion: ownerCandidate.schemaVersion,
  authority: "OWNER_EDITORIAL",
  decisionUse: "SOFT_PREFERENCE_ONLY",
  traitVocabulary: vocabulary,
  families,
  variants,
  generatedAt: ownerCandidate.ownerApproval.approvedAt,
  approval,
};
const payloadRaw = json(payload);
const payloadChecksum = sha(payloadRaw);
const distribution = Object.fromEntries(vocabulary.map((trait) => [trait, families.filter((family) => family.traits.includes(trait)).length]));
const safeCandidateRoot = path.join(root, "data/production/personas/safe-traits/release-candidates", releaseVersion);
mkdirSync(safeCandidateRoot, { recursive: true });
write(safeCandidateRoot, "vehicle-persona-safe-traits.json", payloadRaw);
write(safeCandidateRoot, "manifest.json", {
  releaseVersion,
  schemaVersion: "1.1.0",
  authority: "OWNER_EDITORIAL",
  decisionUse: "SOFT_PREFERENCE_ONLY",
  compatibleCatalogRelease: "v0.55.4",
  compatibleCatalogFingerprint: activePointer.compatibleCatalogFingerprint,
  sourcePersonaDatasetVersion: payload.sourcePersonaDatasetVersion,
  sourceSafeDraftRelease: ownerReleaseId,
  sanitizationPolicyVersion: approval.sanitizationPolicyVersion,
  ownerApprovalReference: approval.reference,
  approvedNonEmptyFamilyCount: families.filter((family) => family.traits.length > 0).length,
  keepEmptyFamilyCount: families.filter((family) => family.traits.length === 0).length,
  approval,
  familyCount: families.length,
  variantCount: variants.length,
  matchCounts: { MATCHED: families.length, AMBIGUOUS: 0, UNMATCHED: 0 },
  emptyTraitFamilyCount: families.filter((family) => family.traits.length === 0).length,
  emptyTraitVariantCount: variants.filter((variant) => variant.traits.length === 0).length,
  reviewCounts: { PROGRAMMATIC_DRAFT: 0, OWNER_REVIEW_REQUIRED: 0, OWNER_APPROVED: families.length },
  traitDistribution: distribution,
  payloadSha256: payloadChecksum,
  validationStatus: "VALIDATED",
  declaredLimitations: ["BOUNDED_SOFT_RANKING_ONLY", "NO_HARD_FILTER_AUTHORITY", "NO_TECHNICAL_OR_EQUIPMENT_AUTHORITY", "FIVE_OWNER_REJECTED_CLAIMS_EXCLUDED"],
});

const packageId = "PERSONA-V39-ACTIVATION-PREP-2026-08-24-01";
const packageRoot = path.join(root, "data/production/personas/evidence/activation-preparations", packageId);
mkdirSync(packageRoot, { recursive: true });
const proposedPointer = { state: "ACTIVE", activeReleaseVersion: releaseVersion, compatibleCatalogRelease: "v0.55.4", compatibleCatalogFingerprint: activePointer.compatibleCatalogFingerprint, payloadSha256: payloadChecksum, schemaVersion: "1.1.0" };
const proposedModule = `// Generated by scripts/sync-active-vehicle-persona-safe-traits.ts. Do not edit manually.\nexport { default as activeVehiclePersonaSafeTraitRelease } from "./releases/${releaseVersion}/vehicle-persona-safe-traits.json";\nexport { default as activeVehiclePersonaSafeTraitManifest } from "./releases/${releaseVersion}/manifest.json";\nexport const activeVehiclePersonaSafeTraitReleaseVersion = "${releaseVersion}";\n`;
write(packageRoot, "proposed-active-pointer.json", proposedPointer);
write(packageRoot, "proposed-activeVehiclePersonaSafeTraits.generated.ts.txt", proposedModule);
write(packageRoot, "rollback-plan.json", { rollbackReleaseVersion: activePointer.activeReleaseVersion, currentActivePointerSha256: sha(activePointerRaw), currentActiveModuleSha256: sha(activeModuleRaw), activationMustBeAtomic: true, rollbackOnPostValidationFailure: true });
write(packageRoot, "activation-request.json", {
  schemaVersion: "persona-v3.9-activation-request.1",
  packageId,
  status: "AWAITING_EXPLICIT_OWNER_ACTIVATION_AUTHORIZATION",
  ownerApprovalEventId: approval.reference,
  sourceOwnerApprovedRelease: ownerReleaseId,
  targetSafeTraitsRelease: releaseVersion,
  targetPayloadSha256: payloadChecksum,
  scope: "LOCAL_ACTIVE_PERSONA_SAFE_TRAITS_POINTER_AND_GENERATED_MODULE_ONLY",
  rankingPolicy: { formula: "BASE_SCORE_PLUS_CAPPED_PERSONA", personaScoreCap: 0.75, use: "BOUNDED_SOFT_RANKING_ONLY" },
  invariants: { hardFilterEffect: "ZERO", candidateCountEffect: "ZERO", affordabilityEffect: "ZERO", offerGovernanceEffect: "ZERO", technicalFactAuthority: "NONE", equipmentAuthority: "NONE" },
  activationAuthorized: false,
  activationPerformed: false,
  productionDatabaseWrite: false,
  deployment: false,
  commit: false,
  push: false,
});
const packageFiles = ["activation-request.json", "proposed-active-pointer.json", "proposed-activeVehiclePersonaSafeTraits.generated.ts.txt", "rollback-plan.json"];
write(packageRoot, "manifest.json", { packageId, targetSafeTraitsRelease: releaseVersion, targetPayloadSha256: payloadChecksum, sourceOwnerApprovedPayloadSha256: ownerManifest.payloadSha256, files: Object.fromEntries(packageFiles.map((file) => [file, sha(readFileSync(path.join(packageRoot, file)))])), familyCount: families.length, variantCount: variants.length, approvedClaimCount: ownerCandidate.approvedClaims.length, rejectedClaimCount: ownerCandidate.rejectedClaims.length, currentActiveRelease: activePointer.activeReleaseVersion, activePointerChanged: false, generatedModuleChanged: false, activationPerformed: false });
console.log(json({ packageId, releaseVersion, payloadChecksum, familyCount: families.length, variantCount: variants.length, activePointerChanged: false, activationPerformed: false }));
