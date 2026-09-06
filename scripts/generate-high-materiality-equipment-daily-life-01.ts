import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  HIGH_MATERIALITY_DAILY_LIFE_POLICY_VERSION,
  HIGH_MATERIALITY_DAILY_LIFE_SCHEMA_VERSION,
  highMaterialityDefinitionDigest,
  projectHighMaterialityDailyLife,
  validateHighMaterialityDailyLifeRelease,
  type HighMaterialityApplication,
  type HighMaterialityDailyLifeRelease,
  type HighMaterialityDefinition,
} from "../features/vehicle-data/highMaterialityEquipmentDailyLife";
import { canonicalJson } from "../features/vehicle-data/ownerManualEvidence";

const ROOT = process.cwd();
const GENERATED_AT = "2026-09-04T18:00:00.000Z";
const RELEASE = "v1.1.0-high-materiality-exact-applications-catalog-v0.55.4-2026-09-04";
const RELEASE_RELATIVE = `data/production/equipment-daily-life/releases/${RELEASE}`;
const RELEASE_PATH = path.join(ROOT, RELEASE_RELATIVE);
const PARENT_RELEASE = "v1.0.1-catalog-v0.55.4-2026-08-20";
const PARENT_PAYLOAD = `data/production/equipment-daily-life/releases/${PARENT_RELEASE}/equipment-daily-life.json`;
const EQUIPMENT_RELEASE = "v1.6.0-owner-reviewed-manual-bridges-catalog-v0.55.4-2026-09-04";
const EQUIPMENT_PAYLOAD = `data/production/equipment-evidence/releases/${EQUIPMENT_RELEASE}/equipment-evidence.json`;
const MANUAL_RELEASE = "v4.3.0-equipment-owner-review-01";
const MANUAL_PAYLOAD = `data/research/owner-manual-evidence-v4/releases/${MANUAL_RELEASE}/exact-tr-bridge-decisions.json`;
const PROPOSAL_PAYLOAD = "data/research/owner-manual-evidence-v4/releases/v4.2.0-equipment-evidence-batch-01/exact-equipment-association-proposals.json";
const CATALOG_PAYLOAD = "data/production/catalog/releases/v0.55.4/catalog.json";
const CATALOG_FINGERPRINT = "sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9" as const;
const PARENT_OWNER_APPROVAL_EVENT = "EPEA-OAE-AD0553D90F8B5E4DA497";
const PARENT_OWNER_APPROVAL_PATH = `data/production/equipment-public-explanation-authority/governance/owner-approval-events/${PARENT_OWNER_APPROVAL_EVENT}/owner-approval-event.json`;
const NEXT_WORK_UNIT = "WU-XPY-APPL-DRYER-CATALOG-RICHNESS-01";

const PRIORITY_VARIANTS = [
  "6cb56615-37ef-51a8-9202-a73e59d4e14b",
  "11382bb9-bf71-52bf-9d0b-33befe86da7e",
  "4c22cb31-e980-4dc8-8525-c47363783d96",
  "8332f9df-5df5-5626-9d5f-22fbed616a56",
  "cf63bfb6-d503-5669-9799-6593f4b3f96b",
] as const;
const PRIORITY_FEATURES = [
  "ADAPTIVE_CRUISE_CONTROL",
  "BLIND_SPOT_MONITOR",
  "HEATED_FRONT_SEATS",
  "ISOFIX_REAR_OUTER",
  "WIRELESS_PHONE_CHARGING",
  "SURROUND_VIEW_CAMERA_360",
] as const;

type Json = Record<string, unknown>;
const object = (value: unknown): Json => value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown): string => typeof value === "string" ? value : "";
const sha256 = (value: string | Buffer): `sha256:${string}` => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const stableId = (prefix: string, ...parts: string[]) => `${prefix}-${createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 20).toUpperCase()}`;
const readJson = async <T>(relative: string): Promise<T> => JSON.parse(await readFile(path.join(ROOT, relative), "utf8")) as T;
const writeCanonical = async (name: string, value: unknown) => writeFile(path.join(RELEASE_PATH, name), `${canonicalJson(value)}\n`, "utf8");

function identity(catalogRecord: Json): HighMaterialityApplication["identity"] {
  const variant = object(catalogRecord.variant);
  return {
    brand: text(object(variant.brand).value),
    model: text(object(variant.model).value),
    trim: text(object(variant.trim).value),
    modelYear: Number(object(variant.modelYear).value),
    body: text(object(variant.bodyStyle).value),
    powertrain: text(object(object(variant.powertrain).fuelType).value),
    market: "TR",
  };
}

function sourceArtifactSha(assertion: Json): `sha256:${string}` {
  const reference = object(list(assertion.rawSourceReferences)[0] ?? list(assertion.sourceReferences)[0]);
  return text(reference.artifactSha256) as `sha256:${string}`;
}

function readinessBlockers(exactManualCount: number, mappedCount: number, before: boolean): string[] {
  return [
    ...(exactManualCount ? [] : ["NO_EXACT_TR_MANUAL_ASSERTION"]),
    "DAILY_LIFE_MAPPING_PARTIAL",
    ...(before || mappedCount === 0 ? ["EXACT_EQUIPMENT_DAILY_LIFE_APPLICATIONS_MISSING"] : []),
  ];
}

async function main(): Promise<void> {
  const [catalog, equipment, manual, parent, proposals] = await Promise.all([
    readJson<{ records: Json[] }>(CATALOG_PAYLOAD),
    readJson<Json>(EQUIPMENT_PAYLOAD),
    readJson<Json>(MANUAL_PAYLOAD),
    readJson<Json>(PARENT_PAYLOAD),
    readJson<{ proposals: Json[] }>(PROPOSAL_PAYLOAD),
  ]);
  const [equipmentPayloadSha, manualPayloadSha, parentPayloadSha, ownerApprovalEventSha] = await Promise.all([
    readFile(path.join(ROOT, EQUIPMENT_PAYLOAD)).then(sha256),
    readFile(path.join(ROOT, MANUAL_PAYLOAD)).then(sha256),
    readFile(path.join(ROOT, PARENT_PAYLOAD)).then(sha256),
    readFile(path.join(ROOT, PARENT_OWNER_APPROVAL_PATH)).then(sha256),
  ]);
  const catalogById = new Map(catalog.records.map((item) => [text(object(item.variant).id), item]));
  const parentEntries = new Map(list(parent.entries).map(object).map((item) => [text(item.featureCode), item]));
  const definitions: HighMaterialityDefinition[] = PRIORITY_FEATURES.map((featureCode) => {
    const entry = parentEntries.get(featureCode);
    if (!entry) throw new Error(`PARENT_SEMANTIC_ENTRY_MISSING:${featureCode}`);
    return {
      definitionId: stableId("EDL-DEF", PARENT_RELEASE, featureCode),
      featureCode,
      titleTr: text(entry.labelTr),
      dailyLifeMeaningTr: text(entry.dailyLifeBenefit),
      userFacingExplanationTr: text(entry.userFacingExplanation),
      limitationsTr: [text(entry.caveat)],
      semanticSource: { release: PARENT_RELEASE, payloadSha256: parentPayloadSha, entrySha256: highMaterialityDefinitionDigest(entry), ownerApprovalEventId: PARENT_OWNER_APPROVAL_EVENT },
      authority: "INHERITED_OWNER_EDITORIAL",
      decisionUse: "NONE",
      directCandidateEffect: "NONE",
    } satisfies HighMaterialityDefinition;
  }).sort((left, right) => left.featureCode.localeCompare(right.featureCode, "en"));
  const definitionByFeature = new Map(definitions.map((item) => [item.featureCode, item]));
  const proposalById = new Map(proposals.proposals.map((item) => [text(item.proposalId), item]));
  const assertions = list(equipment.verifiedAssertions).map(object);
  const expectedEquipmentLocators = new Map(assertions.map((assertion) => {
    const proposal = proposalById.get(text(assertion.sourceAssertionId));
    const locator = Object.keys(object(assertion.locator)).length ? object(assertion.locator) : object(object(proposal?.source).locator);
    return [text(assertion.materializationId), locator] as const;
  }));
  const expectedEquipmentSourceSha256 = new Map(assertions.map((assertion) => [text(assertion.materializationId), sourceArtifactSha(assertion)] as const));
  const manualDecisions = list(manual.variants).map(object).flatMap((variant) => list(variant.decisions).map(object))
    .filter((item) => text(item.decision) === "EXACT_VARIANT_VERIFIED" && text(item.authorityLevel) === "EXACT_VARIANT_VERIFIED");
  const manualByPair = new Map(manualDecisions.map((item) => [`${text(item.exactVariantId)}|${text(item.featureCode)}`, item]));

  const applications: HighMaterialityApplication[] = assertions
    .filter((assertion) => PRIORITY_VARIANTS.includes(text(assertion.exactVariantId) as typeof PRIORITY_VARIANTS[number])
      && PRIORITY_FEATURES.includes(text(assertion.featureCode) as typeof PRIORITY_FEATURES[number]))
    .map((assertion) => {
      const exactVariantId = text(assertion.exactVariantId);
      const featureCode = text(assertion.featureCode);
      const variantIdentity = identity(catalogById.get(exactVariantId) ?? {});
      const polarity = text(assertion.availabilityStatus) === "NOT_AVAILABLE" ? "NEGATIVE" as const : "POSITIVE" as const;
      const definition = definitionByFeature.get(featureCode);
      if (!definition) throw new Error(`DEFINITION_MISSING:${featureCode}`);
      const locator = expectedEquipmentLocators.get(text(assertion.materializationId)) ?? {};
      const manualDecision = manualByPair.get(`${exactVariantId}|${featureCode}`);
      const manualSource = object(manualDecision?.manualSource);
      const manualLocator = object(manualSource.locator);
      const consumerStatementTr = polarity === "NEGATIVE"
        ? `Bu exact konfigürasyonda ${definition.titleTr.toLocaleLowerCase("tr-TR")} doğrulanmış biçimde mevcut değildir.`
        : definition.userFacingExplanationTr;
      const comparisonSafeStatementTr = polarity === "NEGATIVE"
        ? `Bu exact konfigürasyonda yerleşik ${definition.titleTr.toLocaleLowerCase("tr-TR")} mevcut değildir; bu durum aracı genel olarak daha kötü yapmaz ve kablolu alternatif ya da telefon desteği hakkında ek bir iddia kurmaz.`
        : `Bu exact konfigürasyonda ${definition.titleTr.toLocaleLowerCase("tr-TR")} doğrulanmıştır; tek başına kullanıcı faydası, performans, konfor veya güvenlik sonucu garanti etmez.`;
      const noManualLimitation = variantIdentity.model === "Hilux"
        ? "MY2024 owner manual, MY2026 Hilux için operasyonel ayrıntı kaynağı olarak kullanılmadı."
        : "Bu exact özellik için uyumlu manual assertion bulunmadığından operasyonel ayrıntı eklenmedi.";
      return {
        applicationId: stableId("EDL-APP", RELEASE, exactVariantId, featureCode, polarity),
        exactVariantId,
        identity: variantIdentity,
        featureCode,
        definitionId: definition.definitionId,
        polarity,
        capabilityState: polarity === "POSITIVE" ? "PRESENT" : "ABSENT",
        consumerStatementTr,
        comparisonSafeStatementTr,
        unknownBehaviorTr: "Exact doğrulanmış uygulama yoksa özellik hakkında var veya yok iddiası kurulmaz; karşılaştırma hücresi nötr kalır ve ceza üretmez.",
        equipmentEvidence: {
          release: EQUIPMENT_RELEASE,
          payloadSha256: equipmentPayloadSha,
          assertionId: text(assertion.sourceAssertionId),
          materializationId: text(assertion.materializationId),
          ownerApprovalEventId: text(assertion.ownerApprovalEventId),
          approvalManifestId: text(assertion.approvalManifestId),
          approvalManifestChecksum: text(assertion.approvalManifestChecksum) as `sha256:${string}`,
          sourceArtifactSha256: sourceArtifactSha(assertion),
          locator,
        },
        manualEvidence: manualDecision ? {
          release: MANUAL_RELEASE,
          payloadSha256: manualPayloadSha,
          decisionId: text(manualDecision.decisionId),
          sourceId: text(manualSource.sourceId),
          artifactSha256: text(manualSource.artifactSha256) as `sha256:${string}`,
          physicalPdfPage: Number(manualLocator.physicalPdfPage),
          sectionHeading: text(manualLocator.sectionHeading),
          use: "OPERATION_CONTEXT_ONLY_NOT_EQUIPMENT_PROOF",
        } : null,
        limitations: [
          ...definition.limitationsTr,
          "Y eligibility, filtering, ranking, sufficiency, selection ve authorization üzerinde etkisi yoktur.",
          "Varlık veya yokluk yalnızca belirtilen Türkiye pazarı, model yılı ve exact donanım için geçerlidir.",
          manualDecision ? "Manual referansı yalnızca operasyon bağlamı içindir; ekipman varlığını kurmaz." : noManualLimitation,
        ],
        familyInheritance: false,
        crossVariantInheritance: false,
        crossModelYearInference: false,
        decisionUse: "NONE",
        directCandidateEffect: "NONE",
      } satisfies HighMaterialityApplication;
    })
    .sort((left, right) => left.exactVariantId.localeCompare(right.exactVariantId, "en") || left.featureCode.localeCompare(right.featureCode, "en"));
  if (applications.length !== 20) throw new Error(`EXPECTED_20_EXACT_APPLICATIONS_GOT_${applications.length}`);

  const release: HighMaterialityDailyLifeRelease = {
    schemaVersion: HIGH_MATERIALITY_DAILY_LIFE_SCHEMA_VERSION,
    policyVersion: HIGH_MATERIALITY_DAILY_LIFE_POLICY_VERSION,
    releaseVersion: RELEASE,
    parentRelease: PARENT_RELEASE,
    generatedAt: GENERATED_AT,
    compatibleCatalogRelease: "v0.55.4",
    compatibleCatalogFingerprint: CATALOG_FINGERPRINT,
    compatibleEquipmentRelease: EQUIPMENT_RELEASE,
    compatibleEquipmentPayloadSha256: equipmentPayloadSha,
    compatibleManualRelease: MANUAL_RELEASE,
    compatibleManualPayloadSha256: manualPayloadSha,
    state: "GOVERNED_IMMUTABLE_READ_PROJECTION_ONLY",
    activationPerformed: false,
    definitions,
    applications,
    projectionPolicy: {
      allowedConsumers: ["X_EXPLANATION", "ASAMA_1_CARD_RATIONALE", "ADVISOR_READ_PROJECTION", "COMPARISON_EVIDENCE_PROJECTION"],
      unknownTreatment: "NEUTRAL_NO_CLAIM_NO_PENALTY",
      negativeTreatment: "EXACT_CONFIGURATION_ONLY_NO_GLOBAL_QUALITY_JUDGMENT",
      manualAuthority: "OPERATION_CONTEXT_ONLY_NOT_EQUIPMENT_PROOF",
      decisionUse: "NONE",
      directCandidateEffect: "NONE",
    },
  };
  const issues = validateHighMaterialityDailyLifeRelease({ release, catalogById, equipmentAssertions: assertions, manualDecisions, parentEntries, expectedEquipmentLocators, expectedEquipmentSourceSha256 });
  if (issues.length) throw new Error(`HIGH_MATERIALITY_DAILY_LIFE_INVALID:${issues.join(",")}`);
  const projection = projectHighMaterialityDailyLife({ release, exactVariantIds: PRIORITY_VARIANTS, featureCodes: PRIORITY_FEATURES });
  const perVariant = PRIORITY_VARIANTS.map((exactVariantId) => {
    const mapped = applications.filter((item) => item.exactVariantId === exactVariantId);
    const exactManualCount = mapped.filter((item) => item.manualEvidence).length;
    const labelIdentity = mapped[0]?.identity ?? identity(catalogById.get(exactVariantId) ?? {});
    const comparisonBase = ["COMPARABLE_FIELD_COVERAGE_PARTIAL", "DOMAIN_PACK_COMPARISON_DIMENSIONS_AND_LABELS_NOT_REGISTERED"];
    return {
      exactVariantId,
      label: `${labelIdentity.brand} ${labelIdentity.model} ${labelIdentity.trim}`,
      evidenceSupportedPriorityFeatureCount: mapped.length,
      mappedBefore: 0,
      mappedAfter: mapped.length,
      unresolvedSupportedBefore: mapped.length,
      unresolvedSupportedAfter: 0,
      positiveApplications: mapped.filter((item) => item.polarity === "POSITIVE").length,
      negativeApplications: mapped.filter((item) => item.polarity === "NEGATIVE").length,
      neutralUnknownPriorityCellsAfter: PRIORITY_FEATURES.length - mapped.length,
      exactManualSupportedApplications: exactManualCount,
      advisor: { before: { status: "PARTIAL", blockers: readinessBlockers(exactManualCount, mapped.length, true) }, after: { status: "PARTIAL", blockers: readinessBlockers(exactManualCount, mapped.length, false) } },
      comparison: { before: { status: "PARTIAL", blockers: [...comparisonBase, "EXACT_EQUIPMENT_DAILY_LIFE_APPLICATIONS_MISSING"] }, after: { status: "PARTIAL", blockers: comparisonBase } },
    };
  });
  const coverageReport = {
    schemaVersion: "EQUIPMENT_DAILY_LIFE_HIGH_MATERIALITY_COVERAGE/v1",
    releaseVersion: RELEASE,
    generatedAt: GENERATED_AT,
    verdict: "PARTIAL",
    counts: {
      priorityExactVariants: PRIORITY_VARIANTS.length,
      priorityFeatureDefinitions: PRIORITY_FEATURES.length,
      exactApplicationsBefore: 0,
      exactApplicationsAfter: applications.length,
      positiveApplications: applications.filter((item) => item.polarity === "POSITIVE").length,
      negativeApplications: applications.filter((item) => item.polarity === "NEGATIVE").length,
      exactManualSupportedApplications: applications.filter((item) => item.manualEvidence).length,
      exactEquipmentOnlyApplications: applications.filter((item) => !item.manualEvidence).length,
      neutralUnknownPriorityCells: projection.cells.filter((item) => item.state === "UNKNOWN_NEUTRAL").length,
      globalTechnicalToDailyLifeGapAssignmentsBefore: 8646,
      globalTechnicalToDailyLifeGapAssignmentsAfter: 8646,
      advisorReadyVariantsBefore: 0,
      advisorReadyVariantsAfter: 0,
      comparisonReadyVariantsBefore: 0,
      comparisonReadyVariantsAfter: 0,
    },
    perVariant,
    blockers: [
      "The active equipment-daily-life/public-explanation composite remains bound to equipment evidence v1.5.5; a new composite activation authorization is required before public runtime use.",
      "The 8,646 catalog technical-field mapping gaps are outside this exact equipment application batch and remain open.",
      "Cars Domain Pack comparison dimensions, labels and Need-to-Evidence bindings remain unregistered.",
      "Hilux MY2024 manual remains incompatible with the MY2026 exact variant.",
    ],
    nextBoundedWorkUnit: { workUnitId: NEXT_WORK_UNIT, objective: "Use the XPY_CATALOG/v0.1 pattern to close Dryer L1-L9 richness gaps for its three exact products without copying Cars semantics, guessing data or moving commerce/media into catalog authority." },
  };
  const reviewBinding = {
    schemaVersion: "EQUIPMENT_DAILY_LIFE_HIGH_MATERIALITY_REVIEW_BINDING/v1",
    releaseVersion: RELEASE,
    semanticDefinitions: { sourceRelease: PARENT_RELEASE, sourcePayloadSha256: parentPayloadSha, ownerApprovalEventId: PARENT_OWNER_APPROVAL_EVENT, ownerApprovalEventPath: PARENT_OWNER_APPROVAL_PATH, ownerApprovalEventFileSha256: ownerApprovalEventSha, status: "INHERITED_OWNER_EDITORIAL_NO_TEXT_MUTATION" },
    exactApplicability: { sourceRelease: EQUIPMENT_RELEASE, sourcePayloadSha256: equipmentPayloadSha, ownerApprovedAssertionCount: applications.length, status: "OWNER_REVIEWED_EXACT_ASSERTIONS_ONLY" },
    manualContext: { sourceRelease: MANUAL_RELEASE, sourcePayloadSha256: manualPayloadSha, exactCompatibleApplicationCount: applications.filter((item) => item.manualEvidence).length, incompatibleOrUnavailableApplicationCount: applications.filter((item) => !item.manualEvidence).length, status: "EXACT_COMPATIBILITY_FAIL_CLOSED" },
    bindingValidation: { status: "PASSED", issueCount: issues.length, method: "DETERMINISTIC_FAIL_CLOSED_VALIDATION", newSemanticOwnerApprovalCreated: false },
    activation: { status: "NOT_PERFORMED", reason: "NEW_COMPOSITE_ACTIVATION_AUTHORIZATION_REQUIRED", activePointerUpdated: false, publicRuntimeIntegrationPerformed: false },
  };
  const neutrality = {
    schemaVersion: "EQUIPMENT_DAILY_LIFE_HIGH_MATERIALITY_DECISION_NEUTRALITY/v1",
    releaseVersion: RELEASE,
    decisionUse: "NONE",
    directCandidateEffect: "NONE",
    yEffects: { eligibility: "ZERO", filtering: "ZERO", ranking: "ZERO", sufficiency: "ZERO", selection: "ZERO", authorization: "ZERO", decisionFingerprint: "UNCHANGED" },
    runtimeFilesChanged: [],
    activePointersChanged: [],
  };
  await mkdir(RELEASE_PATH, { recursive: true });
  await writeCanonical("equipment-daily-life-exact-applications.json", release);
  await writeCanonical("read-projection.json", projection);
  await writeCanonical("coverage-report.json", coverageReport);
  await writeCanonical("review-binding.json", reviewBinding);
  await writeCanonical("decision-neutrality.json", neutrality);
  const artifactNames = ["equipment-daily-life-exact-applications.json", "read-projection.json", "coverage-report.json", "review-binding.json", "decision-neutrality.json"];
  const files = await Promise.all(artifactNames.map(async (name) => ({ path: name, sha256: sha256(await readFile(path.join(RELEASE_PATH, name))) })));
  const manifest = {
    schemaVersion: "EQUIPMENT_DAILY_LIFE_HIGH_MATERIALITY_MANIFEST/v1",
    releaseVersion: RELEASE,
    parentRelease: PARENT_RELEASE,
    generatedAt: GENERATED_AT,
    compatibleCatalogRelease: "v0.55.4",
    compatibleCatalogFingerprint: CATALOG_FINGERPRINT,
    compatibleEquipmentRelease: EQUIPMENT_RELEASE,
    compatibleEquipmentPayloadSha256: equipmentPayloadSha,
    compatibleManualRelease: MANUAL_RELEASE,
    compatibleManualPayloadSha256: manualPayloadSha,
    payloadSha256: files.find((item) => item.path === "equipment-daily-life-exact-applications.json")?.sha256,
    definitionCount: definitions.length,
    exactApplicationCount: applications.length,
    state: "GOVERNED_IMMUTABLE_READ_PROJECTION_ONLY",
    ownerReviewStatus: "INHERITED_APPROVED_SEMANTICS_AND_OWNER_REVIEWED_EXACT_EVIDENCE",
    bindingValidationStatus: "PASSED",
    activationPerformed: false,
    activePointerUpdated: false,
    decisionEngineEffect: "ZERO",
    files,
  };
  await writeCanonical("manifest.json", manifest);
  await writeCanonical("checksums.json", Object.fromEntries((await Promise.all([...artifactNames, "manifest.json"].map(async (name) => [name, sha256(await readFile(path.join(RELEASE_PATH, name)))] as const))).sort(([left], [right]) => left.localeCompare(right, "en"))));
  console.log(`${RELEASE}: ${definitions.length} inherited definitions, ${applications.length} exact applications, ${applications.filter((item) => item.manualEvidence).length} exact-manual supported, active pointer unchanged.`);
}

void main();
