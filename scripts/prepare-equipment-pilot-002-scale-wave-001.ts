import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeCatalogIdentity } from "../features/decision/v2/catalog/normalization";

const ROOT = process.cwd();
const PILOT_DIR = path.join(ROOT, "data/production/equipment-evidence/pilots/pilot-v1.0.2-catalog-v0.55.2-2026-08-18");
const WAVE_DIR = path.join(ROOT, "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-SCALE-WAVE-001");
const CATALOG_PATH = path.join(ROOT, "data/production/catalog/releases/v0.55.2/catalog.json");
const CATALOG_FINGERPRINT = "sha256:fd5609adcc0ca3fec0f8c9dc4dd1c903ed5514326bd322eacd4decff5a044f0f";
const GENERATED_AT = "2026-08-19T00:00:00.000+03:00";
const EXCLUDED = new Set([
  "1a3cc01d-3bfa-56f3-817f-4cc77e723ef8", "5a64b246-3b05-52b6-9f24-b8f52ccc2305",
  "54bbe431-a3c2-56d0-8177-cefdf0330bcb", "f12f742b-111c-54de-a006-61361fb1ae04",
]);
const ALPINE = new Set(["bdf54f5b-2c18-5505-8875-0157f5bd1db7", "f954d7a8-b69b-5ee2-b3ad-a4638772725a"]);

type Gate = "EXACT_IDENTITY_CONFIRMED" | "EXACT_IDENTITY_PARTIALLY_CONFIRMED" | "EXACT_IDENTITY_NOT_CONFIRMED" | "IDENTITY_CONFLICT";
type Disposition = "COLLECTION_APPROVED" | "DEFERRED_IDENTITY_AUDIT" | "CATALOG_EVIDENCE_AUDIT_REQUIRED" | "SOURCE_INSUFFICIENT";
type Preflight = { gate: Gate; disposition: Disposition; sourceUrl?: string; sourceType?: string; reason: string };
type PilotVariant = { exactVariantId: string; canonicalBrand: string; canonicalModel: string; pairedFamilyId?: string; [key: string]: unknown };
type CatalogRecord = { variant: { id: string; market: string; lifecycleStatus: string; powertrain?: { transmission?: { value?: string } } } };
type EnrichedVariant = PilotVariant & { familyId: string; disposition: Disposition; preflightReason: string; officialSourceUrl: string | null; officialSourceType: string | null };
type MicroBatch = { microBatchId: string; familyId: string; exactVariantIds: string[]; brandModels: string[]; disposition: Disposition; expectedLedgerRows: number };

const PREFLIGHT: Record<string, Preflight> = {
  "19951113-2e40-5526-b568-2ae1984c27e0": { gate: "EXACT_IDENTITY_CONFIRMED", disposition: "COLLECTION_APPROVED", sourceUrl: "https://www.volvocars.com/tr/build/print?token=17411673982122151385", sourceType: "OFFICIAL_CONFIGURATOR_PRINT", reason: "TR configurator print identifies EX30 Ultra, Single Motor Extended Range, electric and MY2026 with included equipment." },
  "2f5054d1-1c11-5c34-a815-8223facf9892": { gate: "EXACT_IDENTITY_PARTIALLY_CONFIRMED", disposition: "CATALOG_EVIDENCE_AUDIT_REQUIRED", sourceUrl: "https://www.fiat.com.tr/modeller/egea/cross", sourceType: "OFFICIAL_PRODUCT_PAGE", reason: "Street and 1.6 MultiJet 130 are visible, but the exact Street+DCT+MY2026 applicability chain is not explicit in one immutable configuration." },
  "3383408d-d77b-5643-93ee-8dc0cb3465a0": { gate: "EXACT_IDENTITY_PARTIALLY_CONFIRMED", disposition: "CATALOG_EVIDENCE_AUDIT_REQUIRED", sourceUrl: "https://www.mercedes-benz.com.tr/vans/models/vito/panel-van/overview.html", sourceType: "OFFICIAL_PRODUCT_PAGE", reason: "Panelvan and SELECT equipment are official; exact 114 CDI Select MY2026 applicability remains unresolved." },
  "3d0f2b09-791e-5d76-9257-ec6be591c4eb": { gate: "EXACT_IDENTITY_PARTIALLY_CONFIRMED", disposition: "CATALOG_EVIDENCE_AUDIT_REQUIRED", sourceUrl: "https://www.peugeot.com.tr/content/dam/peugeot/turkey/b2c/brosurler/2025/ocak/0009_E_2008_Teknik_Brosur.pdf", sourceType: "OFFICIAL_BROCHURE", reason: "GT 115 kW is documented, but the available document does not establish catalog MY2026 applicability." },
  "3dceba8a-9f0a-56ac-aabc-515193e1c62a": { gate: "EXACT_IDENTITY_PARTIALLY_CONFIRMED", disposition: "CATALOG_EVIDENCE_AUDIT_REQUIRED", sourceUrl: "https://compare.porsche.com/tr-TR?model-series=taycan", sourceType: "OFFICIAL_COMPARISON", reason: "Current official comparison is MY2027; exact catalog MY2026 temporal applicability is unresolved." },
  "61b1bb40-dce9-5e01-97d2-5ba0167b3062": { gate: "IDENTITY_CONFLICT", disposition: "CATALOG_EVIDENCE_AUDIT_REQUIRED", sourceUrl: "https://www.fiat.com.tr/professional/modeller/doblo-combi", sourceType: "OFFICIAL_PRODUCT_PAGE", reason: "Current TR offering identifies named trims and BlueHDi 130 automatic; catalog uses Combi as the trim, so exact trim identity conflicts." },
  "62465336-2cfb-4ccd-b9a7-36467d63497f": { gate: "EXACT_IDENTITY_CONFIRMED", disposition: "COLLECTION_APPROVED", sourceUrl: "https://www.renault.com.tr/hybrid-araclar/captur-e-tech/konfigurator-yeni.html", sourceType: "OFFICIAL_CONFIGURATOR", reason: "TR configurator explicitly identifies techno mild hybrid EDC 140 hp and separates standard/optional equipment." },
  "625c6cce-a78e-5d2d-a682-8feb90b09268": { gate: "EXACT_IDENTITY_CONFIRMED", disposition: "COLLECTION_APPROVED", sourceUrl: "https://www.togg.com.tr/en/t10f-price-list", sourceType: "OFFICIAL_PRICE_AND_OPTION_LIST", reason: "Official TR price list identifies V1 RWD Long Range and option applicability; equipment beyond explicit options remains unresolved." },
  "64996711-e8a8-5d7e-b92e-4a2c3c5e46f1": { gate: "EXACT_IDENTITY_PARTIALLY_CONFIRMED", disposition: "CATALOG_EVIDENCE_AUDIT_REQUIRED", sourceUrl: "https://www.fiat.com.tr/professional/modeller/ducato-minibus", sourceType: "OFFICIAL_PRODUCT_PAGE", reason: "16+1 body is official, but exact 2.2 180+MY2026 configuration and trim equipment boundary are not explicit." },
  "6cb56615-37ef-51a8-9202-a73e59d4e14b": { gate: "EXACT_IDENTITY_CONFIRMED", disposition: "COLLECTION_APPROVED", sourceUrl: "https://www.bydauto.com.tr/storage/pdf/byd-dolphin-teknik-ozellikler-ve-donanim-tablosu-030425.pdf", sourceType: "OFFICIAL_EQUIPMENT_MATRIX", reason: "Official TR 2025 DOLPHIN equipment matrix explicitly identifies Comfort and standard/not-available semantics." },
  "6d6c0805-8779-5764-a42a-48850990a60c": { gate: "EXACT_IDENTITY_PARTIALLY_CONFIRMED", disposition: "CATALOG_EVIDENCE_AUDIT_REQUIRED", sourceUrl: "https://fiyatlistesi.audi.com.tr/2025/4N", sourceType: "OFFICIAL_PRICE_LIST", reason: "Official source identifies A8 L 50 TDI quattro as MY2025, not catalog MY2026." },
  "75a0db67-272b-509f-8b60-312f2092a6b2": { gate: "EXACT_IDENTITY_CONFIRMED", disposition: "COLLECTION_APPROVED", sourceUrl: "https://www.hyundai.com/content/dam/hyundai/tr/tr/data/marketing/brochure/product/tucson-n-line/Tucson-Hibrit-ve-N-Line-brosur.pdf", sourceType: "OFFICIAL_EQUIPMENT_MATRIX", reason: "Official TR brochure separates HEV-compatible Elite equipment with explicit standard/optional/absent markers." },
  "84b2d12e-6ed2-5b7f-9a18-6fe6c41914c7": { gate: "EXACT_IDENTITY_CONFIRMED", disposition: "COLLECTION_APPROVED", sourceUrl: "https://www.dacia.com.tr/modeller/yeni-logan/modeller-versiyonlar.html?gradeCode=ENS_MDL2P1SERIELIM2", sourceType: "OFFICIAL_CONFIGURATOR", reason: "Official TR configurator identifies Logan Expression Eco-G 120 auto/EDC; only exact visible equipment rows may be collected." },
  "8833b383-4379-54e8-a017-fac236dcca0f": { gate: "EXACT_IDENTITY_PARTIALLY_CONFIRMED", disposition: "CATALOG_EVIDENCE_AUDIT_REQUIRED", sourceUrl: "https://finder.porsche.com/tr/tr-TR", sourceType: "OFFICIAL_STOCK_FINDER", reason: "Model-family stock visibility does not establish exact Boxster MY2026 configuration applicability." },
  "90e65f94-6fdb-5eea-ad7e-0b4e18435427": { gate: "EXACT_IDENTITY_CONFIRMED", disposition: "COLLECTION_APPROVED", sourceUrl: "https://www.nissan.com.tr/content/dam/Nissan/turkey/brochures/NISSAN_QASHQAI_BROSUR_260211_WEB.pdf", sourceType: "OFFICIAL_EQUIPMENT_BROCHURE", reason: "Official TR MY2026 brochure identifies Platinum Premium e-POWER and explicit standard equipment." },
  "95bd2cd3-7940-5678-8a8f-56ec41f5c3d0": { gate: "EXACT_IDENTITY_NOT_CONFIRMED", disposition: "SOURCE_INSUFFICIENT", reason: "No official Turkey-market exact MY2026 Continental GT Speed Hybrid equipment source was located." },
  "9d6a26bb-88c0-596e-9905-246e1371e27a": { gate: "EXACT_IDENTITY_PARTIALLY_CONFIRMED", disposition: "CATALOG_EVIDENCE_AUDIT_REQUIRED", sourceUrl: "https://www.hyundai.com/tr/tr/modeller/kona/performans.html", sourceType: "OFFICIAL_PRODUCT_PAGE", reason: "Current page confirms 180 PS+DCT but exact Prime+MY2026 equipment applicability is not established by the available older matrix." },
  "b1dc656b-e78c-57ab-9a44-924716ba6c2b": { gate: "EXACT_IDENTITY_NOT_CONFIRMED", disposition: "SOURCE_INSUFFICIENT", reason: "No official Turkey-market exact MY2026 Continental GTC Speed Hybrid equipment source was located." },
  "bad56151-8735-569c-ad4f-129880820a0e": { gate: "EXACT_IDENTITY_PARTIALLY_CONFIRMED", disposition: "CATALOG_EVIDENCE_AUDIT_REQUIRED", sourceUrl: "https://www.seat.com.tr/modeller/leon/teknik-ozellikler/fr", sourceType: "OFFICIAL_SPECIFICATION_PAGE", reason: "Exact FR 1.5 eTSI 150 DSG is visible, but the source explicitly applies to MY2024 rather than catalog MY2026." },
  "bdf54f5b-2c18-5505-8875-0157f5bd1db7": { gate: "EXACT_IDENTITY_PARTIALLY_CONFIRMED", disposition: "DEFERRED_IDENTITY_AUDIT", sourceUrl: "https://www.alpinecars.com.tr/a110.html", sourceType: "OFFICIAL_PRODUCT_PAGE", reason: "Ordering closed, last-stock language, current price-list absence and MY2025 applicability remain unresolved." },
  "c4c5efbc-ba1e-5537-a4c6-1fe5116ccb25": { gate: "EXACT_IDENTITY_NOT_CONFIRMED", disposition: "SOURCE_INSUFFICIENT", reason: "No exact official TR Esprit Alpine E-Tech Full Hybrid 160 equipment/configuration artifact was located in preflight." },
  "cb8f5af7-b20f-5877-a79b-4af71c18a61c": { gate: "EXACT_IDENTITY_CONFIRMED", disposition: "COLLECTION_APPROVED", sourceUrl: "https://fiyatlisteleri.opel.com.tr/Assets/files/Opel_Tum_Modeller_Fiyat_Listesi3.5.2026.pdf", sourceType: "OFFICIAL_PRICE_AND_OPTION_LIST", reason: "Official MY26 price list identifies Astra GS Hybrid 145 and explicit option/package applicability; non-option equipment remains unresolved." },
  "e09c81aa-6324-5b20-9cd8-90dc806a5ae9": { gate: "EXACT_IDENTITY_CONFIRMED", disposition: "COLLECTION_APPROVED", sourceUrl: "https://www.fiat.com.tr/modeller/egea/sedan", sourceType: "OFFICIAL_PRODUCT_PAGE", reason: "Official 2026 campaign and current product page jointly identify Easy 1.6 MultiJet 130 manual; only exact Easy rows may be collected." },
  "f954d7a8-b69b-5ee2-b3ad-a4638772725a": { gate: "EXACT_IDENTITY_PARTIALLY_CONFIRMED", disposition: "DEFERRED_IDENTITY_AUDIT", sourceUrl: "https://www.alpinecars.com.tr/a110.html", sourceType: "OFFICIAL_PRODUCT_PAGE", reason: "Ordering closed, last-stock language, current price-list absence and MY2025 applicability remain unresolved." },
};

const hash = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const familyId = (brand: string, model: string) => `family-${createHash("sha256").update(`cars-family-v1\0${normalizeCatalogIdentity(brand)}\0${normalizeCatalogIdentity(model)}`).digest("hex").slice(0, 24)}`;

async function json(file: string) { return JSON.parse(await readFile(file, "utf8")); }
async function writeJson(file: string, value: unknown) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`); }

async function main() {
  const [pilot, catalog] = await Promise.all([json(path.join(PILOT_DIR, "pilot-manifest.json")), json(CATALOG_PATH)]) as [{ variants: PilotVariant[] }, { records: CatalogRecord[] }];
  const remaining = pilot.variants.filter((item: { exactVariantId: string }) => !EXCLUDED.has(item.exactVariantId));
  if (remaining.length !== 24) throw new Error(`REMAINING_VARIANT_COUNT_MISMATCH:${remaining.length}`);
  const catalogById = new Map(catalog.records.map((record) => [record.variant.id, record]));
  const enriched: EnrichedVariant[] = remaining.map((item) => {
    const record = catalogById.get(item.exactVariantId); if (!record) throw new Error(`CATALOG_VARIANT_MISSING:${item.exactVariantId}`);
    const gate = PREFLIGHT[item.exactVariantId]; if (!gate) throw new Error(`PREFLIGHT_MISSING:${item.exactVariantId}`);
    return { ...item, familyId: item.pairedFamilyId ?? familyId(item.canonicalBrand, item.canonicalModel), market: record.variant.market, transmission: record.variant.powertrain?.transmission?.value ?? "UNRESOLVED", lifecycleStatus: record.variant.lifecycleStatus, recommendationEligible: record.variant.lifecycleStatus === "ON_SALE", quarantineState: "NOT_QUARANTINED", identityGate: gate.gate, disposition: gate.disposition, preflightReason: gate.reason, officialSourceUrl: gate.sourceUrl ?? null, officialSourceType: gate.sourceType ?? null };
  });
  const grouped = new Map<string, EnrichedVariant[]>();
  for (const item of enriched) grouped.set(item.familyId, [...(grouped.get(item.familyId) ?? []), item]);
  const microBatches: MicroBatch[] = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([fid, variants], index) => ({
    microBatchId: `EE-PILOT-002-BATCH-${String(index + 3).padStart(3, "0")}`,
    familyId: fid, exactVariantIds: variants.map((v) => v.exactVariantId).sort(),
    brandModels: [...new Set(variants.map((v) => `${v.canonicalBrand} ${v.canonicalModel}`))].sort(),
    disposition: variants.every((v) => v.disposition === "COLLECTION_APPROVED") ? "COLLECTION_APPROVED" : variants.some((v) => v.disposition === "DEFERRED_IDENTITY_AUDIT") ? "DEFERRED_IDENTITY_AUDIT" : variants.some((v) => v.disposition === "CATALOG_EVIDENCE_AUDIT_REQUIRED") ? "CATALOG_EVIDENCE_AUDIT_REQUIRED" : "SOURCE_INSUFFICIENT",
    expectedLedgerRows: variants.every((v) => v.disposition === "COLLECTION_APPROVED") ? variants.length * 51 : 0,
  }));
  let sourceNumber = 89;
  const reservations = enriched.filter((v) => v.disposition === "COLLECTION_APPROVED").sort((a, b) => a.exactVariantId.localeCompare(b.exactVariantId)).map((v) => ({ sourceId: `SRC-${String(sourceNumber++).padStart(6, "0")}`, exactVariantId: v.exactVariantId, familyId: v.familyId, originalUrl: v.officialSourceUrl, sourceType: v.officialSourceType, market: "TR", status: "RESERVED_NOT_CAPTURED", capturePolicy: "IMMUTABLE_RAW_SNAPSHOT_SHA256_V1", sharedAcrossMicroBatches: false }));
  const core = { waveId: "EE-PILOT-002-SCALE-WAVE-001", pilotId: "EE-PILOT-002", catalogRelease: "v0.55.2", catalogFingerprint: CATALOG_FINGERPRINT, remainingVariantCount: enriched.length, microBatchCount: microBatches.length, includedVariantIds: enriched.filter(v => v.disposition === "COLLECTION_APPROVED").map(v => v.exactVariantId).sort(), deferredVariantIds: enriched.filter(v => v.disposition === "DEFERRED_IDENTITY_AUDIT").map(v => v.exactVariantId).sort(), rejectedVariantIds: enriched.filter(v => ["CATALOG_EVIDENCE_AUDIT_REQUIRED", "SOURCE_INSUFFICIENT"].includes(v.disposition)).map(v => v.exactVariantId).sort(), selectionPolicyVersion: "EE_SCALE_WAVE_STRATIFIED_MICROBATCH_V1.0.0", sourceAllocationPolicyVersion: "CENTRAL_SOURCE_RESERVATION_V1.0.0", identityGatePolicyVersion: "EXACT_TR_MY_MARKET_POWERTRAIN_V1.0.0", collectionPolicyVersion: "EQUIPMENT_COLLECTION_PROTOCOL_1.0.1+ASSOCIATION_BOUNDARY_1.0.0", extractionPolicyRegistry: [], semanticMappingPolicyVersion: "EQUIPMENT_FEATURE_SEMANTIC_MAPPING_V1", associationObservationPolicyVersion: "EXACT_TRIM_ASSOCIATION_V1", reviewSeparationPolicy: "COLLECTOR_CANNOT_SECOND_REVIEW_OR_APPROVE", stopConditions: ["EXACT_IDENTITY_NOT_CONFIRMED", "IDENTITY_CONFLICT", "SNAPSHOT_CHECKSUM_UNAVAILABLE", "EXACT_TRIM_SECTION_UNRESOLVED", "LOCATOR_NON_DETERMINISTIC", "MODEL_YEAR_OR_POWERTRAIN_MISMATCH", "REGISTRY_COLLISION"], expectedTotalLedgerRows: enriched.filter(v => v.disposition === "COLLECTION_APPROVED").length * 51, generatedAt: GENERATED_AT, variants: enriched, microBatches };
  const manifest = { ...core, canonicalChecksum: hash(JSON.stringify(core)) };
  await mkdir(WAVE_DIR, { recursive: true });
  await writeJson(path.join(WAVE_DIR, "wave-manifest.json"), manifest);
  await writeJson(path.join(WAVE_DIR, "source-id-reservations.json"), { policyVersion: "1.0.0", generatedAt: GENERATED_AT, reservations });
  await writeJson(path.join(WAVE_DIR, "identity-source-preflight.json"), { variants: enriched });
  await writeJson(path.join(WAVE_DIR, "micro-batch-index.json"), { microBatches });
  await writeJson(path.join(WAVE_DIR, "audit-deferred-backlog.json"), { entries: enriched.filter(v => v.disposition !== "COLLECTION_APPROVED").map(v => ({ exactVariantId: v.exactVariantId, familyId: v.familyId, disposition: v.disposition, reason: v.preflightReason, recommendedAction: ALPINE.has(v.exactVariantId) ? "CATALOG_EVIDENCE_AUDIT_ALPINE_LIFECYCLE_AND_MY" : "CATALOG_EVIDENCE_AUDIT_OR_SOURCE_RECOVERY" })) });
  for (const batch of microBatches) await writeJson(path.join(WAVE_DIR, "micro-batches", batch.microBatchId, "preflight.json"), { ...batch, variants: enriched.filter(v => batch.exactVariantIds.includes(v.exactVariantId)), lifecycleState: batch.disposition === "COLLECTION_APPROVED" ? "PREFLIGHT_PASSED_SOURCE_CAPTURE_PENDING" : "TERMINAL_FAIL_CLOSED", assertionsCreated: 0, associationsCreated: 0, reviewPassed: false });
  const checkpointCore = { waveId: core.waveId, state: "SAFE_CHECKPOINT_NOT_WAVE_COMPLETION", completedMicroBatches: microBatches.filter(b => b.disposition !== "COLLECTION_APPROVED").map(b => b.microBatchId), inProgressMicroBatches: [], notStartedMicroBatches: microBatches.filter(b => b.disposition === "COLLECTION_APPROVED").map(b => b.microBatchId), allocatedSourceIds: reservations.map(r => r.sourceId), immutableArtifactChecksums: [], activePointerChanged: false, decisionEngineEffect: "ZERO", generatedAt: GENERATED_AT };
  await writeJson(path.join(WAVE_DIR, "checkpoint.json"), { ...checkpointCore, safeResumeToken: hash(JSON.stringify(checkpointCore)) });
  await writeJson(path.join(WAVE_DIR, "checksums.json"), { "wave-manifest.json": hash(await readFile(path.join(WAVE_DIR, "wave-manifest.json"))), "source-id-reservations.json": hash(await readFile(path.join(WAVE_DIR, "source-id-reservations.json"))), "identity-source-preflight.json": hash(await readFile(path.join(WAVE_DIR, "identity-source-preflight.json"))), "micro-batch-index.json": hash(await readFile(path.join(WAVE_DIR, "micro-batch-index.json"))), "audit-deferred-backlog.json": hash(await readFile(path.join(WAVE_DIR, "audit-deferred-backlog.json"))), "checkpoint.json": hash(await readFile(path.join(WAVE_DIR, "checkpoint.json"))) });
  console.log(JSON.stringify({ status: "SAFE_CHECKPOINT", remaining: enriched.length, approved: enriched.filter(v => v.disposition === "COLLECTION_APPROVED").length, deferred: enriched.filter(v => v.disposition === "DEFERRED_IDENTITY_AUDIT").length, auditRequired: enriched.filter(v => v.disposition === "CATALOG_EVIDENCE_AUDIT_REQUIRED").length, sourceInsufficient: enriched.filter(v => v.disposition === "SOURCE_INSUFFICIENT").length, microBatches: microBatches.length, reservations: reservations.length, waveChecksum: manifest.canonicalChecksum }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
