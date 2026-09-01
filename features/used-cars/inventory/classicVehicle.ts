import type { UsedCarFieldAssertion } from "../evidence/contracts";

export interface ClassicVehicleProfile {
  readonly estimatedProductionPeriod: UsedCarFieldAssertion<{ readonly fromYear: number; readonly untilYear: number }>;
  readonly chassisSeries: UsedCarFieldAssertion<string>;
  readonly originality: UsedCarFieldAssertion<"UNASSESSED" | "DECLARED" | "DOCUMENTED" | "EXPERT_REVIEWED">;
  readonly restorationStatus: UsedCarFieldAssertion<"UNRESTORED" | "PARTIAL" | "FULL" | "UNKNOWN">;
  readonly matchingNumbersClaim: UsedCarFieldAssertion<boolean>;
  readonly engineOrTransmissionChanges: UsedCarFieldAssertion<readonly string[]>;
  readonly periodCorrectness: UsedCarFieldAssertion<string>;
  readonly collectionHistory: UsedCarFieldAssertion<readonly string[]>;
  readonly archiveRecords: UsedCarFieldAssertion<readonly string[]>;
  readonly importAndRegistrationStatus: UsedCarFieldAssertion<string>;
  readonly partsAvailability: UsedCarFieldAssertion<string>;
  readonly useAndStorageConditions: UsedCarFieldAssertion<readonly string[]>;
  readonly expertReviewRequirements: readonly string[];
}

