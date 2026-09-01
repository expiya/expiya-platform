import type { UsedCarFieldAssertion } from "../evidence/contracts";

export type UsedVehicleOwnershipType = "DEALER_OWNED" | "CONSIGNMENT" | "FLEET_DISPOSAL" | "OTHER_CORPORATE";

export interface UsedVehicleUnit {
  readonly id: string;
  readonly tenantId: string;
  readonly branchId: string;
  readonly taxonomyVariantId: string;
  readonly vinCiphertext: string;
  readonly vinFingerprint: string;
  readonly plateCiphertext?: string;
  readonly plateFingerprint?: string;
  readonly publicVin: never;
  readonly publicPlate: never;
  readonly stockNumber: string;
  readonly ownershipType: UsedVehicleOwnershipType;
  readonly modelYear: UsedCarFieldAssertion<number>;
  readonly firstRegistrationDate: UsedCarFieldAssertion<string>;
  readonly mileageKm: UsedCarFieldAssertion<number>;
  readonly color: UsedCarFieldAssertion<string>;
  readonly askingPriceTry: UsedCarFieldAssertion<number>;
  readonly damageDisclosure: UsedCarFieldAssertion<readonly string[]>;
  readonly maintenanceHistory: UsedCarFieldAssertion<readonly string[]>;
  readonly warranty: UsedCarFieldAssertion<string>;
  readonly inspection: UsedCarFieldAssertion<string>;
  readonly createdAt: string;
}

export interface UsedVehicleRevision {
  readonly id: string;
  readonly vehicleUnitId: string;
  readonly tenantId: string;
  readonly revisionNumber: number;
  readonly changedFieldNames: readonly string[];
  readonly createdByActorId: string;
  readonly createdAt: string;
}
