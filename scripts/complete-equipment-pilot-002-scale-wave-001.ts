import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { EQUIPMENT_FEATURE_CODES, type EquipmentFeatureCode } from "../types/equipmentEvidence";

const ROOT = process.cwd();
const WAVE_DIR = path.join(ROOT, "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-SCALE-WAVE-001");
const SNAPSHOT_ROOT = path.join(ROOT, "data/cars/vehicle_evidence/source_snapshots");
const CATALOG_FINGERPRINT = "sha256:fd5609adcc0ca3fec0f8c9dc4dd1c903ed5514326bd322eacd4decff5a044f0f";
const COMPLETED_AT = "2026-08-19T04:00:00.000+03:00";
const COLLECTOR = "ACTOR-COLLECTOR-CODEX-CATALOG-001";
const CHECKPOINT_MANIFEST_CHECKSUM = "sha256:2c0ff1240b7f6a7324b7e1499a81b446629188683d96ece0db8656e1f3df77b8";
const ACTIVE_POINTER_SHA256 = "sha256:4ba2ec5ee76a09906092c19446a2b4846015ac5fd8d08708056b413a721ec8ed";
const ACTIVE_MODULE_SHA256 = "sha256:9c5971b14716bc503a649f99790655bdddc02f8513a6e13b6f198749f0166fea";

type TerminalDisposition = "COLLECTION_COMPLETED" | "CATALOG_EVIDENCE_AUDIT_REQUIRED" | "DEFERRED_IDENTITY_AUDIT" | "SOURCE_INSUFFICIENT" | "COLLECTION_FAILED_SOURCE_ACCESS";
type Mapping = { featureCode: EquipmentFeatureCode; rawText: string; status: "STANDARD" | "NOT_AVAILABLE" | "ASSOCIATION"; page?: number; note?: string };
type ManifestVariant = { exactVariantId: string; canonicalBrand: string; canonicalModel: string; trim: string; modelYear: number; familyId: string; disposition: string; preflightReason: string };
type MicroBatch = { microBatchId: string; exactVariantIds: string[] };
type LedgerSummary = { disposition: string };
type ReviewBatchSummary = { subjectCounts: { total: number; [key: string]: number }; [key: string]: unknown };
type SourceReservation = { sourceId: string; status: string; artifactSha256?: string; [key: string]: unknown };

const sha = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const stable = (prefix: string, ...parts: string[]) => `${prefix}-${createHash("sha256").update(parts.join("\0")).digest("hex").slice(0, 24).toUpperCase()}`;
const json = async (file: string) => JSON.parse(await readFile(file, "utf8"));
const writeJson = async (file: string, value: unknown) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`); };

const completed: Record<string, { sourceId: string; sourceType: string; mappings: Mapping[]; identityReason: string }> = {
  "19951113-2e40-5526-b568-2ae1984c27e0": {
    sourceId: "SRC-000089", sourceType: "BROWSER_RENDERED_PUBLIC_DOM",
    identityReason: "Public TR configurator print explicitly states EX30 Ultra Single Motor Extended Range, Electric (2026), created 18.08.2026.",
    mappings: [
      ["ADAPTIVE_CRUISE_CONTROL", "Adaptif hız sabitleyici"], ["BLIND_SPOT_MONITOR", "Kör Nokta Bilgi Sistemi (BLIS)"],
      ["REAR_CROSS_TRAFFIC_ALERT", "Otomatik fren destekli arka çapraz uyarı sistemi"], ["TRAFFIC_SIGN_RECOGNITION", "Trafik İşareti Bilgisi"],
      ["DRIVER_ATTENTION_MONITOR", "Sürücü uyarı sistemi"], ["LANE_DEPARTURE_WARNING", "Şeritten ayrılma uyarı sistemi"],
      ["LANE_KEEP_ASSIST", "Şerit takip desteği"], ["LANE_CENTERING_ASSIST", "Pilot Assist"],
      ["SURROUND_VIEW_CAMERA_360", "360° kamera, 3D görünüm"], ["FRONT_PARKING_SENSORS", "Park yardımı, ön ve arka"],
      ["REAR_PARKING_SENSORS", "Park yardımı, ön ve arka"], ["AUTOMATIC_PARK_ASSIST", "Park Pilot Assist"],
      ["ISOFIX_REAR_OUTER", "ISOFIX çocuk koltuğu bağlantısı"], ["FRONT_SIDE_CURTAIN_AIRBAG_COVERAGE", "Perde Hava Yastığı"],
      ["HEATED_FRONT_SEATS", "Isıtmalı ön koltuklar"], ["POWER_DRIVER_SEAT", "Elektrikli sürücü koltuğu"],
      ["POWER_FRONT_PASSENGER_SEAT", "Elektrikli yolcu koltuğu"], ["HEATED_STEERING_WHEEL", "Isıtmalı direksiyon"],
      ["DUAL_ZONE_CLIMATE_CONTROL", "İki bölgeli klima sistemi"], ["POWER_TAILGATE", "Elektrikli bagaj kapağı"],
      ["PANORAMIC_GLASS_ROOF", "Panoramik tavan"], ["WIRELESS_APPLE_CARPLAY", "Kablosuz Apple CarPlay ve Android Auto"],
      ["WIRELESS_ANDROID_AUTO", "Kablosuz Apple CarPlay ve Android Auto"], ["WIRELESS_PHONE_CHARGING", "Kablosuz telefon şarjı"],
      ["LED_HEADLIGHTS", "LED ön farlar"], ["HILL_DESCENT_CONTROL", "Eğim İniş Kontrolü"],
    ].map(([featureCode, rawText]) => ({ featureCode: featureCode as EquipmentFeatureCode, rawText, status: ["HEATED_FRONT_SEATS", "HEATED_STEERING_WHEEL"].includes(featureCode) ? "STANDARD" : "ASSOCIATION" })),
  },
  "6cb56615-37ef-51a8-9202-a73e59d4e14b": {
    sourceId: "SRC-000092", sourceType: "OFFICIAL_EQUIPMENT_MATRIX",
    identityReason: "Official BYD Turkey DOLPHIN matrix is dated 28 March 2025 and has an explicit Comfort column with Standard/Not available legend.",
    mappings: [
      ["AUTONOMOUS_EMERGENCY_BRAKING", "Ön çarpma uyarısı (PCW) & Otonom acil durum freni (AEB)", "STANDARD", 3],
      ["FORWARD_COLLISION_WARNING", "Ön çarpma uyarısı (PCW) & Otonom acil durum freni (AEB)", "STANDARD", 3],
      ["LANE_KEEP_ASSIST", "Şerit takip asistanı (Direksiyon destekli) (LSS)", "STANDARD", 3],
      ["ADAPTIVE_CRUISE_CONTROL", "Adaptif hız sabitleme sistemi (ACC) & Akıllı hız sabitleme sistemi (ICC)", "STANDARD", 3],
      ["BLIND_SPOT_MONITOR", "Kör nokta uyarı sistemi (BSD) & Şerit değiştirme asistanı (LCA)", "STANDARD", 3],
      ["REAR_CROSS_TRAFFIC_ALERT", "Geri manevra çapraz trafik uyarısı (Fren destekli) (RCTB)", "STANDARD", 3],
      ["TRAFFIC_SIGN_RECOGNITION", "Trafik işareti algılama sistemi (TSR)", "STANDARD", 3],
      ["DRIVER_ATTENTION_MONITOR", "Sürücü yorgunluk algılama sistemi (DFM)", "STANDARD", 3],
      ["HIGH_BEAM_ASSIST", "Uzun far asistanı (HBA)", "STANDARD", 2],
      ["SURROUND_VIEW_CAMERA_360", "Panoramik görüş kamerası (360°)", "STANDARD", 3],
      ["FRONT_PARKING_SENSORS", "Ön ve arka park sensörü (2 x Ön, 3 x Arka)", "STANDARD", 3],
      ["REAR_PARKING_SENSORS", "Ön ve arka park sensörü (2 x Ön, 3 x Arka)", "STANDARD", 3],
      ["ISOFIX_REAR_OUTER", "Ön yolcu koltuğunda ve arka yan koltuklarda ISOFIX bağlantıları", "STANDARD", 3],
      ["ISOFIX_FRONT_PASSENGER", "Ön yolcu koltuğunda ve arka yan koltuklarda ISOFIX bağlantıları", "STANDARD", 3],
      ["FRONT_SIDE_CURTAIN_AIRBAG_COVERAGE", "Sürücü ve ön yolcu için yan hava yastıkları / Perde hava yastıkları", "STANDARD", 3],
      ["CENTER_AIRBAG", "Sürücü ve ön yolcu için ön-orta hava yastığı", "STANDARD", 3],
      ["REAR_SEAT_OCCUPANT_ALERT", "Çocuk varlık tespiti (CPD)", "STANDARD", 3],
      ["HEATED_FRONT_SEATS", "Isıtmalı ön koltuklar", "STANDARD", 2],
      ["VENTILATED_FRONT_SEATS", "Havalandırmalı ön koltuklar", "NOT_AVAILABLE", 2],
      ["POWER_DRIVER_SEAT", "6 yöne elektrikli ayarlanabilir sürücü koltuğu", "STANDARD", 2],
      ["POWER_FRONT_PASSENGER_SEAT", "4 yöne elektrikli ayarlanabilir ön yolcu koltuğu", "STANDARD", 2],
      ["HEATED_STEERING_WHEEL", "Çok fonksiyonlu, ısıtmalı vegan deri direksiyon simidi", "STANDARD", 2],
      ["KEYLESS_ENTRY", "Anahtarsız giriş ve anahtarsız çalıştırma", "STANDARD", 3],
      ["KEYLESS_START", "Anahtarsız giriş ve anahtarsız çalıştırma", "STANDARD", 3],
      ["PANORAMIC_GLASS_ROOF", "Panoramik cam tavan (Cam tavan perdesi ile)", "NOT_AVAILABLE", 2],
      ["APPLE_CARPLAY", "Apple CarPlay & Android Auto (Kablolu & kablosuz bağlantı)", "STANDARD", 2],
      ["WIRELESS_APPLE_CARPLAY", "Apple CarPlay & Android Auto (Kablolu & kablosuz bağlantı)", "STANDARD", 2],
      ["ANDROID_AUTO", "Apple CarPlay & Android Auto (Kablolu & kablosuz bağlantı)", "STANDARD", 2],
      ["WIRELESS_ANDROID_AUTO", "Apple CarPlay & Android Auto (Kablolu & kablosuz bağlantı)", "STANDARD", 2],
      ["WIRELESS_PHONE_CHARGING", "Akıllı telefonlar için havalandırmalı kablosuz şarj istasyonu (50 W)", "NOT_AVAILABLE", 2],
      ["LED_HEADLIGHTS", "LED ön farlar", "STANDARD", 2],
      ["AUTOMATIC_HIGH_BEAM", "Uzun far asistanı (HBA)", "STANDARD", 2],
      ["TERRAIN_DRIVE_MODES", "4 farklı sürüş modu (Eco, normal, spor, kar)", "STANDARD", 3],
    ].map(([featureCode, rawText, status, page]) => ({ featureCode: featureCode as EquipmentFeatureCode, rawText: String(rawText), status: status as Mapping["status"], page: Number(page) })),
  },
  "90e65f94-6fdb-5eea-ad7e-0b4e18435427": {
    sourceId: "SRC-000095", sourceType: "OFFICIAL_EQUIPMENT_MATRIX",
    identityReason: "Official Nissan Turkey MY2026 brochure identifies Qashqai Platinum Premium and e-POWER applicability; matrix legend explicitly separates Standard, Option and Not available.",
    mappings: [
      ["AUTONOMOUS_EMERGENCY_BRAKING", "Akıllı acil fren destek sistemi (AEBS) yaya, bisiklet ve kavşak algılama fonksiyonlu"],
      ["FORWARD_COLLISION_WARNING", "Önsezili Akıllı Çarpışma Uyarı Sistemi"], ["LANE_KEEP_ASSIST", "Akıllı Şerit Takip Sistemi"],
      ["LANE_CENTERING_ASSIST", "ProPILOT Akıllı Şerit Takip Sistemi"], ["ADAPTIVE_CRUISE_CONTROL", "Akıllı Hız Sabitleme Sistemi (ICC)"],
      ["BLIND_SPOT_MONITOR", "Akıllı Kör Nokta Önleme Sistemi"], ["REAR_CROSS_TRAFFIC_ALERT", "Akıllı Arka Çapraz Trafik Uyarı Sistemi (RCTA)"],
      ["TRAFFIC_SIGN_RECOGNITION", "Trafik işaretleri tanıma sistemi (TSR)"], ["DRIVER_ATTENTION_MONITOR", "Gelişmiş Yorgunluk Algılama Sistemi"],
      ["HIGH_BEAM_ASSIST", "Uzun Far Asistanı (AHB)"], ["SURROUND_VIEW_CAMERA_360", "Hareketli Nesne Algılama Özellikli 3D 360° Çevre Görüş Sistemi"],
      ["FRONT_PARKING_SENSORS", "Ön Park sensörü"], ["REAR_PARKING_SENSORS", "Arka Park Sensörü"],
      ["ISOFIX_REAR_OUTER", "ISOFIX Çocuk Koltuğu Sabitleme Mekanizması x2"], ["FRONT_SIDE_CURTAIN_AIRBAG_COVERAGE", "Sürücü, Yolcu, Yan ve Perde Hava Yastıkları"],
      ["HEATED_FRONT_SEATS", "Isıtmalı Ön Koltuklar"], ["POWER_DRIVER_SEAT", "Elektrikli, Hafızalı, Masaj Özellikli Sürücü ve Ön Yolcu Koltukları"],
      ["POWER_FRONT_PASSENGER_SEAT", "Elektrikli, Hafızalı, Masaj Özellikli Sürücü ve Ön Yolcu Koltukları"], ["DRIVER_SEAT_MEMORY", "Elektrikli, Hafızalı, Masaj Özellikli Sürücü ve Ön Yolcu Koltukları"],
      ["HEATED_STEERING_WHEEL", "Isıtmalı Deri Direksiyon"], ["DUAL_ZONE_CLIMATE_CONTROL", "Çift Bölgeli Otomatik Klima"],
      ["KEYLESS_ENTRY", "Akıllı Anahtar - Anahtarsız Giriş ve Çalıştırma"], ["KEYLESS_START", "Akıllı Anahtar - Anahtarsız Giriş ve Çalıştırma"],
      ["POWER_TAILGATE", "Akıllı Elektrikli Bagaj Kapağı"], ["PANORAMIC_GLASS_ROOF", "Panoramik Cam Tavan"],
      ["APPLE_CARPLAY", "Kablosuz Apple CarPlay ve Kablosuz Android Auto"], ["WIRELESS_APPLE_CARPLAY", "Kablosuz Apple CarPlay ve Kablosuz Android Auto"],
      ["ANDROID_AUTO", "Kablosuz Apple CarPlay ve Kablosuz Android Auto"], ["WIRELESS_ANDROID_AUTO", "Kablosuz Apple CarPlay ve Kablosuz Android Auto"],
      ["WIRELESS_PHONE_CHARGING", "Kablosuz Cep Telefonu Şarj Özelliği"], ["LED_HEADLIGHTS", "LED Ön Farlar"],
      ["MATRIX_LED_HEADLIGHTS", "Adaptif LED Matrix Ön Farlar ve Otomatik Yükseklik Ayarı"],
    ].map(([featureCode, rawText]) => ({ featureCode: featureCode as EquipmentFeatureCode, rawText, status: "STANDARD" as const, page: 13 })),
  },
};

const forcedTerminal: Record<string, { disposition: TerminalDisposition; reason: string }> = {
  "62465336-2cfb-4ccd-b9a7-36467d63497f": { disposition: "CATALOG_EVIDENCE_AUDIT_REQUIRED", reason: "Captured configurator encodes M2025 while catalog exact variant is MY2026." },
  "625c6cce-a78e-5d2d-a682-8feb90b09268": { disposition: "CATALOG_EVIDENCE_AUDIT_REQUIRED", reason: "Current 2026 price list identifies the configuration, but does not establish exact MY2026 applicability." },
  "75a0db67-272b-509f-8b60-312f2092a6b2": { disposition: "CATALOG_EVIDENCE_AUDIT_REQUIRED", reason: "Captured official equipment brochure is dated June 2022 and cannot support catalog MY2025 exact applicability." },
  "84b2d12e-6ed2-5b7f-9a18-6fe6c41914c7": { disposition: "CATALOG_EVIDENCE_AUDIT_REQUIRED", reason: "Current configurator proves the exact configuration and 2026 offer date but does not explicitly identify model year 2026." },
  "cb8f5af7-b20f-5877-a79b-4af71c18a61c": { disposition: "CATALOG_EVIDENCE_AUDIT_REQUIRED", reason: "Recovered 19 August 2026 official price list does not list Astra GS Hybrid 145; catalog identity requires audit." },
  "e09c81aa-6324-5b20-9cd8-90dc806a5ae9": { disposition: "CATALOG_EVIDENCE_AUDIT_REQUIRED", reason: "Official page lists Easy and 1.6 MultiJet 130 manual separately without exact trim-powertrain applicability linkage." },
};

async function sourceMetadata(sourceId: string) {
  return json(path.join(SNAPSHOT_ROOT, sourceId, "2026-08-19", "metadata.json"));
}

async function main() {
  const [manifest, preResumeChecksums, checkpoint, reservations, activePointer, activeModule] = await Promise.all([
    json(path.join(WAVE_DIR, "wave-manifest.json")), json(path.join(WAVE_DIR, "checksums.json")), json(path.join(WAVE_DIR, "checkpoint.json")),
    json(path.join(WAVE_DIR, "source-id-reservations.json")), readFile(path.join(ROOT, "data/production/equipment-evidence/active.json")),
    readFile(path.join(ROOT, "data/production/equipment-evidence/activeEquipmentEvidence.generated.ts")),
  ]);
  if (manifest.canonicalChecksum !== CHECKPOINT_MANIFEST_CHECKSUM) throw new Error("CHECKPOINT_MANIFEST_CHECKSUM_MISMATCH");
  for (const [file, digest] of Object.entries(preResumeChecksums as Record<string, string>)) {
    if (sha(await readFile(path.join(WAVE_DIR, file))) !== digest) throw new Error(`CHECKPOINT_FILE_MISMATCH:${file}`);
  }
  for (const entry of checkpoint.immutableArtifactChecksums) {
    const meta = await sourceMetadata(entry.sourceId);
    if (meta.artifactSha256 !== entry.artifactSha256 || sha(await readFile(path.join(ROOT, meta.artifactReference))) !== entry.artifactSha256) throw new Error(`SOURCE_CHECKSUM_MISMATCH:${entry.sourceId}`);
  }
  if (sha(activePointer) !== ACTIVE_POINTER_SHA256 || sha(activeModule) !== ACTIVE_MODULE_SHA256) throw new Error("ACTIVE_EQUIPMENT_POINTER_CHANGED");

  const variants = manifest.variants as ManifestVariant[];
  const batchByVariant = new Map<string, string>();
  for (const batch of manifest.microBatches as MicroBatch[]) for (const id of batch.exactVariantIds) batchByVariant.set(id, batch.microBatchId);
  const terminal = variants.map((variant) => {
    if (completed[variant.exactVariantId]) return { exactVariantId: variant.exactVariantId, microBatchId: batchByVariant.get(variant.exactVariantId), disposition: "COLLECTION_COMPLETED" as const, reason: completed[variant.exactVariantId].identityReason };
    if (forcedTerminal[variant.exactVariantId]) return { exactVariantId: variant.exactVariantId, microBatchId: batchByVariant.get(variant.exactVariantId), ...forcedTerminal[variant.exactVariantId] };
    return { exactVariantId: variant.exactVariantId, microBatchId: batchByVariant.get(variant.exactVariantId), disposition: variant.disposition as TerminalDisposition, reason: variant.preflightReason };
  });
  if (terminal.length !== 24 || new Set(terminal.map((item) => item.exactVariantId)).size !== 24) throw new Error("TERMINAL_COVERAGE_MISMATCH");

  const allLedger: LedgerSummary[] = []; const allAssertions: unknown[] = []; const allAssociations: unknown[] = []; const allMappings: unknown[] = []; const allTrimLinks: unknown[] = []; const reviewBatches: ReviewBatchSummary[] = [];
  for (const variant of variants) {
    const batchId = batchByVariant.get(variant.exactVariantId)!;
    const batchDir = path.join(WAVE_DIR, "micro-batches", batchId);
    const result = terminal.find((item) => item.exactVariantId === variant.exactVariantId)!;
    if (result.disposition !== "COLLECTION_COMPLETED") {
      await writeJson(path.join(batchDir, "terminal-result.json"), { ...result, ledgerRows: 0, assertions: 0, associations: 0, trimLinks: 0, collectionStarted: false, activePointerChanged: false });
      continue;
    }
    const config = completed[variant.exactVariantId];
    const meta = await sourceMetadata(config.sourceId);
    const uniqueRows = [...new Map(config.mappings.map((item) => [item.rawText, item])).values()];
    const rows = uniqueRows.map((item, index) => ({ sourceRowId: stable("EE-ROW", config.sourceId, item.rawText), sourceOrder: index + 1, rawText: item.rawText, normalizedText: item.rawText.normalize("NFKC"), locator: item.page ? { kind: "PDF_PAGE", pageNumber: item.page, row: item.rawText } : { kind: "STRUCTURED_RECORD", recordPath: `$.visibleTextRows.${stable("EE-ROW", config.sourceId, item.rawText)}` } }));
    const mappings = config.mappings.map((item) => ({ mappingId: stable("EE-MAP", variant.exactVariantId, item.featureCode, item.rawText), sourceRowId: stable("EE-ROW", config.sourceId, item.rawText), featureCode: item.featureCode, mappingPolicyId: "EQUIPMENT_FEATURE_SEMANTIC_MAPPING_V1", mappingReasonCode: "OFFICIAL_PHRASE_DIRECT_CONTROLLED_FEATURE_MATCH", sourcePhrase: item.rawText, mappingState: "PROVISIONAL", collectorRole: "EQUIPMENT_COLLECTOR_PRIMARY", collectorInstanceId: COLLECTOR }));
    const assertions = config.mappings.filter((item) => item.status !== "ASSOCIATION").map((item) => {
      const assertionId = stable("EE-AST", "EE-PILOT-002-SCALE-WAVE-001", variant.exactVariantId, item.featureCode);
      const negative = item.status === "NOT_AVAILABLE";
      return { assertionId, featureCode: item.featureCode, exactVariantId: variant.exactVariantId, sourceApplicability: "EXACT_VARIANT", source: { sourceId: config.sourceId, registryRelease: "equipment-source-registry-v1", sourceType: config.sourceType === "BROWSER_RENDERED_PUBLIC_DOM" ? "OFFICIAL_CONFIGURATOR" : "OFFICIAL_EQUIPMENT_LIST", sourceAuthority: config.sourceType === "BROWSER_RENDERED_PUBLIC_DOM" ? "OFFICIAL_CONFIGURATOR" : "OFFICIAL_BROCHURE", originalUrl: meta.originalUrl, artifactReference: meta.artifactReference, artifactSha256: meta.artifactSha256, observedAt: meta.capturedAt ?? meta.capturedAt, publishedAt: variant.exactVariantId === "6cb56615-37ef-51a8-9202-a73e59d4e14b" ? "2025-03-28" : undefined }, locator: item.page ? { kind: "PDF_PAGE", pageNumber: item.page, row: item.rawText, column: variant.trim } : { kind: "STRUCTURED_RECORD", recordPath: `$.visibleTextRows.${stable("EE-ROW", config.sourceId, item.rawText)}` }, semanticMappingId: stable("EE-MAP", variant.exactVariantId, item.featureCode, item.rawText), market: "TR", modelYearFrom: variant.modelYear, modelYearTo: variant.modelYear, evidencePolarity: negative ? "NEGATIVE" : "POSITIVE", negativeEvidenceReason: negative ? "OFFICIAL_EQUIPMENT_MATRIX_EXPLICIT_ABSENCE" : undefined, availabilityStatus: negative ? "NOT_AVAILABLE" : "STANDARD", provisionMode: negative ? "NOT_OFFERED" : "INCLUDED", verificationState: "PROVISIONAL", confidence: "HIGH", conflictState: "CLEAR", collectionContext: { waveId: manifest.waveId, microBatchId: batchId, collectorActorId: COLLECTOR } };
    });
    const associations = config.mappings.filter((item) => item.status === "ASSOCIATION").map((item) => ({ observationId: stable("EE-OBS", manifest.waveId, variant.exactVariantId, item.featureCode), observationType: "LISTED_FOR_EXACT_TRIM", exactVariantId: variant.exactVariantId, featureCode: item.featureCode, provisionKnowledge: "PROVISION_UNRESOLVED", sourceId: config.sourceId, sourceRowId: stable("EE-ROW", config.sourceId, item.rawText), semanticMappingId: stable("EE-MAP", variant.exactVariantId, item.featureCode, item.rawText), marketApplicability: "TR", modelYearApplicability: [variant.modelYear], trimApplicability: variant.trim, powertrainApplicability: "EXACT_CATALOG_POWERTRAIN", verificationState: "PROVISIONAL", reviewState: "SECOND_REVIEW_REQUIRED", decisionUse: "CONFIRMATION_REQUIRED", confidence: "MEDIUM", conflictState: "CLEAR", collectorActorId: COLLECTOR, contentFingerprint: sha(`${variant.exactVariantId}\0${item.featureCode}\0${item.rawText}`), createdAt: COMPLETED_AT }));
    const assertionByFeature = new Map(assertions.map((item) => [item.featureCode, item.assertionId]));
    const associationByFeature = new Map(associations.map((item) => [item.featureCode, item.observationId]));
    const ledger = EQUIPMENT_FEATURE_CODES.map((featureCode) => ({ ledgerEntryId: stable("EE-RES", manifest.waveId, variant.exactVariantId, featureCode), exactVariantId: variant.exactVariantId, featureCode, disposition: assertionByFeature.has(featureCode) || associationByFeature.has(featureCode) ? "RESEARCHED_CONCLUSIVE" : "RESEARCHED_INCONCLUSIVE", researchCycleId: `${manifest.waveId}-${batchId}`, updatedAt: COMPLETED_AT, sourceIds: [config.sourceId], assertionIds: assertionByFeature.has(featureCode) ? [assertionByFeature.get(featureCode)] : [], associationObservationIds: associationByFeature.has(featureCode) ? [associationByFeature.get(featureCode)] : [], collectorRole: "EQUIPMENT_COLLECTOR_PRIMARY", collectorInstanceId: COLLECTOR, inconclusiveReason: assertionByFeature.has(featureCode) || associationByFeature.has(featureCode) ? undefined : "NO_EXACT_CONTROLLED_FEATURE_EVIDENCE_IN_REVIEWED_SOURCE" }));
    const trimLink = { linkId: stable("EE-LINK-TRIM", manifest.waveId, variant.exactVariantId), exactVariantId: variant.exactVariantId, canonicalTrimId: stable("EE-TRIM", "TR", variant.canonicalBrand, variant.canonicalModel, String(variant.modelYear), variant.trim), market: "TR", modelYearFrom: variant.modelYear, modelYearTo: variant.modelYear, assertionIds: assertions.map((item) => item.assertionId), verificationState: "PROVISIONAL", reviewState: "SECOND_REVIEW_REQUIRED", sourceId: config.sourceId, identityReason: config.identityReason };
    const reviewSubjects = [...assertions.map((item) => ({ subjectType: "ASSERTION", subjectId: item.assertionId })), ...associations.map((item) => ({ subjectType: "ASSOCIATION_OBSERVATION", subjectId: item.observationId })), { subjectType: "TRIM_LINK", subjectId: trimLink.linkId }];
    await Promise.all([
      writeJson(path.join(batchDir, "raw-source-rows.json"), { schemaVersion: "1.0.0", sourceId: config.sourceId, exactVariantId: variant.exactVariantId, rows }),
      writeJson(path.join(batchDir, "semantic-mappings.json"), { policyVersion: "EQUIPMENT_FEATURE_SEMANTIC_MAPPING_V1", mappings }),
      writeJson(path.join(batchDir, "research-ledger.json"), { entries: ledger }),
      writeJson(path.join(batchDir, "assertions.json"), { assertions }),
      writeJson(path.join(batchDir, "association-observations.json"), { observations: associations }),
      writeJson(path.join(batchDir, "trim-links.json"), { trimLinks: [trimLink] }),
      writeJson(path.join(batchDir, "package-links.json"), { packageLinks: [] }),
      writeJson(path.join(batchDir, "review-index.json"), { independentReviewRequired: true, collectorCannotReview: true, subjects: reviewSubjects, riskFlags: ["PROVISIONAL_ONLY", ...(associations.length ? ["PROVISION_UNRESOLVED_ASSOCIATIONS"] : [])] }),
      writeJson(path.join(batchDir, "terminal-result.json"), { ...result, ledgerRows: ledger.length, assertions: assertions.length, associations: associations.length, trimLinks: 1, packageLinks: 0, inconclusive: ledger.filter((item) => item.disposition === "RESEARCHED_INCONCLUSIVE").length, collectionStarted: true, lifecycleState: "SECOND_REVIEW_REQUIRED", activePointerChanged: false }),
    ]);
    allLedger.push(...ledger); allAssertions.push(...assertions); allAssociations.push(...associations); allMappings.push(...mappings); allTrimLinks.push(trimLink);
    reviewBatches.push({ microBatchId: batchId, exactVariantId: variant.exactVariantId, subjectCounts: { assertions: assertions.length, associations: associations.length, trimLinks: 1, packageLinks: 0, total: reviewSubjects.length }, evidenceTypeCounts: { explicitProvision: assertions.length, exactTrimAssociation: associations.length, inconclusive: ledger.filter((item) => item.disposition === "RESEARCHED_INCONCLUSIVE").length }, sourceIds: [config.sourceId], sourceChecksums: [meta.artifactSha256], provisionConfidence: associations.length ? "MIXED_EXPLICIT_AND_UNRESOLVED" : "EXPLICIT", reviewRisk: associations.length ? "MEDIUM" : "LOW", expectedReviewEffort: reviewSubjects.length > 30 ? "HIGH" : "MEDIUM", reviewerIndependenceRequired: true });
  }

  const recoveredSources = await Promise.all(["SRC-000089", "SRC-000095", "SRC-000096", "SRC-000097"].map(sourceMetadata));
  const updatedReservations = (reservations.reservations as SourceReservation[]).map((item) => {
    const recovered = recoveredSources.find((meta) => meta.sourceId === item.sourceId);
    return recovered ? { ...item, status: "CAPTURED_IMMUTABLE_RECOVERY", originalUrl: recovered.originalUrl, finalUrl: recovered.finalUrl ?? recovered.originalUrl, sourceType: recovered.sourceType, capturedAt: recovered.capturedAt, artifactReference: recovered.artifactReference, artifactSha256: recovered.artifactSha256, mimeType: recovered.mimeType ?? (String(recovered.artifactReference).endsWith(".pdf") ? "application/pdf" : "text/plain"), recoveryPolicy: "ONE_BOUNDED_OFFICIAL_PUBLIC_RECOVERY_CHAIN" } : item;
  });
  await writeJson(path.join(WAVE_DIR, "source-id-reservations.json"), { ...reservations, resumedAt: COMPLETED_AT, reservations: updatedReservations });
  await writeJson(path.join(WAVE_DIR, "source-recovery-report.json"), {
    policyVersion: "ONE_BOUNDED_OFFICIAL_PUBLIC_RECOVERY_CHAIN_V1",
    attemptedSourceIds: ["SRC-000089", "SRC-000095", "SRC-000096", "SRC-000097"],
    recoveredCount: recoveredSources.length,
    failedCount: 0,
    sources: recoveredSources,
    outcomes: [
      { sourceId: "SRC-000089", result: "COLLECTION_COMPLETED", method: "BROWSER_RENDERED_PUBLIC_DOM" },
      { sourceId: "SRC-000095", result: "COLLECTION_COMPLETED", method: "OFFICIAL_NAVIGATION_TO_CURRENT_PDF" },
      { sourceId: "SRC-000096", result: "CATALOG_EVIDENCE_AUDIT_REQUIRED", method: "OFFICIAL_NAVIGATION_TO_CURRENT_PDF" },
      { sourceId: "SRC-000097", result: "CATALOG_EVIDENCE_AUDIT_REQUIRED", method: "BROWSER_RENDERED_PUBLIC_DOM" },
    ],
    completedAt: COMPLETED_AT,
  });
  await writeJson(path.join(WAVE_DIR, "terminal-dispositions.json"), { waveId: manifest.waveId, terminalAt: COMPLETED_AT, entries: terminal });
  await writeJson(path.join(WAVE_DIR, "wave-independent-review-index.json"), { waveId: manifest.waveId, reviewStatus: "INDEPENDENT_REVIEW_NOT_STARTED", collectorActorId: COLLECTOR, batches: reviewBatches });
  const counts = Object.fromEntries(["COLLECTION_COMPLETED", "CATALOG_EVIDENCE_AUDIT_REQUIRED", "DEFERRED_IDENTITY_AUDIT", "SOURCE_INSUFFICIENT", "COLLECTION_FAILED_SOURCE_ACCESS"].map((key) => [key, terminal.filter((item) => item.disposition === key).length]));
  const aggregationCore = { waveId: manifest.waveId, disposition: counts.COLLECTION_COMPLETED > 0 && terminal.length === 24 ? "COMPLETED_WITH_DEFERRED_AND_AUDIT_BACKLOG" : counts.COLLECTION_COMPLETED === 0 ? "COMPLETED_WITHOUT_COLLECTABLE_EVIDENCE" : "CHECKPOINT_INCOMPLETE", terminalVariantCount: terminal.length, terminalDispositionCounts: counts, collectionCompletedExactVariantIds: terminal.filter((item) => item.disposition === "COLLECTION_COMPLETED").map((item) => item.exactVariantId).sort(), ledgerRowCount: allLedger.length, assertionCount: allAssertions.length, associationObservationCount: allAssociations.length, inconclusiveCount: allLedger.filter((item) => item.disposition === "RESEARCHED_INCONCLUSIVE").length, trimLinkCount: allTrimLinks.length, packageLinkCount: 0, semanticMappingCount: allMappings.length, reviewSubjectCount: reviewBatches.reduce((sum, item) => sum + item.subjectCounts.total, 0), conflictCount: 0, sourceSnapshotCount: updatedReservations.filter((item) => item.status.startsWith("CAPTURED_IMMUTABLE")).length, sourceFailureCount: terminal.filter((item) => item.disposition === "COLLECTION_FAILED_SOURCE_ACCESS").length, catalogRelease: manifest.catalogRelease, catalogFingerprint: CATALOG_FINGERPRINT, activePointerChanged: false, decisionEngineEffect: "ZERO", completedAt: COMPLETED_AT };
  const aggregation = { ...aggregationCore, canonicalChecksum: sha(JSON.stringify(aggregationCore)) };
  await writeJson(path.join(WAVE_DIR, "wave-aggregation-report.json"), aggregation);
  await writeJson(path.join(WAVE_DIR, "resume-integrity-report.json"), { status: "PASSED", manifestCanonicalChecksum: manifest.canonicalChecksum, expectedManifestCanonicalChecksum: CHECKPOINT_MANIFEST_CHECKSUM, preResumeCheckpointFileChecksum: preResumeChecksums["checkpoint.json"], fiveOriginalSnapshotChecksumsVerified: true, batch001002ImmutabilityEnforcedByNoWriteScope: true, activePointerSha256: sha(activePointer), activeGeneratedModuleSha256: sha(activeModule), existingSourceIdsReusedWithoutReallocation: true, verifiedAt: COMPLETED_AT });
  const checkpointCore = { waveId: manifest.waveId, state: "TERMINAL_COLLECTION_READY_FOR_INDEPENDENT_REVIEW", completedMicroBatches: (manifest.microBatches as MicroBatch[]).map((item) => item.microBatchId), inProgressMicroBatches: [], notStartedMicroBatches: [], terminalVariantCount: 24, collectionCompletedVariantCount: counts.COLLECTION_COMPLETED, allocatedSourceIds: updatedReservations.map((item) => item.sourceId), immutableArtifactChecksums: updatedReservations.filter((item) => item.status.startsWith("CAPTURED_IMMUTABLE")).map((item) => ({ sourceId: item.sourceId, artifactSha256: item.artifactSha256 })), activePointerChanged: false, decisionEngineEffect: "ZERO", generatedAt: COMPLETED_AT };
  await writeJson(path.join(WAVE_DIR, "checkpoint.json"), { ...checkpointCore, safeResumeToken: sha(JSON.stringify(checkpointCore)) });
  const checksumFiles = ["wave-manifest.json", "source-id-reservations.json", "identity-source-preflight.json", "micro-batch-index.json", "audit-deferred-backlog.json", "source-capture-report.json", "source-recovery-report.json", "terminal-dispositions.json", "wave-independent-review-index.json", "wave-aggregation-report.json", "resume-integrity-report.json", "checkpoint.json"];
  const checksums = Object.fromEntries(await Promise.all(checksumFiles.map(async (file) => [file, sha(await readFile(path.join(WAVE_DIR, file)))])));
  await writeJson(path.join(WAVE_DIR, "checksums.json"), checksums);
  console.log(JSON.stringify({ ...aggregation, activePointerSha256: sha(activePointer), activeModuleSha256: sha(activeModule) }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
