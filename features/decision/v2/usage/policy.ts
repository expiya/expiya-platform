import { CARGO_CAPACITY_BAND_POLICY_V1, type CargoCapacityBandPolicy, type VehicleUsageArchitecture } from "../domain/usageCargo";

export interface UsageArchitecturePolicy {
  readonly policyId: "usage-architecture-derivation"; readonly policyVersion: "1.0.0";
  readonly bodyStyleArchitecture: Readonly<Partial<Record<string, Exclude<VehicleUsageArchitecture, "UNKNOWN">>>>;
  readonly minimumHardConfidence: "MEDIUM";
}

export const USAGE_ARCHITECTURE_POLICY_V1: UsageArchitecturePolicy = Object.freeze({
  policyId: "usage-architecture-derivation", policyVersion: "1.0.0", minimumHardConfidence: "MEDIUM",
  bodyStyleArchitecture: Object.freeze({
    "Panel Van": "ENCLOSED_CARGO", Pickup: "OPEN_CARGO", "Chassis Cab": "CAB_CHASSIS",
    "Passenger Van": "PASSENGER_CARRIER", MPV: "PASSENGER_CARRIER", Sedan: "PASSENGER_CAR",
    Hatchback: "PASSENGER_CAR", SUV: "PASSENGER_CAR", Coupe: "PASSENGER_CAR", Convertible: "PASSENGER_CAR",
    Crossover: "PASSENGER_CAR", "Fastback SUV": "PASSENGER_CAR", Liftback: "PASSENGER_CAR",
    "Station Wagon": "PASSENGER_CAR", Quadricycle: "PASSENGER_CAR",
  }),
});

export interface UsageFactAuthorityPolicy {
  readonly policyId: "usage-fact-decision-authority"; readonly policyVersion: "1.0.0";
  readonly minimumHardConfidence: "MEDIUM"; readonly requireProvenance: true; readonly requireCatalogFingerprintMatch: true;
  readonly derivedCapacityClassHardFilterAllowed: false; readonly dimensionProxyHardFilterAllowed: false;
}
export const USAGE_FACT_AUTHORITY_POLICY_V1: UsageFactAuthorityPolicy = Object.freeze({
  policyId: "usage-fact-decision-authority", policyVersion: "1.0.0", minimumHardConfidence: "MEDIUM",
  requireProvenance: true, requireCatalogFingerprintMatch: true, derivedCapacityClassHardFilterAllowed: false,
  dimensionProxyHardFilterAllowed: false,
});

export interface UsageCargoPolicies {
  readonly architecture: UsageArchitecturePolicy; readonly factAuthority: UsageFactAuthorityPolicy;
  readonly cargoCapacity: CargoCapacityBandPolicy;
}
export const USAGE_CARGO_POLICIES_V1: UsageCargoPolicies = Object.freeze({
  architecture: USAGE_ARCHITECTURE_POLICY_V1, factAuthority: USAGE_FACT_AUTHORITY_POLICY_V1,
  cargoCapacity: CARGO_CAPACITY_BAND_POLICY_V1,
});
