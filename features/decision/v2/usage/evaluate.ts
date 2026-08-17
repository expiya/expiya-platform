import type { CatalogFact, CatalogVariantSnapshot } from "../catalog/types";
import type { CargoCapacityBandPolicy, CargoCapacityClass } from "../domain/usageCargo";
import { catalogFactReference, evaluateUsageFactAuthority } from "./authority";
import type { UsageCargoPolicies } from "./policy";
import { projectUsageArchitecture } from "./projection";
import type {
  CargoCapacityProjection, UsageCargoNeed, UsageExplanationInput, UsagePolicyReference, UsageRankingSignal,
  UsageReasonCode, UsageSuitabilityCheck, UsageSuitabilityEvaluation,
} from "./types";

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value as object)) return value;
  seen.add(value as object);
  for (const child of Object.values(value as object)) deepFreeze(child, seen);
  return Object.freeze(value);
}

export function classifyCargoCapacity(cargoVolumeLitres: number | undefined, policy: CargoCapacityBandPolicy): CargoCapacityProjection {
  let capacityClass: CargoCapacityClass = "UNKNOWN";
  if (cargoVolumeLitres !== undefined) {
    const band = policy.bands.find((candidate) => (candidate.minimumExclusiveLitres === undefined || cargoVolumeLitres > candidate.minimumExclusiveLitres)
      && (candidate.maximumInclusiveLitres === undefined || cargoVolumeLitres <= candidate.maximumInclusiveLitres));
    capacityClass = band?.capacityClass ?? "UNKNOWN";
  }
  return Object.freeze({ capacityClass, authority: capacityClass === "UNKNOWN" ? "NOT_EVALUABLE" : "RANK_ONLY", policyId: policy.policyId, policyVersion: policy.policyVersion });
}

function exactMinimumCheck(input: {
  readonly id: string; readonly field: string; readonly fact?: CatalogFact<number>; readonly minimum: number;
  readonly match: UsageReasonCode; readonly insufficient: UsageReasonCode; readonly unknown: UsageReasonCode;
  readonly catalogFingerprint: string; readonly policies: UsageCargoPolicies;
}): UsageSuitabilityCheck {
  const authority = evaluateUsageFactAuthority({ fact: input.fact, expectedCatalogFingerprint: input.catalogFingerprint, explicitHardRequirement: true, policy: input.policies.factAuthority });
  const references = input.fact ? [catalogFactReference(input.field, input.fact)] : [];
  if (!input.fact || authority !== "HARD_FILTER_ALLOWED") return { id: input.id, field: input.field, outcome: "UNKNOWN", reasonCode: input.unknown, hardRequirement: true, authority, sourceFactReferences: references };
  const pass = input.fact.value >= input.minimum;
  return { id: input.id, field: input.field, outcome: pass ? "PASS" : "FAIL", reasonCode: pass ? input.match : input.insufficient, hardRequirement: true, authority, sourceFactReferences: references };
}

export function evaluateUsageCargoSuitability(variant: CatalogVariantSnapshot, need: UsageCargoNeed, policies: UsageCargoPolicies): UsageSuitabilityEvaluation {
  const architecture = projectUsageArchitecture(variant, policies.architecture);
  const checks: UsageSuitabilityCheck[] = [];
  const rankingSignals: UsageRankingSignal[] = [];
  const explanationFactInputs: UsageExplanationInput[] = [];
  const policyReferences: UsagePolicyReference[] = [{ policyId: policies.architecture.policyId, policyVersion: policies.architecture.policyVersion, decisionEffect: need.architectureRequirement ? "HARD_FILTER" : "EXPLANATION_ONLY" }];
  for (const reasonCode of architecture.diagnostics) explanationFactInputs.push({ reasonCode, sourceFactReferences: architecture.sourceFactReferences, catalogFingerprint: architecture.catalogFingerprint });
  const requirement = need.architectureRequirement;
  if (requirement) {
    const hard = requirement.explicitness !== "INFERRED";
    const matches = (requirement.required === undefined || architecture.architecture === requirement.required)
      && (requirement.allowed === undefined || requirement.allowed.includes(architecture.architecture))
      && (requirement.excluded === undefined || !requirement.excluded.includes(architecture.architecture));
    const outcome = architecture.architecture === "UNKNOWN" || (hard && !architecture.hardScopeAuthority) ? "UNKNOWN" : matches ? "PASS" : "FAIL";
    checks.push({ id: "architecture", field: "usageArchitecture", outcome, reasonCode: outcome === "PASS" ? "ARCHITECTURE_MATCH" : outcome === "FAIL" ? "ARCHITECTURE_MISMATCH" : "ARCHITECTURE_UNKNOWN", hardRequirement: hard, authority: architecture.hardScopeAuthority ? hard ? "HARD_FILTER_ALLOWED" : "RANK_ONLY" : "NOT_EVALUABLE", sourceFactReferences: architecture.sourceFactReferences });
  }
  const fingerprint = architecture.catalogFingerprint;
  const dimensions = variant.decisionFacts.dimensions;
  if (need.minimumCargoLitres || need.minimumLuggageLitres || need.minimumPayloadKg || need.minimumSeats) {
    policyReferences.push({ policyId: policies.factAuthority.policyId, policyVersion: policies.factAuthority.policyVersion, decisionEffect: "HARD_FILTER" });
  }
  if (need.minimumCargoLitres) checks.push(exactMinimumCheck({ id: "minimum-cargo-litres", field: "cargoVolumeLitres", fact: dimensions.cargoVolumeLitres, minimum: need.minimumCargoLitres.minimumLitres, match: "CARGO_VOLUME_MATCH", insufficient: "CARGO_VOLUME_INSUFFICIENT", unknown: "CARGO_VOLUME_UNKNOWN", catalogFingerprint: fingerprint, policies }));
  if (need.minimumLuggageLitres) checks.push(exactMinimumCheck({ id: "minimum-luggage-litres", field: "luggageLitres", fact: dimensions.luggageLitres, minimum: need.minimumLuggageLitres.minimumLitres, match: "LUGGAGE_VOLUME_MATCH", insufficient: "LUGGAGE_VOLUME_INSUFFICIENT", unknown: "LUGGAGE_VOLUME_UNKNOWN", catalogFingerprint: fingerprint, policies }));
  if (need.minimumPayloadKg) checks.push(exactMinimumCheck({ id: "minimum-payload-kg", field: "payloadKg", fact: dimensions.payloadKg, minimum: need.minimumPayloadKg.minimumKg, match: "PAYLOAD_MATCH", insufficient: "PAYLOAD_INSUFFICIENT", unknown: "PAYLOAD_UNKNOWN", catalogFingerprint: fingerprint, policies }));
  if (need.minimumSeats) checks.push(exactMinimumCheck({ id: "minimum-seats", field: "seats", fact: dimensions.seats, minimum: need.minimumSeats.minimumSeats, match: "SEATING_MATCH", insufficient: "SEATING_INSUFFICIENT", unknown: "SEATING_UNKNOWN", catalogFingerprint: fingerprint, policies }));
  if (need.rearSeatPreference?.requirement === "NOT_NEEDED") rankingSignals.push({ id: "rear-seats-not-needed", strength: "SOFT", direction: "POSITIVE", reasonCode: "REAR_SEAT_NOT_NEEDED_SOFT" });
  if (need.rearSeatPreference && need.rearSeatPreference.presenceConstraint !== "NO_CONSTRAINT") checks.push({ id: "rear-seat-presence", field: "rearSeatPresence", outcome: "UNKNOWN", reasonCode: "REAR_SEAT_PRESENCE_NOT_PROVABLE", hardRequirement: true, authority: "NOT_EVALUABLE", sourceFactReferences: [] });
  const capacity = classifyCargoCapacity(dimensions.cargoVolumeLitres?.value, policies.cargoCapacity);
  if (need.cargoCapacityPreference) {
    policyReferences.push({ policyId: capacity.policyId, policyVersion: capacity.policyVersion, decisionEffect: need.cargoCapacityPreference.decisionEffect });
    if (capacity.capacityClass === need.cargoCapacityPreference.preferredClass) rankingSignals.push({ id: "cargo-capacity-preference", strength: need.cargoCapacityPreference.decisionEffect === "STRONG_RANK" ? "STRONG" : "SOFT", direction: "POSITIVE", reasonCode: "POLICY_CLASS_RANK_ONLY" });
    explanationFactInputs.push({ reasonCode: "POLICY_CLASS_RANK_ONLY", sourceFactReferences: dimensions.cargoVolumeLitres ? [catalogFactReference("cargoVolumeLitres", dimensions.cargoVolumeLitres, "DERIVED_POLICY")] : [], catalogFingerprint: fingerprint });
  }
  if (need.commercialScenario === "URBAN_DELIVERY") {
    if (architecture.architecture === "ENCLOSED_CARGO") rankingSignals.push({ id: "urban-enclosed-cargo", strength: "STRONG", direction: "POSITIVE", reasonCode: "URBAN_DELIVERY_ENCLOSED_CARGO_FIT" });
    if (capacity.capacityClass === "COMPACT_CARGO" && evaluateUsageFactAuthority({ fact: dimensions.cargoVolumeLitres, expectedCatalogFingerprint: fingerprint, explicitHardRequirement: false, policy: policies.factAuthority }) === "RANK_ONLY") {
      rankingSignals.push({ id: "urban-compact-cargo", strength: "STRONG", direction: "POSITIVE", reasonCode: "URBAN_DELIVERY_COMPACT_CARGO_PREFERENCE" });
      policyReferences.push({ policyId: capacity.policyId, policyVersion: capacity.policyVersion, decisionEffect: "STRONG_RANK" });
    }
    if (!dimensions.lengthMm || !dimensions.widthMm) explanationFactInputs.push({ reasonCode: "MANEUVERABILITY_NOT_PROVABLE", sourceFactReferences: [], catalogFingerprint: fingerprint });
  }
  if (need.commercialScenario === "PASSENGER_TRANSPORT" && architecture.architecture === "PASSENGER_CARRIER") rankingSignals.push({ id: "passenger-carrier-fit", strength: "STRONG", direction: "POSITIVE", reasonCode: "PASSENGER_TRANSPORT_CARRIER_FIT" });
  if (need.commercialScenario === "GENERAL_CARGO") rankingSignals.push({ id: "general-cargo-orientation", strength: "SOFT", direction: "NEUTRAL", reasonCode: "GENERAL_CARGO_ORIENTATION_ONLY" });
  for (const check of checks) explanationFactInputs.push({ reasonCode: check.reasonCode, sourceFactReferences: check.sourceFactReferences, catalogFingerprint: fingerprint });
  const hardFailures = checks.filter((check) => check.hardRequirement && check.outcome === "FAIL").map((check) => check.id);
  const unknownHardRequirements = checks.filter((check) => check.hardRequirement && check.outcome === "UNKNOWN").map((check) => check.id);
  const overallOutcome = hardFailures.length > 0 ? "FAIL" : unknownHardRequirements.length > 0 ? "UNKNOWN" : "PASS";
  const uniquePolicyReferences = [...new Map(policyReferences.map((reference) => [`${reference.policyId}:${reference.policyVersion}:${reference.decisionEffect}`, reference])).values()];
  return deepFreeze({ exactVariantId: variant.id, overallOutcome, checks, hardFailures, unknownHardRequirements, rankingSignals, explanationFactInputs, policyReferences: uniquePolicyReferences });
}
