import { describe, expect, it } from "vitest";
import { evaluateIettsBranchGate } from "./dealer/iettsVerification";
import { evaluateEidsPublicationGate } from "./listing/eidsVehicleAuthorization";
import { evaluateRegulatoryPublicationGate } from "./listing/regulatoryPublicationGate";

const now = "2026-09-02T10:00:00.000Z";
const ietts = { tenantId: "tenant-1", branchId: "branch-1", authorizationCertificateNumber: "YB-001", checkedAt: now, validUntil: "2027-01-01T00:00:00.000Z", renewalDueAt: "2026-12-01T00:00:00.000Z", result: "VERIFIED" as const, source: "IETTS_RESERVED_SYNTHETIC_RESPONSE" as const, sourceReference: "synthetic/ietts/1", syntheticOnly: true as const, realProviderCallMade: false as const };
const eids = { listingId: "listing-1", inventoryUnitId: "vehicle-1", tenantId: "tenant-1", branchId: "branch-1", authorizationReference: "EIDS-SYN-1", checkedAt: now, validFrom: "2026-09-01T00:00:00.000Z", validUntil: "2026-10-01T00:00:00.000Z", result: "VERIFIED" as const, authoritativeVehicle: { brand: "Toyota", tradeName: "Corolla", modelYear: 2023 }, source: "EIDS_RESERVED_SYNTHETIC_RESPONSE" as const, syntheticOnly: true as const, realProviderCallMade: false as const };
const fields = { authorizationCertificateNumber: "YB-001", businessLegalName: "Sentetik Galeri A.Ş.", brand: "Toyota", tradeName: "Corolla", vehicleKind: "Otomobil", vehicleType: "Sedan", modelYear: 2023, equipmentAndAccessories: ["Klima"], vinLastSix: "ABC123", plate: "34 DEMO 01", fuelType: "Benzin", mileageKm: 12_000, salePriceTry: 1_500_000, paintedParts: [], replacedParts: [], damageRecordNature: "Beyan edilen hasar kaydı yok", encumbranceStatus: "NONE_DECLARED" as const, remainingManufacturerWarranty: { months: 12, km: 20_000 }, updatedAt: now, eidsVerificationStatus: "VERIFIED" as const };

describe("used-cars regulatory publication gates", () => {
  it("keeps IETTS and vehicle EIDS as separate checks", () => {
    expect(evaluateIettsBranchGate({ verification: ietts, tenantId: "tenant-1", branchId: "branch-1", now })).toMatchObject({ gatePassed: true, productionProviderCallAuthorized: false, productionMutationAuthorized: false });
    expect(evaluateEidsPublicationGate({ authorization: eids, listingId: "listing-1", inventoryUnitId: "vehicle-1", tenantId: "tenant-1", branchId: "branch-1", now })).toMatchObject({ gatePassed: true, officialLogoUseAuthorized: false, productionPublicationAuthorized: false });
  });
  it("passes a complete synthetic snapshot without authorizing real publication", () => expect(evaluateRegulatoryPublicationGate({ tenantId: "tenant-1", branchId: "branch-1", listingId: "listing-1", inventoryUnitId: "vehicle-1", now, ietts, eids, fields })).toMatchObject({ gatePassed: true, iettsGatePassed: true, eidsGatePassed: true, mandatoryFieldsPassed: true, productionPublicationAuthorized: false }));
  it("fails closed on branch mismatch and authoritative field conflict", () => {
    const result = evaluateRegulatoryPublicationGate({ tenantId: "tenant-1", branchId: "other", listingId: "listing-1", inventoryUnitId: "vehicle-1", now, ietts, eids, fields: { ...fields, brand: "Başka" } });
    expect(result.gatePassed).toBe(false); expect(result.codes).toContain("IETTS_BRANCH_MISMATCH"); expect(result.codes).toContain("EIDS_BRANCH_MISMATCH"); expect(result.codes).toContain("EIDS_AUTHORITATIVE_FIELD_CONFLICT");
  });
});
