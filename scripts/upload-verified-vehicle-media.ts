import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { put } from "@vercel/blob";

const manifestPath = path.resolve("data/production/media/verified-model-candidates.json");

interface VerifiedCandidate {
  familyKey: string;
  brand: string;
  model: string;
  localCandidatePath: string;
  contentType: string;
  sha256: string;
  storageUrl?: string;
  storagePathname?: string;
  uploadedAt?: string;
}

interface CandidateManifest {
  records: VerifiedCandidate[];
  [key: string]: unknown;
}

const slug = (value: string) => value.toLocaleLowerCase("tr-TR")
  .normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function uploadVerifiedVehicleMedia(): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is required");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as CandidateManifest;
  for (const record of manifest.records) {
    if (record.storageUrl) continue;
    const extension = record.contentType === "image/png" ? "png" : "jpg";
    const pathname = `cars/v0.55.0/${slug(record.brand)}/${slug(record.model)}/${record.sha256.slice(0, 16)}.${extension}`;
    const bytes = await readFile(path.resolve(record.localCandidatePath));
    const blob = await put(pathname, bytes, {
      access: "public", token, addRandomSuffix: false, allowOverwrite: false,
      contentType: record.contentType, cacheControlMaxAge: 31_536_000,
    });
    record.storageUrl = blob.url;
    record.storagePathname = blob.pathname;
    record.uploadedAt = new Date().toISOString();
    console.log(`uploaded ${record.familyKey} -> ${blob.pathname}`);
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

if (import.meta.url === `file://${process.argv[1]}`) uploadVerifiedVehicleMedia();
