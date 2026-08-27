import pilotEvidence from "@/data/research/owner-manual-evidence-v4/pilot-assertions.json";
import coverage from "@/data/research/owner-manual-evidence-v4/coverage.json";

type CatalogIdentity = {
  readonly id: string;
  readonly brand: string;
  readonly model: string;
};

const normalized = (value: string) => value
  .toLocaleLowerCase("tr-TR")
  .normalize("NFKD")
  .replace(/\p{M}+/gu, "")
  .replace(/ı/gu, "i")
  .replace(/[^a-z0-9]+/gu, " ")
  .trim();

const normalizedFamily = (value: string) => normalized(value)
  .replace(/\b(electric|elektrik|hybrid|hibrit|kamyonet|panelvan|cargo|van|combi|multix|sedan|cross|coupe|sports tourer)\b/gu, "")
  .replace(/\b145\b/gu, "")
  .replace(/\s+/gu, " ")
  .trim();

const artifactsBySourceId = new Map(pilotEvidence.artifacts.map((artifact) => [artifact.sourceId, artifact]));

function familyMatches(brand: string, model: string, documentedFamily: string): boolean {
  const exactCandidate = normalized(model);
  const exactDocumented = documentedFamily.split("/").map(normalized);
  if (exactDocumented.includes(exactCandidate)) return true;

  // Closely named derivatives can have materially different equipment and
  // powertrains. Keep the same explicit isolation boundary as generation.
  if (brand === "Toyota" && (model.includes("Yaris") || documentedFamily.includes("Yaris"))) return false;
  if (brand === "Fiat" && (model.includes("Doblo") || documentedFamily.includes("Doblo"))) return false;
  if (brand === "Mercedes-Benz" && (model.includes("Citan") || documentedFamily.includes("Citan"))) return false;
  if (brand === "Mercedes-Benz" && (model.includes("EQE") || documentedFamily.includes("EQE"))) return false;
  if (brand === "Land Rover" && (model.startsWith("Range Rover") || documentedFamily.startsWith("Range Rover"))) return false;
  if (brand === "Škoda" && (model.includes("Enyaq") || documentedFamily.includes("Enyaq"))) return false;

  const candidate = normalizedFamily(model);
  return documentedFamily.split("/").map(normalizedFamily).some((family) => candidate === family || candidate.startsWith(`${family} `));
}

export function hasProvisionalOwnerManualEquipment(input: {
  readonly variant: CatalogIdentity;
  readonly featureCode: string;
  readonly catalogRelease: string;
  readonly catalogFingerprint: string;
}): boolean {
  if (input.catalogRelease.replace(/^v/u, "") !== coverage.catalogRelease.replace(/^v/u, "") || input.catalogFingerprint !== coverage.catalogFingerprint) return false;
  return pilotEvidence.assertions.some((assertion) => {
    if (assertion.featureCode !== input.featureCode || assertion.polarity !== "POSITIVE" || assertion.normalizedValue === false) return false;
    if (assertion.authorityLevel === "RESEARCHED_INCONCLUSIVE") return false;
    if ("exactVariantId" in assertion && assertion.exactVariantId && assertion.exactVariantId !== input.variant.id) return false;
    const artifact = artifactsBySourceId.get(assertion.sourceId);
    return Boolean(artifact
      && normalized(artifact.brand) === normalized(input.variant.brand)
      && familyMatches(artifact.brand, input.variant.model, assertion.applicability.modelFamily));
  });
}
