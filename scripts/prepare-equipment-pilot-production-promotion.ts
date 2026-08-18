import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { EQUIPMENT_FEATURE_CODES, type EquipmentEvidenceAssertion, type EquipmentReviewEvent, type EquipmentTrimVariantLink } from "../types/equipmentEvidence";
import { canonicalJson, fingerprint, selectTerminalSecondReviewed } from "../features/vehicle-data/equipmentVerificationMaterialization";

async function main() {
const root = process.cwd();
const batch = path.join(root, "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-BATCH-001");
const r1 = path.join(batch, "corrections/EE-PILOT-002-CYCLE-001-R1");
const r2 = path.join(batch, "corrections/EE-PILOT-002-CYCLE-001-R2");
const out = path.join(root, "outputs/equipment-evidence-pilot-promotion-ee-pilot-002-batch-001");
const generatedAt = "2026-08-18T20:45:00.000Z";
const catalogFingerprint = "sha256:fd5609adcc0ca3fec0f8c9dc4dd1c903ed5514326bd322eacd4decff5a044f0f";
const read = async <T>(file: string) => JSON.parse(await readFile(file, "utf8")) as T;
const shaFile = async (file: string) => `sha256:${createHash("sha256").update(await readFile(file)).digest("hex")}`;

await mkdir(out, { recursive: true });
const assertions = [
  ...await read<EquipmentEvidenceAssertion[]>(path.join(batch, "assertions.json")),
  ...await read<EquipmentEvidenceAssertion[]>(path.join(r1, "assertions.json")),
  ...await read<EquipmentEvidenceAssertion[]>(path.join(r2, "assertions.json")),
];
const trimLinks = [
  ...await read<EquipmentTrimVariantLink[]>(path.join(batch, "trim-links.json")),
  ...await read<EquipmentTrimVariantLink[]>(path.join(r1, "trim-links.json")),
  ...await read<EquipmentTrimVariantLink[]>(path.join(r2, "trim-links.json")),
];
const reviewEvents = [
  ...await read<EquipmentReviewEvent[]>(path.join(batch, "second-review-events.json")),
  ...await read<EquipmentReviewEvent[]>(path.join(r1, "second-review/second-review-events.json")),
  ...await read<EquipmentReviewEvent[]>(path.join(r2, "second-review/second-review-events.json")),
];
const selected = selectTerminalSecondReviewed({ assertions, trimLinks, reviewEvents });
const original = await read<EquipmentEvidenceAssertion[]>(path.join(batch, "assertions.json"));
const r1Assertions = await read<EquipmentEvidenceAssertion[]>(path.join(r1, "assertions.json"));
const historicalConflictAssertionIds = [...original.filter((item) => item.exactVariantId === "1a3cc01d-3bfa-56f3-817f-4cc77e723ef8"), ...r1Assertions]
  .map((item) => item.assertionId).sort();
const historicalConflictTrimLinkIds = [trimLinks[0].linkId, trimLinks.find((item) => item.supersedesTrimLinkId === trimLinks[0].linkId)?.linkId].filter(Boolean).sort();
const catalog = await read<{ records: Array<{ variant: { id: string } }> }>(path.join(root, "data/production/catalog/releases/v0.55.2/catalog.json"));
const activePointerPath = path.join(root, "data/production/equipment-evidence/active.json");
const activePointerHash = await shaFile(activePointerPath);

const candidates = {
  schemaVersion: "1.0.0", status: "OWNER_APPROVAL_REQUIRED", pilotId: "EE-PILOT-002", batchId: "EE-PILOT-002-BATCH-001",
  catalogRelease: "v0.55.2", catalogFingerprint, generatedAt,
  assertions: selected.assertions.map((item) => ({ assertionId: item.assertionId, exactVariantId: item.exactVariantId, featureCode: item.featureCode,
    availabilityStatus: item.availabilityStatus, verificationState: item.verificationState,
    passedSecondReviewEventId: selected.passed.get(`ASSERTION:${item.assertionId}`)?.reviewEventId,
    inputFingerprint: fingerprint(item) })),
  trimLinks: selected.trimLinks.map((item) => ({ trimLinkId: item.linkId, exactVariantId: item.exactVariantId, canonicalTrimId: item.canonicalTrimId,
    verificationState: item.verificationState, passedSecondReviewEventId: selected.passed.get(`TRIM_LINK:${item.linkId}`)?.reviewEventId,
    inputFingerprint: fingerprint(item) })),
};
const countsByFeature = new Map(EQUIPMENT_FEATURE_CODES.map((code) => [code, 0]));
for (const item of selected.assertions) countsByFeature.set(item.featureCode, (countsByFeature.get(item.featureCode) ?? 0) + 1);
const coverage = {
  schemaVersion: "1.0.0", catalogVariantCount: catalog.records.length, reviewedCandidateVariantCount: 2,
  reviewedCandidateUncoveredVariantCount: catalog.records.length - 2, authoritativeCoveredVariantCount: 0,
  authoritativeUncoveredVariantCount: catalog.records.length, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED",
  features: EQUIPMENT_FEATURE_CODES.map((featureCode) => ({ featureCode, reviewedCandidateExactVariantCount: countsByFeature.get(featureCode),
    authoritativeExactVariantCount: 0, authoritativeModelFamilyCount: 0, coverageRatio: 0, positiveStandardCount: 0,
    optionalCount: 0, packageDependentCount: 0, notAvailableCount: 0, unknownUncoveredCount: catalog.records.length,
    conflictCount: 0 })),
};
const ownerStatus = {
  status: "OWNER_APPROVAL_REQUIRED", verifiedEquipmentOwnerActorAvailable: false, verifiedOwnerActorIds: [],
  reasonCode: "OWNER_GOVERNANCE_ACTOR_UNAVAILABLE", evidence: "No Equipment owner actor registry or verified actor instance contract exists in the repository.",
  ownerApprovalEventCount: 0, note: "Persona PRODUCT_OWNER provenance is not an Equipment operational actor identity.",
};
const historical = { historicalConflictAssertionCount: historicalConflictAssertionIds.length, historicalConflictAssertionIds,
  historicalConflictTrimLinkCount: historicalConflictTrimLinkIds.length, historicalConflictTrimLinkIds,
  originalBatchHash: await shaFile(path.join(batch, "assertions.json")), r1Hash: await shaFile(path.join(r1, "assertions.json")),
  r2Hash: await shaFile(path.join(r2, "assertions.json")) };
const dryRun = { status: "BLOCKED_OWNER_APPROVAL_REQUIRED", releaseCreated: false,
  proposedReleaseId: "v1.3.0-pilot-verified-catalog-v0.55.2-2026-08-18", activePointerChanged: false,
  activePointerBeforeSha256: activePointerHash, activePointerAfterSha256: activePointerHash,
  catalogCompatible: catalog.records.length === 566, terminalAssertionCandidateCount: selected.assertions.length,
  terminalTrimLinkCandidateCount: selected.trimLinks.length, ownerApprovalValid: false, materializationCount: 0,
  publicFilteringEnabled: false, publicRankingEnabled: false, automaticQuestionGenerationEnabled: false,
  publicEquipmentClaimsEnabled: false, shadowDiagnosticsEnabled: false, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED",
  rollback: { activeEquipmentReleaseUnchanged: "v1.2.2-catalog-v0.55.2-2026-08-18" } };
const contract = { schemaVersion: "1.0.0", policyVersion: "1.0.0", stages: ["RESEARCH_ASSERTION", "PROVISIONAL_ASSERTION", "INDEPENDENTLY_REVIEWED_ASSERTION", "OWNER_APPROVED_ASSERTION", "VERIFICATION_MATERIALIZATION", "PRODUCTION_PROJECTION", "ACTIVE_RELEASE_POINTER"],
  appendOnly: true, provisionalMutationForbidden: true, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED",
  requiredOwnerRole: "EQUIPMENT_OWNER_APPROVER", ownerActorRegistryRequired: true,
  releaseStateAfterSuccessfulApproval: "PILOT_VERIFIED_DATA" };

const files: Record<string, unknown> = {
  "promotion-contract.json": contract, "terminal-reviewed-candidates.json": candidates, "owner-approval-status.json": ownerStatus,
  "owner-approval-events.json": [], "verification-materializations.json": [], "verified-trim-link-materializations.json": [],
  "coverage-report.json": coverage, "historical-audit-integrity.json": historical, "activation-dry-run.json": dryRun,
  "release-plan.json": { proposedReleaseId: dryRun.proposedReleaseId, releaseCreated: false, payloadSha256: null,
    blocker: "OWNER_GOVERNANCE_ACTOR_UNAVAILABLE", expectedAfterApproval: { assertionCount: 47, trimLinkCount: 2, variantCoverageCount: 2, state: "PILOT_VERIFIED_DATA" } },
};
for (const [name, value] of Object.entries(files)) await writeFile(path.join(out, name), canonicalJson(value));
const checksums = Object.fromEntries(await Promise.all(Object.keys(files).sort().map(async (name) => [name, await shaFile(path.join(out, name))])));
await writeFile(path.join(out, "checksums.json"), canonicalJson(checksums));
await writeFile(path.join(out, "promotion-report.md"), `# Equipment pilot promotion gate\n\n- Result: **OWNER_APPROVAL_REQUIRED**\n- Terminal reviewed assertions: **${selected.assertions.length}** (23 Elettrica + 24 Ibrida R2)\n- Terminal reviewed trim links: **${selected.trimLinks.length}**\n- Historical conflicts preserved: **${historicalConflictAssertionIds.length} assertions + ${historicalConflictTrimLinkIds.length} trim links**\n- Owner approval events: **0**\n- Verification materializations: **0**\n- Production release: **not created**\n- Active pointer: **unchanged**\n- Decision authority: **SHADOW_AND_EXPLANATION_DISABLED**\n\nRepository does not contain a verified Equipment owner actor registry. No identity was fabricated.\n`);
console.log(JSON.stringify({ output: path.relative(root, out), terminalAssertions: selected.assertions.length, terminalTrimLinks: selected.trimLinks.length,
  historicalAssertions: historicalConflictAssertionIds.length, historicalTrimLinks: historicalConflictTrimLinkIds.length, status: ownerStatus.status }, null, 2));
}

void main();
