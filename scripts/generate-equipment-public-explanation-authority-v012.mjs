import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const previousDirectory = join(root, "data/production/equipment-public-explanation-authority/release-candidates/v0.1.1-catalog-v0.55.4-2026-08-20-candidate");
const outputDirectory = join(root, "data/production/equipment-public-explanation-authority/release-candidates/v0.1.2-catalog-v0.55.4-2026-08-20-candidate");
const dailyLifeChecksum = "sha256:c2f60f9534d9695c36d9f7075cd288eb52a5050d5a43629081a30a38ac937233";
const previousAuthorityChecksum = "sha256:4811c5b12359346411efd137706935ffd2ace90bad0d1c88796f118e9bed7a4c";

const readJson = (file) => JSON.parse(readFileSync(join(previousDirectory, file), "utf8"));
const canonical = (value) => `${JSON.stringify(value, null, 2)}\n`;
const shaBytes = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const shaJson = (value) => shaBytes(canonical(value));
const writeJson = (file, value) => writeFileSync(join(outputDirectory, file), canonical(value));

mkdirSync(outputDirectory, { recursive: true });

const previousAuthority = readJson("authority.json");
const previousCoverage = readJson("coverage-report.json");
const previousCopy = readJson("approved-copy-registry.json");

const approvedCopy = {
  ...previousCopy,
  comparisonTemplates: {
    ...previousCopy.comparisonTemplates,
    VERIFIED_ABSENCE_UNKNOWN: "A’nın incelenen Türkiye [MY] resmî donanım listesinde [özellik] sunulmadığı belirtiliyor; B için yeterli doğrulama bulunmuyor. Bu karşılaştırmadan B lehine bir üstünlük sonucu çıkarılamaz.",
    BOTH_CONFIRMED: "İncelenen Türkiye model yılı donanım listelerinde [özellik] her iki versiyon için de doğrulandı. Bu tek özellik araçların genel kalite veya güvenlik düzeyini göstermez."
  }
};

const privacyPolicy = {
  schemaVersion: "1.1.0",
  authorizationUnitLifetime: "LESS_THAN_OR_EQUAL_TO_CONVERSATION_OR_OFFER_LIFETIME",
  explanationPreferenceAndDeclineScope: "CURRENT_VEHICLE_SESSION_ONLY",
  vehicleSessionBinding: ["conversationId", "exactVariantId", "offerId"],
  crossVehicleSessionReuseAllowed: false,
  crossConversationEquipmentProfileAllowed: false,
  marketingReuseAllowed: false,
  retargetingReuseAllowed: false,
  rankingOrLeadScoringAllowed: false,
  rawEquipmentQuestionsDurableProfileAllowed: false,
  acceptanceProofSeparatedFromFeatureInterestHistory: true,
  internalEvidenceIdentifiersInGeneralTelemetryAllowed: false,
  stateExpiresWithConversationOrOffer: true,
  databaseOrPersistenceChangePerformed: false
};

const telemetryPolicy = {
  schemaVersion: "1.0.0",
  policyId: "EQUIPMENT_PUBLIC_TELEMETRY_ALLOWLIST_V1",
  allowedFields: ["eventType", "outcome", "scope"],
  allowedEventTypes: ["EXPLANATION_OFFERED", "EXPLANATION_ACCEPTED", "EXPLANATION_DECLINED"],
  allowedOutcomes: ["RECORDED", "IGNORED"],
  scope: "CURRENT_VEHICLE_SESSION_ONLY",
  prohibitedFields: [
    "recommendationTermsAcceptanceEventId", "recommendationTermsVersion", "recommendationTermsAcceptedAt",
    "recommendationTermsAcceptanceSequence", "evidenceAssertionId", "evidenceLocator", "evidenceChecksum",
    "sourceChecksum", "authorizationUnitId", "rawEquipmentQuestion", "rawPreferenceOrDeclineText"
  ],
  personalIdentifiersAllowed: false,
  rawTextAllowed: false,
  genericObjectSpreadAllowed: false,
  durableProfileWriteAllowed: false,
  marketingLeadScoringRetargetingAllowed: false
};

const boundArtifactChecksums = {
  dailyLifeCandidatePayloadSha256: dailyLifeChecksum,
  approvedCopyRegistrySha256: shaJson(approvedCopy),
  privacyRetentionPolicySha256: shaJson(privacyPolicy),
  publicTelemetryAllowlistPolicySha256: shaJson(telemetryPolicy)
};
const compositeBinding = {
  schemaVersion: "1.0.0",
  bindingPolicy: "EQUIPMENT_PUBLIC_EXPLANATION_COMPOSITE_BINDING_V1",
  ...boundArtifactChecksums
};
const compositeManifestChecksum = shaJson(compositeBinding);

const authority = {
  ...previousAuthority,
  schemaVersion: "1.2.0-rc",
  releaseId: "v0.1.2-catalog-v0.55.4-2026-08-20-candidate",
  supersession: {
    supersedesCandidate: "v0.1.1-catalog-v0.55.4-2026-08-20-candidate",
    supersededCandidateChecksum: previousAuthorityChecksum,
    predecessorStatus: "SUPERSEDED_PENDING_CORRECTED_LEGAL_REVIEW",
    relationOnly: true
  },
  revealAcceptancePolicy: {
    policyVersion: "STRICT_ACCEPTANCE_BEFORE_REVEAL_V1",
    sequenceRelation: "ACCEPTANCE_STRICTLY_BEFORE_REVEAL",
    instantRelation: "ACCEPTANCE_STRICTLY_BEFORE_REVEAL",
    timestampPolicy: "STRICT_RFC3339_OFFSET_V1",
    requiredBindings: ["conversationId", "offerId"]
  },
  vehicleSessionPrivacyPolicy: "CURRENT_VEHICLE_SESSION_ONLY",
  boundArtifactChecksums,
  compositeManifestChecksum,
  legalReviewReference: "EQUIPMENT-PUBLIC-EXPLANATION-LEGAL-REREVIEW-V012-PENDING"
};

const coverage = {
  ...previousCoverage,
  releaseId: authority.releaseId,
  authorityCandidateStatus: "SUPERSEDED_SUCCESSOR_LEGAL_REREVIEW_REQUIRED"
};

const supersession = {
  supersedesCandidate: "v0.1.1-catalog-v0.55.4-2026-08-20-candidate",
  supersededCandidateChecksum: previousAuthorityChecksum,
  predecessorStatus: "SUPERSEDED_PENDING_CORRECTED_LEGAL_REVIEW",
  relationOnly: true
};

const semanticDiff = {
  schemaVersion: "1.0.0",
  predecessor: supersession.supersedesCandidate,
  successor: authority.releaseId,
  unchangedScope: { pilotExactVariantCount: 2, confirmedIncludedAssertionCount: 62, verifiedAbsenceAssertionCount: 3, verifiedAbsenceVariant: "BYD Dolphin Comfort MY2025" },
  changes: [
    "STRICT_ACCEPTANCE_SEQUENCE_BEFORE_REVEAL",
    "STRICT_ACCEPTANCE_INSTANT_BEFORE_REVEAL",
    "COMPARISON_NO_SUPERIORITY_COPY",
    "CURRENT_VEHICLE_SESSION_ONLY_BINDING",
    "PUBLIC_TELEMETRY_EXPLICIT_ALLOWLIST",
    "COMPOSITE_ARTIFACT_CHECKSUM_BINDING"
  ],
  unchangedBoundaries: ["PUBLIC_INTEGRATION_DISABLED", "GLOBAL_FILTER_RANKING_QUESTION_AUTHORITY_DISABLED", "NO_OWNER_APPROVAL", "NO_ACTIVATION"]
};

writeJson("approved-copy-registry.json", approvedCopy);
writeJson("privacy-retention-policy.json", privacyPolicy);
writeJson("public-telemetry-allowlist-policy.json", telemetryPolicy);
writeJson("composite-binding.json", compositeBinding);
writeJson("authority.json", authority);
writeJson("coverage-report.json", coverage);
writeJson("supersession-reference.json", supersession);
writeJson("semantic-contract-diff.json", semanticDiff);

const manifest = {
  schemaVersion: authority.schemaVersion,
  releaseId: authority.releaseId,
  authorityPayloadSha256: shaJson(authority),
  coverageReportSha256: shaJson(coverage),
  dailyLifeCandidateRelease: authority.compatibleEquipmentDailyLifeRelease,
  dailyLifeCandidatePayloadSha256: dailyLifeChecksum,
  approvedCopyRegistrySha256: boundArtifactChecksums.approvedCopyRegistrySha256,
  privacyRetentionPolicySha256: boundArtifactChecksums.privacyRetentionPolicySha256,
  publicTelemetryAllowlistPolicySha256: boundArtifactChecksums.publicTelemetryAllowlistPolicySha256,
  compositeManifestSha256: compositeManifestChecksum,
  authorizedPositiveSubjectCount: 62,
  authorizedNegativeSubjectCount: 3,
  affectedCorrectedAssertionCount: 7,
  pilotExactVariantCount: 2,
  validationStatus: "LEGAL_REREVIEW_REQUIRED",
  activationPerformed: false,
  publicIntegrationPerformed: false,
  ownerApprovalRequired: true,
  ownerApprovalEventId: null
};
writeJson("manifest.json", manifest);

const handoff = `# Equipment Public Explanation Authority v0.1.2 — Legal Re-review Handoff

- Predecessor: \`${supersession.supersedesCandidate}\`
- Successor: \`${authority.releaseId}\`
- Predecessor state: \`${supersession.predecessorStatus}\`
- Daily-Life payload: \`${dailyLifeChecksum}\` (byte-identical, 51 records)
- Scope: 2 exact variants; 62 confirmed included assertions; 3 verified absences, all on BYD Dolphin Comfort MY2025.

## Corrected blockers

1. REC acceptance must be strictly before reveal by sequence and strict RFC 3339 instant. Equal sequence or timestamp fails closed.
2. The two reviewed comparison templates now explicitly forbid superiority and general quality/safety inference.
3. Preference/decline state is \`CURRENT_VEHICLE_SESSION_ONLY\`, bound to \`conversationId + exactVariantId + offerId\`.
4. Public telemetry uses a three-field allowlist and excludes REC proof, evidence/provenance IDs, checksums and raw user text.
5. Daily-Life, copy, privacy and telemetry artifacts are bound by child checksums and composite checksum \`${compositeManifestChecksum}\`.

Public integration remains disabled. Global Equipment filtering, ranking, question generation and offer/card ordering remain disabled. Owner approval event count is zero. No activation or materialization has been performed.
`;
writeFileSync(join(outputDirectory, "legal-re-review-handoff.md"), handoff);

const files = ["approved-copy-registry.json", "authority.json", "composite-binding.json", "coverage-report.json", "legal-re-review-handoff.md", "manifest.json", "privacy-retention-policy.json", "public-telemetry-allowlist-policy.json", "semantic-contract-diff.json", "supersession-reference.json"];
const checksums = Object.fromEntries(files.map((file) => [file, shaBytes(readFileSync(join(outputDirectory, file)))]));
writeJson("checksums.json", checksums);

process.stdout.write(`${JSON.stringify({ releaseId: authority.releaseId, authorityChecksum: manifest.authorityPayloadSha256, compositeManifestChecksum, checksums }, null, 2)}\n`);
