import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const input = JSON.parse(readFileSync(path.join(root, "data/production/personas/evidence/research-completion/release-candidates/v3.9.0-deferred-150-2026-08-24/research-completion.json"), "utf8"));
const outputDir = path.join(root, "data/production/personas/evidence/expanded-regional-research/v3.9.0-2026-08-24");
const selected = new Set([
  "family-be90f0db119d9d3859a2d0b7",
  "family-e54cda2a90648060a99cb37b",
  "family-2c7a24089fdb0c812282f4e6",
  "family-31961cca2fce994af065068e"
]);
const sources = {
  "family-be90f0db119d9d3859a2d0b7": {
    url: "https://www.carexpert.com.au/car-reviews/2025-land-rover-discovery-sport-review", publisher: "CarExpert", title: "2025 Land Rover Discovery Sport review", publicationDate: "2025-01-27", accessedAt: "2026-08-24", market: "AU", modelYearOrGeneration: "2024 test vehicle / 2025 current facelift generation",
    spans: {
      COMFORT: "smooth, quiet and comfortable, with neutral handling and well-calibrated driver controls",
      PRACTICALITY: "a spacious and practical second row that is up there with the best in its class",
      TECHNOLOGY: "Pivi Pro multimedia interface with clean menus and snappy response",
      PRESTIGE: "everything looks and feels befitting of a premium product",
      ADVENTURE: "dirt sections ... capable and grippy all-wheel drive system",
      MINIMALISM: "simplistic design around the new shift-by-wire gear selector"
    }
  },
  "family-e54cda2a90648060a99cb37b": {
    url: "https://www.carexpert.com.au/car-reviews/2024-land-rover-discovery-review", publisher: "CarExpert", title: "2024 Land Rover Discovery review", publicationDate: "2024", accessedAt: "2026-08-24", market: "AU", modelYearOrGeneration: "Discovery 5, MY24 with MY25 continuity discussed",
    spans: {
      COMFORT: "air suspension in a comfortable family cruiser remains a winning combination",
      PRACTICALITY: "every bit as practical as you'd expect",
      TECHNOLOGY: "same technology suite you get in the new Defender and Range Rover",
      PRESTIGE: "mix of luxurious materials ... a lovely place to spend time",
      ADVENTURE: "rugged finishes designed to call the great outdoors to mind",
      FAMILY: "still a lovely family SUV ... large seven-seater"
    }
  },
  "family-2c7a24089fdb0c812282f4e6": {
    url: "https://www.whichcar.com.au/reviews/bmw-x6-range-review-stylish-coupe-suv", publisher: "WhichCar / Wheels", title: "BMW X6: Range review of the stylish coupe SUV", publicationDate: "2025-04-10", accessedAt: "2026-08-24", market: "AU", modelYearOrGeneration: "G06 third generation, current range",
    spans: {
      DRIVING_ENGAGEMENT: "sharp driving dynamics for an SUV ... handling ability is impressive",
      COMFORT: "slightly firm ... still entirely comfortable ... noise suppression is impressive",
      PRACTICALITY: "healthy 580-litre boot ... clever storage solutions",
      TECHNOLOGY: "high quality and tech-filled interior",
      PRESTIGE: "interior ... genuinely luxurious"
    }
  },
  "family-31961cca2fce994af065068e": {
    url: "https://www.autotrader.co.za/cars/news-and-advice/buying-a-car/everything-you-need-to-know-about-the-fiat-tipo/10720", publisher: "AutoTrader South Africa", title: "Everything you need to know about the Fiat Tipo", publicationDate: "2022-08-04", accessedAt: "2026-08-24", market: "ZA", modelYearOrGeneration: "Fiat Tipo/Egea Type 356 facelift; sedan explicitly covered",
    spans: {
      DRIVING_ENGAGEMENT: "dynamic driving attributes will make this a fun car to drive",
      COMFORT: "5 adults seated in comfort ... padding ... to aid comfort and noise reduction",
      PRACTICALITY: "sedan offers the extra luggage space ... 520-litre for the sedan",
      TECHNOLOGY: "Tech features: Keyless Entry and Go, adaptive cruise control, rear cross path detection",
      VALUE: "value proposition ... offers good value for money"
    }
  }
};

const queue = input.families.map((family) => ({
  familyId: family.familyId,
  canonicalBrand: family.canonicalBrand,
  canonicalModel: family.canonicalModel,
  traits: family.claims.map((claim) => claim.trait),
  claimIds: family.claims.map((claim) => claim.claimId),
  status: selected.has(family.familyId) ? "WAVE_01_RESEARCHED" : "QUEUED",
  priority: family.claims.length
})).sort((a, b) => b.priority - a.priority || a.familyId.localeCompare(b.familyId));

const waveFamilies = input.families.filter((family) => selected.has(family.familyId)).map((family) => {
  const source = sources[family.familyId];
  return {
    familyId: family.familyId, canonicalBrand: family.canonicalBrand, canonicalModel: family.canonicalModel, exactVariantIds: family.exactVariantIds,
    generationMatchBasis: source.modelYearOrGeneration,
    regionalSource: { ...source, spans: undefined, sourceType: "REGIONAL_PROFESSIONAL_WRITTEN_REVIEW", technicalAuthority: false, marketApplicability: "CHARACTER_ONLY_NO_EQUIPMENT_AUTHORITY" },
    claims: family.claims.map((claim) => ({ claimId: claim.claimId, trait: claim.trait, supportedSpan: source.spans[claim.trait], status: "REGIONAL_CORROBORATION_RESEARCHED", ownerReviewRequired: true })),
    rankingMutationAllowed: false
  };
});
const campaign = {
  schemaVersion: "3.9.0-expanded-regional-research.1", campaignId: "PERSONA-V39-EXPANDED-REGIONAL-150", startedAt: "2026-08-24T00:00:00.000Z",
  scope: { familyCount: queue.length, claimCount: queue.reduce((n, item) => n + item.claimIds.length, 0) },
  sourcePolicy: { professionalEditorialOnly: true, userContentAuthority: false, exactFamilyAndGenerationRequired: true, crossMarketUse: "CHARACTER_ONLY", technicalAuthority: false },
  markets: ["AU", "NZ", "ZA", "IN", "GCC", "DE", "NL", "PL", "ES", "RO", "US"],
  queue, activationPerformed: false, rankingMutationAllowed: false
};
const wave = { schemaVersion: "3.9.0-expanded-regional-wave.1", waveId: "WAVE_01_HIGH_DENSITY", generatedAt: "2026-08-24T00:00:00.000Z", families: waveFamilies, activationPerformed: false, rankingMutationAllowed: false };
mkdirSync(outputDir, { recursive: true });
const campaignRaw = `${JSON.stringify(campaign, null, 2)}\n`;
const waveRaw = `${JSON.stringify(wave, null, 2)}\n`;
writeFileSync(path.join(outputDir, "campaign-manifest.json"), campaignRaw);
writeFileSync(path.join(outputDir, "wave-01.json"), waveRaw);
writeFileSync(path.join(outputDir, "wave-01-manifest.json"), `${JSON.stringify({ waveId: wave.waveId, payloadSha256: `sha256:${createHash("sha256").update(waveRaw).digest("hex")}`, researchedFamilyCount: waveFamilies.length, researchedClaimCount: waveFamilies.flatMap((family) => family.claims).length, remainingFamilyCount: queue.filter((item) => item.status === "QUEUED").length, remainingClaimCount: queue.filter((item) => item.status === "QUEUED").reduce((n, item) => n + item.claimIds.length, 0), activationPerformed: false }, null, 2)}\n`);
console.log(JSON.stringify({ families: waveFamilies.length, claims: waveFamilies.flatMap((family) => family.claims).length, remainingFamilies: queue.filter((item) => item.status === "QUEUED").length }, null, 2));
