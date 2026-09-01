import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { canRenderAsExpiyaVerified, type UsedCarFieldAssertion } from "./evidence/contracts";
import { canTransitionListing, isListingPublic } from "./listing/lifecycle";
import { assertValidMatchDimensions } from "./matching/contracts";
import { isDealerPublishingEligible, type PublishingGates } from "./memberships/publishingEligibility";
import { canAccessTenantResource, type TenantActor } from "./tenancy/contracts";
import { hasForbiddenAnalyticsAttributes } from "./analytics/contracts";

const eligibleGates: PublishingGates = {
  dealerStatus: "PUBLISHING_ELIGIBLE",
  identityVerified: true,
  contractActive: true,
  paymentCurrent: true,
  operationalReviewPassed: true,
  moderationEnabled: true,
};

describe("used-cars domain isolation foundation", () => {
  it("fails closed for cross-tenant, branch and non-MFA access", () => {
    const actor: TenantActor = {
      actorId: "actor-1", tenantId: "tenant-a", role: "BRANCH_MANAGER",
      branchIds: ["branch-a"], mfaVerified: true,
    };
    expect(canAccessTenantResource(actor, { tenantId: "tenant-a", branchId: "branch-a" })).toBe(true);
    expect(canAccessTenantResource(actor, { tenantId: "tenant-b", branchId: "branch-a" })).toBe(false);
    expect(canAccessTenantResource(actor, { tenantId: "tenant-a", branchId: "branch-b" })).toBe(false);
    expect(canAccessTenantResource({ ...actor, mfaVerified: false }, { tenantId: "tenant-a" })).toBe(false);
  });

  it("does not turn membership or payment into publishing authority", () => {
    expect(isDealerPublishingEligible(eligibleGates)).toBe(true);
    expect(isDealerPublishingEligible({ ...eligibleGates, dealerStatus: "MEMBERSHIP_ACTIVE" })).toBe(false);
    expect(isDealerPublishingEligible({ ...eligibleGates, moderationEnabled: false })).toBe(false);
  });

  it("removes every listing from public projection when a dealer gate closes", () => {
    const listing = {
      status: "PUBLISHED" as const,
      stockConfirmedAt: "2026-09-01T08:00:00.000Z",
      freshnessValidUntil: "2026-09-03T08:00:00.000Z",
      criticalConflictCount: 0,
    };
    expect(isListingPublic(listing, eligibleGates, "2026-09-02T08:00:00.000Z")).toBe(true);
    expect(isListingPublic(listing, { ...eligibleGates, dealerStatus: "SUSPENDED" }, "2026-09-02T08:00:00.000Z")).toBe(false);
    expect(isListingPublic(listing, { ...eligibleGates, contractActive: false }, "2026-09-02T08:00:00.000Z")).toBe(false);
    expect(isListingPublic({ ...listing, criticalConflictCount: 1 }, eligibleGates, "2026-09-02T08:00:00.000Z")).toBe(false);
    expect(isListingPublic(listing, eligibleGates, "2026-09-04T08:00:00.000Z")).toBe(false);
  });

  it("keeps listing transitions explicit and terminal sale immutable", () => {
    expect(canTransitionListing("DRAFT", "READY_FOR_REVIEW")).toBe(true);
    expect(canTransitionListing("DRAFT", "PUBLISHED")).toBe(false);
    expect(canTransitionListing("SOLD", "PUBLISHED")).toBe(false);
  });

  it("never promotes a dealer declaration or unreviewed document to verified", () => {
    const assertion = (status: UsedCarFieldAssertion<string>["status"], assertedBy: UsedCarFieldAssertion<string>["assertedBy"], sourceReferenceIds: string[]): UsedCarFieldAssertion<string> => ({
      value: "örnek", status, assertedBy, sourceReferenceIds,
      observedAt: "2026-09-01T00:00:00.000Z", limitations: [],
    });
    expect(canRenderAsExpiyaVerified(assertion("DEALER_DECLARED", "DEALER", ["dealer-form"]))).toBe(false);
    expect(canRenderAsExpiyaVerified(assertion("DOCUMENT_UPLOADED_UNREVIEWED", "DOCUMENT", ["document-1"]))).toBe(false);
    expect(canRenderAsExpiyaVerified(assertion("EXPIYA_VERIFIED", "EXPIYA", []))).toBe(false);
    expect(canRenderAsExpiyaVerified(assertion("EXPIYA_VERIFIED", "EXPIYA", ["source-1"]))).toBe(true);
  });

  it("validates every match dimension independently", () => {
    expect(() => assertValidMatchDimensions({ needFit: 1, budgetFit: 0.5, riskFit: 0, evidenceReadiness: 0.7, operationalAvailability: 1 })).not.toThrow();
    expect(() => assertValidMatchDimensions({ needFit: 1.1, budgetFit: 0.5, riskFit: 0, evidenceReadiness: 0.7, operationalAvailability: 1 })).toThrow("INVALID_MATCH_DIMENSION:needFit");
  });

  it("rejects sensitive analytics attributes", () => {
    const base = { version: "used-cars-analytics/v1" as const, namespace: "used_partner" as const, eventName: "inventory_viewed", occurredAt: "2026-09-01T00:00:00.000Z" };
    expect(hasForbiddenAnalyticsAttributes({ ...base, attributes: { listingCount: 3 } })).toBe(false);
    expect(hasForbiddenAnalyticsAttributes({ ...base, attributes: { vin: "sensitive" } })).toBe(true);
  });

  it("does not import new-car decision, catalog, sales or price aggregates", () => {
    const root = path.join(process.cwd(), "features/used-cars");
    const walk = (directory: string): string[] => readdirSync(directory).flatMap((entry) => {
      const candidate = path.join(directory, entry);
      return statSync(candidate).isDirectory() ? walk(candidate) : [candidate];
    });
    const forbidden = [
      "@/features/decision/v3", "@/features/vehicle-data", "@/features/sales-advisor",
      "@/features/sales-request", "@/types/productionVehicle", "TurkeyVehicleVariant", "PriceObservation",
    ];
    const implementationFiles = walk(root).filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"));
    for (const file of implementationFiles) {
      const source = readFileSync(file, "utf8");
      for (const token of forbidden) expect(source, `${file} must not contain ${token}`).not.toContain(token);
    }
  });
});

