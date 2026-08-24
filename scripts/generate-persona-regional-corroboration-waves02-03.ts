import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { personaRegionalCorroborationFollowupSchema, regionalFollowupChecksum } from "@/features/vehicle-data/personaRegionalCorroborationFollowup";

const ROOT = process.cwd();
const PERSONA = path.join(ROOT, "data/production/personas/evidence/release-candidates/v3.9.0-catalog-v0.55.4-2026-08-24/persona-evidence.json");
const MANIFEST = path.join(ROOT, "data/production/personas/evidence/release-candidates/v3.9.0-catalog-v0.55.4-2026-08-24/coverage-manifest.json");
const WAVE_01 = path.join(ROOT, "data/production/personas/evidence/regional-corroboration/release-candidates/v1.0.0-wave-01-2026-08-24/regional-corroboration.json");
const OUTPUT_ROOT = path.join(ROOT, "data/production/personas/evidence/regional-corroboration/release-candidates");

interface Source { sourceId: string; authorityClass: string; market: string }
interface Claim { claimId: string; trait: string; sourceIds: string[]; derivationPolicy: string }
interface Family { familyId: string; canonicalBrand: string; canonicalModel: string; exactVariantIds: string[]; sources: Source[]; claims: Claim[] }

const stable = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const editorialPolicy = new Set(["EDITORIAL_CHARACTER_CONSENSUS", "OFFICIAL_EDITORIAL_CHARACTER_CORROBORATION"]);
const isRegional = (source: Source): boolean => source.authorityClass === "B1_EDITORIAL" && !["UK", "TR"].includes(source.market);

const waves = [
  { number: "02", name: "WAVE_02_PRESTIGE_VALUE_ADVENTURE" as const, traits: ["PRESTIGE", "VALUE", "ADVENTURE"] },
  { number: "03", name: "WAVE_03_COMFORT_PRACTICALITY_TECHNOLOGY" as const, traits: ["COMFORT", "PRACTICALITY", "TECHNOLOGY"] },
  { number: "04", name: "WAVE_04_FINAL_REMAINING_NEUTRAL_TRAITS" as const, traits: ["DESIGN", "DRIVING_ENGAGEMENT", "FAMILY", "URBAN", "COMMERCIAL", "SUSTAINABILITY", "MINIMALISM"] },
];

async function main(): Promise<void> {
  const persona = JSON.parse(await readFile(PERSONA, "utf8")) as { families: Family[] };
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8")) as { payloadSha256: string };
  let predecessorChecksum = regionalFollowupChecksum(await readFile(WAVE_01, "utf8"));

  for (const wave of waves) {
    const traitSet = new Set(wave.traits);
    const families = persona.families.flatMap((family) => {
      const claims = family.claims.filter((claim) => traitSet.has(claim.trait) && editorialPolicy.has(claim.derivationPolicy)).map((claim) => {
        const citedRegional = family.sources.filter((source) => claim.sourceIds.includes(source.sourceId) && isRegional(source));
        return {
          personaClaimId: claim.claimId,
          trait: claim.trait,
          status: citedRegional.length ? "CORROBORATES" as const : "RESEARCH_REQUIRED" as const,
          regionalSourceIds: citedRegional.map((source) => source.sourceId),
          regionalMarkets: [...new Set(citedRegional.map((source) => source.market))],
          rationale: citedRegional.length
            ? "Exact family/nesil bağlı iddia en az bir UK/TR dışı profesyonel editoryal kaynakla destekleniyor; mevcut trait veya ranking skoru değiştirilmez."
            : "Exact family/nesil için bağımsız bölgesel profesyonel yayın kanıtı henüz yok; claim araştırma ve owner-review kuyruğunda tutulur.",
        };
      });
      if (claims.length === 0) return [];
      const corroboratedCount = claims.filter((claim) => claim.status === "CORROBORATES").length;
      return [{
        familyId: family.familyId,
        canonicalBrand: family.canonicalBrand,
        canonicalModel: family.canonicalModel,
        exactVariantIds: family.exactVariantIds,
        claims,
        familyStatus: corroboratedCount === claims.length ? "CORROBORATED" as const : corroboratedCount > 0 ? "PARTIALLY_CORROBORATED" as const : "RESEARCH_REQUIRED" as const,
        rankingMutationAllowed: false as const,
        ownerReviewRequired: true as const,
      }];
    });
    const release = personaRegionalCorroborationFollowupSchema.parse({
      schemaVersion: "1.0.0-rc.1",
      releaseVersion: `v1.0.0-wave-${wave.number}-2026-08-24-rc.1`,
      compatiblePersonaEvidenceChecksum: manifest.payloadSha256,
      predecessorReleaseChecksum: predecessorChecksum,
      wave: wave.name,
      includedTraits: wave.traits,
      targetFamilyCount: families.length,
      decisionUse: "RESEARCH_AND_OWNER_REVIEW_ONLY",
      activationPerformed: false,
      ownerApproval: null,
      generatedAt: "2026-08-24T00:00:00.000Z",
      families,
    });
    const raw = stable(release);
    const summary = {
      releaseVersion: release.releaseVersion,
      payloadSha256: regionalFollowupChecksum(raw),
      predecessorReleaseChecksum: predecessorChecksum,
      includedTraits: wave.traits,
      targetFamilyCount: families.length,
      claimCount: families.reduce((sum, family) => sum + family.claims.length, 0),
      corroboratedFamilyCount: families.filter((family) => family.familyStatus === "CORROBORATED").length,
      partiallyCorroboratedFamilyCount: families.filter((family) => family.familyStatus === "PARTIALLY_CORROBORATED").length,
      researchRequiredFamilyCount: families.filter((family) => family.familyStatus === "RESEARCH_REQUIRED").length,
      corroboratedClaimCount: families.flatMap((family) => family.claims).filter((claim) => claim.status === "CORROBORATES").length,
      rankingMutationAllowed: false,
      activationPerformed: false,
    };
    const output = path.join(OUTPUT_ROOT, `v1.0.0-wave-${wave.number}-2026-08-24`);
    await mkdir(output, { recursive: true });
    await Promise.all([
      writeFile(path.join(output, "regional-corroboration.json"), raw),
      writeFile(path.join(output, "coverage-manifest.json"), stable(summary)),
    ]);
    console.log(JSON.stringify(summary));
    predecessorChecksum = summary.payloadSha256;
  }
}

void main();
