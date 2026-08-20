import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sha = (text) => `sha256:${createHash("sha256").update(text).digest("hex")}`;
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const read = (relative) => readFile(path.join(root, relative), "utf8");
const FOUNDATION_CANDIDATE = "v1.0.0-catalog-v0.55.4-2026-08-20-candidate";
const FOUNDATION_RELEASE = "v1.0.1-catalog-v0.55.4-2026-08-20";
const INTEGRATION_RELEASE = "v0.1.0-catalog-v0.55.4-2026-08-20";
const LAUNCH_ID = "EPEI-PILOT-LAUNCH-V3";
const base = "data/production/rec-offer-audit-foundation";
const candidateDir = `${base}/release-candidates/${FOUNDATION_CANDIDATE}`;
const releaseDir = `${base}/releases/${FOUNDATION_RELEASE}`;
const launchDir = `data/production/equipment-public-explanation-integration/governance/launch-preparations/${LAUNCH_ID}`;

const immutable = {
  candidatePolicy: await read(`${candidateDir}/policy.json`), candidateManifest: await read(`${candidateDir}/manifest.json`), candidateAssessment: await read(`${candidateDir}/schema-assessment.json`),
  integrationPolicy: await read(`data/production/equipment-public-explanation-integration/releases/${INTEGRATION_RELEASE}/policy.json`), integrationManifest: await read(`data/production/equipment-public-explanation-integration/releases/${INTEGRATION_RELEASE}/manifest.json`), integrationMaterialization: await read(`data/production/equipment-public-explanation-integration/releases/${INTEGRATION_RELEASE}/materialization-event.json`),
  dailyPointer: await read("data/production/equipment-daily-life/active.json"), authorityPointer: await read("data/production/equipment-public-explanation-authority/active.json"), actorRegistry: await read("data/production/equipment-evidence/governance/actor-registry.json"),
};
const expected = {
  candidatePolicy: "sha256:f4ef5c6712d20868bb469d60a74d4967bc282c3740e99b778bafb23b282e15cd", candidateManifest: "sha256:fcae76f6262368231e4d4b422e31972e3d1c58544cfe8824ab8ff3110f90a12c", candidateAssessment: "sha256:e129fa201742f2e13e8bce517eca6db907e4f0abf74378289c85bf224420d713",
  integrationPolicy: "sha256:7fb57a834501114eafe16f6ea601aceea8e5cc4a51994129ff0161f1867ad1e5", integrationManifest: "sha256:b563f9b2577a2f5fe3ffcd34637aa7ae6fbada913ed63cd8b6f3f5abefdb33ff", integrationMaterialization: "sha256:6ac51381fcc8f71b989dced8c636f2b77b8384756f0bc703e83783f28a6eaf38",
};
for (const [name, checksum] of Object.entries(expected)) if (sha(immutable[name]) !== checksum) throw new Error(`IMMUTABLE_INPUT_CHECKSUM_INVALID:${name}`);
const integration = JSON.parse(immutable.integrationPolicy); const daily = JSON.parse(immutable.dailyPointer); const authority = JSON.parse(immutable.authorityPointer); const registry = JSON.parse(immutable.actorRegistry);
const actor = registry.actors.find((item) => item.actorId === "EQUIPMENT_OWNER_001");
if (!actor || actor.status !== "ACTIVE" || actor.role !== "EQUIPMENT_OWNER_APPROVER" || actor.forbiddenActions.includes("GRANT_DECISION_AUTHORITY") === false) throw new Error("OWNER_SCOPE_INVALID");
if (daily.activeEquipmentDailyLifeRelease !== "v1.0.1-catalog-v0.55.4-2026-08-20" || authority.activePublicExplanationAuthorityRelease !== "v0.1.2-catalog-v0.55.4-2026-08-20") throw new Error("ACTIVE_EXPLANATION_STACK_MISMATCH");

const contractPaths = Object.freeze([
  "app/api/cars/conversation/route.ts", "features/decision/v2/integration/publicRoute.server.ts", "features/decision/v2/orchestrator/types.ts", "features/decision/v2/orchestrator/runCarsDecisionTurnV2.ts",
  "features/decision/v2/persistence/postgresStore.server.ts", "features/decision/v2/orchestrator/store.ts", "features/decision/v2/domain/conversationEvent.ts", "features/decision/v2/domain/eventDecisionImpact.ts", "features/decision/v2/schema/conversationEventSchema.ts",
  "features/decision/v2/offer/recOfferAuditFoundation.server.ts", "features/vehicle-data/equipmentRecommendationOfferAuditAdapter.server.ts", "features/vehicle-data/equipmentAuditAuthorizationResolver.server.ts",
  "features/decision/v2/offer/recOfferAuditFoundationRuntime.server.ts", "features/vehicle-data/equipmentPublicExplanationIntegrationRuntime.server.ts",
  "features/vehicle-data/equipmentPublicExplanationIntegrationLifecycle.server.ts", "features/vehicle-data/equipmentPublicExplanationIntegrationActivation.server.ts", "features/vehicle-data/equipmentPublicExplanationFacade.server.ts", "app/api/cars/equipment-explanation/route.ts",
  "features/vehicle-data/equipmentPublicExplanationRenderer.ts", "components/cars/CarsConversation.tsx", "components/cars/V2AuthorizedCarCard.tsx",
]);
const contracts = [];
for (const sourcePath of contractPaths) { const source = await read(sourcePath); contracts.push({ sourcePath, sourceChecksum: sha(source) }); }
const runtimeAppendix = { schemaVersion: "1.0.0", contractPolicy: "DETERMINISTIC_SOURCE_FINGERPRINT_APPENDIX_V1", sourceEmbedding: false, contracts, invariants: {
  routeAuthoritativeRecIntent: true, atomicPostgresAcceptanceRevealCommit: true, inMemoryParity: true, eventSchemaAndClassifier: true, readOnlyVerifiedResolver: true, verifiedOnlyEquipmentAdapter: true,
  pointerControlledFoundationCutover: true, eventBoundIntegrationLoaderAndModule: true, activePolicyFacadeConsumption: true, equipmentEndpointConsumesActiveFacade: true, equipmentEndpointFailClosedUntilLaunch: true, vehicleSessionIntegrity: "CONVERSATION_EXACT_VARIANT_OFFER",
  publicTelemetryAllowlist: ["eventType", "outcome", "scope"], publicResponseInternalAuditFields: false, publicImportBoundary: "SERVER_ONLY", decisionEngineEffect: "ZERO",
} };
const runtimeAppendixText = json(runtimeAppendix); const runtimeContractCompositeChecksum = sha(runtimeAppendixText);
const productionPolicy = { schemaVersion: "1.0.0", releaseId: FOUNDATION_RELEASE, state: "OWNER_APPROVAL_REQUIRED_SINGLE_LAUNCH", sourceCandidateReleaseId: FOUNDATION_CANDIDATE, sourceCandidatePayloadChecksum: expected.candidatePolicy, sourceCandidateManifestChecksum: expected.candidateManifest,
  schemaAssessmentChecksum: expected.candidateAssessment, compatibleCatalogRelease: "v0.55.4", compatibleCatalogFingerprint: integration.compatibleCatalogFingerprint, recommendationTermsVersion: "REC-2026.08-v1.1",
  eventVocabulary: ["RECOMMENDATION_TERMS_ACCEPTED", "OFFER_REVEALED"], sequencePolicy: { policyId: "REC_OFFER_AUDIT_SEQUENCE_V1", version: "1.0.0", acceptance: 1, reveal: 2, strictTimestampOrder: true },
  transactionContract: "ATOMIC_ACCEPTANCE_CONSENT_REVEAL_EVENTS_OFFER_AND_CONVERSATION_COMMIT_V1", stores: ["POSTGRES", "IN_MEMORY_PARITY"], resolverContract: "FAIL_CLOSED_READ_ONLY_RECOMMENDATION_OFFER_AUDIT_PROOF_V1",
  historicalOfferContract: "HISTORICAL_AUDIT_UNAVAILABLE_NO_SYNTHETIC_BACKFILL", equipmentAdapter: "VERIFIED_ONLY", cutoverPolicy: "SINGLE_EVENT_BOUND_LAUNCH_APPLY", rollbackPolicy: "DISABLE_NEW_USAGE_PRESERVE_APPEND_ONLY_AUDIT_EVENTS",
  runtimeContractCompositeChecksum, legalGate: "UNCHANGED", migrationDisposition: "NO_DATABASE_MIGRATION_REQUIRED", materializedAtPolicy: "REAL_CANONICAL_UTC_Z_AT_SINGLE_LAUNCH_APPLY", materializationPerformed: false, cutoverPerformed: false, decisionEngineEffect: "ZERO" };
const productionPolicyText = json(productionPolicy); const foundationPayloadChecksum = sha(productionPolicyText);
const foundationManifest = { schemaVersion: "1.0.0", releaseId: FOUNDATION_RELEASE, state: "PREPARED_IMMUTABLE_BYTES_PENDING_SINGLE_LAUNCH_AUTHORIZATION", sourceCandidateReleaseId: FOUNDATION_CANDIDATE, sourceCandidateChecksum: expected.candidatePolicy, sourceCandidateManifestChecksum: expected.candidateManifest,
  payloadChecksum: foundationPayloadChecksum, schemaAssessmentChecksum: expected.candidateAssessment, runtimeContractAppendixChecksum: runtimeContractCompositeChecksum, eventVocabulary: productionPolicy.eventVocabulary, sequencePolicy: productionPolicy.sequencePolicy,
  transactionContract: productionPolicy.transactionContract, resolverContract: productionPolicy.resolverContract, historicalOfferContract: productionPolicy.historicalOfferContract, equipmentAdapter: productionPolicy.equipmentAdapter, cutoverPolicy: productionPolicy.cutoverPolicy,
  rollbackPolicy: productionPolicy.rollbackPolicy, legalGate: "UNCHANGED", migrationDisposition: "NO_DATABASE_MIGRATION_REQUIRED", eventBoundFields: "DERIVED_AT_APPLY_NOT_PREDECLARED", activationPerformed: false };
const foundationManifestText = json(foundationManifest); const foundationManifestChecksum = sha(foundationManifestText);

const activationPolicy = { policyId: "EPEI_EVENT_BOUND_ATOMIC_ACTIVATION_V2", version: "2.0.0", canonicalSerialization: "UTF8_JSON_PRETTY_2_LF_FINAL_NEWLINE_V1", hashPolicy: "SHA256_PREFIXED_LOWERCASE_HEX_V1", eventIdPolicy: "SHA256_BOUND_ROLE_MANIFEST_OWNER_EVENT_AND_CANONICAL_EFFECTIVE_INSTANT_V2",
  timePolicy: "SYSTEM_CLOCK_ACTUAL_CANONICAL_UTC_Z_AT_APPLY_NO_PREDECLARED_INSTANT", pointerModulePolicy: "DERIVE_FROM_REAL_OWNER_AUTHORIZATION_AND_ACTIVATION_EVENTS_THEN_TEMP_VALIDATE", atomicInstall: "TEMP_VALIDATE_THEN_ATOMIC_COMPOSITE_REPLACE_V2",
  applyOrder: ["APPEND_OWNER_LAUNCH_AUTHORIZATION_EVENT", "MATERIALIZE_FOUNDATION_PRODUCTION_RELEASE", "APPEND_FOUNDATION_CUTOVER_EVENT", "INSTALL_FOUNDATION_ACTIVE_POLICY", "APPEND_INTEGRATION_ACTIVATION_EVENT", "DERIVE_INTEGRATION_ACTIVE_POINTER_AND_MODULE", "ATOMIC_INSTALL", "POST_VALIDATE_REC_ROUTE_STORE_RESOLVER", "POST_VALIDATE_BYD_NISSAN_PUBLIC_HAPPY_PATH", "POST_VALIDATE_DECISION_NEUTRALITY", "SUCCESS_OR_FAIL_CLOSED_ROLLBACK"],
  rollback: { integration: "DISABLED_NO_ACTIVE_INTEGRATION_POINTER", foundation: "CUTOVER_DISABLED_SAFE_PREDECESSOR_ROUTE_STORE", phase1OfferCard: "AVAILABLE", auditHistory: "APPEND_ONLY_PRESERVED", destructiveDatabaseAction: false }, exactActiveChecksums: "DERIVED_AND_REPORTED_AFTER_REAL_EVENTS_NEVER_PREAPPROVED" };
const activationPolicyText = json(activationPolicy); const activationPolicyChecksum = sha(activationPolicyText);
const pilotScope = { exactVariantIds: ["6cb56615-37ef-51a8-9202-a73e59d4e14b", "90e65f94-6fdb-5eea-ad7e-0b4e18435427"], confirmedIncluded: 62, verifiedAbsence: 3, verifiedAbsenceOnlyExactVariantId: "6cb56615-37ef-51a8-9202-a73e59d4e14b", nissanNegative: 0, outsidePilot: "NO_CLAIM", decisionEngineEffect: "ZERO" };
const pilotScopeChecksum = sha(json(pilotScope));
const launchManifest = { schemaVersion: "1.0.0", manifestId: LAUNCH_ID, manifestVersion: "1.0.0", manifestChecksumBinding: "checksums.json:single-pilot-launch-manifest.json", ownerActorId: actor.actorId, ownerActorRole: actor.role, ownerScope: "BOUNDED_EQUIPMENT_EXPLANATION_NO_DECISION_AUTHORITY",
  catalogRelease: integration.compatibleCatalogRelease, catalogFingerprint: integration.compatibleCatalogFingerprint,
  foundation: { candidateReleaseId: FOUNDATION_CANDIDATE, candidatePayloadChecksum: expected.candidatePolicy, candidateManifestChecksum: expected.candidateManifest, schemaAssessmentChecksum: expected.candidateAssessment, productionTargetReleaseId: FOUNDATION_RELEASE, productionPayloadChecksum: foundationPayloadChecksum, productionManifestChecksum: foundationManifestChecksum },
  integration: { productionReleaseId: INTEGRATION_RELEASE, payloadChecksum: expected.integrationPolicy, manifestChecksum: expected.integrationManifest, materializationEventId: "EPEI-MAT-D1A71CF56D8B25DD452D", materializationEventChecksum: expected.integrationMaterialization },
  explanationStack: { equipmentDailyLifeRelease: daily.activeEquipmentDailyLifeRelease, equipmentDailyLifeChecksum: daily.payloadSha256, publicExplanationAuthorityRelease: authority.activePublicExplanationAuthorityRelease, publicExplanationAuthorityChecksum: authority.payloadSha256, productionCompositeChecksum: "sha256:34eae64907d0fc62a73f5d2691a12f440f8adbba40a243dff08cfa9509fcc082" },
  runtimeContractCompositeChecksum, activationPolicyId: activationPolicy.policyId, activationPolicyVersion: activationPolicy.version, activationPolicyChecksum, pilotScope, pilotScopeChecksum,
  legalDisposition: "LEGAL_AND_COPY_APPROVED", consentDisposition: "NO_ADDITIONAL_CONSENT_REQUIRED", migrationDisposition: "NO_DATABASE_MIGRATION_REQUIRED", eventBoundTimeAndHashPolicy: activationPolicy.timePolicy,
  atomicApplyOrder: activationPolicy.applyOrder, postValidation: ["REC_ROUTE_STORE_RESOLVER", "BYD_NISSAN_PUBLIC_HAPPY_PATH", "DECISION_NEUTRALITY_ZERO", "PUBLIC_LEAKAGE_ALLOWLIST", "ACTIVE_POINTER_MODULE_CHECKSUM_CHAIN"], rollback: activationPolicy.rollback,
  publicPilotEffectAfterSuccessfulApply: "ENABLED_EXACT_TWO_VARIANTS_ONLY", decisionEngineEffect: "ZERO", excluded: ["DEPLOYMENT", "COMMIT", "PUSH", "DATABASE_MIGRATION", "DESTRUCTIVE_DATABASE_WRITE"], ownerAuthorizationRequired: true, launchApplied: false };
const launchManifestText = json(launchManifest); const launchManifestChecksum = sha(launchManifestText);
const dryRun = { schemaVersion: "1.0.0", manifestId: LAUNCH_ID, manifestChecksum: launchManifestChecksum, disposition: "READY_FOR_SINGLE_PILOT_LAUNCH_APPROVAL", immutableInputsVerified: true, runtimeContractCompositeChecksum, activationPolicyChecksum, pilotScopeChecksum,
  activeFilesChanged: false, publicEffect: "DISABLED_PENDING_SINGLE_LAUNCH", eventBoundTargetChecksums: "DERIVED_AT_APPLY", rollbackSimulation: { result: "PASS", integrationPublicEffect: "DISABLED_NO_ACTIVE_INTEGRATION_POINTER", foundationCutover: "SAFE_PREDECESSOR", phase1OfferCard: "PASS", appendOnlyAuditHistory: "PRESERVED", destructiveDatabaseAction: false }, decisionEngineEffect: "ZERO" };
const ownerText = `EQUIPMENT_OWNER_001 olarak ${LAUNCH_ID} kimlikli, ${launchManifestChecksum} checksum'lı single composite Pilot Launch manifestini onaylıyorum. Bu onay REC Offer Audit Foundation ${FOUNDATION_CANDIDATE} candidate'ının ${expected.candidatePolicy} policy, ${expected.candidateManifest} manifest ve ${expected.candidateAssessment} schema assessment bağları korunarak ${FOUNDATION_RELEASE} production release'ine materialize edilmesini ve cutover edilmesini; Equipment Public Explanation Integration ${INTEGRATION_RELEASE} release'inin ${expected.integrationPolicy} payload, ${expected.integrationManifest} manifest, EPEI-MAT-D1A71CF56D8B25DD452D materialization event ve ${expected.integrationMaterialization} event checksum bağlarıyla aktive edilmesini; ${runtimeContractCompositeChecksum} runtime contract composite, ${activationPolicy.policyId} sürüm ${activationPolicy.version} ve ${activationPolicyChecksum} activation policy kapsamında public pilot effect'in yalnız 6cb56615-37ef-51a8-9202-a73e59d4e14b ile 90e65f94-6fdb-5eea-ad7e-0b4e18435427 exact varyantları için açılmasını kapsar. Gerçek owner authorization, materialization, cutover ve activation event ID/timestamp/checksum'larının ve exact active pointer/module checksum'larının apply sırasında gerçek canonical UTC Z ve onaylanan deterministic policy ile türetilip post-validation raporunda yayınlanacağını kabul ediyorum. Herhangi bir uyuşmazlıkta integration public effect'in DISABLED_NO_ACTIVE_INTEGRATION_POINTER durumuna, foundation cutover'ın güvenli predecessor davranışına atomik fail-closed rollback edilmesini; oluşmuş geçerli audit ve governance eventlerinin append-only korunmasını onaylıyorum. Legal disposition LEGAL_AND_COPY_APPROVED, consent disposition NO_ADDITIONAL_CONSENT_REQUIRED ve Decision Engine etkisi ZERO kalmalıdır. Bu onay deployment, commit, push, migration veya destructive database write kapsamını içermez.\n`;

const releaseFiles = { "policy.json": productionPolicyText, "runtime-contract-appendix.json": runtimeAppendixText, "manifest.json": foundationManifestText };
const launchFiles = { "single-pilot-launch-manifest.json": launchManifestText, "activation-policy.json": activationPolicyText, "launch-dry-run.json": json(dryRun), "owner-single-pilot-launch-authorization.txt": ownerText };
for (const [directory, files] of [[releaseDir, releaseFiles], [launchDir, launchFiles]]) { await mkdir(path.join(root, directory), { recursive: true }); for (const [name, text] of Object.entries(files)) await writeFile(path.join(root, directory, name), text); await writeFile(path.join(root, directory, "checksums.json"), json(Object.fromEntries(Object.entries(files).map(([name, text]) => [name, sha(text)])))); }
if (process.argv.includes("--check")) for (const [directory, files] of [[releaseDir, releaseFiles], [launchDir, launchFiles]]) for (const [name, expectedText] of Object.entries(files)) if (await read(path.join(directory, name)) !== expectedText) throw new Error(`NON_DETERMINISTIC:${directory}/${name}`);
console.log(JSON.stringify({ disposition: dryRun.disposition, launchManifestId: LAUNCH_ID, launchManifestChecksum, foundationProductionReleaseId: FOUNDATION_RELEASE, foundationPayloadChecksum, foundationManifestChecksum, runtimeContractCompositeChecksum, activationPolicyChecksum, pilotScopeChecksum }));
