import { z } from "zod";

const id = z.string().trim().min(1).max(256);
const timestamp = z.iso.datetime({ offset: false });
const hash = z.string().regex(/^sha256:[a-f0-9]{64}$/u);
const releaseVersion = z.string().regex(/^\d+\.\d+\.\d+$/u);
export const catalogFactProvenanceSchema = z.strictObject({
  sourceId: id, sourceUrl: z.url(), accessedAt: timestamp,
  publishedAt: timestamp.optional(), documentVersion: z.string().max(2_000).optional(),
  extractionMethod: z.enum(["MANUAL", "API", "LICENSED_FEED", "DOCUMENT_IMPORT", "USER_SUBMISSION"]),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]), limitations: z.array(z.string().max(2_000)).max(64),
  contentHash: hash.optional(),
});
const confidence = z.enum(["HIGH", "MEDIUM", "LOW"]);
export function sourcedValueSchema<T extends z.ZodType>(value: T) {
  return z.strictObject({ value, confidence, provenance: z.array(catalogFactProvenanceSchema).min(1).max(64), conflictGroupId: id.optional() });
}
const sourcedText = sourcedValueSchema(id);
const sourcedNumber = (maximum = 1_000_000_000) => sourcedValueSchema(z.number().finite().nonnegative().max(maximum));
const sourcedPositiveInteger = sourcedValueSchema(z.number().int().positive().max(1_000));

export const activePointerSchema = z.strictObject({
  market: z.literal("TR"), state: z.literal("ACTIVE"), active_catalog_release_version: releaseVersion,
  catalog_payload_hash: hash, activated_at: timestamp, activation_reference: id,
  previous_active_release: releaseVersion, rollback_release: releaseVersion,
});

export const catalogManifestSchema = z.strictObject({
  catalog_release_version: releaseVersion, catalog_schema_version: z.literal("0.1"), catalog_payload_hash: hash,
  market: z.literal("TR"), source_revision: id, source_path: id, effective_as_of: timestamp,
  record_count: z.number().int().nonnegative(), publishable_record_count: z.number().int().nonnegative(),
  included_variant_ids: z.array(id).max(10_000), generator_version: id, validator_version: id,
  validator_status: z.enum(["PASS", "FAIL"]),
  approval: z.strictObject({ state: z.enum(["APPROVED", "PENDING", "REJECTED"]), at: timestamp, reference: id }),
  staging: z.strictObject({ state: z.literal("STAGED"), at: timestamp, actor_reference: id, target: z.literal("INTERNAL_INTEGRATION_NON_PRODUCTION") }),
  previous_release: releaseVersion.nullable(), declared_limitations: z.array(z.string().max(2_000)).max(256),
});

const variantSchema = z.strictObject({
  id, market: z.literal("TR"), lifecycleStatus: z.enum(["ANNOUNCED", "ON_SALE", "ORDER_CLOSED", "DISCONTINUED"]),
  brand: sourcedText, model: sourcedText, trim: sourcedText,
  vehicleUseClass: sourcedValueSchema(z.enum(["PASSENGER", "LIGHT_COMMERCIAL", "HEAVY_COMMERCIAL"])).optional(),
  bodyStyle: sourcedText, modelYear: sourcedValueSchema(z.number().int().min(1886).max(3000)),
  powertrain: z.strictObject({
    fuelType: sourcedValueSchema(z.enum(["GASOLINE", "DIESEL", "LPG", "MHEV", "HEV", "PHEV", "BEV", "HYDROGEN"])),
    engineDisplacementCc: sourcedNumber(100_000).optional(), powerKw: sourcedNumber(100_000), torqueNm: sourcedNumber(1_000_000).optional(),
    transmission: sourcedText, drivenWheels: sourcedText.optional(),
  }),
  dimensions: z.strictObject({
    lengthMm: sourcedNumber(1_000_000).optional(), widthMm: sourcedNumber(1_000_000).optional(), heightMm: sourcedNumber(1_000_000).optional(),
    wheelbaseMm: sourcedNumber(1_000_000).optional(), seats: sourcedPositiveInteger.optional(), luggageLitres: sourcedNumber(10_000_000).optional(),
    cargoVolumeLitres: sourcedNumber(10_000_000).optional(), payloadKg: sourcedNumber(10_000_000).optional(), brakedTowingKg: sourcedNumber(10_000_000).optional(),
    groundClearanceMm: sourcedNumber(1_000_000).optional(),
  }),
  efficiency: z.strictObject({
    protocol: sourcedValueSchema(z.enum(["WLTP", "NEDC", "EPA", "USER_REPORTED"])).optional(),
    combinedLitresPer100Km: sourcedNumber(100_000).optional(), combinedKwhPer100Km: sourcedNumber(100_000).optional(),
    electricRangeKm: sourcedNumber(10_000_000).optional(), batteryCapacityKwh: sourcedNumber(1_000_000).optional(),
    batteryUsableKwh: sourcedNumber(1_000_000).optional(), maxDcChargeKw: sourcedNumber(1_000_000).optional(),
  }),
  safetyFeatureCodes: z.array(sourcedText).max(1_000),
  createdAt: timestamp, updatedAt: timestamp,
});
export const catalogPriceObservationSchema = z.strictObject({
  id, vehicleVariantId: id, market: z.literal("TR"), condition: z.enum(["NEW", "USED"]), amountTry: z.number().finite().positive().max(1_000_000_000_000),
  priceType: z.enum(["LIST", "CAMPAIGN", "ASKING", "TRANSACTION", "VALUATION", "ESTIMATE"]),
  consumerVisibility: z.enum(["PUBLIC", "INTERNAL_ONLY"]).optional(), estimationMethod: z.string().max(4_000).optional(),
  validFrom: timestamp, validUntil: timestamp.optional(), mileageKm: z.number().int().nonnegative().max(100_000_000).optional(),
  sellerType: z.enum(["DISTRIBUTOR", "DEALER", "BUSINESS", "PRIVATE"]).optional(),
  provenance: z.array(catalogFactProvenanceSchema).min(1).max(64), confidence,
}).superRefine((price, context) => {
  if (price.priceType === "ESTIMATE" && price.consumerVisibility !== "INTERNAL_ONLY") {
    context.addIssue({ code: "custom", path: ["consumerVisibility"], message: "Estimated prices must be INTERNAL_ONLY." });
  }
});
const recordSchema = z.strictObject({ variant: variantSchema, activeNewPrice: catalogPriceObservationSchema.nullable().optional() });
export const catalogPayloadSchema = z.strictObject({
  catalog_schema_version: z.literal("0.1"), market: z.literal("TR"), effective_as_of: timestamp,
  records: z.array(recordSchema).max(10_000),
});

export const decisionFacetsSchema = z.strictObject({ version: z.number().int().positive(), facets: z.array(z.unknown()).max(256) });

export type ParsedActivePointer = z.infer<typeof activePointerSchema>;
export type ParsedCatalogManifest = z.infer<typeof catalogManifestSchema>;
export type ParsedCatalogPayload = z.infer<typeof catalogPayloadSchema>;
