import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const authorityDirectory = join(root, "data/production/equipment-public-explanation-authority/release-candidates/v0.1.2-catalog-v0.55.4-2026-08-20-candidate");
const dailyLifeDirectory = join(root, "data/production/equipment-daily-life/release-candidates/v1.0.1-catalog-v0.55.4-2026-08-20-candidate");
const actorRegistryPath = join(root, "data/production/equipment-evidence/governance/actor-registry.json");
const actorAttestationPath = join(root, "data/production/equipment-evidence/governance/attestations/EQUIPMENT_OWNER_001-v1.txt");

const EXPECTED = Object.freeze({
  catalogRelease: "v0.55.4",
  catalogFingerprint: "sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9",
  equipmentRelease: "v1.5.5-catalog-v0.55.4-2026-08-20",
  equipmentChecksum: "sha256:0135bbfee468fa955d3d00d3129e0e7e01dae7bf9a980488450d8319ddc98d2e",
  dailyLifeRelease: "v1.0.1-catalog-v0.55.4-2026-08-20-candidate",
  dailyLifeChecksum: "sha256:c2f60f9534d9695c36d9f7075cd288eb52a5050d5a43629081a30a38ac937233",
  authorityRelease: "v0.1.2-catalog-v0.55.4-2026-08-20-candidate",
  authorityChecksum: "sha256:c22d1b1dc6357e6e1cea229e1262f23929f13872e3a59e4ec2002d994aa124cd",
  compositeChecksum: "sha256:59a65a589f1d04507c86ee68a3f573bfd28f8bfee8cce673f9547cfb37916222",
  approvedCopyChecksum: "sha256:f1f5bc7acaf64f1c416d567d484115bd0600c33b6a98f7063ab8047d8ba93357",
  privacyChecksum: "sha256:58f0bfcca9d2df5275402f1bbe2b2ca320a0bccb1a87804dc708356b29b2ee2d",
  telemetryChecksum: "sha256:44c2b01de571afcb83749bcbcf315fe2e3e1b3b1ef47b2b0bb51c0ff3c7ef2c7"
});

const sortValue = (value) => Array.isArray(value) ? value.map(sortValue) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])])) : value;
const canonical = (value) => `${JSON.stringify(sortValue(value), null, 2)}\n`;
const shaBytes = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const shaJson = (value) => shaBytes(canonical(value));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const fileSha = (path) => shaBytes(readFileSync(path));

const authority = readJson(join(authorityDirectory, "authority.json"));
const authorityManifest = readJson(join(authorityDirectory, "manifest.json"));
const copy = readJson(join(authorityDirectory, "approved-copy-registry.json"));
const telemetry = readJson(join(authorityDirectory, "public-telemetry-allowlist-policy.json"));
const composite = readJson(join(authorityDirectory, "composite-binding.json"));
const coverage = readJson(join(authorityDirectory, "coverage-report.json"));
const dailyLife = readJson(join(dailyLifeDirectory, "equipment-daily-life.json"));
const actors = readJson(actorRegistryPath).actors;
const actor = actors.find((candidate) => candidate.actorId === "EQUIPMENT_OWNER_001");
const actorAttestation = readFileSync(actorAttestationPath, "utf8");

const checks = {
  authority: fileSha(join(authorityDirectory, "authority.json")),
  composite: fileSha(join(authorityDirectory, "composite-binding.json")),
  copy: fileSha(join(authorityDirectory, "approved-copy-registry.json")),
  privacy: fileSha(join(authorityDirectory, "privacy-retention-policy.json")),
  telemetry: fileSha(join(authorityDirectory, "public-telemetry-allowlist-policy.json")),
  dailyLife: fileSha(join(dailyLifeDirectory, "equipment-daily-life.json"))
};
if (checks.authority !== EXPECTED.authorityChecksum || checks.composite !== EXPECTED.compositeChecksum || checks.copy !== EXPECTED.approvedCopyChecksum
  || checks.privacy !== EXPECTED.privacyChecksum || checks.telemetry !== EXPECTED.telemetryChecksum || checks.dailyLife !== EXPECTED.dailyLifeChecksum) throw new Error("OWNER_PACKAGE_CHECKSUM_MISMATCH");
if (authorityManifest.compositeManifestSha256 !== checks.composite || authority.compositeManifestChecksum !== checks.composite
  || authority.compatibleEquipmentDailyLifeChecksum !== checks.dailyLife
  || composite.dailyLifeCandidatePayloadSha256 !== checks.dailyLife || composite.approvedCopyRegistrySha256 !== checks.copy
  || composite.privacyRetentionPolicySha256 !== checks.privacy || composite.publicTelemetryAllowlistPolicySha256 !== checks.telemetry) throw new Error("COMPOSITE_BINDING_INVALID");
if (!actor || actor.role !== "EQUIPMENT_OWNER_APPROVER" || actor.scope !== "EQUIPMENT_EVIDENCE_ONLY" || actor.status !== "ACTIVE"
  || actor.authorizationStatementHash !== shaBytes(actorAttestation)) throw new Error("OWNER_ACTOR_REGISTRY_INVALID");
if (coverage.pilotExactVariantCount !== 2 || coverage.authorizedPositiveSubjectCount !== 62 || coverage.authorizedNegativeSubjectCount !== 3
  || coverage.byExactVariant["6cb56615-37ef-51a8-9202-a73e59d4e14b"].verifiedNegativeCount !== 3
  || coverage.byExactVariant["90e65f94-6fdb-5eea-ad7e-0b4e18435427"].verifiedNegativeCount !== 0) throw new Error("OWNER_PACKAGE_SCOPE_INVALID");
if (dailyLife.entries.length !== 51 || authority.authorizedPositiveAssertionIds.length !== 62 || authority.authorizedNegativeAssertionIds.length !== 3) throw new Error("OWNER_PACKAGE_SUBJECT_INVENTORY_INVALID");

const identity = {
  authorityRelease: EXPECTED.authorityRelease,
  authorityChecksum: EXPECTED.authorityChecksum,
  compositeChecksum: EXPECTED.compositeChecksum,
  dailyLifeRelease: EXPECTED.dailyLifeRelease,
  dailyLifeChecksum: EXPECTED.dailyLifeChecksum
};
const manifestId = `EPEA-OAM-${shaJson(identity).slice(7, 27).toUpperCase()}`;
const outputDirectory = join(root, "data/production/equipment-public-explanation-authority/governance/owner-approval-manifests", manifestId);
mkdirSync(outputDirectory, { recursive: true });
const existingManifestPath = join(outputDirectory, "approval-manifest.json");
const preparedAt = existsSync(existingManifestPath) ? readJson(existingManifestPath).preparedAt : new Date().toISOString();

const subjectInventory = {
  schemaVersion: "1.0.0",
  inventoryId: `${manifestId}-SUBJECTS`,
  exactVariants: [
    { exactVariantId: "6cb56615-37ef-51a8-9202-a73e59d4e14b", label: "BYD Dolphin Comfort MY2025", confirmedIncludedCount: 30, verifiedAbsenceCount: 3 },
    { exactVariantId: "90e65f94-6fdb-5eea-ad7e-0b4e18435427", label: "Nissan Qashqai Platinum Premium e-POWER MY2026", confirmedIncludedCount: 32, verifiedAbsenceCount: 0 }
  ],
  controlledDailyLifeEntries: dailyLife.entries.map((entry) => ({ featureCode: entry.featureCode, entryChecksum: shaJson(entry) })),
  authorizedPositiveAssertionIds: authority.authorizedPositiveAssertionIds,
  authorizedNegativeAssertionIds: authority.authorizedNegativeAssertionIds,
  excludedPublicClaimCounts: { optional: 0, packageDependent: 0, unknownOrSilentAbsence: 0, associationOnly: 0, legacyUnresolved: 0 }
};
const subjectInventoryChecksum = shaJson(subjectInventory);

const manifestPayload = {
  schemaVersion: "1.0.0",
  manifestId,
  manifestVersion: "1.0.0",
  canonicalSerializationVersion: "CANONICAL_JSON_SORTED_KEYS_V1",
  preparedAt,
  ownerActorId: actor.actorId,
  ownerActorRegistryBinding: { role: actor.role, scope: actor.scope, status: actor.status, authorityVersion: actor.authorityVersion, authorizationStatementHash: actor.authorizationStatementHash },
  catalog: { release: EXPECTED.catalogRelease, fingerprint: EXPECTED.catalogFingerprint },
  equipmentEvidence: { release: EXPECTED.equipmentRelease, checksum: EXPECTED.equipmentChecksum, globalDecisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED" },
  equipmentDailyLife: { release: EXPECTED.dailyLifeRelease, checksum: EXPECTED.dailyLifeChecksum, featureCount: 51, decisionUse: "EXPLANATION_ONLY" },
  publicExplanationAuthority: { release: EXPECTED.authorityRelease, checksum: EXPECTED.authorityChecksum, compositeBindingChecksum: EXPECTED.compositeChecksum },
  boundArtifacts: { approvedCopyChecksum: EXPECTED.approvedCopyChecksum, privacyPolicyChecksum: EXPECTED.privacyChecksum, telemetryPolicyChecksum: EXPECTED.telemetryChecksum, subjectInventoryChecksum },
  legalReview: { disposition: "LEGAL_AND_COPY_APPROVED", consentDisposition: "NO_ADDITIONAL_CONSENT_REQUIRED", reference: "OWNER_PROVIDED_FINAL_LEGAL_DISPOSITION_2026-08-20", checksumBoundOnly: true, artifactChangeRequiresNewLegalReview: true },
  pilotScope: {
    exactVariantIds: authority.pilotExactVariantAllowlist,
    confirmedIncludedCount: 62,
    verifiedAbsenceCount: 3,
    verifiedAbsenceExactVariantIds: ["6cb56615-37ef-51a8-9202-a73e59d4e14b"],
    otherExactVariantCount: 0,
    authorityTypes: authority.authorityTypes
  },
  recAndConsentBoundary: {
    recommendationTermsVersion: "REC-2026.08-v1.1",
    acceptanceSequenceRelation: "STRICTLY_LESS_THAN_REVEAL_SEQUENCE",
    acceptanceInstantRelation: "STRICTLY_BEFORE_REVEAL_INSTANT",
    acceptanceBinding: ["conversationId", "offerId"],
    booleanAcceptanceAloneSufficient: false,
    additionalCheckboxRequired: false,
    kvkkExplicitConsentCreated: false,
    marketingOrCommercialCommunicationPermissionCreated: false
  },
  vehicleSessionAndTelemetryBoundary: {
    preferenceScope: "CURRENT_VEHICLE_SESSION_ONLY",
    preferenceBinding: ["conversationId", "exactVariantId", "offerId"],
    stateOutlivesConversationOrOffer: false,
    publicTelemetryAllowlist: telemetry.allowedFields,
    durableEquipmentProfileAllowed: false,
    marketingRetargetingLeadScoringOrRankingAllowed: false
  },
  authorityBoundaries: {
    publicIntegrationPerformed: false,
    activationPerformed: false,
    globalFilteringAllowed: false,
    globalRankingAllowed: false,
    equipmentQuestionGenerationAllowed: false,
    candidateOrOfferOrderingImpact: "NONE",
    verifiedAbsenceUse: "DIRECT_QUESTION_EXACT_NEGATIVE_EVIDENCE_ONLY",
    unknownAssociationLegacyBehavior: "NO_CLAIM",
    comparisonQualitySafetyOrSuperiorityScoreAllowed: false,
    llmFreeCompletionOutsideControlledCopyAllowed: false
  },
  sourceCopy: {
    postRevealOffer: copy.postRevealOfferTemplate,
    positiveTemplate: copy.positiveTemplate,
    verifiedAbsenceTemplate: copy.verifiedAbsenceDirectQuestionTemplate,
    sessionNotice: copy.sessionSourceNotice,
    verifiedAbsenceUnknownComparison: copy.comparisonTemplates.VERIFIED_ABSENCE_UNKNOWN,
    bothConfirmedComparison: copy.comparisonTemplates.BOTH_CONFIRMED
  },
  historicalCandidatesExcludedFromApproval: ["v0.1.0-catalog-v0.55.4-2026-08-20-candidate", "v0.1.1-catalog-v0.55.4-2026-08-20-candidate"],
  supersessionRelationPreserved: "SUPERSEDED_PENDING_CORRECTED_LEGAL_REVIEW",
  activationPerformed: false,
  publicIntegrationPerformed: false,
  ownerApprovalEvent: null,
  nextAuthorizedStep: "OWNER_APPROVAL_EVENT_AND_IMMUTABLE_MATERIALIZATION_PREPARATION_ONLY"
};
const manifestChecksum = shaJson(manifestPayload);
const approvalManifest = { ...manifestPayload, manifestChecksum };

const ownerReview = `# Equipment Public Explanation Pilot — Composite-bound Owner Review

## Package

- Manifest: \`${manifestId}\`
- Manifest checksum: \`${manifestChecksum}\`
- Daily-Life: \`${EXPECTED.dailyLifeRelease}\` / \`${EXPECTED.dailyLifeChecksum}\`
- Authority: \`${EXPECTED.authorityRelease}\` / \`${EXPECTED.authorityChecksum}\`
- Composite binding: \`${EXPECTED.compositeChecksum}\`
- Legal: **LEGAL_AND_COPY_APPROVED**
- Consent: **NO_ADDITIONAL_CONSENT_REQUIRED**

## Scope and boundaries

This package covers only BYD Dolphin Comfort MY2025 and Nissan Qashqai Platinum Premium e-POWER MY2026: 62 confirmed included assertions and three verified absences, all three on BYD. Verified absence is direct-question-only and requires exact negative evidence. Unknown, silent absence, association-only and legacy unresolved records remain no-claim.

This approval is not activation or public integration. It grants no global filtering, ranking, question-generation, candidate ordering or offer ordering authority. Comparisons cannot produce quality, safety or superiority scores. An LLM cannot add facts outside the checksum-bound controlled copy.

REC-2026.08-v1.1 acceptance must be strictly before reveal by sequence and instant and must bind to conversationId + offerId; a boolean alone is insufficient. “Evet/anlat” is only a CURRENT_VEHICLE_SESSION_ONLY preference bound to conversationId + exactVariantId + offerId. No additional checkbox, KVKK explicit consent, marketing permission or cross-conversation profile is created.

Public telemetry is limited to eventType, outcome and scope. REC proof, assertion/authorization identifiers, locators, checksums and raw user text are excluded.

## Controlled copy

- Post-reveal: “${copy.postRevealOfferTemplate}”
- Positive: “${copy.positiveTemplate}”
- Verified absence: “${copy.verifiedAbsenceDirectQuestionTemplate}”
- Session notice: “${copy.sessionSourceNotice}”
- Absence/unknown comparison: “${copy.comparisonTemplates.VERIFIED_ABSENCE_UNKNOWN}”
- Both-confirmed comparison: “${copy.comparisonTemplates.BOTH_CONFIRMED}”

The 51 Daily-Life records are not duplicated here; they are bound by \`${EXPECTED.dailyLifeChecksum}\` and subject inventory \`${subjectInventoryChecksum}\`.
`;

const approvalText = `Expiya Cars ürün sahibi ve ${actor.actorId} olarak ${manifestId} kimlikli ve
${manifestChecksum} checksum’lı composite-bound Equipment Public Explanation Pilot owner approval manifestini onaylıyorum.

Onay kapsamım; ${EXPECTED.dailyLifeRelease} / ${EXPECTED.dailyLifeChecksum} Equipment Daily-Life candidate’ını, ${EXPECTED.authorityRelease} / ${EXPECTED.authorityChecksum} Public Explanation Authority candidate’ını ve ${EXPECTED.compositeChecksum} composite binding’ini ayrılmaz paket olarak kapsar.

Onay yalnız BYD Dolphin Comfort MY2025 (6cb56615-37ef-51a8-9202-a73e59d4e14b) ve Nissan Qashqai Platinum Premium e-POWER MY2026 (90e65f94-6fdb-5eea-ad7e-0b4e18435427) exact varyantlarını; 62 confirmed included assertion ile yalnız BYD’ye ait 3 verified absence assertion’ı kapsar. Verified absence yalnız doğrudan kullanıcı sorusu ve exact negatif evidence halinde kullanılabilir; unknown, silent absence, association-only ve legacy unresolved kayıtlar no-claim kalır.

REC-2026.08-v1.1 kabulünün reveal’dan sequence ve gerçek instant bakımından kesinlikle önce olmasını, acceptance event’in conversationId ve offerId’ye bağlı olmasını ve yalnız boolean kabulün yetersiz olmasını onaylıyorum. “Evet/anlat” yanıtı yalnız conversationId + exactVariantId + offerId üçlüsüne bağlı CURRENT_VEHICLE_SESSION_ONLY tercihidir; başka araç, offer veya conversation’a taşınamaz.

Public/general telemetry’nin yalnız eventType, outcome ve scope alanlarını taşımasını; REC acceptance proof, assertion/authorization kimlikleri, locator, checksum ve ham kullanıcı metninin telemetry’ye taşınmamasını kabul ediyorum.

Bu onay owner approval eventinin ve immutable materialization hazırlığının yapılmasına izin verir. Active pointer değişikliğini, aktivasyonu, public route/UI/Decision Engine entegrasyonunu, deployment’ı, commit veya push’u onaylamaz. Global Equipment filtering, ranking, question generation, candidate/offer ordering authority’si açılmaz.
`;

writeFileSync(join(outputDirectory, "subject-inventory.json"), canonical(subjectInventory));
writeFileSync(existingManifestPath, canonical(approvalManifest));
writeFileSync(join(outputDirectory, "owner-review.md"), ownerReview);
writeFileSync(join(outputDirectory, "owner-approval-text.txt"), approvalText);
const validationReport = {
  status: "READY_FOR_EXPLICIT_OWNER_APPROVAL",
  checksumsVerified: true,
  compositeBindingVerified: true,
  ownerActorRegistryVerified: true,
  subjectScopeVerified: true,
  historicalCandidatesExcluded: true,
  ownerApprovalEventCount: 0,
  materializationPerformed: false,
  activationPerformed: false,
  publicIntegrationPerformed: false
};
writeFileSync(join(outputDirectory, "validation-report.json"), canonical(validationReport));
const files = ["approval-manifest.json", "owner-approval-text.txt", "owner-review.md", "subject-inventory.json", "validation-report.json"];
const checksums = Object.fromEntries(files.map((file) => [file, fileSha(join(outputDirectory, file))]));
writeFileSync(join(outputDirectory, "checksums.json"), canonical(checksums));

process.stdout.write(canonical({ manifestId, manifestChecksum, outputDirectory, preparedAt, checksums }));
