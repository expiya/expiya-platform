import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

interface CollectedCandidate {
  familyKey: string;
  brand: string;
  model: string;
  bodyStyle: string;
  sourcePageUrl: string;
  discoveredAssetUrl?: string;
  localPath?: string;
  sha256?: string;
  contentType?: string;
  status: string;
  note?: string;
}

interface VerifiedCandidate {
  familyKey: string;
  brand: string;
  model: string;
  bodyStyle: string;
  sourcePageUrl: string;
  originalAssetUrl: string;
  localCandidatePath: string;
  contentType: string;
  width: number;
  height: number;
  sha256: string;
  applicability: "MODEL_BODY";
  reviewNote: string;
  storageUrl?: string;
  storagePathname?: string;
  uploadedAt?: string;
}

const ROOT = process.cwd();
const manifestPath = path.join(ROOT, "data/production/media/vehicle-media-candidate-manifest.json");
const outputPath = path.join(ROOT, "data/production/media/verified-model-candidates.json");
const ignoredTokens = new Set(["yeni", "new", "electric", "elektrik", "hybrid", "hibrit", "series", "serisi", "model"]);
const tokens = (value: string) => value.toLocaleLowerCase("tr-TR").normalize("NFKD")
  .replace(/[\u0300-\u036f]/gu, "").replace(/[^a-z0-9]+/gu, " ").split(" ")
  .filter((token) => token.length > 2 && !ignoredTokens.has(token));

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    catalogRelease: string;
    catalogPayloadHash: string;
    records: CollectedCandidate[];
  };
  const previous = JSON.parse(await readFile(outputPath, "utf8")) as { records: VerifiedCandidate[] };
  const preserved = previous.records.filter((record) => record.storageUrl);
  const hashModels = new Map<string, Set<string>>();
  for (const record of manifest.records.filter((item) => item.status === "DOWNLOADED" && item.sha256)) {
    const models = hashModels.get(record.sha256!) ?? new Set<string>();
    models.add(`${record.brand}|${record.model}`);
    hashModels.set(record.sha256!, models);
  }
  const accepted: VerifiedCandidate[] = [];
  const unresolved: { familyKey: string; reason: string }[] = [];
  for (const record of manifest.records) {
    if (record.status !== "DOWNLOADED" || !record.localPath || !record.sha256 || !record.contentType || !record.discoveredAssetUrl) {
      unresolved.push({ familyKey: record.familyKey, reason: record.note ?? record.status });
      continue;
    }
    const duplicateModels = hashModels.get(record.sha256)?.size ?? 0;
    const normalizedUrl = decodeURIComponent(record.discoveredAssetUrl).toLocaleLowerCase("tr-TR").normalize("NFKD");
    const modelSpecificUrl = tokens(record.model).some((token) => normalizedUrl.includes(token));
    if (duplicateModels > 1 || !modelSpecificUrl) {
      unresolved.push({ familyKey: record.familyKey, reason: duplicateModels > 1 ? "CROSS_MODEL_DUPLICATE_ASSET" : "MODEL_TOKEN_NOT_PRESENT_IN_ASSET_URL" });
      continue;
    }
    const metadata = await sharp(path.join(ROOT, record.localPath)).metadata();
    const width = metadata.width ?? 0, height = metadata.height ?? 0;
    if (width < 500 || height < 250 || width / Math.max(height, 1) < 1.2) {
      unresolved.push({ familyKey: record.familyKey, reason: `IMAGE_GEOMETRY_REJECTED:${width}x${height}` });
      continue;
    }
    accepted.push({
      familyKey: record.familyKey, brand: record.brand, model: record.model, bodyStyle: record.bodyStyle,
      sourcePageUrl: record.sourcePageUrl, originalAssetUrl: record.discoveredAssetUrl,
      localCandidatePath: record.localPath, contentType: record.contentType, width, height,
      sha256: record.sha256, applicability: "MODEL_BODY",
      reviewNote: "Official manufacturer/distributor source; deterministic model-token and image-geometry checks passed. Trim and color may differ.",
    });
  }
  const byFamily = new Map([...preserved, ...accepted].map((record) => [record.familyKey, record]));
  const result = {
    schemaVersion: "0.2.0", catalogRelease: manifest.catalogRelease, catalogPayloadHash: manifest.catalogPayloadHash,
    publicationState: "OWNER_ATTESTED_REVIEWED", generatedAt: "2026-08-18T16:02:38.000Z",
    qualityPolicy: "OFFICIAL_SOURCE_MODEL_TOKEN_GEOMETRY_AND_CROSS_MODEL_DUPLICATE_GATES",
    records: [...byFamily.values()].sort((left, right) => left.familyKey.localeCompare(right.familyKey, "tr")),
    unresolved: unresolved.sort((left, right) => left.familyKey.localeCompare(right.familyKey, "tr")),
  };
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ acceptedNew: accepted.length, preserved: preserved.length, total: result.records.length, unresolved: unresolved.length }));
}

void main();
