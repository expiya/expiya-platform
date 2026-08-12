import { z } from "zod";

import { cars } from "@/data/car";
import {
  validateCarsCatalogIdentity,
  type CarsCatalogIdentityValidationError,
} from "@/features/decision/context/sufficiency/validateCarsCatalogIdentity";
import type { Car } from "@/types/car";

export const CARS_CATALOG_SOURCE_ID = "repo:data/car.ts" as const;
export const CARS_CATALOG_APPROVED_SNAPSHOT =
  "b59169f29f974369a51ca607cb7dbd201683578b" as const;
export const CARS_CATALOG_REVISION =
  "git-blob:32edbf2ed189b2936cf468d5489c97e07a094d42" as const;

const APPROVED_CATALOG_IDS = new Set(["1", "2", "3"]);

const carSchema = z.strictObject({
  id: z.string(),
  brand: z.string(),
  model: z.string(),
  year: z.number(),
  price: z.number(),
  km: z.number(),
  fuel: z.enum(["Gasoline", "Diesel", "Hybrid", "Electric"]),
  transmission: z.enum(["Manual", "Automatic"]),
  bodyType: z.enum(["Sedan", "Hatchback", "SUV", "Coupe", "Pickup", "Van"]),
  image: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const carsCatalogPayloadSchema = z.array(carSchema);

export interface CarsCatalogAcquisition {
  readonly catalog: readonly Readonly<Car>[];
  readonly trace: {
    readonly sourceId: typeof CARS_CATALOG_SOURCE_ID;
    readonly approvedSnapshot: typeof CARS_CATALOG_APPROVED_SNAPSHOT;
    readonly catalogRevision: typeof CARS_CATALOG_REVISION;
    readonly acquiredOptionIds: readonly string[];
    readonly limitations: readonly [
      "catalog-only",
      "v0.1-authoritative-evidence-source",
    ];
  };
}

export type CarsCatalogAcquisitionErrorCode =
  | "CATALOG_PAYLOAD_INVALID"
  | "APPROVED_CATALOG_ID_MISSING"
  | "UNEXPECTED_CATALOG_ID"
  | "CATALOG_REVISION_MISMATCH"
  | "CATALOG_IDENTITY_VALIDATION_FAILED";

export interface CarsCatalogAcquisitionError {
  readonly code: CarsCatalogAcquisitionErrorCode;
  readonly referenceId?: string;
  readonly expectedRevision?: typeof CARS_CATALOG_REVISION;
  readonly actualRevision?: string;
  readonly identityErrors?: readonly CarsCatalogIdentityValidationError[];
}

export type CarsCatalogAcquisitionResult =
  | { readonly ok: true; readonly value: CarsCatalogAcquisition }
  | { readonly ok: false; readonly errors: readonly CarsCatalogAcquisitionError[] };

function failure(
  errors: readonly CarsCatalogAcquisitionError[],
): CarsCatalogAcquisitionResult {
  return { ok: false, errors: Object.freeze(errors.map((error) => Object.freeze(error))) };
}

export function validateBoundedCarsCatalogPayload(
  payload: unknown,
  catalogRevision: string,
): CarsCatalogAcquisitionResult {
  const parsedPayload = carsCatalogPayloadSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return failure([{ code: "CATALOG_PAYLOAD_INVALID" }]);
  }

  const identityResult = validateCarsCatalogIdentity(parsedPayload.data);

  if (!identityResult.ok) {
    return failure([
      {
        code: "CATALOG_IDENTITY_VALIDATION_FAILED",
        identityErrors: Object.freeze(
          identityResult.errors.map((error) => Object.freeze({ ...error })),
        ),
      },
    ]);
  }

  const acquiredIds = new Set(identityResult.value.cars.map((car) => car.id));
  const scopeErrors: CarsCatalogAcquisitionError[] = [];

  for (const approvedId of APPROVED_CATALOG_IDS) {
    if (!acquiredIds.has(approvedId)) {
      scopeErrors.push({
        code: "APPROVED_CATALOG_ID_MISSING",
        referenceId: approvedId,
      });
    }
  }

  for (const acquiredId of acquiredIds) {
    if (!APPROVED_CATALOG_IDS.has(acquiredId)) {
      scopeErrors.push({ code: "UNEXPECTED_CATALOG_ID", referenceId: acquiredId });
    }
  }

  if (scopeErrors.length > 0) {
    return failure(scopeErrors);
  }

  if (catalogRevision !== CARS_CATALOG_REVISION) {
    return failure([
      {
        code: "CATALOG_REVISION_MISMATCH",
        expectedRevision: CARS_CATALOG_REVISION,
        actualRevision: catalogRevision,
      },
    ]);
  }

  const catalog = Object.freeze(
    identityResult.value.cars.map((car) => Object.freeze({ ...car })),
  );
  const acquiredOptionIds = Object.freeze(catalog.map((car) => car.id));
  const limitations = Object.freeze([
    "catalog-only",
    "v0.1-authoritative-evidence-source",
  ] as const);

  return {
    ok: true,
    value: Object.freeze({
      catalog,
      trace: Object.freeze({
        sourceId: CARS_CATALOG_SOURCE_ID,
        approvedSnapshot: CARS_CATALOG_APPROVED_SNAPSHOT,
        catalogRevision: CARS_CATALOG_REVISION,
        acquiredOptionIds,
        limitations,
      }),
    }),
  };
}

export function acquireBoundedCarsCatalog(): CarsCatalogAcquisitionResult {
  return validateBoundedCarsCatalogPayload(cars, CARS_CATALOG_REVISION);
}
