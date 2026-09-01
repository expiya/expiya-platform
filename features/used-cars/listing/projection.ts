import type { UsedCarAssertionStatus, UsedCarFieldAssertion } from "../evidence/contracts";

export interface PrivateUsedVehicleView {
  readonly inventoryUnitId: string;
  readonly listingId: string;
  readonly tenantId: string;
  readonly branchId: string;
  readonly taxonomyVariantId: string;
  readonly vinCiphertext: string;
  readonly vinFingerprint: string;
  readonly maskedVin: string;
  readonly plateCiphertext?: string;
  readonly plateFingerprint?: string;
  readonly maskedPlate?: string;
  readonly stockNumber: string;
  readonly modelYear: UsedCarFieldAssertion<number>;
  readonly mileageKm: UsedCarFieldAssertion<number>;
  readonly color: UsedCarFieldAssertion<string>;
  readonly askingPriceTry: UsedCarFieldAssertion<number>;
  readonly damageDisclosure: UsedCarFieldAssertion<readonly string[]>;
  readonly maintenanceHistory: UsedCarFieldAssertion<readonly string[]>;
  readonly warranty: UsedCarFieldAssertion<string>;
  readonly inspection: UsedCarFieldAssertion<string>;
  readonly publicMediaUrls: readonly string[];
  readonly sellerDisplayName: string;
  readonly branchDisplayName: string;
  readonly description?: string;
}

export interface PublicFieldTrust {
  readonly status: UsedCarAssertionStatus;
  readonly observedAt: string;
  readonly validUntil?: string;
  readonly limitationCount: number;
  readonly sourceCount: number;
}

export interface PublicUsedCarListing {
  readonly version: "public-used-car-listing/v1";
  readonly listingId: string;
  readonly inventoryUnitId: string;
  readonly taxonomyVariantId: string;
  readonly stockNumber: string;
  readonly modelYear: number | null;
  readonly mileageKm: number | null;
  readonly color: string | null;
  readonly askingPriceTry: number | null;
  readonly damageDisclosure: readonly string[] | null;
  readonly maintenanceHistory: readonly string[] | null;
  readonly warranty: string | null;
  readonly inspection: string | null;
  readonly trust: Readonly<Record<"modelYear" | "mileageKm" | "color" | "askingPriceTry" | "damageDisclosure" | "maintenanceHistory" | "warranty" | "inspection", PublicFieldTrust>>;
  readonly mediaUrls: readonly string[];
  readonly sellerDisplayName: string;
  readonly branchDisplayName: string;
  readonly description?: string;
}

const trust = (assertion: UsedCarFieldAssertion<unknown>): PublicFieldTrust => ({
  status: assertion.status,
  observedAt: assertion.observedAt,
  ...(assertion.validUntil ? { validUntil: assertion.validUntil } : {}),
  limitationCount: assertion.limitations.length,
  sourceCount: assertion.sourceReferenceIds.length,
});

export function projectPublicUsedCarListing(input: PrivateUsedVehicleView): PublicUsedCarListing {
  return Object.freeze({
    version: "public-used-car-listing/v1",
    listingId: input.listingId,
    inventoryUnitId: input.inventoryUnitId,
    taxonomyVariantId: input.taxonomyVariantId,
    stockNumber: input.stockNumber,
    modelYear: input.modelYear.value,
    mileageKm: input.mileageKm.value,
    color: input.color.value,
    askingPriceTry: input.askingPriceTry.value,
    damageDisclosure: input.damageDisclosure.value,
    maintenanceHistory: input.maintenanceHistory.value,
    warranty: input.warranty.value,
    inspection: input.inspection.value,
    trust: {
      modelYear: trust(input.modelYear), mileageKm: trust(input.mileageKm),
      color: trust(input.color), askingPriceTry: trust(input.askingPriceTry),
      damageDisclosure: trust(input.damageDisclosure), maintenanceHistory: trust(input.maintenanceHistory),
      warranty: trust(input.warranty), inspection: trust(input.inspection),
    },
    mediaUrls: input.publicMediaUrls,
    sellerDisplayName: input.sellerDisplayName,
    branchDisplayName: input.branchDisplayName,
    ...(input.description ? { description: input.description } : {}),
  });
}

export const forbiddenPublicUsedCarKeys = [
  "tenantId", "branchId", "vin", "vinCiphertext", "vinFingerprint", "maskedVin",
  "plate", "plateCiphertext", "plateFingerprint", "maskedPlate", "sourceReferenceIds", "assertedBy",
] as const;

export function findForbiddenPublicKeys(value: unknown): readonly string[] {
  const found = new Set<string>();
  const visit = (candidate: unknown): void => {
    if (Array.isArray(candidate)) { candidate.forEach(visit); return; }
    if (!candidate || typeof candidate !== "object") return;
    for (const [key, child] of Object.entries(candidate)) {
      if ((forbiddenPublicUsedCarKeys as readonly string[]).includes(key)) found.add(key);
      visit(child);
    }
  };
  visit(value);
  return [...found].sort();
}
