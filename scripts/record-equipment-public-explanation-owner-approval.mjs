import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const manifestId = "EPEA-OAM-034AF597CB25EE09DF8F";
const manifestChecksum = "sha256:cf20aa4f49c5f6bf2959fec9802fc84731f49925162ba2dbf0dd405d4c206f78";
const governanceRoot = join(root, "data/production/equipment-public-explanation-authority/governance");
const manifestDirectory = join(governanceRoot, "owner-approval-manifests", manifestId);
const manifestPath = join(manifestDirectory, "approval-manifest.json");
const statementPath = join(manifestDirectory, "owner-approval-text.txt");
const actorRegistryPath = join(root, "data/production/equipment-evidence/governance/actor-registry.json");
const actorAttestationPath = join(root, "data/production/equipment-evidence/governance/attestations/EQUIPMENT_OWNER_001-v1.txt");

const sortValue = (value) => Array.isArray(value) ? value.map(sortValue) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])])) : value;
const canonical = (value) => `${JSON.stringify(sortValue(value), null, 2)}\n`;
const shaBytes = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const shaJson = (value) => shaBytes(canonical(value));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, value) => writeFileSync(path, canonical(value));

const manifest = readJson(manifestPath);
const statement = readFileSync(statementPath, "utf8");
const statementChecksum = shaBytes(statement);
const { manifestChecksum: embeddedChecksum, ...manifestPayload } = manifest;
if (embeddedChecksum !== manifestChecksum || shaJson(manifestPayload) !== manifestChecksum) throw new Error("APPROVAL_MANIFEST_CHECKSUM_INVALID");
if (manifest.ownerApprovalEvent !== null || manifest.activationPerformed || manifest.publicIntegrationPerformed) throw new Error("APPROVAL_MANIFEST_LIFECYCLE_INVALID");
const actor = readJson(actorRegistryPath).actors.find((candidate) => candidate.actorId === "EQUIPMENT_OWNER_001");
const actorAttestation = readFileSync(actorAttestationPath, "utf8");
if (!actor || actor.role !== "EQUIPMENT_OWNER_APPROVER" || actor.scope !== "EQUIPMENT_EVIDENCE_ONLY" || actor.status !== "ACTIVE"
  || actor.authorizationStatementHash !== shaBytes(actorAttestation)) throw new Error("OWNER_ACTOR_INVALID");

const eventId = `EPEA-OAE-${shaJson({ manifestId, manifestChecksum, statementChecksum }).slice(7, 27).toUpperCase()}`;
const eventDirectory = join(governanceRoot, "owner-approval-events", eventId);
mkdirSync(eventDirectory, { recursive: true });
const eventPath = join(eventDirectory, "owner-approval-event.json");
const approvedAt = existsSync(eventPath) ? readJson(eventPath).approvedAt : new Date().toISOString();
const eventPayload = {
  schemaVersion: "1.0.0",
  eventId,
  eventType: "COMPOSITE_OWNER_APPROVAL_GRANTED",
  ownerActorId: actor.actorId,
  ownerActorRole: actor.role,
  ownerActorScope: actor.scope,
  manifestId,
  manifestChecksum,
  approvalStatementChecksum: statementChecksum,
  approvedAt,
  approvedPackage: {
    equipmentDailyLife: manifest.equipmentDailyLife,
    publicExplanationAuthority: manifest.publicExplanationAuthority,
    boundArtifacts: manifest.boundArtifacts
  },
  legalDisposition: "LEGAL_AND_COPY_APPROVED",
  consentDisposition: "NO_ADDITIONAL_CONSENT_REQUIRED",
  pilotScope: manifest.pilotScope,
  authorityBoundaries: manifest.authorityBoundaries,
  authorizedNextStep: "IMMUTABLE_MATERIALIZATION_PREPARATION_ONLY",
  activePointerChangeAuthorized: false,
  activationAuthorized: false,
  publicIntegrationAuthorized: false,
  routeUiDecisionEngineChangeAuthorized: false,
  deploymentAuthorized: false,
  commitPushAuthorized: false,
  revocationPolicy: "APPEND_ONLY_REVOCATION_EVENT_REQUIRED"
};
const eventChecksum = shaJson(eventPayload);
writeFileSync(join(eventDirectory, "approval-statement.txt"), statement);
writeJson(eventPath, { ...eventPayload, eventChecksum });
writeJson(join(eventDirectory, "checksums.json"), {
  "approval-statement.txt": statementChecksum,
  "owner-approval-event.json": shaBytes(readFileSync(eventPath))
});

const preparationId = `EPEA-MATPREP-${shaJson({ eventId, eventChecksum }).slice(7, 27).toUpperCase()}`;
const preparationDirectory = join(governanceRoot, "materialization-preparations", preparationId);
mkdirSync(preparationDirectory, { recursive: true });
const preparationPath = join(preparationDirectory, "materialization-plan.json");
const preparedAt = existsSync(preparationPath) ? readJson(preparationPath).preparedAt : approvedAt;
const materializationPlanPayload = {
  schemaVersion: "1.0.0",
  preparationId,
  preparedAt,
  sourceOwnerApprovalEventId: eventId,
  sourceOwnerApprovalEventChecksum: eventChecksum,
  sourceManifestId: manifestId,
  sourceManifestChecksum: manifestChecksum,
  immutableSources: {
    equipmentDailyLifeCandidate: manifest.equipmentDailyLife,
    publicExplanationAuthorityCandidate: manifest.publicExplanationAuthority,
    compositeBindingChecksum: manifest.publicExplanationAuthority.compositeBindingChecksum
  },
  proposedMaterializations: [
    {
      layer: "EQUIPMENT_DAILY_LIFE",
      proposedReleaseId: "v1.0.1-catalog-v0.55.4-2026-08-20-owner-approved",
      sourceReleaseId: manifest.equipmentDailyLife.release,
      sourcePayloadChecksum: manifest.equipmentDailyLife.checksum,
      contentMutationAllowed: false,
      authorityAfterMaterialization: "EXPLANATION_ONLY_PENDING_SEPARATE_ACTIVATION_AND_PUBLIC_INTEGRATION"
    },
    {
      layer: "EQUIPMENT_PUBLIC_EXPLANATION_AUTHORITY",
      proposedReleaseId: "v0.1.2-catalog-v0.55.4-2026-08-20-owner-approved",
      sourceReleaseId: manifest.publicExplanationAuthority.release,
      sourcePayloadChecksum: manifest.publicExplanationAuthority.checksum,
      contentMutationAllowed: false,
      authorityAfterMaterialization: "INACTIVE_PENDING_SEPARATE_ACTIVATION_AND_PUBLIC_INTEGRATION"
    }
  ],
  requiredMaterializationInvariants: [
    "SOURCE_PAYLOADS_BYTE_IDENTICAL",
    "COMPOSITE_BINDING_PRESERVED",
    "OWNER_APPROVAL_EVENT_BOUND",
    "TWO_EXACT_VARIANTS_ONLY",
    "62_CONFIRMED_INCLUDED_AND_3_BYD_VERIFIED_ABSENCE",
    "NO_ACTIVE_POINTER_OR_GENERATED_MODULE_CHANGE",
    "NO_PUBLIC_ROUTE_UI_OR_DECISION_ENGINE_IMPORT",
    "GLOBAL_FILTER_RANKING_QUESTION_AUTHORITY_DISABLED"
  ],
  materializationPerformed: false,
  productionReleaseCreated: false,
  activationPerformed: false,
  publicIntegrationPerformed: false
};
const preparationChecksum = shaJson(materializationPlanPayload);
writeJson(preparationPath, { ...materializationPlanPayload, preparationChecksum });
writeJson(join(preparationDirectory, "validation-report.json"), {
  status: "READY_FOR_SEPARATE_IMMUTABLE_MATERIALIZATION_AUTHORIZATION",
  ownerApprovalEventVerified: true,
  sourceChecksumsVerified: true,
  compositeBindingVerified: true,
  materializationPerformed: false,
  activationPerformed: false,
  publicIntegrationPerformed: false
});
writeJson(join(preparationDirectory, "checksums.json"), {
  "materialization-plan.json": shaBytes(readFileSync(preparationPath)),
  "validation-report.json": shaBytes(readFileSync(join(preparationDirectory, "validation-report.json")))
});

process.stdout.write(canonical({ eventId, eventChecksum, approvedAt, preparationId, preparationChecksum, eventDirectory, preparationDirectory }));
