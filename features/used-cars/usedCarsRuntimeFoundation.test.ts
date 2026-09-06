import { describe, expect, it } from "vitest";
import { createAuditEnvelope, verifyAuditChain } from "./audit/envelope";
import { dryRunInventoryImport } from "./inventory/importDryRun";
import { usedVehicleDraftInputSchema } from "./inventory/schemas";
import { usedCarPreferenceLedgerSchema } from "./risk/schemas";
import { authorizeDealerAction, authorizeExpiyaAction } from "./tenancy/authorization";
import type { TenantActor } from "./tenancy/contracts";

const validDraft = {
  version: "used-vehicle-draft/v1",
  tenantId: "tenant-a",
  branchId: "branch-a",
  taxonomyVariantId: "taxonomy:variant:1",
  idempotencyKey: "c4413656-c96d-4e9d-a8ea-9f5c0c1f637b",
  vin: "WVWZZZ1JZXW000001",
  plate: "34ABC123",
  modelYear: 2022,
  firstRegistrationDate: "2022-06-01",
  mileageKm: 48_200,
  color: "Beyaz",
  askingPriceTry: 1_450_000,
  stockNumber: "IST-001",
  ownershipType: "DEALER_OWNED",
};

describe("used-cars runtime validation and authorization", () => {
  it("strictly accepts a controlled draft and rejects free-form identity fields", () => {
    expect(usedVehicleDraftInputSchema.safeParse(validDraft).success).toBe(true);
    expect(usedVehicleDraftInputSchema.safeParse({ ...validDraft, brand: "Serbest Marka" }).success).toBe(false);
    expect(usedVehicleDraftInputSchema.safeParse({ ...validDraft, vin: "INVALIDVIN" }).success).toBe(false);
    expect(usedVehicleDraftInputSchema.safeParse({ ...validDraft, firstRegistrationDate: "2018-01-01" }).success).toBe(false);
  });

  it("rejects contradictory preference ledgers", () => {
    const validLedger = {
      version: "used-car-preference-ledger/v1",
      totalBudgetTry: 2_000_000,
      downPaymentTry: 500_000,
      usagePurposes: ["FAMILY"], bodyStyles: ["SUV"], fuelTypes: [], transmissions: [],
      paintTolerance: "LIMITED", replacedPartTolerance: "LIMITED",
      heavyDamageApproach: "EXCLUDE", maintenanceExpectation: "DOCUMENTED",
      warrantyExpectation: "PREFERRED", unexpectedExpenseTolerance: "LOW",
      classicInterest: false,
    };
    expect(usedCarPreferenceLedgerSchema.safeParse(validLedger).success).toBe(true);
    expect(usedCarPreferenceLedgerSchema.safeParse({ ...validLedger, downPaymentTry: 2_500_000 }).success).toBe(false);
    expect(usedCarPreferenceLedgerSchema.safeParse({ ...validLedger, classicPurpose: "COLLECTION" }).success).toBe(false);
  });

  it("authorizes dealer actions by role, tenant, branch and MFA", () => {
    const actor: TenantActor = { actorId: "editor", tenantId: "tenant-a", role: "INVENTORY_EDITOR", branchIds: ["branch-a"], mfaVerified: true };
    expect(authorizeDealerAction(actor, { tenantId: "tenant-a", branchId: "branch-a" }, "INVENTORY_WRITE")).toBe(true);
    expect(authorizeDealerAction(actor, { tenantId: "tenant-a", branchId: "branch-a" }, "LEAD_READ")).toBe(false);
    expect(authorizeDealerAction(actor, { tenantId: "tenant-b", branchId: "branch-a" }, "INVENTORY_WRITE")).toBe(false);
    expect(authorizeDealerAction({ ...actor, mfaVerified: false }, { tenantId: "tenant-a", branchId: "branch-a" }, "INVENTORY_WRITE")).toBe(false);
  });

  it("keeps moderator and system administrator authority separated", () => {
    expect(authorizeExpiyaAction("EXPIYA_MODERATOR", "LISTING_MODERATE", true)).toBe(true);
    expect(authorizeExpiyaAction("EXPIYA_MODERATOR", "PLATFORM_ADMIN", true)).toBe(false);
    expect(authorizeExpiyaAction("EXPIYA_SYSTEM_ADMIN", "LISTING_MODERATE", true)).toBe(false);
    expect(authorizeExpiyaAction("EXPIYA_SYSTEM_ADMIN", "PLATFORM_ADMIN", false)).toBe(false);
  });
});

describe("used-cars audit and import dry-run", () => {
  it("creates a deterministic tamper-evident audit chain", () => {
    const first = createAuditEnvelope({
      version: "used-cars-audit/v1", eventId: "event-1", sequence: 1, tenantId: "tenant-a",
      actorId: "actor-1", actorType: "DEALER_USER", action: "LISTING_SUBMIT",
      subjectType: "LISTING", subjectId: "listing-1", occurredAt: "2026-09-01T10:00:00.000Z",
      reasonCode: "SUBMITTED_FOR_REVIEW", previousEventHash: null,
    });
    const second = createAuditEnvelope({
      version: "used-cars-audit/v1", eventId: "event-2", sequence: 2, tenantId: "tenant-a",
      actorId: "moderator-1", actorType: "EXPIYA_USER", action: "LISTING_MODERATE",
      subjectType: "LISTING", subjectId: "listing-1", occurredAt: "2026-09-01T11:00:00.000Z",
      reasonCode: "APPROVED", previousEventHash: first.eventHash,
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(verifyAuditChain([first, second])).toBe(true);
    expect(verifyAuditChain([first, { ...second, reasonCode: "TAMPERED" }])).toBe(false);
    expect(verifyAuditChain([second])).toBe(false);
  });

  it("produces deterministic no-write dry-runs and detects tenant/duplicate rows", () => {
    const input = {
      tenantId: "tenant-a", idempotencyKey: "import-1", sourceChecksum: "sha256:source",
      rows: [validDraft, validDraft, { ...validDraft, tenantId: "tenant-b", vin: "WVWZZZ1JZXW000002" }, { ...validDraft, vin: "bad" }],
    };
    const first = dryRunInventoryImport(input);
    const replay = dryRunInventoryImport(input);
    expect(first).toEqual(replay);
    expect(first.writeAuthorized).toBe(false);
    expect(first.acceptedCount).toBe(1);
    expect(first.rejectedCount).toBe(3);
    expect(first.rows.map((row) => row.status)).toEqual(["ACCEPTED", "DUPLICATE_IN_BATCH", "REJECTED", "REJECTED"]);
    expect(first.rows[2].errorCodes).toContain("tenantId:TENANT_MISMATCH");
  });
});

