import policy from "@/data/production/personas/safe-traits/policies/v1.0.0.json";
import { VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY } from "@/types/vehiclePersonaSafeTraits";
import type { VehiclePersonaTrait } from "@/types/vehiclePersona";
import type { SafeTraitDerivationReason } from "@/types/vehiclePersonaSafeTraits";

export type { SafeTraitDerivationReason } from "@/types/vehiclePersonaSafeTraits";

export type SafePersonaRiskFlag =
  | "DEMOGRAPHIC_SOURCE_CONTEXT" | "PROFESSION_SOURCE_CONTEXT" | "SOCIAL_CLASS_SOURCE_CONTEXT"
  | "DANGEROUS_DRIVING_SOURCE_CONTEXT" | "RIVALRY_SOURCE_CONTEXT" | "COMMERCIAL_FALSE_POSITIVE_RISK"
  | "SUSTAINABILITY_TECHNICAL_MISMATCH" | "PRESTIGE_SOCIAL_CLASS_RISK" | "ADVENTURE_BODY_MISMATCH"
  | "SAFE_NEUTRAL_CONTEXT" | "EMPTY_AFTER_SANITIZATION";

export interface SafePersonaSemanticInput {
  readonly priorTraits: readonly VehiclePersonaTrait[];
  readonly sourceEditorialText: string;
  readonly bodyStyles: readonly string[];
  readonly vehicleUseClasses: readonly string[];
  readonly fuelTypes: readonly string[];
}

export interface SafePersonaSemanticResult {
  readonly traits: readonly VehiclePersonaTrait[];
  readonly reasons: readonly { trait: VehiclePersonaTrait; reasonCode: SafeTraitDerivationReason }[];
  readonly riskFlags: readonly SafePersonaRiskFlag[];
  readonly reviewStatus: "OWNER_REVIEW_REQUIRED";
}

const demographic = /\b(kadın|erkek|anne|baba|genç|yaşlı|üniversiteli|öğrenci|evli|bekar|influencer)\b/iu;
const profession = /\b(beyaz yakalı|ceo|yönetici|avukat|doktor|mühendis|iş insanı|işadamı|şirket sahibi|esnaf)\b/iu;
const socialClass = /\b(milyoner|milyarder|zengin|fakir|aristokrat|elit|sosyal sınıf|statü)\b/iu;
const dangerous = /\b(makas|makasçı|agresif|saldırgan|tehlikeli|trafik ihlali|kural tanımaz|trafik terörü)\b/iu;
const rivalry = /rakip marka|sürücülerine|bmw sürüc|mercedes sürüc|audi sürüc/iu;
const normalize = (value: string) => value.toLocaleUpperCase("tr-TR").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]+/g, " ").trim();
const matchesAny = (values: readonly string[], patterns: readonly string[]) => values.some((value) => patterns.some((pattern) => normalize(value).includes(pattern)));
const reason: Readonly<Partial<Record<VehiclePersonaTrait, SafeTraitDerivationReason>>> = {
  DESIGN: "NEUTRAL_DESIGN_CHARACTER", DRIVING_ENGAGEMENT: "NEUTRAL_DRIVING_CHARACTER",
  TECHNOLOGY: "NEUTRAL_TECHNOLOGY_CHARACTER", PRESTIGE: "NEUTRAL_PRESTIGE_CHARACTER",
  ADVENTURE: "NEUTRAL_ADVENTURE_CHARACTER", URBAN: "NEUTRAL_URBAN_CHARACTER", MINIMALISM: "NEUTRAL_MINIMALISM_CHARACTER",
};

export function applySafePersonaTraitDerivationPolicy(input: SafePersonaSemanticInput): SafePersonaSemanticResult {
  const flags = new Set<SafePersonaRiskFlag>(); const text = input.sourceEditorialText;
  const hasDemographic = demographic.test(text); const hasProfession = profession.test(text); const hasSocialClass = socialClass.test(text);
  const hasDanger = dangerous.test(text); const hasRivalry = rivalry.test(text);
  if (hasDemographic) flags.add("DEMOGRAPHIC_SOURCE_CONTEXT"); if (hasProfession) flags.add("PROFESSION_SOURCE_CONTEXT");
  if (hasSocialClass) flags.add("SOCIAL_CLASS_SOURCE_CONTEXT"); if (hasDanger) flags.add("DANGEROUS_DRIVING_SOURCE_CONTEXT"); if (hasRivalry) flags.add("RIVALRY_SOURCE_CONTEXT");
  const commercialArchitecture = input.vehicleUseClasses.some((value) => policy.commercialVehicleUseClasses.includes(value as "LIGHT_COMMERCIAL" | "HEAVY_COMMERCIAL")) || matchesAny(input.bodyStyles, policy.commercialBodyPatterns);
  const sustainableArchitecture = input.fuelTypes.some((value) => policy.sustainabilityFuelTypes.includes(value as "BEV" | "PHEV" | "HEV" | "HYDROGEN"));
  const sustainabilityReview = input.fuelTypes.some((value) => policy.sustainabilityReviewFuelTypes.includes(value as "MHEV"));
  const adventureArchitecture = matchesAny(input.bodyStyles, policy.adventureBodyPatterns);
  const proposed = new Map<VehiclePersonaTrait, SafeTraitDerivationReason>();
  for (const trait of input.priorTraits) {
    if ((policy.reviewBeforePublishingTraits as readonly string[]).includes(trait)) continue;
    if (trait === "COMMERCIAL") { if (!commercialArchitecture) flags.add("COMMERCIAL_FALSE_POSITIVE_RISK"); continue; }
    if (trait === "SUSTAINABILITY") { if (!sustainableArchitecture) flags.add("SUSTAINABILITY_TECHNICAL_MISMATCH"); continue; }
    if (trait === "DRIVING_ENGAGEMENT" && hasDanger) continue;
    if (trait === "ADVENTURE") { if (hasDanger) continue; if (!adventureArchitecture) flags.add("ADVENTURE_BODY_MISMATCH"); }
    if (trait === "PRESTIGE" && (hasProfession || hasSocialClass)) { flags.add("PRESTIGE_SOCIAL_CLASS_RISK"); continue; }
    if (["DESIGN", "TECHNOLOGY", "MINIMALISM", "URBAN"].includes(trait) && (hasDemographic || hasProfession || hasSocialClass || hasRivalry)) continue;
    const reasonCode = reason[trait]; if (reasonCode) proposed.set(trait, reasonCode);
  }
  if (commercialArchitecture && input.priorTraits.includes("COMMERCIAL")) proposed.set("COMMERCIAL", "CANONICAL_COMMERCIAL_ARCHITECTURE");
  if (sustainableArchitecture && input.priorTraits.includes("SUSTAINABILITY")) proposed.set("SUSTAINABILITY", "ELECTRIFIED_SUSTAINABILITY_CHARACTER");
  else if (sustainabilityReview && input.priorTraits.includes("SUSTAINABILITY")) flags.add("SUSTAINABILITY_TECHNICAL_MISMATCH");
  const traits = VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY.filter((trait) => proposed.has(trait));
  if (flags.size === 0 && traits.length > 0) flags.add("SAFE_NEUTRAL_CONTEXT");
  if (traits.length === 0) flags.add("EMPTY_AFTER_SANITIZATION");
  return Object.freeze({ traits: Object.freeze(traits), reasons: Object.freeze(traits.map((trait) => Object.freeze({ trait, reasonCode: proposed.get(trait)! }))), riskFlags: Object.freeze([...flags].sort()), reviewStatus: "OWNER_REVIEW_REQUIRED" });
}

export const SAFE_PERSONA_TRAIT_DERIVATION_POLICY_VERSION = policy.policyVersion;
