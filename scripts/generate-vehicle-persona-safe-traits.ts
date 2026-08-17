import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import personaPayload from "@/data/production/personas/vehicle-personas.v1.json";
import { normalizeCatalogIdentity } from "@/features/decision/v2/catalog/normalization";
import { VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY } from "@/types/vehiclePersonaSafeTraits";
import type {
  SafePersonaFamilyProjection, SafePersonaReviewStatus, VehiclePersonaSafeTraitManifest,
  VehiclePersonaSafeTraitPointer, VehiclePersonaSafeTraitRelease,
} from "@/types/vehiclePersonaSafeTraits";
import type { VehiclePersonaTrait } from "@/types/vehiclePersona";

const RELEASE_VERSION = "v1.0.0-catalog-v0.55.0-2026-08-16";
const GENERATED_AT = "2026-08-16T15:24:52.000Z";
const ROOT = process.cwd();
type PersonaBrand = (typeof personaPayload.brands)[number];
type PersonaSeries = PersonaBrand["series"][number];

const normalize = (value: string) => value.toLocaleUpperCase("tr-TR").normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").replaceAll("Ë", "E").replaceAll("İ", "I")
  .replace(/\b(YENI|NEW|HYBRID|HIBRIT|ELECTRIC|ELEKTRIK)\b/g, " ").replace(/[^A-Z0-9]+/g, " ").trim();
const aliases = (group: string) => group.replace(/\([^)]*\)/g, "").split("/")
  .map((item) => normalize(item.replace(/\bSerisi\b/giu, ""))).filter(Boolean);
function aliasScore(model: string, group: string): number {
  const normalizedModel = normalize(model); const compactModel = normalizedModel.replaceAll(" ", ""); let best = 0;
  for (const alias of aliases(group)) {
    if (normalizedModel === alias || compactModel === alias.replaceAll(" ", "")) best = Math.max(best, 1_000 + alias.length);
    else if (normalizedModel.startsWith(`${alias} `) || normalizedModel.startsWith(alias)) best = Math.max(best, 700 + alias.length);
    const tokens = new Set(normalizedModel.split(" ")); const parts = alias.split(" ");
    const common = parts.filter((token) => tokens.has(token)).length;
    best = Math.max(best, common * 100 + Math.round((common / parts.length) * 50));
  }
  if (/^3\d\d[A-Z]*/.test(normalizedModel) && /3 SERISI/i.test(normalize(group))) best = Math.max(best, 900);
  if (/^E[ -]?/.test(model) && aliases(group).some((alias) => normalizedModel.slice(1).startsWith(alias))) best = Math.max(best, 650);
  return best;
}

const safeTraitRules: readonly [VehiclePersonaTrait, RegExp][] = [
  ["DESIGN", /tasarım|estetik|şık|moda|avangart|retro|stil/iu],
  ["DRIVING_ENGAGEMENT", /sürüş keyfi|viraj|performans|pist|ralli|karting|dinamik|sportif/iu],
  ["COMFORT", /konfor|rahat|sessiz|yumuşak/iu], ["PRACTICALITY", /pratik|geniş|bagaj|işlev|hacim|koltuk/iu],
  ["TECHNOLOGY", /teknoloji|fütür|dijital|ekran|akıllı|siber/iu], ["PRESTIGE", /lüks|prestij|asil|premium/iu],
  ["VALUE", /ekonom|bütçe|fiyat.performans|uygun fiyat|az yakan|masraf/iu], ["ADVENTURE", /arazi|doğa|kamp|çamur|dağ|macera|4x4/iu],
  ["FAMILY", /aile kullanımı|aileler için|çocuk|7 kişi|kalabalık aile/iu], ["URBAN", /şehir|park|kompakt|küçük/iu],
  ["COMMERCIAL", /ticari araç|esnaf|lojistik|yük|taşımacılık|şantiye|panelvan|kamyonet|kargo/iu], ["SUSTAINABILITY", /çevreci|sürdürülebilir|karbon|elektrikli/iu],
  ["MINIMALISM", /minimal|gösterişten uzak|sade/iu],
];
const unsafeDriving = /makas|agresif|saldırgan|tehlikeli|kural tanımaz|trafik terörü/iu;
const unsafeEditorialContext = /\b(kadın|erkek|anne|baba|aile reisi|beyaz yakalı|yönetici|ceo|avukat|doktor|mühendis|milyoner|zengin|fakir|genç|yaşlı|evli|bekar|influencer|mafya|makasçı)\b|rakip marka|sürücülerine/iu;
const reviewSensitive = new Set<VehiclePersonaTrait>(["COMFORT", "PRACTICALITY", "VALUE", "FAMILY"]);
function candidateTraits(series: PersonaSeries): readonly VehiclePersonaTrait[] {
  return VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY.filter((trait) => {
    if (trait === "DRIVING_ENGAGEMENT" && unsafeDriving.test(series.persona)) return false;
    return safeTraitRules.find(([candidate]) => candidate === trait)?.[1].test(series.persona) ?? false;
  });
}
function safeTraits(series: PersonaSeries): readonly VehiclePersonaTrait[] {
  if (unsafeEditorialContext.test(series.persona) || unsafeDriving.test(series.persona)) return [];
  return candidateTraits(series).filter((trait) => !reviewSensitive.has(trait));
}
function familyId(brand: string, model: string): string {
  const digest = createHash("sha256").update(`cars-family-v1\0${normalizeCatalogIdentity(brand)}\0${normalizeCatalogIdentity(model)}`, "utf8").digest("hex").slice(0, 24);
  return `family-${digest}`;
}
function sourceMatch(brandName: string, model: string): { status: "MATCHED" | "AMBIGUOUS" | "UNMATCHED"; brand?: PersonaBrand; series?: PersonaSeries } {
  const brand = personaPayload.brands.find((item) => normalize(item.brand) === normalize(brandName));
  if (!brand) return { status: "UNMATCHED" };
  const ranked = brand.series.map((series) => ({ series, score: aliasScore(model, series.group) }))
    .sort((left, right) => right.score - left.score || left.series.group.localeCompare(right.series.group, "tr"));
  if (!ranked[0] || ranked[0].score <= 0) return { status: "UNMATCHED" };
  if (ranked[1]?.score === ranked[0].score) return { status: "AMBIGUOUS", brand };
  return { status: "MATCHED", brand, series: ranked[0].series };
}
const canonicalJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
async function writeImmutable(file: string, content: string): Promise<void> {
  try { await writeFile(file, content, { encoding: "utf8", flag: "wx" }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    if (await readFile(file, "utf8") !== content) throw new Error(`IMMUTABLE_RELEASE_ARTIFACT_DIFFERS:${file}`);
  }
}

async function main(): Promise<void> {
  const catalogPointer = JSON.parse(await readFile(path.join(ROOT, "data/production/catalog/active.json"), "utf8")) as { active_catalog_release_version: string; catalog_payload_hash: string };
  const catalogRelease = `v${catalogPointer.active_catalog_release_version}`;
  const catalog = JSON.parse(await readFile(path.join(ROOT, `data/production/catalog/releases/${catalogRelease}/catalog.json`), "utf8")) as { records: { variant: { id: string; brand: { value: string }; model: { value: string } } }[] };
  const groups = new Map<string, { brand: string; model: string; variantIds: string[] }>();
  for (const { variant } of catalog.records) {
    const id = familyId(variant.brand.value, variant.model.value);
    const prior = groups.get(id) ?? { brand: variant.brand.value, model: variant.model.value, variantIds: [] };
    prior.variantIds.push(variant.id); groups.set(id, prior);
  }
  const families: SafePersonaFamilyProjection[] = [];
  for (const [id, group] of [...groups].sort(([left], [right]) => left.localeCompare(right, "en"))) {
    const resolved = sourceMatch(group.brand, group.model);
    const traits = resolved.series ? safeTraits(resolved.series) : [];
    const candidates = resolved.series ? candidateTraits(resolved.series) : [];
    const reviewStatus: SafePersonaReviewStatus = resolved.status === "MATCHED" && (candidates.some((trait) => reviewSensitive.has(trait)) || unsafeEditorialContext.test(resolved.series!.persona) || unsafeDriving.test(resolved.series!.persona))
      ? "OWNER_REVIEW_REQUIRED" : "PROGRAMMATIC_DRAFT";
    families.push({
      familyId: id, canonicalBrand: group.brand, canonicalModel: group.model,
      sourceSeriesGroup: resolved.series?.group ?? null, traits,
      matchAuthority: "DETERMINISTIC_CATALOG_MATCH", matchStatus: resolved.status, reviewStatus,
      ...(resolved.brand && resolved.series ? { sourceReference: { personaDatasetVersion: personaPayload.datasetVersion, brand: resolved.brand.brand, seriesGroup: resolved.series.group } } : {}),
    });
  }
  const variants = families.flatMap((family) => (groups.get(family.familyId)?.variantIds ?? []).sort().map((exactVariantId) => ({
    exactVariantId, familyId: family.familyId, traits: family.traits, authority: "OWNER_EDITORIAL" as const, decisionUse: "SOFT_PREFERENCE_ONLY" as const,
  }))).sort((left, right) => left.exactVariantId.localeCompare(right.exactVariantId, "en"));
  const release: VehiclePersonaSafeTraitRelease = {
    schemaVersion: "1.0.0", releaseVersion: RELEASE_VERSION, compatibleCatalogRelease: catalogRelease,
    compatibleCatalogFingerprint: catalogPointer.catalog_payload_hash, sourcePersonaDatasetVersion: personaPayload.datasetVersion,
    sourcePersonaSchemaVersion: personaPayload.schemaVersion, authority: "OWNER_EDITORIAL", decisionUse: "SOFT_PREFERENCE_ONLY",
    traitVocabulary: VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY, families, variants, generatedAt: GENERATED_AT,
  };
  const rawPayload = canonicalJson(release); const payloadSha256 = `sha256:${createHash("sha256").update(rawPayload).digest("hex")}`;
  const matchCount = (status: SafePersonaFamilyProjection["matchStatus"]) => families.filter((item) => item.matchStatus === status).length;
  const reviewCount = (status: SafePersonaReviewStatus) => families.filter((item) => item.reviewStatus === status).length;
  const traitDistribution = Object.fromEntries(VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY.map((trait) => [trait, families.filter((family) => family.traits.includes(trait)).length])) as VehiclePersonaSafeTraitManifest["traitDistribution"];
  const manifest: VehiclePersonaSafeTraitManifest = {
    releaseVersion: RELEASE_VERSION, schemaVersion: "1.0.0", authority: "OWNER_EDITORIAL", decisionUse: "SOFT_PREFERENCE_ONLY",
    compatibleCatalogRelease: catalogRelease, compatibleCatalogFingerprint: catalogPointer.catalog_payload_hash,
    sourcePersonaDatasetVersion: personaPayload.datasetVersion, familyCount: families.length, variantCount: variants.length,
    matchCounts: { MATCHED: matchCount("MATCHED"), AMBIGUOUS: matchCount("AMBIGUOUS"), UNMATCHED: matchCount("UNMATCHED") },
    emptyTraitFamilyCount: families.filter((item) => item.traits.length === 0).length,
    emptyTraitVariantCount: variants.filter((item) => item.traits.length === 0).length,
    reviewCounts: { PROGRAMMATIC_DRAFT: reviewCount("PROGRAMMATIC_DRAFT"), OWNER_REVIEW_REQUIRED: reviewCount("OWNER_REVIEW_REQUIRED"), OWNER_APPROVED: reviewCount("OWNER_APPROVED") },
    traitDistribution, payloadSha256, validationStatus: "VALIDATED",
    declaredLimitations: [
      "safe-traits-are-owner-editorial-soft-preferences-not-technical-facts",
      "programmatic-projections-are-not-owner-approved-by-generation",
      "unmatched-and-ambiguous-families-carry-empty-traits",
      "variant-projections-inherit-family-traits-without-variant-specific-inference",
      "raw-editorial-persona-text-is-excluded-from-this-release",
    ],
  };
  const pointer: VehiclePersonaSafeTraitPointer = { state: "ACTIVE", activeReleaseVersion: RELEASE_VERSION, compatibleCatalogRelease: catalogRelease, compatibleCatalogFingerprint: catalogPointer.catalog_payload_hash, payloadSha256, schemaVersion: "1.0.0" };
  const base = path.join(ROOT, "data/production/personas/safe-traits"); const releaseRoot = path.join(base, "releases", RELEASE_VERSION);
  await mkdir(releaseRoot, { recursive: true });
  await writeImmutable(path.join(releaseRoot, "vehicle-persona-safe-traits.json"), rawPayload);
  await writeImmutable(path.join(releaseRoot, "manifest.json"), canonicalJson(manifest));
  await writeFile(path.join(base, "active.json"), canonicalJson(pointer), "utf8");
  console.log(JSON.stringify({ releaseVersion: RELEASE_VERSION, families: families.length, variants: variants.length, payloadSha256, matchCounts: manifest.matchCounts, reviewCounts: manifest.reviewCounts }));
}

void main();
