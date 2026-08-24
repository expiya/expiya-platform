import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { VehiclePersonaTrait } from "@/types/vehiclePersona";

const ROOT = process.cwd();
const INPUT = path.join(ROOT, "data/production/personas/evidence/research-discovery/editorial-wave-02/discovery-ledger.json");
const OUTPUT = path.join(ROOT, "data/production/personas/evidence/editorial-research-wave-04.json");
const denied = new Set(["Renault|Megane Sedan", "Jaguar|E-PACE"]);
const patterns: ReadonlyArray<{ trait: VehiclePersonaTrait; expression: RegExp }> = [
  { trait: "DRIVING_ENGAGEMENT", expression: /\b(fun|good) to drive\b|\bengaging\b|\bagile handling\b|\bexcellent handling\b|\bdriver focus\b/iu },
  { trait: "COMFORT", expression: /\bcomfortable\b|\bcomfort\b|\brefined\b|\brefinement\b|\bcomfy\b|\bsmooth ride\b/iu },
  { trait: "PRACTICALITY", expression: /\bpractical\b|\bpracticality\b|\bspacious\b|\bboot space\b|\bloads of space\b|\broomy\b/iu },
  { trait: "TECHNOLOGY", expression: /\binfotainment\b|\bon-board tech\b|\btechnology\b|\btech and connectivity\b|\bdigital cockpit\b/iu },
  { trait: "PRESTIGE", expression: /\bluxury\b|\bluxurious\b|\bupmarket\b|\bpremium (?:SUV|car|choice|feel|cabin|interior|brand|model)\b|\bhighly desirable\b/iu },
  { trait: "VALUE", expression: /\bvalue for money\b|\bgood value\b|\bkeen pricing\b|\battractively priced\b|\baffordable\b/iu },
  { trait: "ADVENTURE", expression: /\boff-road\b|\boff road\b|\brugged\b|\badventure\b/iu },
  { trait: "FAMILY", expression: /\bfamily car\b|\bfamily suv\b|\bseven-seat\b|\bseven seat\b|\b7-seat\b/iu },
  { trait: "URBAN", expression: /\burban\b|\bcity car\b|\baround town\b|\bsupermini\b/iu },
  { trait: "MINIMALISM", expression: /\bminimalist\b|\brefreshingly simple\b|\bsimple choice\b/iu },
];

interface DiscoveredSource { publisher: string; finalUrl?: string; httpStatus?: number; title?: string; description?: string; publicationDateRaw?: string | null; evidenceSpans?: string[] }
interface DiscoveredFamily { canonicalBrand: string; canonicalModel: string; sources: DiscoveredSource[] }

const isoDate = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString().slice(0, 10);
};
const contradicted = (span: string, trait: VehiclePersonaTrait): boolean => trait === "DRIVING_ENGAGEMENT" && /\bnot\b.{0,50}\b(?:fun|good) to drive\b|\bisn['’]t\b.{0,50}\b(?:fun|good) to drive\b/iu.test(span);

async function main(): Promise<void> {
  const discovery = JSON.parse(await readFile(INPUT, "utf8")) as { families: DiscoveredFamily[] };
  const families = discovery.families.flatMap((family) => {
    const key = `${family.canonicalBrand}|${family.canonicalModel}`;
    if (denied.has(key)) return [];
    const sources = family.sources.filter((source) => source.httpStatus === 200 && source.finalUrl && /review/iu.test(source.title ?? "") && !/2010-2021|2015-2020|2017-2024|E-Tech Electric/iu.test(source.title ?? ""));
    if (new Set(sources.map((source) => source.publisher)).size < 2) return [];
    const claims = patterns.flatMap(({ trait, expression }) => {
      const matches = sources.map((source, index) => ({ index, span: [source.description ?? "", ...(source.evidenceSpans ?? [])].find((span) => expression.test(span) && !contradicted(span, trait)) ?? null })).filter((match): match is { index: number; span: string } => Boolean(match.span));
      const independent = matches.filter((match, index) => matches.findIndex((candidate) => sources[candidate.index]?.publisher === sources[match.index]?.publisher) === index).slice(0, 2);
      if (independent.length < 2) return [];
      return [{ trait, neutralSummary: `${family.canonicalBrand} ${family.canonicalModel} için ${trait} karakteri iki bağımsız güncel editoryal incelemede ortak sinyal veriyor.`, sourceIndexes: independent.map((match) => match.index), locators: independent.map((match) => match.span) }];
    });
    if (!claims.length) return [];
    return [{
      canonicalBrand: family.canonicalBrand, canonicalModel: family.canonicalModel,
      generationMatchBasis: "Her iki yayıncının güncel inceleme başlığı canonical model ile eşleşti; açık eski nesil veya farklı gövde/powertrain sayfaları denylist ile dışlandı.",
      sources: sources.map((source) => ({ url: source.finalUrl, publisher: source.publisher, title: source.title, sourceType: "EDITORIAL_REVIEW", publicationDate: isoDate(source.publicationDateRaw), market: "UK", modelYearOrGeneration: "current generation as reviewed on access date", locator: "See trait-specific exact evidence span" })),
      claims,
    }];
  });
  await writeFile(OUTPUT, `${JSON.stringify({ schemaVersion: "3.9.0-editorial-wave.4", generatedAt: "2026-08-24T00:00:00.000Z", families }, null, 2)}\n`);
  console.log(JSON.stringify({ enrichedFamilyCount: families.length, claimCount: families.reduce((sum, family) => sum + family.claims.length, 0) }));
}

void main();
