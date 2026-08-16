import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { put } from "@vercel/blob";

import type { ProductionCatalogReleasePayload } from "@/features/vehicle-data/productionCatalogRelease";
import type { VehicleMediaAsset } from "@/types/vehicleMedia";

const catalogPath = path.resolve("data/production/catalog/releases/v0.55.0/catalog.json");
const outputPath = path.resolve("data/production/media/wikimedia-vehicle-media.json");
const api = "https://commons.wikimedia.org/w/api.php";

interface Family {
  key: string; brand: string; model: string; generation?: string; bodyStyle: string; modelYear: number;
}
interface SearchRecord { familyKey: string; status: "PUBLISHED" | "NO_MATCH" | "REJECTED" | "ERROR"; note?: string; fileTitle?: string; }
interface Output { schemaVersion: string; catalogRelease: string; generatedAt: string; assets: VehicleMediaAsset[]; searchRecords: SearchRecord[]; }
interface CommonsPage { title: string; snippet?: string; imageinfo?: Array<{ thumburl?: string; url?: string; width?: number; height?: number; mime?: string; extmetadata?: Record<string, { value?: string }> }>; }

const normalize = (value: string) => value.toLocaleLowerCase("tr-TR").normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
const slug = (value: string) => normalize(value).replaceAll(" ", "-");
const stripHtml = (value?: string) => (value ?? "").replace(/<[^>]*>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
const modelTokens = (model: string) => normalize(model).split(" ").filter((token) => token.length > 1 && !["new", "yeni", "the"].includes(token));
const brandToken = (brand: string) => {
  if (normalize(brand) === "kgm") return "ssangyong";
  return normalize(brand).split(" ").find((token) => token.length >= 2) ?? normalize(brand);
};
const searchBrand = (brand: string) => normalize(brand) === "kgm" ? "SsangYong" : brand;
const searchModelAliases = (brand: string, model: string): string[] => {
  let alias = model
    .replace(new RegExp(`^${brand}\\s+`, "i"), "")
    .replace(/^Yeni\s+/i, "")
    .replace(/\s+(Hybrid|Hibrit)\s*\d*$/i, "")
    .replace(/\s+(Electric|Elektrik|EV)$/i, "")
    .replace(/\s+(Panelvan|Van|Cargo|Kamyonet|Combi)$/i, "")
    .replace(/\s+(Sedan|Coupe|Cabrio|5 Kapı)$/i, "")
    .trim();
  alias = alias
    .replace(/^(A|C|E|G|S)-Serisi$/i, "$1-Class")
    .replace(/^(\d) Serisi$/i, "$1 Series")
    .replace(/^(\d) Serisi (Gran Coupe|Active Tourer)$/i, "$1 Series $2")
    .replace(/^Egea$/i, "Tipo")
    .replace(/^Egea Cross$/i, "Tipo Cross")
    .replace(/^MGS5$/i, "S5")
    .replace(/^MGS5 EV$/i, "S5 EV");
  return [...new Set([model, alias].filter(Boolean))];
};
const canonicalVisualModel = (model: string) => normalize(model)
  .replace(/^yeni /, "").replace(/^e (?=\d)/, "")
  .replace(/\b(electric|elektrik|hybrid|hibrit|folgore)\b/g, "")
  .replace(/\b(5 kapi)\b/g, "").replace(/\s+/g, " ").trim();

async function commons(params: Record<string, string>): Promise<unknown> {
  const url = new URL(api);
  for (const [key, value] of Object.entries({ action: "query", format: "json", origin: "*", ...params })) url.searchParams.set(key, value);
  const response = await fetch(url, { headers: { "user-agent": "ExpiyaCarsOpenMediaCollector/0.1 (https://www.expiya.com)" }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Commons HTTP ${response.status}`);
  return response.json();
}

async function findTitle(family: Family): Promise<string | undefined> {
  const brand = brandToken(family.brand), queryBrand = searchBrand(family.brand);
  for (const queryModel of searchModelAliases(family.brand, family.model)) {
    const tokens = modelTokens(queryModel);
    for (const query of [`\"${queryBrand} ${queryModel}\" automobile filetype:bitmap`, `${queryBrand} ${queryModel} car filetype:bitmap`]) {
      const data = await commons({ list: "search", srnamespace: "6", srlimit: "16", srsearch: query }) as { query?: { search?: CommonsPage[] } };
      const match = (data.query?.search ?? []).map((candidate) => ({ candidate, text: normalize(`${candidate.title} ${stripHtml(candidate.snippet)}`) }))
        .filter(({ text }) => text.includes(brand) && tokens.every((token) => text.includes(token)))
        .filter(({ text }) => !/logo|badge|emblem|interior|dashboard|engine|drawing|diagram|police|race|wreck|toy|miniature/.test(text))
        .sort((left, right) => Number(normalize(right.candidate.title).includes(normalize(queryModel))) - Number(normalize(left.candidate.title).includes(normalize(queryModel))))[0]?.candidate.title;
      if (match) return match;
    }
  }
  return undefined;
}

async function fileInfo(title: string): Promise<{ url: string; width: number; height: number; mime: string; license: string; licenseUrl?: string; artist: string; pageUrl: string } | undefined> {
  const data = await commons({ titles: title, prop: "imageinfo", iiprop: "url|mime|dimensions|extmetadata", iiurlwidth: "1200", iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|Credit|AttributionRequired|Copyrighted" }) as { query?: { pages?: Record<string, CommonsPage> } };
  const page = Object.values(data.query?.pages ?? {})[0], info = page?.imageinfo?.[0], meta = info?.extmetadata;
  const license = stripHtml(meta?.LicenseShortName?.value), licenseUrl = stripHtml(meta?.LicenseUrl?.value);
  const artist = stripHtml(meta?.Artist?.value) || stripHtml(meta?.Credit?.value) || "Wikimedia Commons contributor";
  const url = info?.thumburl ?? info?.url;
  if (!url || !info?.width || !info.height || !info.mime?.startsWith("image/")) return undefined;
  if (info.width < 600 || info.height < 300 || info.width <= info.height) return undefined;
  if (!license || /NC|non.?commercial|all rights reserved|copyrighted free use/i.test(license)) return undefined;
  if (!/(CC BY|CC0|Public domain|PDM)/i.test(license)) return undefined;
  return { url, width: info.width, height: info.height, mime: info.mime, license, licenseUrl, artist, pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}` };
}

async function loadOutput(): Promise<Output> {
  try { return JSON.parse(await readFile(outputPath, "utf8")) as Output; }
  catch { return { schemaVersion: "0.1.0", catalogRelease: "v0.55.0", generatedAt: new Date().toISOString(), assets: [], searchRecords: [] }; }
}

async function persist(output: Output): Promise<void> {
  output.generatedAt = new Date().toISOString();
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}

function auditOutput(output: Output): void {
  const records = new Map(output.searchRecords.map((record) => [record.familyKey, record]));
  const byUrl = new Map<string, VehicleMediaAsset[]>();
  for (const asset of output.assets) byUrl.set(asset.originalAssetUrl ?? asset.storagePath, [...(byUrl.get(asset.originalAssetUrl ?? asset.storagePath) ?? []), asset]);
  const ambiguousUrls = new Set([...byUrl].filter(([, assets]) =>
    new Set(assets.map((asset) => `${normalize(asset.brand)}|${canonicalVisualModel(asset.model)}|${normalize(asset.bodyStyle ?? "")}`)).size > 1)
    .map(([url]) => url));
  output.assets = output.assets.filter((asset) => {
    const familyKey = [asset.brand, asset.model, asset.generation, asset.bodyStyle].filter(Boolean).join("|");
    const record = records.get(familyKey), title = normalize(record?.fileTitle ?? "");
    const ambiguous = ambiguousUrls.has(asset.originalAssetUrl ?? asset.storagePath);
    const unsafeTitle = /concept|prototype|police|rally|race car|wreck|modified/.test(title);
    const bodyConflict = ["COUPE", "HATCHBACK", "SEDAN"].includes((asset.bodyStyle ?? "").toUpperCase())
      && /convertible|cabrio|cabriolet|spider|roadster/.test(title);
    if (!ambiguous && !unsafeTitle && !bodyConflict) return true;
    if (record) {
      record.status = "REJECTED";
      record.note = ambiguous ? "Cross-family duplicate image" : unsafeTitle ? "Concept or non-standard vehicle title" : "Body-style conflict in file title";
    }
    return false;
  });
}

async function processFamily(family: Family, token: string): Promise<{ asset?: VehicleMediaAsset; record: SearchRecord }> {
  try {
    const title = await findTitle(family);
    if (!title) return { record: { familyKey: family.key, status: "NO_MATCH" } };
    const info = await fileInfo(title);
    if (!info) return { record: { familyKey: family.key, status: "REJECTED", fileTitle: title, note: "License, dimensions, format, or aspect ratio failed policy" } };
    const response = await fetch(info.url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Image HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer()), hash = createHash("sha256").update(bytes).digest("hex");
    const extension = info.mime.includes("png") ? "png" : "jpg";
    const pathname = `cars/v0.55.0/${slug(family.brand)}/${slug(family.model)}/${hash.slice(0, 16)}.${extension}`;
    const blob = await put(pathname, bytes, { access: "public", token, addRandomSuffix: false, allowOverwrite: true, contentType: info.mime, cacheControlMaxAge: 31_536_000 });
    const id = `media-commons-${createHash("sha256").update(family.key).digest("hex").slice(0, 20)}`;
    const asset: VehicleMediaAsset = {
      id, market: "TR", scope: "MODEL_BODY", brand: family.brand, model: family.model,
      generation: family.generation, bodyStyle: family.bodyStyle, modelYearFrom: family.modelYear, modelYearTo: family.modelYear,
      kind: "HERO_EXTERIOR", storagePath: blob.url, sourcePageUrl: info.pageUrl, originalAssetUrl: info.url,
      rightsHolder: info.artist, usagePermission: "OPEN_LICENSE", licenseName: info.license, licenseUrl: info.licenseUrl,
      attributionText: `${info.artist} — ${info.license}`, publicationState: "PUBLISHED", isPrimary: true,
      reviewedAt: new Date().toISOString(), fileHash: `sha256:${hash}`,
      applicabilityNotes: ["Open-license representative model image from Wikimedia Commons", "Trim, model year, color, and market equipment may differ"],
    };
    return { asset, record: { familyKey: family.key, status: "PUBLISHED", fileTitle: title } };
  } catch (error) { return { record: { familyKey: family.key, status: "ERROR", note: String(error) } }; }
}

export async function collectUploadWikimediaVehicleMedia(): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is required");
  const catalog = JSON.parse(await readFile(catalogPath, "utf8")) as ProductionCatalogReleasePayload;
  const familyMap = new Map<string, Family>();
  for (const { variant } of catalog.records) {
    const key = [variant.brand.value, variant.model.value, variant.generation?.value, variant.bodyStyle.value].filter(Boolean).join("|");
    if (!familyMap.has(key)) familyMap.set(key, { key, brand: variant.brand.value, model: variant.model.value, generation: variant.generation?.value, bodyStyle: variant.bodyStyle.value, modelYear: variant.modelYear.value });
  }
  const output = await loadOutput(), completed = new Set(output.searchRecords
    .filter((record) => record.status !== "NO_MATCH" && !(record.status === "REJECTED" && record.note === "Cross-family duplicate image"))
    .map((record) => record.familyKey));
  const queue = [...familyMap.values()].filter((family) => !completed.has(family.key) && !["Alfa Romeo|Junior|SUV", "Alfa Romeo|Tonale|SUV"].includes(family.key));
  for (let index = 0; index < queue.length; index += 4) {
    const batch = await Promise.all(queue.slice(index, index + 4).map((family) => processFamily(family, token)));
    for (const result of batch) {
      output.searchRecords = output.searchRecords.filter((record) => record.familyKey !== result.record.familyKey);
      output.searchRecords.push(result.record);
      if (result.asset) output.assets.push(result.asset);
    }
    await persist(output);
    console.log(`commons-media ${Math.min(index + 4, queue.length)}/${queue.length}; published=${output.assets.length}`);
  }
  auditOutput(output);
  await persist(output);
  console.log(`commons-media audited; published=${output.assets.length}`);
}

if (import.meta.url === `file://${process.argv[1]}`) collectUploadWikimediaVehicleMedia();
