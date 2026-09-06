import type { FactoryInput } from "./contracts";
import { runCatalogIngestionFactory, sha256 } from "../catalog-ingestion";
import type { DiscoveryCandidateInput, DiscoverySnapshot } from "../catalog-ingestion/contracts";

const snapshot = (snapshotId: string, content: string, sourceClass: DiscoverySnapshot["sourceClass"]): DiscoverySnapshot => ({ snapshotId, schemaVersion: "discovery-snapshot/v1", sourceClass, sourceUrl: `https://manufacturer.invalid/${snapshotId}`, retrievedAt: "2026-09-06T00:00:00.000Z", market: "TR", locator: "synthetic read-only pilot", contentDigest: sha256(content), content });
const ingestionSnapshots = [snapshot("manufacturer-phone", "Example P1 P1-128 128 GB", "MANUFACTURER_PRODUCT_PAGE"), snapshot("manufacturer-drill", "Example D1 D1-18V 18 V", "MANUFACTURER_DOCUMENT")];
const ingestionCandidates: DiscoveryCandidateInput[] = [
  { candidateId: "phone", identity: { department: "ELECTRONICS", category: "SMARTPHONE", manufacturer: "Example", model: "P1", variant: "P1-128" }, discoverySnapshotIds: ["manufacturer-phone"], identityEvidenceSnapshotIds: ["manufacturer-phone"], claims: [{ claimId: "phone-storage", field: "storageGb", value: 128, evidenceSnapshotIds: ["manufacturer-phone"], decisionMaterial: true }] },
  { candidateId: "drill", identity: { department: "DURABLE_GOODS_CANDIDATE", category: "CORDLESS_DRILL", manufacturer: "Example", model: "D1", variant: "D1-18V" }, discoverySnapshotIds: ["manufacturer-drill"], identityEvidenceSnapshotIds: ["manufacturer-drill"], claims: [{ claimId: "drill-voltage", field: "nominalVoltage", value: "18 V", evidenceSnapshotIds: ["manufacturer-drill"], decisionMaterial: true }] },
];
const ingestion = runCatalogIngestionFactory({ runId: "CATALOG-FACTORY-V01-PILOT", createdAt: "2026-09-06T00:00:00.000Z", snapshots: ingestionSnapshots, candidates: ingestionCandidates });
if (ingestion.status !== "READY") throw new Error(`PILOT_INGESTION_INVALID:${ingestion.errors.join(",")}`);

export const PILOT_INPUT: FactoryInput = {
  schemaVersion: "catalog-factory-input/v0.1",
  ingestion,
  taxonomy: [
    { departmentId: "ELECTRONICS", categoryId: "SMARTPHONE", publicLabelTr: "Akıllı telefon", riskFlags: [] },
    { departmentId: "DURABLE_GOODS_CANDIDATE", categoryId: "CORDLESS_DRILL", publicLabelTr: "Akülü matkap", riskFlags: [] },
    { departmentId: "BABY_AND_CHILD", categoryId: "TOY", publicLabelTr: "Oyuncak", riskFlags: ["CHILDREN_TOYS"] },
  ],
  observations: [
    { observationId: "obs-amazon-phone", departmentId: "ELECTRONICS", categoryId: "SMARTPHONE", sourceUrl: "https://www.amazon.com.tr/dp/SYNTHETIC", sourceClass: "AMAZON_TR_COMMERCE", observedAt: "2026-09-06T00:00:00.000Z", freshnessUntil: "2026-09-07T00:00:00.000Z", rawLabel: "Synthetic Phone 128 GB", identifiers: { brand: "Example", family: "Phone", model: "P1", exactVariant: "P1-128", sku: "SKU-P1", asin: "SYNTHETIC" } },
    { observationId: "obs-manufacturer-phone", departmentId: "ELECTRONICS", categoryId: "SMARTPHONE", sourceUrl: "https://manufacturer.invalid/p1", sourceClass: "MANUFACTURER_PRODUCT", observedAt: "2026-09-06T00:00:00.000Z", freshnessUntil: "2027-09-06T00:00:00.000Z", rawLabel: "Example P1 128 GB", identifiers: { brand: "Example", family: "Phone", model: "P1", exactVariant: "P1-128", gtin: "0000000000000" } },
    { observationId: "obs-drill-manual", departmentId: "DURABLE_GOODS_CANDIDATE", categoryId: "CORDLESS_DRILL", sourceUrl: "https://manufacturer.invalid/d1/manual", sourceClass: "OFFICIAL_MANUAL", observedAt: "2026-09-06T00:00:00.000Z", freshnessUntil: "2027-09-06T00:00:00.000Z", rawLabel: "Example D1", identifiers: { brand: "Example", model: "D1", exactVariant: "D1-18V" } },
    { observationId: "obs-toy-unknown", departmentId: "BABY_AND_CHILD", categoryId: "TOY", sourceUrl: "https://retailer.invalid/toy", sourceClass: "RELIABLE_TR_RETAILER", observedAt: "2026-09-06T00:00:00.000Z", freshnessUntil: "2026-09-13T00:00:00.000Z", rawLabel: "Unresolved toy listing", identifiers: {} },
  ],
  identities: [
    { observationId: "obs-amazon-phone", outcome: "EXACT", exactProductId: "electronics:smartphone:example:p1-128", reasonCode: "EXACT_VARIANT_MATCH" },
    { observationId: "obs-manufacturer-phone", outcome: "EXACT", exactProductId: "electronics:smartphone:example:p1-128", reasonCode: "MODEL_GTIN_MATCH" },
    { observationId: "obs-drill-manual", outcome: "EXACT", exactProductId: "durable:drill:example:d1-18v", reasonCode: "EXACT_MANUAL_MATCH" },
    { observationId: "obs-toy-unknown", outcome: "UNKNOWN", reasonCode: "INSUFFICIENT_EXACT_IDENTITY" },
  ],
  evidence: [
    { exactProductId: "electronics:smartphone:example:p1-128", factKey: "storageGb", value: 128, sourceObservationIds: ["obs-manufacturer-phone"], evidenceClasses: ["MANUFACTURER_PRODUCT"], authority: "PRIMARY" },
    { exactProductId: "durable:drill:example:d1-18v", factKey: "nominalVoltage", value: "18 V", sourceObservationIds: ["obs-drill-manual"], evidenceClasses: ["OFFICIAL_MANUAL"], authority: "PRIMARY" },
  ],
  semantics: [
    { exactProductId: "electronics:smartphone:example:p1-128", factKeys: ["storageGb"], dailyLife: "Fotoğraf ve uygulamalar için yer kapasitesidir.", needs: ["yerel depolama"], possibleHardFilters: ["minimum depolama"], materialDiscriminators: ["storageGb"], status: "SUPPORTED" },
    { exactProductId: "durable:drill:example:d1-18v", factKeys: ["nominalVoltage"], dailyLife: "Batarya platformunu tanımlar; tek başına performans sonucu değildir.", needs: ["mevcut batarya uyumu"], possibleHardFilters: ["batarya platformu"], materialDiscriminators: ["nominalVoltage"], status: "SUPPORTED" },
  ],
  personas: [
    { exactProductId: "electronics:smartphone:example:p1-128", hierarchy: ["DIGITAL", "MOBILE", "LOCAL_STORAGE"], evidenceClasses: ["MANUFACTURER_PRODUCT"], aggregateSoftScore: 0.7, authority: "SOFT_RANKING_ONLY" },
    { exactProductId: "durable:drill:example:d1-18v", hierarchy: [], evidenceClasses: [], aggregateSoftScore: 0, authority: "NEUTRAL" },
  ],
  commerceMedia: [{ exactProductId: "electronics:smartphone:example:p1-128", offers: [{ retailer: "Amazon Türkiye", priceTry: 9999, stock: "UNKNOWN", observedAt: "2026-09-06T00:00:00.000Z", sourceObservationId: "obs-amazon-phone" }], media: [], technicalEvidenceDigest: null }],
};
