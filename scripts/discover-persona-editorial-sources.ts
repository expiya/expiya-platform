import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE = path.join(ROOT, "data/production/personas/evidence/release-candidates/v3.9.0-catalog-v0.55.4-2026-08-24/persona-evidence.json");
const OUTPUT = path.join(ROOT, "data/production/personas/evidence/research-discovery/editorial-wave-02");

const aliases: Record<string, string> = {
  "BMW|320i Sedan": "3-series", "BMW|4 Serisi Cabrio": "4-series-convertible", "BMW|4 Serisi Coupe": "4-series-coupe", "BMW|4 Serisi Gran Coupe": "4-series-gran-coupe",
  "BMW|5 Serisi Sedan": "5-series", "BMW|7 Serisi Sedan": "7-series", "BMW|1 Serisi": "1-series", "BMW|2 Serisi Active Tourer": "2-series-active-tourer", "BMW|2 Serisi Gran Coupe": "2-series-gran-coupe",
  "Mercedes-Benz|A-Serisi": "a-class", "Mercedes-Benz|C-Serisi": "c-class", "Mercedes-Benz|E-Serisi": "e-class", "Mercedes-Benz|S-Serisi": "s-class", "Mercedes-Benz|G-Serisi": "g-class",
  "Rolls-Royce|Phantom Extended": "phantom", "Rolls-Royce|Ghost Extended": "ghost", "Ferrari|12Cilindri": "12cilindri", "Porsche|718 Cayman": "718-cayman",
  "Toyota|Land Cruiser Prado": "land-cruiser", "Renault|Megane Sedan": "megane", "Dacia|Logan": "logan", "DS Automobiles|N°4": "ds-4", "DS Automobiles|DS 7": "ds-7",
  "Citroën|C4 X Hybrid 145": "c4-x", "Citroën|C3 Aircross Hybrid 145": "c3-aircross", "Citroën|C5 Aircross Hybrid 145": "c5-aircross", "Citroën|C4 Hybrid 145": "c4",
  "Hyundai|TUCSON": "tucson", "Hyundai|BAYON": "bayon",
  "Chery|TIGGO8": "tiggo-8", "Chery|TIGGO7": "tiggo-7",
  "Audi|A3 Sedan": "a3", "Audi|A8 L": "a8", "Audi|A5 Sedan": "a5", "Audi|A6 Sedan": "a6", "Audi|A5 Avant": "a5",
  "BMW|M4 Cabrio": "m4", "BMW|M4 Coupe": "m4", "BMW|M3 Sedan": "m3", "MINI|Cooper 5 Kapı": "cooper", "MINI|Cooper Cabrio": "cooper-convertible",
  "Mercedes-Benz|CLA": "cla-class", "Fiat|Egea Sedan": "tipo", "Fiat|Egea Cross": "tipo-cross", "JAECOO|JAECOO 7": "7", "OMODA|OMODA 5": "5", "OMODA|OMODA 7": "7",
  "KGM|Tivoli": "tivoli", "KGM|Korando": "korando", "KGM|Rexton": "rexton",
};

const slug = (value: string): string => value.toLocaleLowerCase("en-US").normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").replace(/ı/gu, "i").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
const decode = (value: string): string => value.replace(/&nbsp;/gu, " ").replace(/&amp;/gu, "&").replace(/&#39;|&apos;/gu, "'").replace(/&quot;/gu, '"').replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim();
const meta = (html: string, property: string): string | null => {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return decode(html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "iu"))?.[1] ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, "iu"))?.[1] ?? "") || null;
};
const sentences = (html: string): string[] => decode(html.replace(/<script[\s\S]*?<\/script>/giu, " ").replace(/<style[\s\S]*?<\/style>/giu, " ")).split(/(?<=[.!?])\s+/u).filter((item) => item.length >= 45 && item.length <= 420);
const signal = /(comfort|comfortable|practical|spacious|space|boot|handling|steering|drive|driving|technology|tech|infotainment|design|style|luxury|premium|adventure|off-road|urban|city|family|value|minimal)/iu;

async function inspect(url: string, publisher: string): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(url, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 ExpiyaEvidenceResearch/3.9" }, signal: AbortSignal.timeout(20_000) });
    const html = await response.text();
    const title = meta(html, "og:title") ?? decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/iu)?.[1] ?? "");
    const description = meta(html, "description") ?? meta(html, "og:description");
    const published = meta(html, "article:published_time") ?? html.match(/["']datePublished["']\s*:\s*["']([^"']+)/iu)?.[1] ?? html.match(/Published:\s*(\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4})/u)?.[1] ?? null;
    const spans = sentences(html).filter((item) => signal.test(item)).slice(0, 12);
    return { publisher, requestedUrl: url, finalUrl: response.url, httpStatus: response.status, title, description, publicationDateRaw: published, evidenceSpans: spans, contentBytes: html.length };
  } catch (error) {
    return { publisher, requestedUrl: url, error: error instanceof Error ? error.message : String(error) };
  }
}

async function main(): Promise<void> {
  const release = JSON.parse(await readFile(RELEASE, "utf8")) as { families: Array<{ familyId: string; canonicalBrand: string; canonicalModel: string; proposedTraits: string[] }> };
  const empty = release.families.filter((family) => family.proposedTraits.length === 0);
  const results: Array<Record<string, unknown>> = [];
  for (let index = 0; index < empty.length; index += 6) {
    const batch = empty.slice(index, index + 6);
    results.push(...await Promise.all(batch.map(async (family) => {
      const modelSlug = aliases[`${family.canonicalBrand}|${family.canonicalModel}`] ?? slug(family.canonicalModel);
      const defaultBrand = family.canonicalBrand === "Mercedes-Benz" ? "mercedes" : family.canonicalBrand === "DS Automobiles" ? "ds" : family.canonicalBrand === "Opel" ? "vauxhall" : family.canonicalBrand;
      const brandSlug = slug(defaultBrand);
      const legacyBrandSlug = family.canonicalBrand === "KGM" ? "ssangyong" : brandSlug;
      const autocarBrandSlug = family.canonicalBrand === "Mercedes-Benz" ? "mercedes-benz" : legacyBrandSlug;
      const sources = await Promise.all([
        inspect(`https://www.topgear.com/car-reviews/${legacyBrandSlug}/${modelSlug}`, "Top Gear"),
        inspect(`https://www.autoexpress.co.uk/${family.canonicalBrand === "KGM" ? "kgm" : brandSlug}/${modelSlug}`, "Auto Express"),
        inspect(`https://www.carwow.co.uk/${brandSlug}/${modelSlug}`, "Carwow"),
        inspect(`https://www.autocar.co.uk/car-review/${autocarBrandSlug}/${modelSlug}`, "Autocar"),
      ]);
      return { ...family, researchedAt: "2026-08-24T00:00:00.000Z", sources };
    })));
  }
  await mkdir(OUTPUT, { recursive: true });
  await writeFile(path.join(OUTPUT, "discovery-ledger.json"), `${JSON.stringify({ schemaVersion: "3.9.0-editorial-discovery.1", familyCount: empty.length, families: results }, null, 2)}\n`);
  const valid = results.filter((family) => new Set((family.sources as Array<{ httpStatus?: number; title?: string; publisher?: string }>).filter((source) => source.httpStatus === 200 && /review/iu.test(source.title ?? "")).map((source) => source.publisher)).size >= 2).length;
  await writeFile(path.join(OUTPUT, "discovery-summary.json"), `${JSON.stringify({ familyCount: empty.length, twoPublisherPageCount: valid, requiresManualGenerationReview: empty.length }, null, 2)}\n`);
  console.log(JSON.stringify({ familyCount: empty.length, twoPublisherPageCount: valid }));
}

void main();
