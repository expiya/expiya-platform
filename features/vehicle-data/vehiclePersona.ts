import personaPayload from "@/data/production/personas/vehicle-personas.v1.json";
import type { ResolvedVehiclePersona, VehiclePersonaMatch, VehiclePersonaTrait } from "@/types/vehiclePersona";

type PersonaBrand = (typeof personaPayload.brands)[number];
type PersonaSeries = PersonaBrand["series"][number];

const normalize = (value: string) => value.toLocaleUpperCase("tr-TR")
  .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .replaceAll("Ë", "E").replaceAll("İ", "I")
  .replace(/\b(YENI|NEW|HYBRID|HIBRIT|ELECTRIC|ELEKTRIK)\b/g, " ")
  .replace(/[^A-Z0-9]+/g, " ").trim();

const aliases = (group: string) => group
  .replace(/\([^)]*\)/g, "")
  .split("/").map((item) => normalize(item.replace(/\bSerisi\b/giu, ""))).filter(Boolean);

function aliasScore(model: string, group: string): number {
  const normalizedModel = normalize(model);
  const compactModel = normalizedModel.replaceAll(" ", "");
  let best = 0;
  for (const alias of aliases(group)) {
    if (normalizedModel === alias || compactModel === alias.replaceAll(" ", "")) best = Math.max(best, 1_000 + alias.length);
    else if (normalizedModel.startsWith(`${alias} `) || normalizedModel.startsWith(alias)) best = Math.max(best, 700 + alias.length);
    const modelTokens = new Set(normalizedModel.split(" "));
    const aliasTokens = alias.split(" ");
    const common = aliasTokens.filter((token) => modelTokens.has(token)).length;
    best = Math.max(best, common * 100 + Math.round((common / aliasTokens.length) * 50));
  }
  if (/^3\d\d[A-Z]*/.test(normalizedModel) && /3 SERISI/i.test(normalize(group))) best = 900;
  if (/^E[ -]?/.test(model) && aliases(group).some((alias) => normalizedModel.slice(1).startsWith(alias))) best = Math.max(best, 650);
  return best;
}

const traitRules: readonly [VehiclePersonaTrait, RegExp][] = [
  ["DESIGN", /tasarım|estetik|şık|moda|avangart|retro|stil/iu],
  ["DRIVING_ENGAGEMENT", /sürüş|viraj|performans|pist|hız|ralli|karting|dinamik/iu],
  ["COMFORT", /konfor|rahat|sessiz|yumuşak/iu],
  ["PRACTICALITY", /pratik|geniş|bagaj|işlev|hacim|koltuk/iu],
  ["TECHNOLOGY", /teknoloji|fütür|dijital|ekran|akıllı|siber/iu],
  ["PRESTIGE", /lüks|prestij|statü|asil|aristokrat|premium/iu],
  ["VALUE", /ekonom|bütçe|fiyat.performans|uygun fiyat|az yakan|masraf/iu],
  ["ADVENTURE", /arazi|doğa|kamp|çamur|dağ|macera|4x4/iu],
  ["FAMILY", /aile|çocuk|7 kişi|kalabalık/iu],
  ["URBAN", /şehir|park|kompakt|küçük/iu],
  ["COMMERCIAL", /ticari|esnaf|lojistik|yük|taşımacılık|şantiye/iu],
  ["SUSTAINABILITY", /çevreci|sürdürülebilir|karbon|elektrikli/iu],
  ["MINIMALISM", /minimal|gösterişten uzak|sade/iu],
];

function traitsFor(brand: PersonaBrand, series: PersonaSeries): readonly VehiclePersonaTrait[] {
  const text = `${brand.brandPersona} ${series.persona}`;
  return traitRules.filter(([, pattern]) => pattern.test(text)).map(([trait]) => trait);
}

export function resolveVehiclePersona(brandName: string, model: string): ResolvedVehiclePersona | undefined {
  const brand = personaPayload.brands.find((item) => normalize(item.brand) === normalize(brandName));
  if (!brand) return undefined;
  const ranked = brand.series.map((series) => ({ series, score: aliasScore(model, series.group) }))
    .sort((left, right) => right.score - left.score || left.series.group.localeCompare(right.series.group, "tr"));
  const series = ranked[0]?.score > 0 ? ranked[0].series : undefined;
  if (!series) return undefined;
  return {
    brand: brand.brand, seriesGroup: series.group, brandEditorial: brand.brandPersona,
    seriesEditorial: series.persona, traits: traitsFor(brand, series),
    authority: "OWNER_EDITORIAL", decisionUse: "SOFT_PREFERENCE_ONLY",
  };
}

const preferenceRules: readonly [VehiclePersonaTrait, RegExp][] = [
  ["DESIGN", /tasarım|estetik|şık|tarz|stil|farklı görün/iu],
  ["DRIVING_ENGAGEMENT", /sürüş keyfi|viraj|dinamik|performans|sportif/iu],
  ["COMFORT", /konfor|rahat|sessiz/iu],
  ["PRACTICALITY", /pratik|bagaj|geniş|kullanışlı/iu],
  ["TECHNOLOGY", /teknoloji|dijital|ekran|fütür/iu],
  ["PRESTIGE", /prestij|lüks|statü|premium/iu],
  ["VALUE", /mantıklı|fiyat.performans|ekonomik|bütçe dostu|masraf/iu],
  ["ADVENTURE", /kamp|doğa|arazi|macera|dağ/iu],
  ["FAMILY", /aile|çocuk|kalabalık/iu],
  ["URBAN", /şehir içi|park|kompakt/iu],
  ["COMMERCIAL", /ticari|esnaf|yük|lojistik/iu],
  ["SUSTAINABILITY", /çevreci|sürdürülebilir|karbon/iu],
  ["MINIMALISM", /minimal|sade|gösterişsiz/iu],
];

export function matchVehiclePersona(brand: string, model: string, userText: string): VehiclePersonaMatch {
  const persona = resolveVehiclePersona(brand, model);
  if (!persona) return { score: 0, matchedTraits: [] };
  const requested = preferenceRules.filter(([, pattern]) => pattern.test(userText)).map(([trait]) => trait);
  const matchedTraits = requested.filter((trait) => persona.traits.includes(trait));
  return { score: matchedTraits.length, matchedTraits, persona };
}

const traitLabels: Readonly<Record<VehiclePersonaTrait, string>> = {
  DESIGN: "tasarım", DRIVING_ENGAGEMENT: "sürüş karakteri", COMFORT: "konfor",
  PRACTICALITY: "pratiklik", TECHNOLOGY: "teknoloji", PRESTIGE: "prestij", VALUE: "fiyat/değer dengesi",
  ADVENTURE: "doğa ve macera", FAMILY: "aile kullanımı", URBAN: "şehir kullanımı",
  COMMERCIAL: "ticari kullanım", SUSTAINABILITY: "sürdürülebilirlik", MINIMALISM: "sadelik",
};

export function vehiclePersonaReason(brand: string, model: string, userText: string): string | undefined {
  const match = matchVehiclePersona(brand, model, userText);
  if (!match.persona || match.matchedTraits.length === 0) return undefined;
  const labels = match.matchedTraits.slice(0, 3).map((trait) => traitLabels[trait]);
  return `${match.persona.brand} ${match.persona.seriesGroup} editoryal personası, belirttiğiniz ${labels.join(", ")} tercihleriyle örtüşüyor.`;
}
