import { z } from "zod";

const boundedMoney = z.number().int().nonnegative().max(1_000_000_000);
const controlledValues = z.array(z.string().trim().min(1).max(80)).max(20);
const preference = z.object({ value: z.number().int(), strength: z.enum(["HARD", "SOFT", "UNSPECIFIED"]) }).strict();

export const usedCarPreferenceLedgerSchema = z.object({
  version: z.literal("used-car-preference-ledger/v1"),
  totalBudgetTry: boundedMoney.optional(),
  downPaymentTry: boundedMoney.optional(),
  financingLimitTry: boundedMoney.optional(),
  usagePurposes: controlledValues,
  annualMileageKm: z.number().int().nonnegative().max(500_000).optional(),
  cityDrivingRatio: z.number().min(0).max(1).optional(),
  bodyStyles: controlledValues,
  fuelTypes: controlledValues,
  transmissions: controlledValues,
  minimumModelYear: preference.extend({ value: z.number().int().min(1886).max(new Date().getUTCFullYear() + 1) }).optional(),
  maximumMileageKm: preference.extend({ value: z.number().int().nonnegative().max(3_000_000) }).optional(),
  paintTolerance: z.enum(["NONE", "LIMITED", "FLEXIBLE", "UNSPECIFIED"]),
  replacedPartTolerance: z.enum(["NONE", "LIMITED", "FLEXIBLE", "UNSPECIFIED"]),
  heavyDamageApproach: z.enum(["EXCLUDE", "CONSIDER_WITH_EVIDENCE", "UNSPECIFIED"]),
  maintenanceExpectation: z.enum(["DOCUMENTED", "PREFERRED", "FLEXIBLE", "UNSPECIFIED"]),
  warrantyExpectation: z.enum(["REQUIRED", "PREFERRED", "NOT_REQUIRED", "UNSPECIFIED"]),
  unexpectedExpenseTolerance: z.enum(["LOW", "MEDIUM", "HIGH", "UNSPECIFIED"]),
  nearbyServiceAccessRequired: z.boolean().optional(),
  resalePriority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  classicInterest: z.boolean(),
  classicPurpose: z.enum(["DAILY_USE", "COLLECTION"]).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.downPaymentTry !== undefined && value.totalBudgetTry !== undefined && value.downPaymentTry > value.totalBudgetTry) ctx.addIssue({ code: "custom", path: ["downPaymentTry"], message: "Peşinat toplam bütçeyi aşamaz." });
  if (!value.classicInterest && value.classicPurpose !== undefined) ctx.addIssue({ code: "custom", path: ["classicPurpose"], message: "Klasik araç amacı yalnız klasik ilgisi varsa seçilebilir." });
});
