export type PreferenceStrength = "HARD" | "SOFT" | "UNSPECIFIED";
export type HeavyDamageApproach = "EXCLUDE" | "CONSIDER_WITH_EVIDENCE" | "UNSPECIFIED";

export interface UsedCarPreferenceLedger {
  readonly version: "used-car-preference-ledger/v1";
  readonly totalBudgetTry?: number;
  readonly downPaymentTry?: number;
  readonly financingLimitTry?: number;
  readonly usagePurposes: readonly string[];
  readonly annualMileageKm?: number;
  readonly cityDrivingRatio?: number;
  readonly bodyStyles: readonly string[];
  readonly fuelTypes: readonly string[];
  readonly transmissions: readonly string[];
  readonly minimumModelYear?: { readonly value: number; readonly strength: PreferenceStrength };
  readonly maximumMileageKm?: { readonly value: number; readonly strength: PreferenceStrength };
  readonly paintTolerance: "NONE" | "LIMITED" | "FLEXIBLE" | "UNSPECIFIED";
  readonly replacedPartTolerance: "NONE" | "LIMITED" | "FLEXIBLE" | "UNSPECIFIED";
  readonly heavyDamageApproach: HeavyDamageApproach;
  readonly maintenanceExpectation: "DOCUMENTED" | "PREFERRED" | "FLEXIBLE" | "UNSPECIFIED";
  readonly warrantyExpectation: "REQUIRED" | "PREFERRED" | "NOT_REQUIRED" | "UNSPECIFIED";
  readonly unexpectedExpenseTolerance: "LOW" | "MEDIUM" | "HIGH" | "UNSPECIFIED";
  readonly nearbyServiceAccessRequired?: boolean;
  readonly resalePriority?: "LOW" | "MEDIUM" | "HIGH";
  readonly classicInterest: boolean;
  readonly classicPurpose?: "DAILY_USE" | "COLLECTION";
}
