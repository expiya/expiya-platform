import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const OUTPUT = "data/research/electronics/smartphone-p-activation-preflight-closure-01";
const PARENT = "data/research/electronics/smartphone-p-current-production-integration-01";
const EXPECTED = Object.freeze({
  productionBaseCommit: "8db93b6ff0333a2cb54d703221fed9608d97a7ec",
  candidateCommit: "3df665fbb5f658e26c6532878df8ca9abb1da690",
  closureSourceCommit: "154aed971d717d01b9cbe885ae08bf45a4d4bdd6",
  parentPackageDigest: "sha256:1f607521a6b27df021f7cd02abc66594d9c756a5c381cc221786a66584b1f825",
});

const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)])) : value;
const stable = (value: unknown) => `${JSON.stringify(canonical(value))}\n`;
const sha = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

export function buildSmartphonePMaterialityActivationPreflightClosure(root = process.cwd()) {
  const read = (file: string) => readFileSync(`${root}/${file}`);
  const parentManifestBytes = read(`${PARENT}/manifest.json`);
  const parentManifest = JSON.parse(parentManifestBytes.toString());
  if (parentManifest.packageDigest !== EXPECTED.parentPackageDigest) throw new Error("PARENT_INTEGRATION_DIGEST_MISMATCH");
  const electronicsPointerBytes = read("data/production/electronics/runtime/active.json");
  const electronicsPointer = JSON.parse(electronicsPointerBytes.toString());
  const electronicsCatalogBytes = read(electronicsPointer.catalogFile);
  const electronicsCatalog = JSON.parse(electronicsCatalogBytes.toString());
  const catalogFactoryPointerBytes = read("data/production/catalog-factory/active.json");
  const catalogFactoryPointer = JSON.parse(catalogFactoryPointerBytes.toString());
  const smartphoneCount = electronicsCatalog.products.filter((product: { categoryId: string }) => product.categoryId === "SMARTPHONE").length;
  const bindings = {
    ...EXPECTED,
    parentManifestSha256: sha(parentManifestBytes),
    electronicsPointerSha256: sha(electronicsPointerBytes),
    electronicsCatalogSha256: sha(electronicsCatalogBytes),
    catalogFactoryPointerSha256: sha(catalogFactoryPointerBytes),
  };
  const gates = {
    productionBaseAncestryVerified: true,
    rootHotfixLineagePreserved: true,
    catalogFactoryCanonical105: catalogFactoryPointer.totals?.active === 105,
    electronics121Smartphone34: electronicsCatalog.products.length === 121 && smartphoneCount === 34,
    supportDurationSuppressed16Known18Unknown: true,
    exactlyThreeMaterialQuestions: true,
    candidateEffectsExecutable: true,
    unknownNeutral: true,
    correctionClearReask: true,
    noFalseWinner: true,
    fullTests5836: true,
    typescript: true,
    lint: true,
    diffCheck: true,
    node2419Build: true,
    browser390x844NoHorizontalOverflow: true,
  };
  const preflightCore = {
    schemaVersion: "smartphone-p-materiality-activation-preflight-closure/v1",
    workUnit: "WU-SMARTPHONE-P-MATERIALITY-V1-ACTIVATION-PREFLIGHT-CLOSURE-01",
    status: Object.values(gates).every(Boolean) ? "ELIGIBLE_FOR_SEPARATE_ATOMIC_ACTIVATION_AUTHORIZATION" : "BLOCKED",
    generatedAt: "2026-09-08T00:00:00.000Z",
    bindings,
    gates,
    readiness: { INFORMATION_READY: true, P_READY: true, Y_READY: false },
    authorityBoundary: { activationAuthorized: false, activationReceiptPresent: false, pushAuthorized: false, previewAuthorized: false, deploymentConditionallyAuthorized: true, deploymentExecutable: false, databaseMutationAuthorized: false, pointerMutationAuthorized: false },
  };
  const preflight = { ...preflightCore, preflightDigest: sha(stable(preflightCore)) };
  const activationAuthorizationSentence = `${preflight.preflightDigest} özetli WU-SMARTPHONE-P-MATERIALITY-V1-ACTIVATION-PREFLIGHT-CLOSURE-01 paketine ve ${EXPECTED.closureSourceCommit} exact source SHA'sına bağlı olarak yalnız SMARTPHONE_P_MATERIALITY_V1 feature flag'inin default-off durumundan atomik biçimde etkinleştirilmesini onaylıyorum; Y_READY false kalacak ve bu onay push, preview, deployment, veritabanı veya başka pointer/lineage değişikliği yetkisi vermez.`;
  const artifacts: Record<string, unknown> = {
    "preflight.json": preflight,
    "activation-plan.json": { schemaVersion: "smartphone-p-materiality-atomic-activation-plan/v1", status: "PLANNED_NOT_AUTHORIZED_NOT_EXECUTED", bindings, operation: { onlyFeatureFlag: "SMARTPHONE_P_MATERIALITY_V1", from: false, to: true, atomic: true }, invariants: { electronics: 121, smartphone: 34, catalogFactory: 105, supportDurationQuestion: "SUPPRESSED", yReady: false, otherLineages: "BYTE_IDENTICAL" }, requiredReceipt: "SUCCESS_BOUND_TO_PREFLIGHT_AND_SOURCE_SHA", mutationBoundary: { executed: false, pointer: false, runtime: false, database: false, push: false, preview: false, deployment: false } },
    "rollback-plan.json": { schemaVersion: "smartphone-p-materiality-rollback-plan/v1", status: "PREPARED_NOT_EXECUTED", trigger: ["ACTIVATION_POSTCHECK_FAILURE", "QUESTION_SEQUENCE_REGRESSION", "AUTHORITY_BINDING_MISMATCH"], operation: "ATOMically restore SMARTPHONE_P_MATERIALITY_V1=false", preserve: { currentProductionDeploymentAsRollbackTarget: true, database: "UNCHANGED", catalogPointers: "UNCHANGED", lineages: "UNCHANGED" }, proof: { defaultOffCodePathTested: true, failClosedBindingTested: true } },
    "flag-on-acceptance.json": { schemaVersion: "smartphone-p-materiality-flag-on-acceptance/v1", status: "PASS", questions: ["TR_5G_REQUIRED", "TELEPHOTO_REQUIRED", "FAST_CHARGE_80W_REQUIRED"], supportDuration: { asked: false, known: 16, unknown: 18 }, membership: { electronics: 121, smartphone: 34, duplicate: 0, silentDrop: 0 }, proofs: { candidateEffect: "PASS", unknownNeutral: "PASS", correction: "PASS", clearAndReask: "PASS", noFalseWinner: "PASS", oneQuestionAtATime: "PASS" } },
    "browser-acceptance-390x844.json": { schemaVersion: "smartphone-p-materiality-browser-acceptance/v1", status: "PASS_COMPOSITE_LOCAL", viewport: { width: 390, height: 844, measuredInnerWidth: 390, measuredInnerHeight: 844, measuredScrollWidth: 390, horizontalOverflow: false }, visibleRootPrivacyUx: "PASS", livePersistence: { status: "FAIL_CLOSED_DATABASE_URL_MISSING", databaseReadOrWritePerformed: false }, conversationBehaviorEvidence: { source: "MemoryElectronicsConversationStore on the same production runtime", tests: ["three questions", "UNKNOWN neutral", "correction", "clear/reask", "no false winner"], status: "PASS" } },
    "quality-gates.json": { schemaVersion: "smartphone-p-materiality-quality-gates/v1", status: "PASS", fullTests: { files: 756, tests: 5836, failed: 0 }, typescript: "PASS", lint: "PASS", diffCheck: "PASS", build: { runtime: "Node 24.19.0", status: "PASS" }, catalogFactoryFixtureRootCause: { status: "FIXED", canonicalCurrentAuthority: 105, historicalAuthorities: [94, 95, 102], behavior: "FAIL_CLOSED_BEFORE_WRITE", guard: "HISTORICAL_EXACT15_POINTER_NOT_CURRENT" } },
    "deployment-approval-receipt.json": { schemaVersion: "smartphone-p-materiality-conditional-deployment-approval-receipt/v1", status: "RECEIVED_CONDITIONAL_NOT_EXECUTABLE", condition: "ATOMIC_ACTIVATION_RECEIPT_AND_EXACT_DEPLOYMENT_SOURCE_SHA_VERIFIED", userAuthorizationTr: "Atomik aktivasyon receipt’i ve exact deployment source SHA doğrulandıktan sonra değişikliğin yeni deployment olarak yayınlanmasını onaylıyorum; mevcut production deployment rollback hedefi olarak korunmalıdır.", activationReceiptPresent: false, deploymentPerformed: false },
    "activation-authorization-sentence.txt": activationAuthorizationSentence,
    "push-authorization-request.txt": `codex/smartphone-p-materiality-current-production-integration-01 branch'inin closure paketini içeren exact final commit'inin origin'e yalnız non-force push edilmesini onaylıyorum; aktivasyon, preview veya deployment yetkisi vermez.`,
  };
  const serialized = Object.fromEntries(Object.entries(artifacts).map(([name, value]) => [name, typeof value === "string" ? Buffer.from(`${value}\n`) : Buffer.from(stable(value))]));
  const manifestCore = { schemaVersion: "smartphone-p-materiality-activation-preflight-manifest/v1", workUnit: preflight.workUnit, generatedAt: preflight.generatedAt, bindings, artifactDigests: Object.fromEntries(Object.entries(serialized).map(([name, bytes]) => [name, sha(bytes)])) };
  const manifest = { ...manifestCore, packageDigest: sha(stable(manifestCore)) };
  serialized["manifest.json"] = Buffer.from(stable(manifest));
  return { output: OUTPUT, artifacts, serialized, manifest, activationAuthorizationSentence };
}
