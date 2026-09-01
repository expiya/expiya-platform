import { z } from "zod";

const opaqueId = z.string().trim().min(3).max(120).regex(/^[A-Za-z0-9:_-]+$/u);
const nonEmptyText = z.string().trim().min(1).max(120);

export const usedVehicleDraftInputSchema = z.object({
  version: z.literal("used-vehicle-draft/v1"),
  tenantId: opaqueId,
  branchId: opaqueId,
  taxonomyVariantId: opaqueId,
  idempotencyKey: z.string().uuid(),
  vin: z.string().trim().toUpperCase().regex(/^[A-HJ-NPR-Z0-9]{17}$/u, "VIN 17 karakter olmalı; I, O ve Q içeremez."),
  plate: z.string().trim().toUpperCase().min(5).max(12).regex(/^[0-9]{2}[A-ZÇĞİÖŞÜ]{1,3}[0-9]{2,4}$/u).optional(),
  modelYear: z.number().int().min(1886).max(new Date().getUTCFullYear() + 1),
  firstRegistrationDate: z.string().date(),
  mileageKm: z.number().int().nonnegative().max(3_000_000),
  color: nonEmptyText,
  askingPriceTry: z.number().int().positive().max(1_000_000_000),
  stockNumber: z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9._/-]+$/u),
  ownershipType: z.enum(["DEALER_OWNED", "CONSIGNMENT", "FLEET_DISPOSAL", "OTHER_CORPORATE"]),
  description: z.string().trim().max(2_000).optional(),
}).strict().superRefine((value, ctx) => {
  const registrationYear = Number(value.firstRegistrationDate.slice(0, 4));
  if (registrationYear < value.modelYear - 1) ctx.addIssue({ code: "custom", path: ["firstRegistrationDate"], message: "İlk tescil tarihi model yılıyla çelişiyor." });
});

export type UsedVehicleDraftInput = z.infer<typeof usedVehicleDraftInputSchema>;
