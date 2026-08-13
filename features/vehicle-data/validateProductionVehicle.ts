import { z } from "zod";

import type { DataSource } from "@/types/productionVehicle";

const permissionSchema = z.enum([
  "OPEN_LICENSE", "PUBLIC_FACTS_ONLY", "CONTRACT_REQUIRED", "PERMISSION_REQUIRED",
  "INTERNAL_ONLY", "PROHIBITED",
]);

const provenanceSchema = z.strictObject({
  sourceId: z.string().min(1),
  sourceUrl: z.url(),
  accessedAt: z.iso.datetime(),
  publishedAt: z.iso.datetime().optional(),
  documentVersion: z.string().min(1).optional(),
  contentHash: z.string().min(1).optional(),
  extractionMethod: z.enum(["MANUAL", "API", "LICENSED_FEED", "DOCUMENT_IMPORT", "USER_SUBMISSION"]),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
  limitations: z.array(z.string()),
});

const sourcedStringSchema = z.strictObject({
  value: z.string().min(1),
  provenance: z.array(provenanceSchema).min(1),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
  conflictGroupId: z.string().optional(),
});

const sourcedNumberSchema = sourcedStringSchema.extend({ value: z.number().finite().nonnegative() });
const sourcedIntegerSchema = sourcedNumberSchema.extend({ value: z.number().int().nonnegative() });

export const productionVehicleIdentitySchema = z.strictObject({
  id: z.string().uuid(),
  market: z.literal("TR"),
  lifecycleStatus: z.enum(["ANNOUNCED", "ON_SALE", "ORDER_CLOSED", "DISCONTINUED"]),
  brand: sourcedStringSchema,
  model: sourcedStringSchema,
  bodyStyle: sourcedStringSchema,
  trim: sourcedStringSchema,
  modelYear: sourcedIntegerSchema.refine((field) => field.value >= 1950 && field.value <= 2100),
});

export type ProductionPublishabilityErrorCode =
  | "INVALID_PAYLOAD" | "UNKNOWN_SOURCE" | "SOURCE_NOT_APPROVED" | "STALE_SOURCE_REVIEW";

export interface ProductionPublishabilityError {
  readonly code: ProductionPublishabilityErrorCode;
  readonly referenceId?: string;
}

const ALLOWED_PERMISSIONS = new Set<DataSource["usagePermission"]>([
  "OPEN_LICENSE", "PUBLIC_FACTS_ONLY", "INTERNAL_ONLY",
]);

export function validateProductionVehicleIdentity(
  payload: unknown,
  sources: ReadonlyMap<string, DataSource>,
  now = new Date(),
): { readonly ok: true } | { readonly ok: false; readonly errors: readonly ProductionPublishabilityError[] } {
  const parsed = productionVehicleIdentitySchema.safeParse(payload);
  if (!parsed.success) return { ok: false, errors: [{ code: "INVALID_PAYLOAD" }] };

  const errors: ProductionPublishabilityError[] = [];
  const provenance = [parsed.data.brand, parsed.data.model, parsed.data.bodyStyle, parsed.data.trim, parsed.data.modelYear]
    .flatMap((field) => field.provenance)
    .filter((record, index, records) => records.findIndex((candidate) => candidate.sourceId === record.sourceId) === index);

  for (const record of provenance) {
    const source = sources.get(record.sourceId);
    if (!source) {
      errors.push({ code: "UNKNOWN_SOURCE", referenceId: record.sourceId });
      continue;
    }
    if (!ALLOWED_PERMISSIONS.has(permissionSchema.parse(source.usagePermission))) {
      errors.push({ code: "SOURCE_NOT_APPROVED", referenceId: source.id });
    }
    const reviewedAt = new Date(source.reviewedAt);
    const reviewAgeDays = (now.getTime() - reviewedAt.getTime()) / 86_400_000;
    if (!Number.isFinite(reviewedAt.getTime()) || reviewAgeDays > 180) {
      errors.push({ code: "STALE_SOURCE_REVIEW", referenceId: source.id });
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
