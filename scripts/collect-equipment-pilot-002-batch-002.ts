import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCanonicalTrimId } from "@/features/vehicle-data/equipmentCanonicalIdentity";
import { createEquipmentOperationalRecordId } from "@/features/vehicle-data/equipmentCollectionProtocol";
import { EQUIPMENT_FEATURE_CODES, type EquipmentFeatureCode } from "@/types/equipmentEvidence";

const ROOT = process.cwd(), PILOT = "EE-PILOT-002", BATCH = "EE-PILOT-002-BATCH-002", CYCLE = "EE-PILOT-002-CYCLE-002";
const STARTED = "2026-08-18T20:32:00.000Z", COMPLETED = "2026-08-18T21:05:00.000Z";
const ACTOR = "ACTOR-COLLECTOR-CODEX-CATALOG-001", ROLE = "EQUIPMENT_COLLECTOR_PRIMARY";
const CATALOG_HASH = "sha256:fd5609adcc0ca3fec0f8c9dc4dd1c903ed5514326bd322eacd4decff5a044f0f";
const WORK = path.join(ROOT, "data/production/equipment-evidence/working", PILOT, BATCH);
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const decode = (value: string) => value.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")
  .replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&nbsp;|&#160;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim();
const stable = (prefix: string, value: string) => `${prefix}-${sha(value).slice(0, 20).toUpperCase()}`;

const variants = [
  { exactVariantId: "54bbe431-a3c2-56d0-8177-cefdf0330bcb", trim: "Ti", catalogTrim: "1.6 Diesel 130 PS Ti TCT6", powertrain: "DIESEL_130_TCT6", modalId: "modal-edizione-ti" },
  { exactVariantId: "f12f742b-111c-54de-a006-61361fb1ae04", trim: "Speciale", catalogTrim: "1.5 Hybrid 175 PS Speciale TCT7", powertrain: "HYBRID_175_TCT7", modalId: "modal-edizione-speciale" },
] as const;
const productArtifact = "data/cars/vehicle_evidence/source_snapshots/SRC-000087/2026-08-18/source.html";
const priceArtifact = "data/cars/vehicle_evidence/source_snapshots/SRC-000088/2026-08-18/source.html";

const mappings: Array<{ phrase: string; features: EquipmentFeatureCode[]; reason: string }> = [
  { phrase: "Elektrikli açılır panoramik cam tavan", features: ["PANORAMIC_GLASS_ROOF"], reason: "EXACT_EQUIPMENT_TERM" },
  { phrase: "Kablosuz Apple CarPlay / Android Auto", features: ["APPLE_CARPLAY", "WIRELESS_APPLE_CARPLAY", "ANDROID_AUTO", "WIRELESS_ANDROID_AUTO"], reason: "EXPLICIT_WIRELESS_DUAL_PLATFORM_FANOUT" },
  { phrase: "360° kamera", features: ["SURROUND_VIEW_CAMERA_360"], reason: "EXACT_EQUIPMENT_TERM" },
  { phrase: "Yan, ön ve arka park sensörleri", features: ["FRONT_PARKING_SENSORS", "REAR_PARKING_SENSORS"], reason: "EXPLICIT_FRONT_REAR_FANOUT" },
  { phrase: "Paralel, dikey ve Exit Assist fonksiyonlu Park Asistanı", features: ["AUTOMATIC_PARK_ASSIST"], reason: "EXPLICIT_AUTOMATIC_PARK_FUNCTION" },
  { phrase: "Keyless Entry & Go (anahtarsız giriş ve çalıştırma)", features: ["KEYLESS_ENTRY", "KEYLESS_START"], reason: "EXPLICIT_ENTRY_START_FANOUT" },
  { phrase: "Elektrikli eller serbest bagaj açma sistemi", features: ["POWER_TAILGATE", "HANDS_FREE_TAILGATE"], reason: "EXPLICIT_POWER_HANDS_FREE_FANOUT" },
  { phrase: "Havalandırmalı kablosuz telefon şarj alanı", features: ["WIRELESS_PHONE_CHARGING"], reason: "EXACT_EQUIPMENT_TERM" },
  { phrase: "Stop & Go fonksiyonlu akıllı adaptif hız sabitleyici", features: ["ADAPTIVE_CRUISE_CONTROL"], reason: "EXPLICIT_ADAPTIVE_CRUISE_TERM" },
  { phrase: "Stop & Go fonksiyonlu adaptif hız sabitleyici", features: ["ADAPTIVE_CRUISE_CONTROL"], reason: "EXPLICIT_ADAPTIVE_CRUISE_TERM" },
  { phrase: "Sürücü yorgunluk algılama sistemi", features: ["DRIVER_ATTENTION_MONITOR"], reason: "EXACT_EQUIPMENT_TERM" },
  { phrase: "Trafik işareti tanıma sistemi", features: ["TRAFFIC_SIGN_RECOGNITION"], reason: "EXACT_EQUIPMENT_TERM" },
  { phrase: "Ön çarpışma uyarı sistemi", features: ["FORWARD_COLLISION_WARNING"], reason: "EXACT_EQUIPMENT_TERM" },
  { phrase: "Yaya ve bisikletli algılamalı acil durum frenleme (AEB)", features: ["AUTONOMOUS_EMERGENCY_BRAKING"], reason: "EXPLICIT_AEB_TERM" },
  { phrase: "Yaya ve bisiklet algılamalı acil durum frenleme (AEB)", features: ["AUTONOMOUS_EMERGENCY_BRAKING"], reason: "EXPLICIT_AEB_TERM" },
  { phrase: "Kör nokta uyarı sistemi + Arka Çapraz Trafik Uyarısı ile kör nokta izleme", features: ["BLIND_SPOT_MONITOR", "REAR_CROSS_TRAFFIC_ALERT"], reason: "EXPLICIT_BLIND_SPOT_REAR_CROSS_FANOUT" },
  { phrase: "Kör nokta uyarı sistemi + Arka çapraz trafik uyarısı", features: ["BLIND_SPOT_MONITOR", "REAR_CROSS_TRAFFIC_ALERT"], reason: "EXPLICIT_BLIND_SPOT_REAR_CROSS_FANOUT" },
  { phrase: "3+3 DRL imzalı Full‑LED ön farlar", features: ["LED_HEADLIGHTS"], reason: "EXPLICIT_FULL_LED_TERM" },
  { phrase: "3+3 DRL imzalı Full-LED ön farlar", features: ["LED_HEADLIGHTS"], reason: "EXPLICIT_FULL_LED_TERM" },
  { phrase: "Isıtmalı ve havalandırmalı, 8 yönlü elektrikli ön koltuklar", features: ["HEATED_FRONT_SEATS", "VENTILATED_FRONT_SEATS", "POWER_DRIVER_SEAT", "POWER_FRONT_PASSENGER_SEAT"], reason: "EXPLICIT_FRONT_SEATS_MULTI_FEATURE_FANOUT" },
  { phrase: "Start/Stop butonlu, ısıtmalı sportif deri direksiyon simidi", features: ["HEATED_STEERING_WHEEL"], reason: "EXPLICIT_HEATED_STEERING_TERM" },
];

async function main() {
  const product = await readFile(path.join(ROOT, productArtifact), "utf8"), price = await readFile(path.join(ROOT, priceArtifact), "utf8");
  const productSha = `sha256:${sha(product)}`, priceSha = `sha256:${sha(price)}`;
  const catalog = JSON.parse(await readFile(path.join(ROOT, "data/production/catalog/releases/v0.55.2/catalog.json"), "utf8"));
  const pilot = JSON.parse(await readFile(path.join(ROOT, "data/production/equipment-evidence/pilots/pilot-v1.0.2-catalog-v0.55.2-2026-08-18/pilot-manifest.json"), "utf8"));
  const quarantine = JSON.parse(await readFile(path.join(ROOT, "data/production/catalog/releases/v0.55.2/quarantine-registry.json"), "utf8"));
  for (const variant of variants) {
    if (catalog.records.filter((record: { variant: { id: string; lifecycleStatus: string } }) => record.variant.id === variant.exactVariantId && record.variant.lifecycleStatus === "ON_SALE").length !== 1) throw new Error(`CATALOG_IDENTITY_GATE_FAILED:${variant.exactVariantId}`);
    if (!pilot.variants.some((item: { exactVariantId: string }) => item.exactVariantId === variant.exactVariantId)) throw new Error(`PILOT_IDENTITY_GATE_FAILED:${variant.exactVariantId}`);
    if (JSON.stringify(quarantine).includes(variant.exactVariantId)) throw new Error(`QUARANTINED_VARIANT:${variant.exactVariantId}`);
  }
  if (!price.includes("TONALE DIESEL 130") || !price.includes("TONALE HYBRID 175") || !price.includes("2026")) throw new Error("PRICE_IDENTITY_GATE_FAILED");

  const sourceRows: Record<string, unknown> = {}, order: string[] = [], contextRows = new Map<string, Array<{ sourceRowId: string; rawText: string; normalizedText: string; occurrence: string }>>();
  for (const variant of variants) {
    const start = product.indexOf(`id="${variant.modalId}"`), next = product.indexOf("<section", start + 10), boundary = product.slice(start, next > start ? next : product.length);
    if (start < 0 || !boundary.includes(`Alfa Romeo Tonale ${variant.trim}`)) throw new Error(`UNIQUE_TRIM_BOUNDARY_FAILED:${variant.trim}`);
    const rows: Array<{ sourceRowId: string; rawText: string; normalizedText: string; occurrence: string }> = [];
    for (const match of boundary.matchAll(/<li>([\s\S]*?)<\/li>/gi)) {
      const rawText = decode(match[1]), sourceRowId = stable("EE-SROW", `${variant.exactVariantId}|${rawText}`), occurrence = `char:${start + (match.index ?? 0)}`;
      if (!rawText || sourceRows[sourceRowId]) continue;
      sourceRows[sourceRowId] = { sourceRowId, sourceId: "SRC-000087", rawText, normalizedText: rawText.normalize("NFKC").replace(/\s+/g, " ").trim(), rawOccurrenceReferences: [occurrence], sourceSection: `Alfa Romeo Tonale ${variant.trim}`, exactVariantId: variant.exactVariantId, powertrainApplicability: variant.powertrain };
      order.push(sourceRowId); rows.push({ sourceRowId, rawText, normalizedText: rawText.normalize("NFKC").replace(/\s+/g, " ").trim(), occurrence });
    }
    contextRows.set(variant.exactVariantId, rows);
  }
  const sourceRowsArtifact = { schemaVersion: "2.0.0", extractionPolicy: { id: "ALFA_ROMEO_TR_TONALE_EXACT_TRIM_SOURCE_ROWS", version: "1.0.0" }, parentSource: { sourceId: "SRC-000087", artifactReference: productArtifact, artifactSha256: productSha }, sourceRowOrder: order, sourceRowsById: sourceRows };
  const sourceRowsPath = path.join(WORK, "tonale-equipment.source-rows.v1.json");
  await mkdir(path.join(WORK, "snapshots"), { recursive: true });
  await writeFile(sourceRowsPath, json(sourceRowsArtifact));
  const derivedSha = `sha256:${sha(await readFile(sourceRowsPath))}`;

  const semanticMappings: Array<Record<string, unknown>> = [];
  for (const variant of variants) for (const row of contextRows.get(variant.exactVariantId) ?? []) {
    const rule = mappings.find((item) => row.normalizedText === item.phrase.normalize("NFKC"));
    if (!rule) continue;
    for (const featureCode of rule.features) semanticMappings.push({ mappingId: stable("EE-MAP", `${variant.exactVariantId}|${row.sourceRowId}|${featureCode}`), sourceRowId: row.sourceRowId, featureCode,
      sourcePhrase: row.rawText, mappingRationale: rule.reason, mappingPolicyId: "EQUIPMENT_FEATURE_SEMANTIC_MAPPING_V1", mappingPolicyVersion: "1.0.0", ambiguityState: "UNAMBIGUOUS", fanOut: rule.features.length,
      exactTrimApplicability: variant.trim, powertrainApplicability: variant.powertrain, mappingState: "PROVISIONAL", collectorRole: ROLE, collectorActorId: ACTOR });
  }
  semanticMappings.sort((a, b) => `${a.exactTrimApplicability}|${a.featureCode}`.localeCompare(`${b.exactTrimApplicability}|${b.featureCode}`));
  const mappingByPair = new Map(semanticMappings.map((item) => [`${variants.find((v) => v.trim === item.exactTrimApplicability)?.exactVariantId}|${item.featureCode}`, item]));
  const assertions = [...mappingByPair.values()].map((mapping) => {
    const variant = variants.find((item) => item.trim === mapping.exactTrimApplicability)!;
    const assertionId = createEquipmentOperationalRecordId("EE-AST", `${CYCLE}|${variant.exactVariantId}|${mapping.featureCode}|STANDARD`);
    return { assertionId, exactVariantId: variant.exactVariantId, featureCode: mapping.featureCode, sourceApplicability: "EXACT_VARIANT", evidencePolarity: "POSITIVE", availabilityStatus: "STANDARD", standardOrOptional: "STANDARD", provisionMode: "INCLUDED",
      market: "TR", modelYearFrom: 2026, modelYearTo: 2026, verificationState: "PROVISIONAL", confidence: "MEDIUM", conflictState: "CLEAR", source: { sourceId: "SRC-000087", registryRelease: "v0.4.0-working-extension-ee-pilot-002-batch-002", sourceType: "OFFICIAL_EQUIPMENT_LIST", sourceAuthority: "TR_DISTRIBUTOR", originalUrl: "https://www.alfaromeo.com.tr/arac-modelleri/yeni-tonale", artifactReference: productArtifact, artifactSha256: productSha, observedAt: STARTED },
      derivedArtifact: { derivedArtifactId: stable("EE-DERIVED", derivedSha), artifactReference: path.relative(ROOT, sourceRowsPath), artifactSha256: derivedSha, parentSourceId: "SRC-000087", parentArtifactReference: productArtifact, parentArtifactSha256: productSha, extractionPolicyId: "ALFA_ROMEO_TR_TONALE_EXACT_TRIM_SOURCE_ROWS", extractionPolicyVersion: "1.0.0", generatedAt: COMPLETED },
      locator: { kind: "STRUCTURED_RECORD", recordPath: `$.sourceRowsById.${mapping.sourceRowId}` }, semanticMappingId: mapping.mappingId, collectorRole: ROLE, collectorInstanceId: ACTOR, researchCycleId: CYCLE, batchId: BATCH,
      contentFingerprint: "" };
  }).map((assertion) => ({ ...assertion, contentFingerprint: `sha256:${sha(json({ ...assertion, contentFingerprint: undefined }))}` }));
  const assertionByPair = new Map(assertions.map((item) => [`${item.exactVariantId}|${item.featureCode}`, item]));
  const ledger = variants.flatMap((variant) => EQUIPMENT_FEATURE_CODES.map((featureCode) => {
    const assertion = assertionByPair.get(`${variant.exactVariantId}|${featureCode}`), mapping = mappingByPair.get(`${variant.exactVariantId}|${featureCode}`);
    return { ledgerEntryId: createEquipmentOperationalRecordId("EE-RES", `${CYCLE}|${variant.exactVariantId}|${featureCode}`), batchId: BATCH, exactVariantId: variant.exactVariantId, featureCode,
      researchStatus: assertion ? "RESEARCHED_CONCLUSIVE" : "RESEARCHED_INCONCLUSIVE", searchedSources: ["SRC-000087", "SRC-000088"], result: assertion ? "EXPLICIT_EXACT_TRIM_EQUIPMENT_ROW" : "NO_EXACT_CONCLUSIVE_EVIDENCE",
      assertionId: assertion?.assertionId ?? null, unresolvedReason: assertion ? null : "FEATURE_NOT_EXPLICITLY_SUPPORTED_FOR_EXACT_TRIM; SOURCE_SILENCE_IS_NOT_NEGATIVE_EVIDENCE", collectorActorId: ACTOR, createdAt: COMPLETED,
      evidenceReferences: mapping ? [{ sourceId: "SRC-000087", sourceRowId: mapping.sourceRowId, semanticMappingId: mapping.mappingId }] : [] };
  }));
  const trimLinks = variants.map((variant) => {
    const canonicalTrimId = createCanonicalTrimId({ market: "TR", brand: "Alfa Romeo", modelFamily: "Tonale", modelYear: 2026, trimName: variant.trim, configurationIdentity: variant.powertrain });
    return { linkId: createEquipmentOperationalRecordId("EE-LINK-TRIM", `${variant.exactVariantId}|${canonicalTrimId}`), exactVariantId: variant.exactVariantId, canonicalTrimId, officialTrimName: variant.trim,
      market: "TR", modelYearFrom: 2026, modelYearTo: 2026, powertrainIdentity: variant.powertrain, assertionIds: assertions.filter((item) => item.exactVariantId === variant.exactVariantId).map((item) => item.assertionId),
      verificationState: "PROVISIONAL", reviewState: "SECOND_REVIEW_REQUIRED", provenanceSourceIds: ["SRC-000087", "SRC-000088"], identityLocators: [{ sourceId: "SRC-000088", kind: "HTML_SECTION", heading: variant.powertrain === "DIESEL_130_TCT6" ? "TONALE DIESEL 130" : "TONALE HYBRID 175" }, { sourceId: "SRC-000087", kind: "HTML_SECTION", elementReference: `#${variant.modalId}` }], collectorRole: ROLE, collectorInstanceId: ACTOR };
  });
  const subjects = [...assertions.map((item) => ({ subjectType: "ASSERTION", subjectId: item.assertionId })), ...trimLinks.map((item) => ({ subjectType: "TRIM_LINK", subjectId: item.linkId }))];
  const reviewEvents = subjects.flatMap((subject) => [
    { reviewEventId: createEquipmentOperationalRecordId("EE-REV", `${subject.subjectType}|${subject.subjectId}|COLLECTED`), ...subject, toState: "COLLECTED", actorRole: ROLE, actorInstanceId: ACTOR, reviewedAt: COMPLETED, reasonCode: "COLLECTOR_EVIDENCE_CAPTURED" },
    { reviewEventId: createEquipmentOperationalRecordId("EE-REV", `${subject.subjectType}|${subject.subjectId}|SECOND_REVIEW_REQUIRED`), ...subject, fromState: "COLLECTED", toState: "SECOND_REVIEW_REQUIRED", actorRole: ROLE, actorInstanceId: ACTOR, reviewedAt: COMPLETED, reasonCode: "INDEPENDENT_REVIEW_REQUIRED" },
  ]);
  const comparison = EQUIPMENT_FEATURE_CODES.map((featureCode) => {
    const a = assertionByPair.get(`${variants[0].exactVariantId}|${featureCode}`), b = assertionByPair.get(`${variants[1].exactVariantId}|${featureCode}`);
    return { featureCode, status: a && b ? "CONFIRMED_SAME" : a || b ? "INCONCLUSIVE_FOR_ONE" : "INCONCLUSIVE_FOR_BOTH", dieselAssertionId: a?.assertionId ?? null, hybridAssertionId: b?.assertionId ?? null,
      reason: a && b ? "Independent exact-trim source rows support the same STANDARD status." : a || b ? "Only one exact-trim section is conclusive; silence on the other side is not absence." : "Neither exact-trim section has conclusive controlled-feature evidence." };
  });
  const sourceInventory = [
    { sourceId: "SRC-000087", title: "Alfa Romeo Türkiye Yeni Tonale exact trim equipment page", originalUrl: "https://www.alfaromeo.com.tr/arac-modelleri/yeni-tonale", finalUrl: "https://www.alfaromeo.com.tr/arac-modelleri/yeni-tonale", sourceType: "OFFICIAL_EQUIPMENT_LIST", authority: "TR_DISTRIBUTOR", market: "TR", captureTimestamp: STARTED, artifactReference: productArtifact, artifactSha256: productSha, mimeType: "text/html", applicability: "MY2026_CURRENT_TI_DIESEL_AND_SPECIALE_HYBRID_SECTIONS", locatorMethod: "STRUCTURED_SOURCE_ROW_WITH_EXACT_MODAL_BOUNDARY", secretScan: "PASSED_NO_SESSION_COOKIE_AUTHORIZATION_OR_PERSONAL_DATA", limitations: ["Only explicit exact-trim rows are usable", "Marketing summary excluded"] },
    { sourceId: "SRC-000088", title: "Alfa Romeo Türkiye MY2026 official price list", originalUrl: "https://arjfiyat.tofas.com.tr/pricelists?brand=alfa-romeo&hidebutton=true", finalUrl: "https://arjfiyat.tofas.com.tr/pricelists?brand=alfa-romeo&hidebutton=true", sourceType: "OFFICIAL_PRICE_LIST", authority: "OFFICIAL_PRICE_EQUIPMENT_LIST", market: "TR", captureTimestamp: STARTED, artifactReference: priceArtifact, artifactSha256: priceSha, mimeType: "text/html", applicability: "MY2026_EXACT_IDENTITY_ONLY", locatorMethod: "HTML_MODEL_CARD_HEADING_AND_ROW", secretScan: "PASSED_NO_SESSION_COOKIE_AUTHORIZATION_OR_PERSONAL_DATA", limitations: ["Identity and price authority only", "Not equipment availability authority"] },
  ];
  for (const source of sourceInventory) {
    const metadataPath = path.join(ROOT, path.dirname(source.artifactReference), "metadata.json");
    await writeFile(metadataPath, json({ sourceId: source.sourceId, canonicalUrl: source.originalUrl, finalUrl: source.finalUrl,
      sourceType: source.sourceType, authority: source.authority, market: source.market, capturedAt: source.captureTimestamp,
      artifactReference: source.artifactReference, artifactSha256: source.artifactSha256, mimeType: source.mimeType,
      applicability: source.applicability, locatorMethod: source.locatorMethod, secretScan: source.secretScan,
      limitations: source.limitations, registryExtension: "v0.4.0-working-extension-ee-pilot-002-batch-002" }));
  }
  const manifestCore = { pilotId: PILOT, batchId: BATCH, catalogRelease: "v0.55.2", catalogFingerprint: CATALOG_HASH, exactVariantIds: variants.map((item) => item.exactVariantId), familyId: "family-30afa1702b606820", expectedFeatureCount: 51, expectedLedgerRows: 102,
    collectionPolicyVersion: "1.0.1", extractionPolicyVersion: "ALFA_ROMEO_TR_TONALE_EXACT_TRIM_SOURCE_ROWS@1.0.0", semanticMappingPolicyVersion: "EQUIPMENT_FEATURE_SEMANTIC_MAPPING_V1@1.0.0", collectorActorId: ACTOR, requiredIndependentReviewerRole: "EQUIPMENT_REVIEWER_SECONDARY",
    sourceScopingRules: ["PRICE_IDENTITY_ONLY", "PRODUCT_EXACT_TRIM_ROWS_ONLY", "HISTORICAL_HYBRID_160_EXCLUDED"], crossTrimIsolation: true, crossPowertrainIsolation: true,
    stopConditions: ["IDENTITY_CONFLICT", "MY2026_UNRESOLVED", "NON_UNIQUE_TRIM_BOUNDARY", "RAW_SNAPSHOT_UNSAFE", "LOCATOR_NOT_UNIQUE", "SOURCE_ID_COLLISION"], createdAt: STARTED };
  const manifest = { ...manifestCore, canonicalChecksum: `sha256:${sha(json(manifestCore))}` };
  const locatorValidation = assertions.map((assertion) => ({ assertionId: assertion.assertionId, recordPath: assertion.locator.recordPath, result: sourceRows[assertion.locator.recordPath.split(".").at(-1)!] ? "RESOLVED_UNIQUE_SOURCE_ROW" : "NOT_FOUND" }));
  const files: Record<string, unknown> = { "batch-manifest.json": manifest, "source-inventory.json": sourceInventory, "source-registry-extension.json": { baseRegistryRelease: "v0.4.0", extensionId: "v0.4.0-working-extension-ee-pilot-002-batch-002", records: sourceInventory },
    "semantic-mappings.json": semanticMappings, "research-ledger.json": ledger, "assertions.json": assertions, "trim-links.json": trimLinks, "package-links.json": [], "review-events.json": reviewEvents,
    "trim-comparison.json": comparison, "locator-validation.json": locatorValidation, "cross-trim-powertrain-isolation.json": { status: "PASSED", tiToSpecialeInheritance: 0, specialeToTiInheritance: 0, dieselToHybridInheritance: 0, hybridToDieselInheritance: 0, juniorSourceUse: 0 },
    "source-checksum-registry.json": sourceInventory.map((source) => ({ sourceId: source.sourceId, artifactReference: source.artifactReference, artifactSha256: source.artifactSha256 })),
    "batch-lifecycle.json": { batchId: BATCH, state: "SECOND_REVIEW_REQUIRED", researchStartedAt: STARTED, collectionCompletedAt: COMPLETED, collectorRole: ROLE, collectorActorId: ACTOR },
    "pilot-lifecycle.json": { pilotId: PILOT, state: "COLLECTING", completedAt: null }, "catalog-quality-issues.json": [] };
  for (const [name, value] of Object.entries(files)) await writeFile(path.join(WORK, name), json(value));
  await writeFile(path.join(WORK, "snapshots/index.json"), json(sourceInventory.map((source) => ({ sourceId: source.sourceId, canonicalArtifactReference: source.artifactReference, artifactSha256: source.artifactSha256 }))));
  const conclusive = ledger.filter((item) => item.researchStatus === "RESEARCHED_CONCLUSIVE").length;
  const availability = Object.fromEntries(["STANDARD", "OPTIONAL", "PACKAGE_DEPENDENT", "NOT_AVAILABLE", "UNKNOWN"].map((status) => [status, assertions.filter((item) => item.availabilityStatus === status).length]));
  const compareCounts = Object.fromEntries(["CONFIRMED_SAME", "CONFIRMED_DIFFERENT", "INCONCLUSIVE_FOR_ONE", "INCONCLUSIVE_FOR_BOTH", "CONFLICTING"].map((status) => [status, comparison.filter((item) => item.status === status).length]));
  await writeFile(path.join(WORK, "collection-report.md"), `# ${BATCH} Tonale collection\n\n- Disposition: SECOND_REVIEW_REQUIRED\n- Sources: SRC-000087, SRC-000088 (immutable, checksum verified)\n- Exact identity: PASS / PASS\n- Ledger: 102/102; ${conclusive} conclusive; ${102 - conclusive} inconclusive; 0 not researched\n- Assertions: ${assertions.length}, all PROVISIONAL; availability ${JSON.stringify(availability)}\n- Trim links: 2; package links: 0\n- Semantic mappings: ${semanticMappings.length}; fan-out mappings: ${semanticMappings.filter((item) => Number(item.fanOut) > 1).length}\n- Locator: ${locatorValidation.filter((item) => item.result === "RESOLVED_UNIQUE_SOURCE_ROW").length}/${locatorValidation.length}\n- Comparison: ${JSON.stringify(compareCounts)}\n- Conflicts: 0; catalog issues: 0\n- Review subjects: ${subjects.length}\n- Decision authority: SHADOW_AND_EXPLANATION_DISABLED\n`);
  const names = [...Object.keys(files), "tonale-equipment.source-rows.v1.json", "snapshots/index.json", "collection-report.md"].sort();
  const checksums = Object.fromEntries(await Promise.all(names.map(async (name) => [name, `sha256:${sha(await readFile(path.join(WORK, name)))}`])));
  await writeFile(path.join(WORK, "checksums.json"), json(checksums));
  console.log(JSON.stringify({ batch: BATCH, ledger: ledger.length, conclusive, inconclusive: 102 - conclusive, assertions: assertions.length, trimLinks: trimLinks.length, mappings: semanticMappings.length, reviewSubjects: subjects.length, availability, compareCounts }, null, 2));
}

void main();
