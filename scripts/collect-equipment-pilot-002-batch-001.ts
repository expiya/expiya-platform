import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createCanonicalTrimId } from "@/features/vehicle-data/equipmentCanonicalIdentity";
import { createEquipmentOperationalRecordId } from "@/features/vehicle-data/equipmentCollectionProtocol";
import { EQUIPMENT_FEATURE_CODES, type EquipmentEvidenceAssertion, type EquipmentFeatureCode } from "@/types/equipmentEvidence";

const ROOT = process.cwd();
const PILOT_ID = "EE-PILOT-002", CYCLE_ID = "EE-PILOT-002-CYCLE-001", BATCH_ID = "EE-PILOT-002-BATCH-001";
const STARTED_AT = "2026-08-18T18:11:00.000Z", COMPLETED_AT = "2026-08-18T18:42:00.000Z";
const COLLECTOR_ROLE = "EQUIPMENT_COLLECTOR_PRIMARY" as const;
const COLLECTOR_ID = "ACTOR-COLLECTOR-CODEX-CATALOG-001";
const WORK = path.join(ROOT, "data/production/equipment-evidence/working", PILOT_ID, BATCH_ID);
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

const variants = [
  { exactVariantId: "1a3cc01d-3bfa-56f3-817f-4cc77e723ef8", powertrain: "IBRIDA", trim: "Ibrida 145 PS Speciale+ eDCT6", sourceId: "SRC-000083", sourceUrl: "https://www.alfaromeo.com.tr/arac-modelleri/junior-ibrida", artifact: "data/cars/vehicle_evidence/source_snapshots/SRC-000083/2026-08-18/source.html", artifactSha256: "sha256:3ab39031195955489bd984c432b469943ebb420b7d11ad4f8f4ec22d6661f955" },
  { exactVariantId: "5a64b246-3b05-52b6-9f24-b8f52ccc2305", powertrain: "ELETTRICA", trim: "Elettrica 115 kW Speciale+", sourceId: "SRC-000084", sourceUrl: "https://www.alfaromeo.com.tr/arac-modelleri/junior-elettrica", artifact: "data/cars/vehicle_evidence/source_snapshots/SRC-000084/2026-08-18/source.html", artifactSha256: "sha256:a97340845586845dfd6e6f84f5e2d0a351c6910678c544d860357ec631dc338b" },
] as const;

const common: Readonly<Record<EquipmentFeatureCode, string | undefined>> = {
  AUTONOMOUS_EMERGENCY_BRAKING: "Otonom acil fren sistemi", ADAPTIVE_CRUISE_CONTROL: "Adaptif hız sabitleyici",
  BLIND_SPOT_MONITOR: "Kör nokta uyarı sistemi", TRAFFIC_SIGN_RECOGNITION: "Trafik işareti algılama sistemi",
  DRIVER_ATTENTION_MONITOR: "Sürücü yorgunluk algılama sistemi", REAR_VIEW_CAMERA: "Dinamik kılavuz çizgili, 180° arka görüş kamerası",
  FRONT_PARKING_SENSORS: "Ön, arka, yan park sensörleri", REAR_PARKING_SENSORS: "Ön, arka, yan park sensörleri",
  FRONT_SIDE_CURTAIN_AIRBAG_COVERAGE: "Ön, Yan ve Perde Hava Yastıkları", HEATED_FRONT_SEATS: "Isıtmalı ön koltuklar",
  POWER_DRIVER_SEAT: "Elektrikli & masaj özellikli sürücü koltuğu", KEYLESS_ENTRY: "Anahtarsız giriş ve çalıştırma",
  KEYLESS_START: "Anahtarsız giriş ve çalıştırma", POWER_TAILGATE: "Elektrikli eller serbest bagaj açma sistemi",
  HANDS_FREE_TAILGATE: "Elektrikli eller serbest bagaj açma sistemi", APPLE_CARPLAY: "Kablosuz Apple CarPlay ve Android Auto™ desteği",
  WIRELESS_APPLE_CARPLAY: "Kablosuz Apple CarPlay ve Android Auto™ desteği", ANDROID_AUTO: "Kablosuz Apple CarPlay ve Android Auto™ desteği",
  WIRELESS_ANDROID_AUTO: "Kablosuz Apple CarPlay ve Android Auto™ desteği", WIRELESS_PHONE_CHARGING: "Kablosuz telefon şarj alanı",
  LED_HEADLIGHTS: "Adaptif Full LED Matrix farlar", ADAPTIVE_HEADLIGHTS: "Adaptif Full LED Matrix farlar",
  MATRIX_LED_HEADLIGHTS: "Adaptif Full LED Matrix farlar",
  FORWARD_COLLISION_WARNING: undefined, LANE_DEPARTURE_WARNING: undefined, LANE_KEEP_ASSIST: undefined, LANE_CENTERING_ASSIST: undefined,
  REAR_CROSS_TRAFFIC_ALERT: undefined, HIGH_BEAM_ASSIST: undefined, SURROUND_VIEW_CAMERA_360: undefined, AUTOMATIC_PARK_ASSIST: undefined,
  ISOFIX_REAR_OUTER: undefined, ISOFIX_FRONT_PASSENGER: undefined, CENTER_AIRBAG: undefined, REAR_SEAT_OCCUPANT_ALERT: undefined,
  HEATED_REAR_SEATS: undefined, VENTILATED_FRONT_SEATS: undefined, POWER_FRONT_PASSENGER_SEAT: undefined, DRIVER_SEAT_MEMORY: undefined,
  HEATED_STEERING_WHEEL: undefined, DUAL_ZONE_CLIMATE_CONTROL: undefined, THREE_ZONE_CLIMATE_CONTROL: undefined, FOUR_ZONE_CLIMATE_CONTROL: undefined,
  PANORAMIC_GLASS_ROOF: undefined, AUTOMATIC_HIGH_BEAM: undefined, HILL_DESCENT_CONTROL: undefined, TERRAIN_DRIVE_MODES: undefined,
  LOW_RANGE_TRANSFER_CASE: undefined, LOCKING_REAR_DIFFERENTIAL: undefined, LOCKING_CENTER_DIFFERENTIAL: undefined, CRAWL_CONTROL: undefined,
};

const sources = [
  { sourceId: "SRC-000083", title: "Alfa Romeo Türkiye Junior Ibrida ürün ve donanım sayfası", sourceType: "OFFICIAL_EQUIPMENT_LIST", authority: "TR_DISTRIBUTOR", originalUrl: variants[0].sourceUrl, artifactReference: variants[0].artifact, artifactSha256: variants[0].artifactSha256, modelYearApplicability: [2026, 2026], snapshotResult: "CAPTURED" },
  { sourceId: "SRC-000084", title: "Alfa Romeo Türkiye Junior Elettrica ürün ve donanım sayfası", sourceType: "OFFICIAL_EQUIPMENT_LIST", authority: "TR_DISTRIBUTOR", originalUrl: variants[1].sourceUrl, artifactReference: variants[1].artifact, artifactSha256: variants[1].artifactSha256, modelYearApplicability: [2026, 2026], snapshotResult: "CAPTURED" },
  { sourceId: "SRC-000085", title: "Alfa Romeo Türkiye MY2026 resmî fiyat listesi structured response", sourceType: "OFFICIAL_PRICE_LIST", authority: "OFFICIAL_PRICE_EQUIPMENT_LIST", originalUrl: "https://arjfiyat.tofas.com.tr/pricelists?brand=alfa-romeo", artifactReference: "data/cars/vehicle_evidence/source_snapshots/SRC-000085/2026-08-16/source.html", artifactSha256: "sha256:af3d2ebbe55bab0c8df0231de73d989718b4d02f851d8fc361e3461fb63d9e79", modelYearApplicability: [2026, 2026], snapshotResult: "REUSED_CANONICAL_ARTIFACT" },
] as const;

async function main() {
  await mkdir(path.join(WORK, "snapshots"), { recursive: true });
  const catalog = JSON.parse(await readFile(path.join(ROOT, "data/production/catalog/releases/v0.55.2/catalog.json"), "utf8")) as { records: { variant: { id: string; modelYear: { value: number }; trim: { value: string } } }[] };
  for (const variant of variants) if (!catalog.records.some((item) => item.variant.id === variant.exactVariantId && item.variant.modelYear.value === 2026 && item.variant.trim.value === variant.trim)) throw new Error(`BATCH_VARIANT_CATALOG_MISMATCH:${variant.exactVariantId}`);
  for (const source of sources) if (`sha256:${sha(await readFile(path.join(ROOT, source.artifactReference)))}` !== source.artifactSha256) throw new Error(`SOURCE_CHECKSUM_MISMATCH:${source.sourceId}`);

  const sourceInventory = sources.map((source) => ({ ...source, sourceRegistryRelease: "v0.4.0-working-extension-ee-pilot-002", observedAt: source.sourceId === "SRC-000085" ? "2026-08-15T22:32:57.544Z" : STARTED_AT, publishedAt: null, effectiveAt: source.sourceId === "SRC-000085" ? "2026-08-03T00:00:00.000Z" : null, market: "TR", applicability: source.sourceId === "SRC-000085" ? "MY2026_EXACT_TRIM_MARKET_AND_TRANSMISSION_IDENTITY" : "MY2026_POWERTRAIN_SPECIFIC_SPECIALE_PLUS_EQUIPMENT_SECTION" }));
  const assertions: (EquipmentEvidenceAssertion & Record<string, unknown>)[] = [];
  for (const variant of variants) for (const featureCode of EQUIPMENT_FEATURE_CODES) {
    const evidenceText = common[featureCode] ?? (variant.powertrain === "IBRIDA" && featureCode === "HIGH_BEAM_ASSIST" ? "Adaptif uzun far yardımcısı" : undefined);
    if (!evidenceText) continue;
    const assertionId = createEquipmentOperationalRecordId("EE-AST", `${CYCLE_ID}|${variant.exactVariantId}|${featureCode}|STANDARD`);
    assertions.push({ assertionId, featureCode, exactVariantId: variant.exactVariantId, sourceApplicability: "EXACT_VARIANT", source: { sourceId: variant.sourceId, registryRelease: "v0.4.0-working-extension-ee-pilot-002", sourceType: "OFFICIAL_EQUIPMENT_LIST", sourceAuthority: "TR_DISTRIBUTOR", originalUrl: variant.sourceUrl, artifactReference: variant.artifact, artifactSha256: variant.artifactSha256, observedAt: STARTED_AT }, locator: { kind: "HTML_SECTION", heading: `Alfa Romeo Junior ${variant.powertrain === "IBRIDA" ? "Ibrida" : "Elettrica"} Speciale+ / Donanım`, row: evidenceText, elementReference: variant.powertrain === "IBRIDA" ? "#modal-avhpos5auh" : "#modal-popup-speciale-plus" }, market: "TR", modelYearFrom: 2026, modelYearTo: 2026, evidencePolarity: "POSITIVE", availabilityStatus: "STANDARD", provisionMode: "INCLUDED", verificationState: "PROVISIONAL", confidence: "HIGH", conflictState: "CLEAR", collectorRole: COLLECTOR_ROLE, collectorInstanceId: COLLECTOR_ID, researchCycleId: CYCLE_ID, batchId: BATCH_ID });
  }
  assertions.sort((a, b) => `${a.exactVariantId}|${a.featureCode}`.localeCompare(`${b.exactVariantId}|${b.featureCode}`));
  const assertionByPair = new Map(assertions.map((item) => [`${item.exactVariantId}|${item.featureCode}`, item.assertionId]));
  const ledger = variants.flatMap((variant) => EQUIPMENT_FEATURE_CODES.map((featureCode) => {
    const assertionId = assertionByPair.get(`${variant.exactVariantId}|${featureCode}`);
    return { ledgerEntryId: createEquipmentOperationalRecordId("EE-RES", `${CYCLE_ID}|${variant.exactVariantId}|${featureCode}`), exactVariantId: variant.exactVariantId, featureCode, disposition: assertionId ? "RESEARCHED_CONCLUSIVE" : "RESEARCHED_INCONCLUSIVE", researchCycleId: CYCLE_ID, batchId: BATCH_ID, updatedAt: COMPLETED_AT, sourceIds: [variant.sourceId, "SRC-000085"], assertionIds: assertionId ? [assertionId] : [], collectorRole: COLLECTOR_ROLE, collectorInstanceId: COLLECTOR_ID, ...(assertionId ? {} : { inconclusiveReasonCodes: ["FEATURE_NOT_EXPLICITLY_LISTED_FOR_EXACT_VARIANT", "ABSENCE_NOT_NEGATIVE_EVIDENCE"] }) };
  }));
  const trimLinks = variants.map((variant) => { const canonicalTrimId = createCanonicalTrimId({ market: "TR", brand: "Alfa Romeo", modelFamily: "Junior", modelYear: 2026, trimName: "Speciale+", configurationIdentity: `${variant.powertrain}|${variant.trim}` }); return { linkId: createEquipmentOperationalRecordId("EE-LINK-TRIM", `${variant.exactVariantId}|${canonicalTrimId}`), exactVariantId: variant.exactVariantId, canonicalTrimId, officialTrimName: "Speciale+", officialConfigurationCode: null, configurationCodeStatus: "NOT_PUBLISHED_IN_CAPTURED_OFFICIAL_SOURCES", market: "TR", modelYearFrom: 2026, modelYearTo: 2026, powertrainIdentity: variant.powertrain, assertionIds: assertions.filter((item) => item.exactVariantId === variant.exactVariantId).map((item) => item.assertionId), verificationState: "PROVISIONAL", reviewState: "SECOND_REVIEW_REQUIRED", provenanceSourceIds: [variant.sourceId, "SRC-000085"], collectorRole: COLLECTOR_ROLE, collectorInstanceId: COLLECTOR_ID } });
  const reviewSubjects = [...assertions.map((item) => ({ subjectType: "ASSERTION" as const, subjectId: item.assertionId })), ...trimLinks.map((item) => ({ subjectType: "TRIM_LINK" as const, subjectId: item.linkId }))];
  const reviewEvents = reviewSubjects.flatMap((subject) => [
    { reviewEventId: createEquipmentOperationalRecordId("EE-REV", `${subject.subjectType}|${subject.subjectId}|COLLECTED`), ...subject, fromState: undefined, toState: "COLLECTED", actorRole: COLLECTOR_ROLE, actorInstanceId: COLLECTOR_ID, reviewedAt: COMPLETED_AT, reasonCode: "COLLECTOR_EVIDENCE_CAPTURED" },
    { reviewEventId: createEquipmentOperationalRecordId("EE-REV", `${subject.subjectType}|${subject.subjectId}|SECOND_REVIEW_REQUIRED`), ...subject, fromState: "COLLECTED", toState: "SECOND_REVIEW_REQUIRED", actorRole: COLLECTOR_ROLE, actorInstanceId: COLLECTOR_ID, reviewedAt: COMPLETED_AT, reasonCode: "INDEPENDENT_REVIEW_REQUIRED" },
  ]);
  const comparison = EQUIPMENT_FEATURE_CODES.map((featureCode) => { const a = assertionByPair.get(`${variants[0].exactVariantId}|${featureCode}`), b = assertionByPair.get(`${variants[1].exactVariantId}|${featureCode}`); return { featureCode, status: a && b ? "CONFIRMED_SAME" : a || b ? "INCONCLUSIVE_FOR_ONE" : "INCONCLUSIVE_FOR_BOTH", ibridaExactVariantId: variants[0].exactVariantId, elettricaExactVariantId: variants[1].exactVariantId, ibridaAssertionIds: a ? [a] : [], elettricaAssertionIds: b ? [b] : [], reason: a && b ? "Two independent powertrain-specific official equipment sections state STANDARD availability." : a || b ? "Only one powertrain-specific official equipment section contains explicit evidence; silence on the other side is not absence evidence." : "Neither exact powertrain-specific section provides conclusive evidence." }; });
  const identityReview = variants.map((variant) => ({ exactVariantId: variant.exactVariantId, result: "EXACT_IDENTITY_SUPPORTED_PROVISIONAL", verifiedFields: ["brand", "model", "trim", "modelYear", "powertrain", "transmission", "market"], officialConfigurationCode: null, configurationCodeStatus: "NOT_PUBLISHED_IN_CAPTURED_OFFICIAL_SOURCES", sourceIds: [variant.sourceId, "SRC-000085"], rationale: "The MY2026 official price-list artifact establishes Junior powertrain, Speciale+, market-facing transmission and model year; the independent powertrain-specific product page establishes 145 PS eDCT6 or 115 kW and a Speciale+ equipment section. Link remains PROVISIONAL pending independent review." }));
  const registry = sourceInventory.map((source) => ({ source_id: source.sourceId, publisher: "Alfa Romeo Türkiye / Tofaş", source_title: source.title, source_type: source.sourceType, source_url: source.originalUrl, market: source.market, publication_date: source.publishedAt, retrieved_at: source.observedAt, authority_class: source.authority, source_status: "WORKING_BATCH", source_url_canonical: source.originalUrl, source_version_label: source.sourceId === "SRC-000085" ? "MY2026-effective-2026-08-03" : "observed-2026-08-18", source_observed_at: source.observedAt, source_content_hash: source.artifactSha256.replace("sha256:", ""), source_snapshot_ref: source.artifactReference }));
  const files: Record<string, unknown> = {
    "source-inventory.json": sourceInventory, "source-registry-extension.json": { baseRegistryRelease: "v0.4.0", extensionId: "v0.4.0-working-extension-ee-pilot-002", records: registry },
    "research-ledger.json": ledger, "assertions.json": assertions, "trim-links.json": trimLinks, "package-links.json": [], "review-events.json": reviewEvents,
    "variant-identity-review.json": identityReview, "trim-comparison.json": comparison, "catalog-quality-issues.json": [],
    "pilot-lifecycle.json": { pilotId: PILOT_ID, lifecycleState: "COLLECTING", researchStartedAt: STARTED_AT, completedAt: null },
    "batch-lifecycle.json": { batchId: BATCH_ID, lifecycleState: "SECOND_REVIEW_REQUIRED", researchStartedAt: STARTED_AT, collectionCompletedAt: COMPLETED_AT, completedAt: null, collectorRole: COLLECTOR_ROLE, collectorInstanceId: COLLECTOR_ID },
    "snapshots/index.json": sources.map((source) => ({ sourceId: source.sourceId, canonicalArtifactReference: source.artifactReference, artifactSha256: source.artifactSha256 })),
  };
  for (const [name, value] of Object.entries(files)) { const file = path.join(WORK, name); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, json(value), "utf8"); }
  const conclusive = ledger.filter((item) => item.disposition === "RESEARCHED_CONCLUSIVE").length;
  const comparisonCounts = Object.fromEntries([...new Set(comparison.map((item) => item.status))].sort().map((status) => [status, comparison.filter((item) => item.status === status).length]));
  const report = `# ${BATCH_ID} Collection Report\n\n- Scope: 2 exact variants × 51 features = 102 dispositions\n- Collector: ${COLLECTOR_ROLE} / ${COLLECTOR_ID}\n- Exact identity: both catalog identities supported provisionally by independent powertrain-specific product pages plus the MY2026 official price-list artifact; official version/configuration codes were not published in the captured sources.\n- Result: ${conclusive} RESEARCHED_CONCLUSIVE; ${ledger.length - conclusive} RESEARCHED_INCONCLUSIVE; 0 NOT_RESEARCHED\n- Assertions: ${assertions.length} positive STANDARD/INCLUDED, all PROVISIONAL; 0 negative; 0 conflict\n- Trim links: ${trimLinks.length} powertrain-separated provisional links; package links: 0\n- Official snapshots: ${sources.length}, all checksum-verified\n- Paired comparison: ${JSON.stringify(comparisonCounts)}\n- Safety boundary: no family inheritance, cross-powertrain projection, OPTIONAL→STANDARD conversion, or silence→NOT_AVAILABLE conversion was used.\n- Review state: ${BATCH_ID} SECOND_REVIEW_REQUIRED; ${PILOT_ID} remains COLLECTING.\n`;
  await writeFile(path.join(WORK, "collection-report.md"), report, "utf8");
  const names = [...Object.keys(files), "collection-report.md"].sort();
  const checksums = Object.fromEntries(await Promise.all(names.map(async (name) => [name, `sha256:${sha(await readFile(path.join(WORK, name)))}`])));
  await writeFile(path.join(WORK, "checksums.json"), json(checksums), "utf8");
  console.log(JSON.stringify({ batchId: BATCH_ID, ledger: ledger.length, conclusive, inconclusive: ledger.length - conclusive, assertions: assertions.length, trimLinks: trimLinks.length, packageLinks: 0, reviewEvents: reviewEvents.length, comparisonCounts }));
}

void main();
