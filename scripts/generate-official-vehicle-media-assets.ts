import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { VehicleMediaAsset } from "@/types/vehicleMedia";

const ROOT = process.cwd();
const slug = (value: string) => value.toLocaleLowerCase("tr-TR").normalize("NFKD")
  .replace(/[\u0300-\u036f]/gu, "").replace(/ı/gu, "i").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");

async function main() {
  const pointer = JSON.parse(await readFile(path.join(ROOT, "data/production/catalog/active.json"), "utf8")) as {
    active_catalog_release_version: string;
    catalog_payload_hash: string;
  };
  const release = `v${pointer.active_catalog_release_version}`;
  const catalog = JSON.parse(await readFile(path.join(ROOT, `data/production/catalog/releases/${release}/catalog.json`), "utf8")) as {
    records: { variant: { brand: { value: string }; model: { value: string }; bodyStyle: { value: string }; modelYear: { value: number } } }[];
  };
  const verified = JSON.parse(await readFile(path.join(ROOT, "data/production/media/verified-model-candidates.json"), "utf8")) as {
    catalogRelease: string;
    catalogPayloadHash: string;
    records: {
      familyKey: string; brand: string; model: string; bodyStyle: string; sourcePageUrl: string;
      originalAssetUrl: string; sha256: string; storageUrl?: string; uploadedAt?: string;
    }[];
  };
  if (verified.catalogRelease !== release || verified.catalogPayloadHash !== pointer.catalog_payload_hash) throw new Error("VERIFIED_MEDIA_CATALOG_MISMATCH");
  const ownerAttestation = {
    attestedBy: "Expiya catalog owner",
    attestedAt: "2026-08-18T16:02:38.000Z",
    statement: "The Expiya catalog owner directed use of official manufacturer/distributor vehicle imagery and accepted the OWNER_ATTESTED publication workflow.",
    evidenceReference: "codex-task:official-vehicle-media-owner-direction:2026-08-18",
    permittedUses: ["COMMERCIAL_DISPLAY"] as const,
  };
  const assets: VehicleMediaAsset[] = verified.records.map((record): VehicleMediaAsset => {
    if (!record.storageUrl || !record.uploadedAt) throw new Error(`VERIFIED_MEDIA_NOT_UPLOADED:${record.familyKey}`);
    const years = catalog.records.filter(({ variant }) => variant.brand.value === record.brand && variant.model.value === record.model
      && variant.bodyStyle.value === record.bodyStyle).map(({ variant }) => variant.modelYear.value);
    if (years.length === 0) throw new Error(`VERIFIED_MEDIA_FAMILY_NOT_IN_CATALOG:${record.familyKey}`);
    return {
      id: `media-official-${slug(record.brand)}-${slug(record.model)}-${slug(record.bodyStyle)}-${record.sha256.slice(0, 12)}`,
      market: "TR", scope: "MODEL", brand: record.brand, model: record.model, bodyStyle: record.bodyStyle,
      modelYearFrom: Math.min(...years), modelYearTo: Math.max(...years), kind: "HERO_EXTERIOR",
      storagePath: record.storageUrl, sourcePageUrl: record.sourcePageUrl, originalAssetUrl: record.originalAssetUrl,
      rightsHolder: `${record.brand} / official manufacturer or Turkey distributor`, usagePermission: "OWNER_ATTESTED",
      sourceAuthority: "OFFICIAL_MANUFACTURER_OR_DISTRIBUTOR",
      ownerAttestation, attributionText: `Görsel kaynağı: ${record.brand} resmî web sitesi`,
      publicationState: "PUBLISHED", isPrimary: true, reviewedAt: record.uploadedAt,
      fileHash: `sha256:${record.sha256}`,
      applicabilityNotes: ["Official manufacturer/distributor source image", "Representative at model level; body derivative, trim, color and optional equipment may differ"],
    };
  }).sort((left, right) => left.id.localeCompare(right.id, "en"));
  const payload = {
    schemaVersion: "1.0.0", releaseVersion: `official-media-${release}-2026-08-18`, compatibleCatalogRelease: release,
    compatibleCatalogFingerprint: pointer.catalog_payload_hash, generatedAt: "2026-08-18T16:02:38.000Z",
    sourcePolicy: "OFFICIAL_MANUFACTURER_OR_TURKEY_DISTRIBUTOR_OWNER_ATTESTED",
    assetCount: assets.length, assets,
  };
  const raw = `${JSON.stringify(payload, null, 2)}\n`;
  await writeFile(path.join(ROOT, "data/production/media/official-vehicle-media.json"), raw, "utf8");
  console.log(JSON.stringify({ assets: assets.length, families: new Set(assets.map((asset) => `${asset.brand}|${asset.model}|${asset.bodyStyle}`)).size,
    checksum: `sha256:${createHash("sha256").update(raw).digest("hex")}` }));
}

void main();
