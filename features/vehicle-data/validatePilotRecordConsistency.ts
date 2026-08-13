import type { PilotVehicleRecord } from "@/data/production/pilotVehicles";

export type PilotRecordConsistencyIssue =
  | "VARIANT_ID_MISMATCH"
  | "MARKET_MISMATCH"
  | "LIFECYCLE_STATUS_MISMATCH"
  | "BRAND_MISMATCH"
  | "MODEL_MISMATCH"
  | "BODY_STYLE_MISMATCH"
  | "TRIM_MISMATCH"
  | "MODEL_YEAR_MISMATCH"
  | "PRICE_VARIANT_ID_MISMATCH"
  | "PRICE_MARKET_MISMATCH";

export function validatePilotRecordConsistency(record: PilotVehicleRecord): PilotRecordConsistencyIssue[] {
  const issues = new Set<PilotRecordConsistencyIssue>();
  const variant = record.technicalVariant;

  if (variant) {
    if (variant.id !== record.identity.id) issues.add("VARIANT_ID_MISMATCH");
    if (variant.market !== record.identity.market) issues.add("MARKET_MISMATCH");
    if (variant.lifecycleStatus !== record.identity.lifecycleStatus) issues.add("LIFECYCLE_STATUS_MISMATCH");
    if (variant.brand.value !== record.identity.brand.value) issues.add("BRAND_MISMATCH");
    if (variant.model.value !== record.identity.model.value) issues.add("MODEL_MISMATCH");
    if (variant.bodyStyle.value !== record.identity.bodyStyle.value) issues.add("BODY_STYLE_MISMATCH");
    if (variant.trim.value !== record.identity.trim.value) issues.add("TRIM_MISMATCH");
    if (variant.modelYear.value !== record.identity.modelYear.value) issues.add("MODEL_YEAR_MISMATCH");
  }

  for (const price of record.prices) {
    if (price.vehicleVariantId !== record.identity.id) issues.add("PRICE_VARIANT_ID_MISMATCH");
    if (price.market !== record.identity.market) issues.add("PRICE_MARKET_MISMATCH");
  }

  return [...issues];
}
