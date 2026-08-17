export type VehicleUsageArchitecture =
  | "PASSENGER_CAR"
  | "PASSENGER_CARRIER"
  | "ENCLOSED_CARGO"
  | "OPEN_CARGO"
  | "CAB_CHASSIS"
  | "UNKNOWN";

export type UsageOrientation = "CARGO_PRIORITY" | "PASSENGER_PRIORITY" | "BALANCED" | "UNKNOWN";
export type CommercialUsageScenario = "URBAN_DELIVERY" | "GENERAL_CARGO" | "PASSENGER_TRANSPORT" | "UNSPECIFIED";
export type CargoCapacityClass = "NOT_CARGO_RATED" | "COMPACT_CARGO" | "MEDIUM_CARGO" | "LARGE_CARGO" | "UNKNOWN";

export interface CargoCapacityBandPolicy {
  readonly policyId: "cargo-capacity-bands";
  readonly policyVersion: string;
  readonly policySource: "EXPIYA_PRODUCT_POLICY";
  readonly authority: "VERSIONED_PRODUCT_POLICY";
  readonly canonicalVehicleFact: false;
  readonly ownerEditorialVehicleLabel: false;
  readonly allowedDecisionEffects: readonly ["STRONG_RANK", "SOFT_RANK", "EXPLANATION_ONLY"];
  readonly bands: readonly {
    readonly capacityClass: Exclude<CargoCapacityClass, "NOT_CARGO_RATED" | "UNKNOWN">;
    readonly minimumExclusiveLitres?: number;
    readonly maximumInclusiveLitres?: number;
  }[];
}

export const CARGO_CAPACITY_BAND_POLICY_V1: CargoCapacityBandPolicy = Object.freeze({
  policyId: "cargo-capacity-bands",
  policyVersion: "1.0.0",
  policySource: "EXPIYA_PRODUCT_POLICY",
  authority: "VERSIONED_PRODUCT_POLICY",
  canonicalVehicleFact: false,
  ownerEditorialVehicleLabel: false,
  allowedDecisionEffects: ["STRONG_RANK", "SOFT_RANK", "EXPLANATION_ONLY"] as const,
  bands: [
    { capacityClass: "COMPACT_CARGO", maximumInclusiveLitres: 4_400 },
    { capacityClass: "MEDIUM_CARGO", minimumExclusiveLitres: 4_400, maximumInclusiveLitres: 7_000 },
    { capacityClass: "LARGE_CARGO", minimumExclusiveLitres: 7_000 },
  ] as const,
});

export type CargoVolumeRequirement =
  | {
      readonly mode: "EXACT_MINIMUM";
      readonly minimumLitres: number;
      readonly decisionEffect: "HARD_FILTER";
      readonly authority: "USER_EXPLICIT";
      readonly catalogFieldAuthority: "CATALOG_VERIFIED";
    }
  | {
      readonly mode: "POLICY_CLASS";
      readonly capacityClass: CargoCapacityClass;
      readonly decisionEffect: "STRONG_RANK" | "SOFT_RANK" | "EXPLANATION_ONLY";
      readonly policyId: string;
      readonly policyVersion: string;
      readonly policySource: string;
    }
  | {
      readonly mode: "GUIDED_APPROXIMATION";
      readonly mappingId: string;
      readonly decisionEffect: "SOFT_RANK";
    };

export type RearSeatRequirement = "REQUIRED" | "OPTIONAL" | "NOT_NEEDED" | "UNKNOWN";
export type RearSeatPresenceConstraint = "MUST_HAVE" | "MUST_NOT_HAVE" | "NO_CONSTRAINT";

export interface RearSeatPreference {
  readonly requirement: RearSeatRequirement;
  readonly presenceConstraint: RearSeatPresenceConstraint;
}

export interface ExactSeatRequirement {
  readonly minimumSeats: number;
  readonly decisionEffect: "HARD_FILTER";
  readonly authority: "USER_EXPLICIT";
  readonly catalogFieldAuthority: "CATALOG_VERIFIED";
}

export interface ExactCargoVolumeRequirement {
  readonly minimumLitres: number; readonly decisionEffect: "HARD_FILTER"; readonly authority: "USER_EXPLICIT";
}
export interface ExactLuggageVolumeRequirement {
  readonly minimumLitres: number; readonly decisionEffect: "HARD_FILTER"; readonly authority: "USER_EXPLICIT";
}
export interface ExactPayloadRequirement {
  readonly minimumKg: number; readonly decisionEffect: "HARD_FILTER"; readonly authority: "USER_EXPLICIT";
}
export interface CargoCapacityPreference {
  readonly preferredClass: Exclude<CargoCapacityClass, "NOT_CARGO_RATED" | "UNKNOWN">;
  readonly decisionEffect: "STRONG_RANK" | "SOFT_RANK";
}
