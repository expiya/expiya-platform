import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ProductionCatalogReleasePayload } from "@/features/vehicle-data/productionCatalogRelease";

const activeCatalogPointerPath = path.resolve("data/production/catalog/active.json");
const candidateDir = path.resolve("data/production/media/candidates");
const manifestPath = path.resolve("data/production/media/vehicle-media-candidate-manifest.json");

interface FamilyCandidate {
  familyKey: string;
  brand: string;
  model: string;
  bodyStyle: string;
  sourcePageUrl: string;
  discoveredAssetUrl?: string;
  localPath?: string;
  sha256?: string;
  contentType?: string;
  status: "DOWNLOADED" | "NO_IMAGE_METADATA" | "SOURCE_FETCH_FAILED" | "ASSET_FETCH_FAILED";
  note?: string;
}

const absoluteUrl = (candidate: string, source: string) => {
  try { return new URL(candidate.replaceAll("&amp;", "&"), source).href; } catch { return undefined; }
};

function discoverImage(html: string, sourceUrl: string, brand: string, model: string): string | undefined {
  const candidates = new Map<string, number>();
  const add = (candidate: string | undefined, baseScore: number) => {
    if (!candidate) return;
    const url = absoluteUrl(candidate.replaceAll("\\/", "/"), sourceUrl);
    if (!url || !/\.(?:avif|jpe?g|png|webp)(?:[?#]|$)/iu.test(url)) return;
    const decoded = decodeURIComponent(url).toLocaleLowerCase("tr-TR");
    if (/logo|favicon|icon|sprite|placeholder|dealer|avatar|qr[-_]?code/u.test(decoded)) return;
    const tokens = `${brand} ${model}`.toLocaleLowerCase("tr-TR").normalize("NFKD")
      .replace(/[\u0300-\u036f]/gu, "").replace(/[^a-z0-9]+/gu, " ").split(" ").filter((token) => token.length > 1);
    const normalizedUrl = decoded.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "");
    const modelScore = tokens.reduce((score, token) => score + (normalizedUrl.includes(token) ? 35 : 0), 0);
    const heroScore = /hero|exterior|desktop|kv|model|vehicle|car|stage|gallery/u.test(decoded) ? 12 : 0;
    candidates.set(url, Math.max(candidates.get(url) ?? 0, baseScore + modelScore + heroScore));
  };
  const metaPatterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/giu,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/giu,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/giu,
  ];
  for (const pattern of metaPatterns) for (const match of html.matchAll(pattern)) add(match[1], 20);
  for (const match of html.matchAll(/<(?:img|source)[^>]+(?:src|data-src|srcset|data-srcset)=["']([^"']+)["']/giu)) {
    for (const source of match[1].split(",")) add(source.trim().split(/\s+/u)[0], 10);
  }
  for (const match of html.matchAll(/["']((?:https?:)?\\?\/\\?\/[^"']+?\.(?:avif|jpe?g|png|webp)(?:\?[^"']*)?)["']/giu)) add(match[1], 5);
  return [...candidates].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "en"))[0]?.[0];
}

async function fetchWithTimeout(url: string, accept: string): Promise<Response> {
  return fetch(url, {
    redirect: "follow", signal: AbortSignal.timeout(20_000),
    headers: { accept, "user-agent": "ExpiyaCarsMediaDiscovery/0.1 (+https://www.expiya.com)" },
  });
}

async function collect(family: Omit<FamilyCandidate, "status">): Promise<FamilyCandidate> {
  try {
    const source = await fetchWithTimeout(family.sourcePageUrl, "text/html,application/xhtml+xml,application/pdf");
    if (!source.ok) return { ...family, status: "SOURCE_FETCH_FAILED", note: `HTTP ${source.status}` };
    const sourceType = source.headers.get("content-type") ?? "";
    let imageUrl: string | undefined;
    if (sourceType.startsWith("image/")) imageUrl = source.url;
    else if (!sourceType.includes("pdf")) imageUrl = discoverImage(await source.text(), source.url, family.brand, family.model);
    if (!imageUrl) return { ...family, status: "NO_IMAGE_METADATA", note: sourceType.includes("pdf") ? "PDF requires brochure extraction" : undefined };
    try {
      const image = await fetchWithTimeout(imageUrl, "image/avif,image/webp,image/*");
      const contentType = image.headers.get("content-type")?.split(";")[0] ?? "";
      if (!image.ok || !contentType.startsWith("image/")) return { ...family, discoveredAssetUrl: imageUrl, status: "ASSET_FETCH_FAILED", note: `HTTP ${image.status}; ${contentType}` };
      const bytes = Buffer.from(await image.arrayBuffer());
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const extension = contentType.split("/")[1]?.replace("jpeg", "jpg").replace("svg+xml", "svg") || "img";
      const localPath = path.join(candidateDir, `${sha256}.${extension}`);
      await writeFile(localPath, bytes);
      return { ...family, discoveredAssetUrl: imageUrl, localPath: path.relative(process.cwd(), localPath), sha256, contentType, status: "DOWNLOADED" };
    } catch (error) {
      return { ...family, discoveredAssetUrl: imageUrl, status: "ASSET_FETCH_FAILED", note: String(error) };
    }
  } catch (error) {
    return { ...family, status: "SOURCE_FETCH_FAILED", note: String(error) };
  }
}

export async function collectVehicleMediaCandidates(): Promise<void> {
  const activePointer = JSON.parse(await readFile(activeCatalogPointerPath, "utf8")) as {
    active_catalog_release_version: string;
    catalog_payload_hash: string;
  };
  const catalogRelease = `v${activePointer.active_catalog_release_version}`;
  const catalogPath = path.resolve(`data/production/catalog/releases/${catalogRelease}/catalog.json`);
  const payload = JSON.parse(await readFile(catalogPath, "utf8")) as ProductionCatalogReleasePayload;
  const families = new Map<string, Omit<FamilyCandidate, "status">>();
  for (const { variant } of payload.records) {
    const familyKey = [variant.brand.value, variant.model.value, variant.generation?.value, variant.bodyStyle.value].filter(Boolean).join("|");
    if (!families.has(familyKey)) families.set(familyKey, {
      familyKey, brand: variant.brand.value, model: variant.model.value, bodyStyle: variant.bodyStyle.value,
      sourcePageUrl: variant.model.provenance[0].sourceUrl,
    });
  }
  await mkdir(candidateDir, { recursive: true });
  const queue = [...families.values()];
  const results: FamilyCandidate[] = [];
  const concurrency = 8;
  for (let index = 0; index < queue.length; index += concurrency) {
    results.push(...await Promise.all(queue.slice(index, index + concurrency).map(collect)));
    console.log(`media-discovery ${Math.min(index + concurrency, queue.length)}/${queue.length}`);
  }
  const manifest = {
    schemaVersion: "0.2.0", generatedAt: new Date().toISOString(), catalogRelease,
    catalogPayloadHash: activePointer.catalog_payload_hash,
    policy: "OFFICIAL_SOURCE_CANDIDATE_OWNER_ATTESTATION_REQUIRED_FOR_PUBLICATION",
    totals: Object.fromEntries(["DOWNLOADED", "NO_IMAGE_METADATA", "SOURCE_FETCH_FAILED", "ASSET_FETCH_FAILED"]
      .map((status) => [status, results.filter((item) => item.status === status).length])),
    records: results.sort((left, right) => left.familyKey.localeCompare(right.familyKey, "tr")),
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(manifest.totals));
}

if (import.meta.url === `file://${process.argv[1]}`) collectVehicleMediaCandidates();
