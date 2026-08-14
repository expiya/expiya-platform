import { z } from "zod";

import artifactPayload from "@/data/runtime/vehicle-evidence/v0.3.0/artifact.json";
import artifactManifest from "@/data/runtime/vehicle-evidence/v0.3.0/manifest.json";
import type {
  RuntimeVehicleCandidateId,
  VehicleEvidenceFactKey,
  VehicleEvidenceReadPort,
} from "@/types/runtimeVehicleEvidence";

const factBaseSchema = z.strictObject({
  status: z.literal("AVAILABLE"),
  factId: z.string().min(1),
  assertionIds: z.array(z.string().min(1)).min(1),
  sourceIds: z.array(z.string().min(1)).min(1),
  scope: z.literal("CONFIGURATION"),
  evidenceState: z.literal("VERIFIED"),
  applicability: z.literal("EXACT"),
  unit: z.string().min(1),
  measurementContext: z.string().optional(),
  limitations: z.array(z.string()),
});
const scalarFactSchema = factBaseSchema.extend({ value: z.number().nonnegative() });
const rangeFactSchema = factBaseSchema.extend({
  valueMin: z.number().nonnegative(), valueMax: z.number().nonnegative(),
  rangeSemantics: z.literal("MIN_MAX"),
}).refine((fact) => fact.valueMin <= fact.valueMax, "MALFORMED_MIN_MAX_RANGE");
const factSchema = z.union([scalarFactSchema, rangeFactSchema]);
const missingFactSchema = z.strictObject({
  status: z.literal("MISSING"), assertionIds: z.array(z.string()).length(0),
  sourceIds: z.array(z.string()).length(0), limitations: z.array(z.string()).min(1),
});

const artifactSchema = z.strictObject({
  artifactVersion: z.string().min(1), datasetVersion: z.string().min(1),
  catalogReleaseVersion: z.string().min(1), catalogPayloadHash: z.string().regex(/^[a-f0-9]{64}$/),
  catalogSchemaVersion: z.string().min(1),
  datasetReleaseHash: z.string().regex(/^[a-f0-9]{64}$/), schemaVersion: z.string().min(1),
  mappingVersion: z.string().min(1), mappingHash: z.string().regex(/^[a-f0-9]{64}$/),
  dictionaryRevision: z.string().min(1), dictionaryHash: z.string().regex(/^[a-f0-9]{64}$/),
  productionCatalogRevision: z.string().min(1), generatedAt: z.string().datetime(),
  generatorVersion: z.string().min(1), validationStatus: z.literal("PASS"),
  evidenceValidator: z.strictObject({ version: z.string().min(1), status: z.literal("PASS") }),
  mappingValidator: z.strictObject({ version: z.string().min(1), status: z.literal("PASS") }),
  policy: z.strictObject({
    id: z.literal("cars.requirement-to-evidence"), version: z.literal("0.1.0"),
    migratedCategories: z.tuple([z.literal("seats"), z.literal("cargo_volume_l")]),
  }),
  candidates: z.array(z.strictObject({
    runtimeVehicleCandidateId: z.string().regex(/^RVC-[A-Z0-9-]+$/),
    vehicleVariantId: z.string().uuid(), configurationId: z.string().regex(/^CFG-\d{6}$/),
    mappingStatus: z.literal("VERIFIED_ONE_TO_ONE"),
    mappingBasis: z.string().min(1), reasonCode: z.string().min(1), reviewReference: z.string().min(1),
    facts: z.strictObject({
      seats: z.union([scalarFactSchema, missingFactSchema]),
      cargo_volume_l: z.union([factSchema, missingFactSchema]),
    }),
  })).length(5),
});

const artifact = artifactSchema.parse(artifactPayload);
const runtimeIds = new Set(artifact.candidates.map((item) => item.runtimeVehicleCandidateId));
const variantIds = new Set(artifact.candidates.map((item) => item.vehicleVariantId));
const configurationIds = new Set(artifact.candidates.map((item) => item.configurationId));
if (runtimeIds.size !== 5 || variantIds.size !== 5 || configurationIds.size !== 5) {
  throw new Error("VEHICLE_EVIDENCE_ARTIFACT_IDENTITY_NOT_ONE_TO_ONE");
}

export const MIGRATED_VEHICLE_EVIDENCE_CATEGORIES = Object.freeze(["seats", "cargo_volume_l"] as const);

export const generatedVehicleEvidenceReadPort: VehicleEvidenceReadPort = Object.freeze({
  getArtifactIdentity: () => Object.freeze({
    artifactVersion: artifact.artifactVersion,
    artifactHash: artifactManifest.artifactSha256,
    catalogReleaseVersion: artifact.catalogReleaseVersion,
    catalogPayloadHash: artifact.catalogPayloadHash,
    datasetVersion: artifact.datasetVersion,
    datasetReleaseHash: artifact.datasetReleaseHash,
    mappingVersion: artifact.mappingVersion,
    mappingHash: artifact.mappingHash,
    dictionaryRevision: artifact.dictionaryRevision,
    dictionaryHash: artifact.dictionaryHash,
  }),
  resolveCatalogVariantId(vehicleVariantId: string) {
    return artifact.candidates.find((item) => item.vehicleVariantId === vehicleVariantId)
      ?.runtimeVehicleCandidateId as RuntimeVehicleCandidateId | undefined;
  },
  readFact(runtimeVehicleCandidateId: RuntimeVehicleCandidateId, factKey: VehicleEvidenceFactKey) {
    const candidate = artifact.candidates.find(
      (item) => item.runtimeVehicleCandidateId === runtimeVehicleCandidateId,
    );
    if (!candidate) {
      return {
        status: "UNRESOLVED" as const, runtimeVehicleCandidateId,
        configurationId: "UNRESOLVED", factKey, assertionIds: [], sourceIds: [],
        limitations: ["RUNTIME_CANDIDATE_NOT_IN_ACTIVE_ARTIFACT"],
        artifactVersion: artifact.artifactVersion,
      };
    }
    const fact = candidate.facts[factKey];
    if (fact.status === "MISSING") return {
      status: "MISSING" as const, runtimeVehicleCandidateId, configurationId: candidate.configurationId,
      factKey, assertionIds: fact.assertionIds, sourceIds: fact.sourceIds,
      limitations: fact.limitations, artifactVersion: artifact.artifactVersion,
    };
    return { status: fact.status, runtimeVehicleCandidateId, configurationId: candidate.configurationId,
      factKey, ...("value" in fact ? { value: fact.value } : {
        valueMin: fact.valueMin, valueMax: fact.valueMax, rangeSemantics: fact.rangeSemantics,
      }), factId: fact.factId, evidenceState: fact.evidenceState,
      applicability: fact.applicability, assertionIds: fact.assertionIds, sourceIds: fact.sourceIds,
      unit: fact.unit, measurementContext: fact.measurementContext,
      limitations: fact.limitations, artifactVersion: artifact.artifactVersion };
  },
});
