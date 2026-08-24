import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { personaEvidencePayloadSha256, personaEvidenceReleaseSchema } from "@/features/vehicle-data/personaEvidenceV39";
import { EDITORIAL_RESEARCH_WAVE_01 } from "@/data/production/personas/evidence/editorial-research-wave-01";
import type { VehiclePersonaTrait } from "@/types/vehiclePersona";

const ROOT = process.cwd();
const CATALOG_RELEASE = "v0.55.4";
const RELEASE = "v3.9.0-catalog-v0.55.4-2026-08-24-rc.1";
const OUTPUT = path.join(ROOT, "data/production/personas/evidence/release-candidates/v3.9.0-catalog-v0.55.4-2026-08-24");
const json = async (file: string) => JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
const safeJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sourceId = (url: string, title: string) => `PERSRC-${createHash("sha256").update(`${url}|${title}`).digest("hex").slice(0, 16).toUpperCase()}`;

async function main(): Promise<void> {
  const catalog = await json(path.join(ROOT, "data/production/catalog/releases/v0.55.4/catalog.json")) as { records: CatalogRecord[] };
  const pointer = await json(path.join(ROOT, "data/production/catalog/active.json")) as { catalog_payload_hash: string };
  const approved = await json(path.join(ROOT, "data/production/personas/safe-traits/releases/v1.0.6-catalog-v0.55.4-2026-08-20/vehicle-persona-safe-traits.json")) as { families: ApprovedFamily[]; variants: ApprovedVariant[] };
  const wave02 = await json(path.join(ROOT, "data/production/personas/evidence/editorial-research-wave-02.json")) as unknown as { families: EditorialResearchFamily[] };
  const wave03 = await json(path.join(ROOT, "data/production/personas/evidence/editorial-research-wave-03.json")) as unknown as { families: EditorialResearchFamily[] };
  const wave04 = await json(path.join(ROOT, "data/production/personas/evidence/editorial-research-wave-04.json")) as unknown as { families: EditorialResearchFamily[] };
  const wave05 = await json(path.join(ROOT, "data/production/personas/evidence/editorial-research-wave-05.json")) as unknown as { families: EditorialResearchFamily[] };
  const editorialResearch: EditorialResearchFamily[] = [...EDITORIAL_RESEARCH_WAVE_01 as unknown as EditorialResearchFamily[], ...wave02.families, ...wave03.families, ...wave04.families, ...wave05.families];
  const records = new Map(catalog.records.map((record) => [record.variant.id, record]));
  const variantsByFamily = new Map<string, string[]>();
  for (const variant of approved.variants) variantsByFamily.set(variant.familyId, [...(variantsByFamily.get(variant.familyId) ?? []), variant.exactVariantId]);
  const families = approved.families.map((family) => {
    const exactVariantIds = variantsByFamily.get(family.familyId) ?? [];
    const familyRecords = exactVariantIds.map((id) => records.get(id)).filter((record): record is CatalogRecord => Boolean(record));
    const sourceMap = new Map<string, EvidenceSource>();
    for (const record of familyRecords) {
      for (const field of [record.variant.brand, record.variant.model, record.variant.modelYear, record.variant.vehicleUseClass, record.variant.powertrain.fuelType]) {
        for (const provenance of field?.provenance ?? []) {
          if (!provenance.sourceUrl || provenance.sourceUrl === "https://www.expiya.com") continue;
          const title = provenance.documentVersion || `${family.canonicalBrand} ${family.canonicalModel}`;
          const id = sourceId(provenance.sourceUrl, title);
          sourceMap.set(id, {
            sourceId: id, url: provenance.sourceUrl, publisher: provenance.sourceId || family.canonicalBrand,
            title, sourceType: "OFFICIAL_MARKET_PAGE", publicationDate: null,
            accessedAt: provenance.accessedAt, market: "TR",
            modelYearOrGeneration: [...new Set(familyRecords.map((item) => String(item.variant.modelYear.value)))].join(" | "),
            authorityClass: "A1_OFFICIAL_MARKET",
            marketApplicability: "EXACT_TR_CATALOG", technicalAuthority: false,
          });
        }
      }
    }
    const sources = [...sourceMap.values()];
    const sourceIds = sources.map((source) => source.sourceId);
    const traits: VehiclePersonaTrait[] = [];
    const claims: EvidenceClaim[] = [];
    const allCommercial = familyRecords.length > 0 && familyRecords.every((record) => ["LIGHT_COMMERCIAL", "HEAVY_COMMERCIAL"].includes(record.variant.vehicleUseClass?.value ?? ""));
    const allElectrified = familyRecords.length > 0 && familyRecords.every((record) => ["BEV", "HEV", "PHEV", "HYDROGEN"].includes(record.variant.powertrain.fuelType.value));
    if (sources.length && allCommercial) {
      traits.push("COMMERCIAL"); claims.push({ claimId: `PERSCLM-${family.familyId}-COMMERCIAL`, trait: "COMMERCIAL", neutralSummary: "Ailenin tüm exact katalog varyantları ticari araç kullanım sınıfında doğrulanmıştır.", sourceIds, supportedSpanOrTimestamp: `catalog.records[${exactVariantIds.join(",")}].variant.vehicleUseClass`, exactVariantIds, derivationPolicy: "EXACT_CATALOG_COMMERCIAL_ARCHITECTURE", conflictStatus: "NONE" });
    }
    if (sources.length && allElectrified) {
      traits.push("SUSTAINABILITY"); claims.push({ claimId: `PERSCLM-${family.familyId}-SUSTAINABILITY`, trait: "SUSTAINABILITY", neutralSummary: "Ailenin tüm exact katalog varyantları BEV, HEV veya PHEV mimarisinde doğrulanmıştır.", sourceIds, supportedSpanOrTimestamp: `catalog.records[${exactVariantIds.join(",")}].variant.powertrain.fuelType`, exactVariantIds, derivationPolicy: "EXACT_CATALOG_ELECTRIFIED_ARCHITECTURE", conflictStatus: "NONE" });
    }
    const editorial = editorialResearch.find((item) => item.canonicalBrand === family.canonicalBrand && item.canonicalModel === family.canonicalModel);
    if (editorial) {
      const editorialSourceIds = editorial.sources.map((item) => {
        const id = sourceId(item.url, item.title);
        sourceMap.set(id, { sourceId: id, url: item.url, publisher: item.publisher, title: item.title, sourceType: item.sourceType, publicationDate: item.publicationDate, accessedAt: "2026-08-24T00:00:00.000Z", market: item.market, modelYearOrGeneration: item.modelYearOrGeneration, authorityClass: item.authorityClass ?? "B1_EDITORIAL", marketApplicability: "CHARACTER_ONLY_NO_EQUIPMENT_AUTHORITY", technicalAuthority: false });
        return id;
      });
      for (const item of editorial.claims) {
        const citedSourceIds = item.sourceIndexes.map((index) => editorialSourceIds[index]).filter((id): id is string => Boolean(id));
        claims.push({ claimId: `PERSCLM-${family.familyId}-${item.trait}-EDITORIAL`, trait: item.trait, neutralSummary: item.neutralSummary, sourceIds: citedSourceIds, supportedSpanOrTimestamp: item.sourceIndexes.map((index, locatorIndex) => `${editorial.sources[index]?.title}: ${item.locators?.[locatorIndex] ?? editorial.sources[index]?.locator}`).join(" | "), exactVariantIds, derivationPolicy: item.derivationPolicy ?? "EDITORIAL_CHARACTER_CONSENSUS", conflictStatus: "NONE" });
        if (!traits.includes(item.trait)) traits.push(item.trait);
      }
    }
    const allSources = [...sourceMap.values()];
    return {
      familyId: family.familyId, canonicalBrand: family.canonicalBrand, canonicalModel: family.canonicalModel,
      exactVariantIds, sources: allSources, claims, proposedTraits: traits,
      evidenceStatus: traits.length ? "SOURCE_BACKED" : allSources.length ? "SOURCE_DISCOVERED_TRAIT_EVIDENCE_INSUFFICIENT" : "SOURCE_OUTAGE_OR_MISSING",
      reviewStatus: "OWNER_REVIEW_REQUIRED", ownerDecision: null,
      contaminationChecks: { exactFamilyBound: familyRecords.length === exactVariantIds.length, generationVerified: familyRecords.every((record) => Number.isInteger(record.variant.modelYear.value)), marketVerified: familyRecords.every((record) => record.variant.market === "TR"), crossMarketRejected: true },
    };
  });
  const release = personaEvidenceReleaseSchema.parse({ schemaVersion: "3.9.0-rc.1", releaseVersion: RELEASE, compatibleCatalogRelease: CATALOG_RELEASE, compatibleCatalogFingerprint: pointer.catalog_payload_hash, authority: "SOURCE_BACKED_OWNER_REVIEW", decisionUse: "BOUNDED_SOFT_RANKING_ONLY", scoreCap: 0.75, generatedAt: "2026-08-24T00:00:00.000Z", activationPerformed: false, ownerApproval: null, families });
  const raw = safeJson(release); const payloadSha256 = personaEvidencePayloadSha256(raw);
  const wave01Keys = new Set(EDITORIAL_RESEARCH_WAVE_01.map((family) => `${family.canonicalBrand}|${family.canonicalModel}`));
  const expandedResearchFamilies = families.filter((family) => !wave01Keys.has(`${family.canonicalBrand}|${family.canonicalModel}`) && (family.claims.some((claim) => ["EDITORIAL_CHARACTER_CONSENSUS", "OFFICIAL_EDITORIAL_CHARACTER_CORROBORATION"].includes(claim.derivationPolicy)) || !family.proposedTraits.length));
  const manifest = {
    releaseVersion: RELEASE, payloadSha256, familyCount: families.length,
    variantCount: families.reduce((sum, family) => sum + family.exactVariantIds.length, 0),
    familiesWithDiscoveredSource: families.filter((family) => family.sources.length).length,
    sourceOutageOrMissingCount: families.filter((family) => !family.sources.length).length,
    sourceBackedTraitFamilyCount: families.filter((family) => family.proposedTraits.length).length,
    emptyTraitFamilyCount: families.filter((family) => !family.proposedTraits.length).length,
    editorialResearchCoverage: {
      researchedFamilyCount: expandedResearchFamilies.length,
      consensusDerivedFamilyCount: expandedResearchFamilies.filter((family) => family.proposedTraits.length > 0).length,
      researchedButInsufficientFamilyCount: expandedResearchFamilies.filter((family) => !family.proposedTraits.length).length,
      researchedButInsufficientFamilies: expandedResearchFamilies.filter((family) => !family.proposedTraits.length).map((family) => ({ familyId: family.familyId, canonicalBrand: family.canonicalBrand, canonicalModel: family.canonicalModel, reason: "TWO_PUBLISHER_GENERATION_MATCHED_TRAIT_CONSENSUS_NOT_ESTABLISHED" })),
    },
    traitDistribution: Object.fromEntries(["DESIGN", "DRIVING_ENGAGEMENT", "COMFORT", "PRACTICALITY", "TECHNOLOGY", "PRESTIGE", "VALUE", "ADVENTURE", "FAMILY", "URBAN", "COMMERCIAL", "SUSTAINABILITY", "MINIMALISM"].map((trait) => [trait, families.filter((family) => family.proposedTraits.includes(trait as VehiclePersonaTrait)).length])),
    validationStatus: "OWNER_REVIEW_REQUIRED", activationPerformed: false,
    limitations: [families.some((family) => !family.proposedTraits.length) ? "Some researched families remain empty because generation-matched consensus was not established." : "No family remains trait-empty; scarce-source families use explicitly governed regional or official-editorial corroboration.", "Foreign editorial sources are character-only and never equipment or technical authority.", "No candidate is automatically owner-approved or activated."],
  };
  await mkdir(OUTPUT, { recursive: true });
  await Promise.all([writeFile(path.join(OUTPUT, "persona-evidence.json"), raw), writeFile(path.join(OUTPUT, "coverage-manifest.json"), safeJson(manifest))]);
  console.log(JSON.stringify(manifest));
}

interface Provenance { sourceId: string; sourceUrl: string; documentVersion: string; accessedAt: string }
interface Sourced<T> { value: T; provenance: Provenance[] }
interface CatalogRecord { variant: { id: string; market: string; brand: Sourced<string>; model: Sourced<string>; modelYear: Sourced<number>; vehicleUseClass?: Sourced<string>; powertrain: { fuelType: Sourced<string> } } }
interface ApprovedFamily { familyId: string; canonicalBrand: string; canonicalModel: string }
interface ApprovedVariant { familyId: string; exactVariantId: string }
interface EditorialResearchFamily { canonicalBrand: string; canonicalModel: string; generationMatchBasis: string; sources: Array<{ url: string; publisher: string; title: string; sourceType: "OFFICIAL_GLOBAL_PAGE" | "EDITORIAL_REVIEW" | "EDITORIAL_VIDEO"; publicationDate: string | null; market: string; modelYearOrGeneration: string; locator: string; authorityClass?: "A2_OFFICIAL_GLOBAL" | "B1_EDITORIAL" }>; claims: Array<{ trait: VehiclePersonaTrait; neutralSummary: string; sourceIndexes: number[]; locators?: Array<string | null>; derivationPolicy?: "EDITORIAL_CHARACTER_CONSENSUS" | "OFFICIAL_EDITORIAL_CHARACTER_CORROBORATION" }> }
interface EvidenceSource { sourceId: string; url: string; publisher: string; title: string; sourceType: "OFFICIAL_MARKET_PAGE" | "OFFICIAL_GLOBAL_PAGE" | "EDITORIAL_REVIEW" | "EDITORIAL_VIDEO"; publicationDate: string | null; accessedAt: string; market: string; modelYearOrGeneration: string; authorityClass: "A1_OFFICIAL_MARKET" | "A2_OFFICIAL_GLOBAL" | "B1_EDITORIAL"; marketApplicability: "EXACT_TR_CATALOG" | "CHARACTER_ONLY_NO_EQUIPMENT_AUTHORITY"; technicalAuthority: false }
interface EvidenceClaim { claimId: string; trait: VehiclePersonaTrait; neutralSummary: string; sourceIds: string[]; supportedSpanOrTimestamp: string; exactVariantIds: string[]; derivationPolicy: "EXACT_CATALOG_COMMERCIAL_ARCHITECTURE" | "EXACT_CATALOG_ELECTRIFIED_ARCHITECTURE" | "EDITORIAL_CHARACTER_CONSENSUS" | "OFFICIAL_EDITORIAL_CHARACTER_CORROBORATION"; conflictStatus: "NONE" }

void main();
