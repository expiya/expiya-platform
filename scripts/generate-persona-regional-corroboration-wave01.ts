import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { EDITORIAL_RESEARCH_WAVE_01 } from "@/data/production/personas/evidence/editorial-research-wave-01";
import { personaRegionalCorroborationSchema, regionalCorroborationChecksum } from "@/features/vehicle-data/personaRegionalCorroboration";

const ROOT = process.cwd();
const PERSONA = path.join(ROOT, "data/production/personas/evidence/release-candidates/v3.9.0-catalog-v0.55.4-2026-08-24/persona-evidence.json");
const PERSONA_MANIFEST = path.join(ROOT, "data/production/personas/evidence/release-candidates/v3.9.0-catalog-v0.55.4-2026-08-24/coverage-manifest.json");
const OUTPUT = path.join(ROOT, "data/production/personas/evidence/regional-corroboration/release-candidates/v1.0.0-wave-01-2026-08-24");

interface Source { sourceId: string; authorityClass: string; market: string }
interface Claim { claimId: string; trait: string; sourceIds: string[]; derivationPolicy: string }
interface Family { familyId: string; canonicalBrand: string; canonicalModel: string; exactVariantIds: string[]; sources: Source[]; claims: Claim[] }

const stable = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const isRegional = (source: Source): boolean => source.authorityClass === "B1_EDITORIAL" && !["UK", "TR"].includes(source.market);

async function main(): Promise<void> {
  const persona = JSON.parse(await readFile(PERSONA, "utf8")) as { families: Family[] };
  const manifest = JSON.parse(await readFile(PERSONA_MANIFEST, "utf8")) as { payloadSha256: string };
  const priorWave = new Set(EDITORIAL_RESEARCH_WAVE_01.map((family) => `${family.canonicalBrand}|${family.canonicalModel}`));
  const targets = persona.families.filter((family) => !priorWave.has(`${family.canonicalBrand}|${family.canonicalModel}`) && family.claims.some((claim) => ["EDITORIAL_CHARACTER_CONSENSUS", "OFFICIAL_EDITORIAL_CHARACTER_CORROBORATION"].includes(claim.derivationPolicy)));
  const families = targets.map((family) => {
    const claims = family.claims.filter((claim) => ["EDITORIAL_CHARACTER_CONSENSUS", "OFFICIAL_EDITORIAL_CHARACTER_CORROBORATION"].includes(claim.derivationPolicy)).map((claim) => {
      const citedRegional = family.sources.filter((source) => claim.sourceIds.includes(source.sourceId) && isRegional(source));
      return {
        personaClaimId: claim.claimId,
        trait: claim.trait,
        status: citedRegional.length ? "CORROBORATES" as const : "RESEARCH_REQUIRED" as const,
        regionalSourceIds: citedRegional.map((source) => source.sourceId),
        regionalMarkets: [...new Set(citedRegional.map((source) => source.market))],
        rationale: citedRegional.length ? "Mevcut family/nesil bağlı claim en az bir UK/TR dışı profesyonel editoryal kaynakla destekleniyor; trait değişikliği yapılmaz." : "Mevcut claim yalnız UK/TR veya resmî kaynaklarla destekli; bağımsız bölgesel profesyonel yayın araştırması sıraya alındı.",
      };
    });
    return {
      familyId: family.familyId, canonicalBrand: family.canonicalBrand, canonicalModel: family.canonicalModel, exactVariantIds: family.exactVariantIds, claims,
      familyStatus: claims.every((claim) => claim.status === "CORROBORATES") ? "CORROBORATED" as const : "RESEARCH_REQUIRED" as const,
      rankingMutationAllowed: false as const, ownerReviewRequired: true as const,
    };
  });
  const release = personaRegionalCorroborationSchema.parse({
    schemaVersion: "1.0.0-rc.1", releaseVersion: "v1.0.0-wave-01-2026-08-24-rc.1", compatiblePersonaEvidenceChecksum: manifest.payloadSha256,
    wave: "WAVE_01_EDITORIAL_ENRICHED_FAMILIES", targetFamilyCount: 154, decisionUse: "RESEARCH_AND_OWNER_REVIEW_ONLY", activationPerformed: false, ownerApproval: null,
    generatedAt: "2026-08-24T00:00:00.000Z", families,
  });
  const raw = stable(release);
  const summary = {
    releaseVersion: release.releaseVersion, payloadSha256: regionalCorroborationChecksum(raw), targetFamilyCount: families.length,
    corroboratedFamilyCount: families.filter((family) => family.familyStatus === "CORROBORATED").length,
    researchRequiredFamilyCount: families.filter((family) => family.familyStatus === "RESEARCH_REQUIRED").length,
    claimCount: families.reduce((sum, family) => sum + family.claims.length, 0),
    rankingMutationAllowed: false, activationPerformed: false,
  };
  await mkdir(OUTPUT, { recursive: true });
  await Promise.all([writeFile(path.join(OUTPUT, "regional-corroboration.json"), raw), writeFile(path.join(OUTPUT, "coverage-manifest.json"), stable(summary))]);
  console.log(JSON.stringify(summary));
}

void main();
