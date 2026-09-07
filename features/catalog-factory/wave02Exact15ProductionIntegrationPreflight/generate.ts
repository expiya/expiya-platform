import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = "outputs/catalog-factory-wave-02-15-exact-production-integration-preflight-01";
const OVERLAY = "data/production/catalog-factory/releases/CATALOG-FACTORY-WAVE-02-EXACT-15-ACTIVE-01/catalog-overlay.json";
const NOW = "2026-09-07T09:00:00.000Z";
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const digest = (value: unknown) => createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex");
const readJson = async (root: string, file: string) => JSON.parse(await readFile(path.join(root, file), "utf8"));
type Addition = { exactProductId: string; identity?: { model?: string; exactVariant?: string }; technicalFacts?: unknown[]; explicitUnknown?: unknown[]; hardFilters?: { unknownPolicy?: string }; dailyLife?: { meaning?: string; questions?: unknown[] }; materialDiscriminators?: unknown[] };

export async function generateWave02Exact15ProductionIntegrationPreflight(root = process.cwd()) {
  const overlay = await readJson(root, OVERLAY);
  const electronics = await readJson(root, "data/production/electronics/runtime/releases/ELECTRONICS-RUNTIME-CATALOG-TR-v1.3-SMARTPHONE-V02-RECONCILED-R2/catalog.json");
  const cars = await readJson(root, "data/production/catalog/releases/v0.55.4/catalog.json");
  const mobility = await readJson(root, "data/production/mobility/active/active.json");
  const tools = await readJson(root, "data/production/cordless-drill/active.json");
  const persona = await readJson(root, "data/production/personas/universal/active.json");
  const additions = overlay.categories.flatMap((category: { additions: Addition[] }) => category.additions) as Addition[];
  const categoryDistribution = overlay.categories.map((category: { categoryId: string; before: number; additions: unknown[]; after: number }) => ({ categoryId: category.categoryId, before: category.before, additions: category.additions.length, after: category.after }));
  const artifactReadiness = {
    exactIdentity: additions.every(item => item.exactProductId && item.identity?.model && item.identity?.exactVariant),
    facts: additions.every(item => (item.technicalFacts?.length ?? 0) > 0),
    unknownPolicy: additions.every(item => Array.isArray(item.explicitUnknown) && item.hardFilters?.unknownPolicy === "UNKNOWN_NEVER_FALSE_AND_NEVER_RANKING_SIGNAL"),
    dailyLifeSemantics: additions.every(item => item.dailyLife?.meaning && (item.dailyLife?.questions?.length ?? 0) > 0),
    pMaterialityQuestions: additions.every(item => (item.materialDiscriminators?.length ?? 0) > 0 && (item.dailyLife?.questions?.length ?? 0) > 0),
    decisionCardProjection: false,
    decisionCardReason: "Only OWNER_REVIEW_CANDIDATE presentation rows exist; no active domain release L8/decision-card projection consumes them.",
  };
  const reportCore = {
    schemaVersion: "catalog-factory-production-integration-preflight/v0.1",
    workUnitId: "WU-CATALOG-FACTORY-WAVE-02-15-EXACT-PRODUCTION-INTEGRATION-PREFLIGHT-01",
    generatedAt: NOW,
    status: "BLOCKED_RUNTIME_CONSUMPTION_GAP",
    authority: { activationCommit: "d73cd1b34863d3cb1f2b1d7ed89aadd43c272050", activationDigest: "27471738652653e9780c08ead8b42cbb6b9d8a604d2dbc276b840e0fbe6685bb", overlayDigest: "8961121fdb13872fe2d153dc9db35aa600c72ab11771d79f25e64d9b8924a643", productionSource: "f1ce8e61f76345aa10a1422bb511d2d9998dd954", mergeBase: "f1ce8e61f76345aa10a1422bb511d2d9998dd954", commitsAheadOfProductionSource: 21, fileConflictsAgainstProductionSource: [] },
    membership: { before: 80, additions: 15, afterOverlayOnly: 95, productionRuntimeVisibleAdditions: 0, categoryDistribution },
    artifactReadiness,
    runtimeConsumption: {
      catalogFactoryPointerConsumers: [],
      appliances: "Legacy/domain active loaders only; overlay is not merged.",
      electronics: "loadActiveElectronicsRuntimeAuthority reads electronics/runtime/active.json and the 121-product v1.3 catalog only.",
      catalogDirectory: "loadActiveCatalogDirectory reads domain loaders directly; overlay is absent.",
      secretary: "loadActiveSecretaryProductIdentityIndex reads electronics, appliance, cars, stroller and mobility authorities directly; overlay is absent.",
      rootXpy: "Department adapters exist, but their candidate sets come from domain runtimes that do not consume the overlay.",
      conclusion: "The 15 additions must not be represented as production-live.",
    },
    preservation: { smartphoneExact: electronics.products.filter((item: { categoryId: string }) => item.categoryId === "SMARTPHONE").length, electronicsExact: electronics.products.length, carsExact: cars.records.length, mobilityProducts: mobility.productCount, toolsRelease: tools.release, personaState: persona.state, personaMembershipEffect: persona.membershipEffect, mitgoMetadataContract: "app/layout.tsx metadata.other mitgo-verification remains present", rootXpyExistingBehavior: "UNCHANGED_BECAUSE_OVERLAY_UNREACHABLE" },
    decisionSafety: { deterministicCandidateSetForExistingAuthorities: true, exact15CandidateSetReachable: false, tieAndNonDominatedPolicyRegression: "NOT_TRIGGERED_EXISTING_RUNTIME_UNCHANGED", falseWinnerRiskIfNaivelyMerged: "FAIL_CLOSED_UNTIL_PROJECTION_AND_UNKNOWN_ADAPTERS_EXIST", signedRecovery: "EXISTING_TOOLS_SIGNED_CRUD_UNCHANGED; EXACT15 HAS_NO_SIGNED_RECOVERY_BINDING" },
    splitBrain: { risk: "HIGH_IF_DEPLOYED_AS_IS", reason: "Catalog Factory says 95 active while domain loaders still authorize 80 for the eight categories.", safeCurrentInterpretation: "ISOLATED_LOCAL_OVERLAY_ACTIVE_PRODUCTION_RUNTIME_INACTIVE" },
    databaseMigration: "NONE",
    rollback: { overlayPointer: "Remove only data/production/catalog-factory/active.json to restore the pre-overlay ABSENT state after verifying its activation digest.", sourceDeployment: "Redeploy the exact prior production source f1ce8e61f76345aa10a1422bb511d2d9998dd954; underlying six authority pointers remain byte-identical.", immutableRelease: "Retain as inactive audit history; never rewrite." },
    requiredBoundedIntegrationUnit: {
      id: "WU-CATALOG-FACTORY-WAVE-02-15-EXACT-UNIFIED-RUNTIME-CONSUMER-01",
      objective: "Introduce one fail-closed Catalog Factory overlay consumer and route all affected read surfaces through one unified authority snapshot.",
      filesAndContracts: [
        "features/catalog-factory/runtimeOverlay.server.ts — validate pointer, manifest, overlay and underlying authority CAS; emit one normalized immutable snapshot",
        "features/electronics/runtimeAuthority.server.ts — merge seven electronics additions without changing Smartphone 34 or baseline Electronics 121",
        "features/appliances/entry.server.ts and affected appliance authority loaders — merge eight appliance additions under existing category releases",
        "features/platform/catalogDirectory.server.ts — consume the unified snapshot",
        "features/platform/secretaryProductIdentityIndex.server.ts — consume the same snapshot and exact aliases",
        "features/xpy/catalog overlay adapter — materialize facts/UNKNOWN/P questions and active L8 decision projections; preserve ties/non-dominated/no-false-winner",
        "contract tests — prove all consumers share one overlay digest and fail closed on drift",
      ],
      activationRule: "A single unified release manifest/pointer must be the only commit point; no independent domain pointer writes.",
    },
    releaseDecision: { runtimeReady: false, unifiedReleaseManifest: null, pushPreviewApprovalSentence: null, reason: "Runtime consumption and decision projection gaps must be closed first." },
    mutationBoundary: { runtime: false, activePointer: false, database: false, production: false, push: false, deployment: false, activationArtifactD73cd1bModified: false },
  };
  const report = { ...reportCore, preflightDigest: digest(reportCore) };
  await mkdir(path.join(root, OUT), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, OUT, "PREFLIGHT.json"), `${stable(report)}\n`),
    writeFile(path.join(root, OUT, "PREFLIGHT.sha256"), `sha256:${report.preflightDigest}\n`),
    writeFile(path.join(root, OUT, "PREFLIGHT.md"), `# Wave-02 exact-15 production integration preflight\n\nStatus: **${report.status}**. The local overlay contains 95 memberships, but production loaders consume none of the 15 additions. Do not describe them as production-live.\n\nThe bounded next unit is \`${report.requiredBoundedIntegrationUnit.id}\`. It must introduce one validated overlay consumer shared by domain runtimes, Catalog Directory, Secretary and XPY projections.\n\nDatabase migration: **NONE**. No pointer/runtime/production mutation, push or deployment was performed.\n\nDigest: \`${report.preflightDigest}\`\n`),
  ]);
  return report;
}

if (process.argv[1]?.endsWith("generate.ts")) generateWave02Exact15ProductionIntegrationPreflight().then(report => console.log(JSON.stringify({ status: report.status, preflightDigest: report.preflightDigest, runtimeVisibleAdditions: report.membership.productionRuntimeVisibleAdditions, nextUnit: report.requiredBoundedIntegrationUnit.id }, null, 2)));
