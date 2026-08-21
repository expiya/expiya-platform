import type { CatalogFact } from "../catalog/types";
import type {
  CargoCapacityClass, CargoCapacityPreference, CommercialUsageScenario, ExactCargoVolumeRequirement,
  ExactLuggageVolumeRequirement, ExactPayloadRequirement, ExactSeatRequirement, RearSeatPreference,
  UsageOrientation, VehicleUsageArchitecture,
} from "../domain/usageCargo";

export interface CatalogFactReference {
  readonly field: string; readonly catalogFingerprint: string; readonly confidence: CatalogFact<unknown>["confidence"];
  readonly provenanceCount: number; readonly factKind: "CANONICAL" | "DERIVED_POLICY";
}
export type UsageArchitectureDerivation = "CANONICAL_USE_CLASS_AND_BODY_STYLE" | "CANONICAL_BODY_STYLE" | "CANONICAL_USE_CLASS" | "INSUFFICIENT_DATA";
export interface UsageArchitectureProjection {
  readonly architecture: VehicleUsageArchitecture; readonly derivation: UsageArchitectureDerivation;
  readonly sourceFactReferences: readonly CatalogFactReference[]; readonly confidence: "LOW" | "MEDIUM" | "HIGH";
  readonly hardScopeAuthority: boolean; readonly policyId: string; readonly policyVersion: string;
  readonly catalogFingerprint: string; readonly diagnostics: readonly UsageReasonCode[];
}

export interface UsageCargoNeed {
  readonly commercialScenario: CommercialUsageScenario; readonly orientation: UsageOrientation;
  readonly usageScenario?: { readonly scenario: import("./variantUsageClassification").VariantUsageScenario; readonly decisionEffect: import("./variantUsageClassification").UsageScenarioDecisionEffect };
  readonly architectureRequirement?: {
    readonly allowed?: readonly VehicleUsageArchitecture[]; readonly required?: VehicleUsageArchitecture;
    readonly excluded?: readonly VehicleUsageArchitecture[]; readonly explicitness: "USER_EXPLICIT" | "USER_CONFIRMED" | "INFERRED";
  };
  readonly minimumSeats?: ExactSeatRequirement; readonly rearSeatPreference?: RearSeatPreference;
  readonly minimumCargoLitres?: ExactCargoVolumeRequirement; readonly minimumLuggageLitres?: ExactLuggageVolumeRequirement;
  readonly minimumPayloadKg?: ExactPayloadRequirement; readonly cargoCapacityPreference?: CargoCapacityPreference;
}
export type SuitabilityOutcome = "PASS" | "FAIL" | "UNKNOWN";
export type UsageFactDecisionAuthority = "HARD_FILTER_ALLOWED" | "RANK_ONLY" | "EXPLANATION_ONLY" | "NOT_EVALUABLE";
export type UsageReasonCode =
  | "ARCHITECTURE_MATCH" | "ARCHITECTURE_MISMATCH" | "ARCHITECTURE_UNKNOWN" | "USE_CLASS_MISSING" | "USE_CLASS_BODY_STYLE_CONFLICT"
  | "CARGO_VOLUME_MATCH" | "CARGO_VOLUME_INSUFFICIENT" | "CARGO_VOLUME_UNKNOWN"
  | "LUGGAGE_VOLUME_MATCH" | "LUGGAGE_VOLUME_INSUFFICIENT" | "LUGGAGE_VOLUME_UNKNOWN"
  | "PAYLOAD_MATCH" | "PAYLOAD_INSUFFICIENT" | "PAYLOAD_UNKNOWN"
  | "SEATING_MATCH" | "SEATING_INSUFFICIENT" | "SEATING_UNKNOWN"
  | "REAR_SEAT_NOT_NEEDED_SOFT" | "REAR_SEAT_PRESENCE_NOT_PROVABLE"
  | "URBAN_DELIVERY_ENCLOSED_CARGO_FIT" | "URBAN_DELIVERY_COMPACT_CARGO_PREFERENCE"
  | "MANEUVERABILITY_NOT_PROVABLE" | "POLICY_CLASS_RANK_ONLY" | "PASSENGER_TRANSPORT_CARRIER_FIT" | "GENERAL_CARGO_ORIENTATION_ONLY"
  | "USAGE_SCENARIO_MEMBERSHIP_MATCH" | "USAGE_SCENARIO_MEMBERSHIP_MISMATCH" | "USAGE_SCENARIO_MEDIUM_FIT";
export interface UsageSuitabilityCheck {
  readonly id: string; readonly field: string; readonly outcome: SuitabilityOutcome; readonly reasonCode: UsageReasonCode;
  readonly hardRequirement: boolean; readonly authority: UsageFactDecisionAuthority; readonly sourceFactReferences: readonly CatalogFactReference[];
}
export interface UsageRankingSignal { readonly id: string; readonly strength: "STRONG" | "SOFT"; readonly direction: "POSITIVE" | "NEUTRAL"; readonly reasonCode: UsageReasonCode }
export interface UsageExplanationInput { readonly reasonCode: UsageReasonCode; readonly sourceFactReferences: readonly CatalogFactReference[]; readonly catalogFingerprint: string }
export interface UsagePolicyReference { readonly policyId: string; readonly policyVersion: string; readonly decisionEffect: "HARD_FILTER" | "STRONG_RANK" | "SOFT_RANK" | "EXPLANATION_ONLY" }
export interface UsageSuitabilityEvaluation {
  readonly exactVariantId: string; readonly overallOutcome: SuitabilityOutcome; readonly checks: readonly UsageSuitabilityCheck[];
  readonly hardFailures: readonly string[]; readonly unknownHardRequirements: readonly string[];
  readonly rankingSignals: readonly UsageRankingSignal[]; readonly explanationFactInputs: readonly UsageExplanationInput[];
  readonly policyReferences: readonly UsagePolicyReference[];
}
export interface CargoCapacityProjection { readonly capacityClass: CargoCapacityClass; readonly authority: "RANK_ONLY" | "NOT_EVALUABLE"; readonly policyId: string; readonly policyVersion: string }
