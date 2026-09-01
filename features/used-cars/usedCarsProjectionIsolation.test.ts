import { describe, expect, it } from "vitest";
import { findForbiddenPublicKeys, projectPublicUsedCarListing, type PrivateUsedVehicleView } from "./listing/projection";
import { authorizeDealerAction, type UsedCarsAction } from "./tenancy/authorization";
import type { DealerRole, TenantActor } from "./tenancy/contracts";

const assertion = <T>(value: T, status: "EXPIYA_VERIFIED" | "DEALER_DECLARED" = "DEALER_DECLARED") => ({
  value, status, sourceReferenceIds: ["private-source-1"],
  assertedBy: status === "EXPIYA_VERIFIED" ? "EXPIYA" as const : "DEALER" as const,
  observedAt: "2026-09-01T00:00:00.000Z", limitations: ["örnek sınırlama"],
});

const privateVehicle: PrivateUsedVehicleView = {
  inventoryUnitId: "unit-1", listingId: "listing-1", tenantId: "tenant-a", branchId: "branch-a",
  taxonomyVariantId: "taxonomy:variant:1", vinCiphertext: "encrypted-vin", vinFingerprint: "vin-hash",
  maskedVin: "*************0001", plateCiphertext: "encrypted-plate", plateFingerprint: "plate-hash",
  maskedPlate: "34 *** 123", stockNumber: "IST-001", modelYear: assertion(2022, "EXPIYA_VERIFIED"),
  mileageKm: assertion(48_200), color: assertion("Beyaz"), askingPriceTry: assertion(1_450_000),
  damageDisclosure: assertion(["Sol ön çamurluk boyalı"]), maintenanceHistory: assertion(["Satıcı bakım beyanı"]),
  warranty: assertion("3 ay satıcı garantisi"), inspection: assertion("Belge yüklendi, içerik doğrulanmadı"),
  publicMediaUrls: ["https://media.expiya.example/public/listing-1/image-1.webp"],
  sellerDisplayName: "Örnek Otomotiv", branchDisplayName: "Kadıköy", description: "Kurumsal stok aracı",
};

describe("used-cars public/private projection", () => {
  it("projects only public allowlisted values and aggregated trust metadata", () => {
    const projected = projectPublicUsedCarListing(privateVehicle);
    expect(projected).toMatchObject({ listingId: "listing-1", modelYear: 2022, sellerDisplayName: "Örnek Otomotiv" });
    expect(projected.trust.modelYear).toEqual({ status: "EXPIYA_VERIFIED", observedAt: "2026-09-01T00:00:00.000Z", limitationCount: 1, sourceCount: 1 });
    expect(findForbiddenPublicKeys(projected)).toEqual([]);
    expect(JSON.stringify(projected)).not.toContain("encrypted-vin");
    expect(JSON.stringify(projected)).not.toContain("private-source-1");
    expect(JSON.stringify(projected)).not.toContain("tenant-a");
  });

  it("detects sensitive keys recursively in an unsafe projection", () => {
    expect(findForbiddenPublicKeys({ safe: { vin: "leak" }, list: [{ sourceReferenceIds: ["private"] }] })).toEqual(["sourceReferenceIds", "vin"]);
  });
});

describe("exhaustive dealer tenant and role matrix", () => {
  const roles: readonly DealerRole[] = ["DEALER_OWNER", "DEALER_ADMIN", "BRANCH_MANAGER", "INVENTORY_EDITOR", "SALES_ADVISOR", "REPORT_VIEWER"];
  const actions: readonly UsedCarsAction[] = [
    "DEALER_SETTINGS_READ", "DEALER_SETTINGS_WRITE", "BRANCH_MANAGE", "TEAM_READ", "TEAM_MANAGE",
    "MEMBERSHIP_READ", "MEMBERSHIP_MANAGE", "INVENTORY_READ", "INVENTORY_WRITE", "LISTING_SUBMIT",
    "LEAD_READ", "LEAD_MANAGE", "ANALYTICS_READ", "AUDIT_READ",
  ];

  it("denies every dealer role/action pair across tenant boundaries", () => {
    for (const role of roles) for (const action of actions) {
      const actor: TenantActor = { actorId: `actor-${role}`, tenantId: "tenant-a", role, branchIds: ["branch-a"], mfaVerified: true };
      expect(authorizeDealerAction(actor, { tenantId: "tenant-b", branchId: "branch-a" }, action), `${role}:${action}`).toBe(false);
    }
  });

  it("denies every dealer role/action pair without MFA", () => {
    for (const role of roles) for (const action of actions) {
      const actor: TenantActor = { actorId: `actor-${role}`, tenantId: "tenant-a", role, branchIds: ["branch-a"], mfaVerified: false };
      expect(authorizeDealerAction(actor, { tenantId: "tenant-a", branchId: "branch-a" }, action), `${role}:${action}`).toBe(false);
    }
  });

  it("denies branch-scoped roles outside their assigned branch", () => {
    for (const role of ["BRANCH_MANAGER", "INVENTORY_EDITOR", "SALES_ADVISOR", "REPORT_VIEWER"] as const) for (const action of actions) {
      const actor: TenantActor = { actorId: `actor-${role}`, tenantId: "tenant-a", role, branchIds: ["branch-a"], mfaVerified: true };
      expect(authorizeDealerAction(actor, { tenantId: "tenant-a", branchId: "branch-b" }, action), `${role}:${action}`).toBe(false);
    }
  });

  it("never grants Expiya moderation or platform actions to dealer roles", () => {
    for (const role of roles) for (const action of ["TAXONOMY_MODERATE", "DEALER_MODERATE", "LISTING_MODERATE", "FRAUD_MANAGE", "PLATFORM_ADMIN"] as const) {
      const actor: TenantActor = { actorId: `actor-${role}`, tenantId: "tenant-a", role, branchIds: ["branch-a"], mfaVerified: true };
      expect(authorizeDealerAction(actor, { tenantId: "tenant-a", branchId: "branch-a" }, action), `${role}:${action}`).toBe(false);
    }
  });
});
