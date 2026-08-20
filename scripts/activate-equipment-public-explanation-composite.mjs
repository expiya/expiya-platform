import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const MANIFEST_ID = "EPEA-ACTMAN-A68831FC3F16C7619F25";
const MANIFEST_SHA = "sha256:a604677715168c97ede36bc3d6d8944609701323c2c102db5b163824300986fe";
const COMPOSITE_SHA = "sha256:34eae64907d0fc62a73f5d2691a12f440f8adbba40a243dff08cfa9509fcc082";
const PREP = join(ROOT, "data/production/equipment-public-explanation-authority/governance/activation-preparations", MANIFEST_ID);
const EVENT_ROOT = join(ROOT, "data/production/equipment-public-explanation-authority/governance/activation-events");
const STATEMENT = `EQUIPMENT_OWNER_001 olarak EPEA-ACTMAN-A68831FC3F16C7619F25 kimlikli ve sha256:a604677715168c97ede36bc3d6d8944609701323c2c102db5b163824300986fe checksum’lı corrected composite activation manifestini onaylıyorum. sha256:34eae64907d0fc62a73f5d2691a12f440f8adbba40a243dff08cfa9509fcc082 production composite paketinin atomik aktivasyonunda Equipment Daily-Life pointer checksum’ının sha256:4c25ab5b88a7e437fa20c0d6d3827180f028f5580fc2ed7b92f7c7246f48ba23, generated module checksum’ının sha256:31e8889bfc91322801c965d756e638d46dea4856ae2b0df905343aa0b927d5ae, Public Explanation Authority pointer checksum’ının sha256:142f84a7bd526177222ca4d3d3e9602e909e5dc19a753166cc77eb69fdf30602 ve generated module checksum’ının sha256:be2457e2a2614ed530c0777cf903641a17137e0f803517c208f6c2de01c4d773 olmasını onaylıyorum. Aktivasyon effective timestamp’inin işlem sırasında gerçek canonical UTC Z olarak append-only activation eventine kaydedilmesini kabul ediyorum. Bu onay yalnız iki pointer ve generated module’un atomik aktivasyonunu kapsar; public route/UI/Decision Engine entegrasyonunu, deployment’ı, migration’ı, database write’ı, commit’i veya push’u kapsamaz.\n`;
const EXPECTED = {
  dailyPointer: "sha256:4c25ab5b88a7e437fa20c0d6d3827180f028f5580fc2ed7b92f7c7246f48ba23",
  dailyModule: "sha256:31e8889bfc91322801c965d756e638d46dea4856ae2b0df905343aa0b927d5ae",
  authorityPointer: "sha256:142f84a7bd526177222ca4d3d3e9602e909e5dc19a753166cc77eb69fdf30602",
  authorityModule: "sha256:be2457e2a2614ed530c0777cf903641a17137e0f803517c208f6c2de01c4d773",
};
const TARGETS = [
  { key: "dailyPointer", source: join(PREP, "targets/equipment-daily-life.active.json"), destination: join(ROOT, "data/production/equipment-daily-life/active.json") },
  { key: "dailyModule", source: join(PREP, "targets/activeEquipmentDailyLife.generated.ts.txt"), destination: join(ROOT, "data/production/equipment-daily-life/activeEquipmentDailyLife.generated.ts") },
  { key: "authorityPointer", source: join(PREP, "targets/equipment-public-explanation-authority.active.json"), destination: join(ROOT, "data/production/equipment-public-explanation-authority/active.json") },
  { key: "authorityModule", source: join(PREP, "targets/activeEquipmentPublicExplanationAuthority.generated.ts.txt"), destination: join(ROOT, "data/production/equipment-public-explanation-authority/activeEquipmentPublicExplanationAuthority.generated.ts") },
];
const sortValue = (value) => Array.isArray(value) ? value.map(sortValue) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])])) : value;
const canonical = (value) => `${JSON.stringify(sortValue(value), null, 2)}\n`;
const sha = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const shaJson = (value) => sha(canonical(value));
const raw = (path) => readFileSync(path);
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const assert = (condition, code) => { if (!condition) throw new Error(code); };
const write = (path, value) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, canonical(value)); };

const manifest = read(join(PREP, "activation-manifest.json"));
const manifestPayload = { ...manifest }; delete manifestPayload.activationManifestChecksum;
assert(manifest.activationManifestId === MANIFEST_ID && shaJson(manifestPayload) === MANIFEST_SHA && manifest.activationManifestChecksum === MANIFEST_SHA, "ACTIVATION_MANIFEST_INVALID");
assert(manifest.productionCompositeBindingChecksum === COMPOSITE_SHA && manifest.explicitOwnerActivationApprovalRequired === true, "ACTIVATION_MANIFEST_SCOPE_INVALID");
for (const target of TARGETS) assert(sha(raw(target.source)) === EXPECTED[target.key], `TARGET_CHECKSUM_INVALID:${target.key}`);
const dailyPointer = read(TARGETS[0].source); const authorityPointer = read(TARGETS[2].source);
assert(dailyPointer.state === "ACTIVE" && authorityPointer.state === "ACTIVE" && dailyPointer.activationApprovalRequired === false && authorityPointer.activationApprovalRequired === false, "TARGET_LIFECYCLE_INVALID");
assert(dailyPointer.productionCompositeBindingChecksum === COMPOSITE_SHA && authorityPointer.productionCompositeBindingChecksum === COMPOSITE_SHA, "TARGET_COMPOSITE_INVALID");
assert(!/PROPOSED_NOT_ACTIVE|Proposed only|Not active/iu.test(`${raw(TARGETS[1].source)}${raw(TARGETS[3].source)}`), "TARGET_PROPOSED_MARKER_INVALID");

const statementChecksum = sha(STATEMENT);
const activatedAt = new Date().toISOString();
const eventBase = { schemaVersion: "1.0.0", eventType: "ATOMIC_COMPOSITE_ACTIVATION_APPLIED", ownerActorId: "EQUIPMENT_OWNER_001",
  activationManifestId: MANIFEST_ID, activationManifestChecksum: MANIFEST_SHA, authorizationStatementChecksum: statementChecksum,
  productionCompositeBindingChecksum: COMPOSITE_SHA, approvedTargetChecksums: EXPECTED, activatedAt,
  activeReleases: { equipmentDailyLife: "v1.0.1-catalog-v0.55.4-2026-08-20", publicExplanationAuthority: "v0.1.2-catalog-v0.55.4-2026-08-20" },
  activationMode: "ATOMIC_TWO_LAYER_POINTER_AND_GENERATED_MODULE_REPLACEMENT_V1", publicIntegrationPerformed: false,
  decisionEngineEffect: "ZERO", deploymentPerformed: false, migrationPerformed: false, databaseWritePerformed: false, commitPushPerformed: false,
  rollbackPlanReference: `${MANIFEST_ID}/rollback-plan.json`, revocationPolicy: "APPEND_ONLY_ROLLBACK_EVENT_REQUIRED" };
const eventChecksum = shaJson(eventBase);
const eventId = `EPEA-ACT-${eventChecksum.slice(7, 27).toUpperCase()}`;
const eventDir = join(EVENT_ROOT, eventId);
if (existsSync(EVENT_ROOT)) for (const existingId of readdirSync(EVENT_ROOT)) {
  const existingPath = join(EVENT_ROOT, existingId, "activation-event.json");
  if (existsSync(existingPath) && read(existingPath).activationManifestId === MANIFEST_ID) throw new Error("DUPLICATE_ACTIVATION_FOR_MANIFEST");
}
assert(!existsSync(eventDir), "DUPLICATE_ACTIVATION_EVENT");

const snapshots = new Map(); const staged = []; const installed = [];
for (const target of TARGETS) {
  snapshots.set(target.destination, existsSync(target.destination) ? raw(target.destination) : null);
  const temp = `${target.destination}.epea-activation-${eventId}.tmp`;
  writeFileSync(temp, raw(target.source)); staged.push(temp);
  assert(sha(raw(temp)) === EXPECTED[target.key], `STAGED_TARGET_CHECKSUM_INVALID:${target.key}`);
}
const stagedEventDir = `${eventDir}.tmp`;
mkdirSync(stagedEventDir, { recursive: true });
writeFileSync(join(stagedEventDir, "activation-approval-statement.txt"), STATEMENT);
write(join(stagedEventDir, "activation-event.json"), { ...eventBase, eventId, eventChecksum });
write(join(stagedEventDir, "post-activation-validation.json"), { schemaVersion: "1.0.0", status: "PENDING_ATOMIC_INSTALL_VALIDATION", expectedActiveChecksums: EXPECTED,
  productionCompositeBindingChecksum: COMPOSITE_SHA, publicIntegrationPerformed: false, decisionEngineEffect: "ZERO" });
try {
  for (let index = 0; index < TARGETS.length; index += 1) { renameSync(staged[index], TARGETS[index].destination); installed.push(TARGETS[index].destination); }
  for (const target of TARGETS) assert(sha(raw(target.destination)) === EXPECTED[target.key], `INSTALLED_TARGET_CHECKSUM_INVALID:${target.key}`);
  renameSync(stagedEventDir, eventDir);
} catch (error) {
  for (const path of installed.reverse()) { const snapshot = snapshots.get(path); if (snapshot === null) rmSync(path, { force: true }); else writeFileSync(path, snapshot); }
  for (const path of staged) if (existsSync(path)) rmSync(path, { force: true });
  if (existsSync(stagedEventDir)) rmSync(stagedEventDir, { recursive: true, force: true });
  if (existsSync(eventDir)) rmSync(eventDir, { recursive: true, force: true });
  throw error;
}

const activeChecksums = Object.fromEntries(TARGETS.map((target) => [target.key, sha(raw(target.destination))]));
write(join(eventDir, "post-activation-validation.json"), { schemaVersion: "1.0.0", status: "PASS", activeChecksums,
  checksumsMatchApprovedTargets: JSON.stringify(activeChecksums) === JSON.stringify(EXPECTED), productionCompositeBindingChecksum: COMPOSITE_SHA,
  pointerStates: { equipmentDailyLife: read(TARGETS[0].destination).state, publicExplanationAuthority: read(TARGETS[2].destination).state },
  publicIntegrationPerformed: false, decisionEngineEffect: "ZERO" });
const rollbackDryRun = { schemaVersion: "1.0.0", status: "READY", activationEventId: eventId, activationEventChecksum: eventChecksum,
  equipmentDailyLife: { targetRelease: "v1.0.0-catalog-v0.55.4-2026-08-20", pointerSource: `${MANIFEST_ID}/rollback/equipment-daily-life.active.json`, moduleSource: `${MANIFEST_ID}/rollback/activeEquipmentDailyLife.generated.ts.txt`, pointerChecksum: "sha256:01fbd50694ef6a60b0cd3cebbfce7e21f1586a682ccc2b509b8169c9d53f1ef8", generatedModuleChecksum: "sha256:36be5b3755c3dc79f42651df661706913cafbf5b13cbac9933a6065949633020" },
  publicExplanationAuthority: { predecessor: "NO_ACTIVE_PREDECESSOR", targetState: "UNCONFIGURED_DISABLED", pointerSource: `${MANIFEST_ID}/rollback/equipment-public-explanation-authority.unconfigured.json`, moduleSource: `${MANIFEST_ID}/rollback/activeEquipmentPublicExplanationAuthority.disabled.generated.ts.txt`, pointerChecksum: "sha256:cddd31540121f225d799dbb2e1c358d940a7ea9417854cbfb7fab3bf065f328a", generatedModuleChecksum: "sha256:acdb9703d1cf3a5ebdc286a28be5fabd3a1ec07ba03806a8cb323fd4310738e0" },
  appendOnlyGovernanceAndMaterializationRecordsPreserved: true, publicIntegrationCreated: false, decisionEngineEffect: "ZERO", explicitRollbackApprovalRequired: true };
write(join(eventDir, "rollback-dry-run.json"), rollbackDryRun);
write(join(eventDir, "checksums.json"), { "activation-approval-statement.txt": sha(raw(join(eventDir, "activation-approval-statement.txt"))),
  "activation-event.json": sha(raw(join(eventDir, "activation-event.json"))), "post-activation-validation.json": sha(raw(join(eventDir, "post-activation-validation.json"))),
  "rollback-dry-run.json": sha(raw(join(eventDir, "rollback-dry-run.json"))) });
process.stdout.write(canonical({ eventId, eventChecksum, activatedAt, activeChecksums, productionCompositeBindingChecksum: COMPOSITE_SHA,
  postActivationValidation: "PASS", rollbackDryRun: "READY", publicIntegrationPerformed: false, decisionEngineEffect: "ZERO" }));
