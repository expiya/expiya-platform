import type { Car } from "@/types/car";

export type CarsCatalogIdentityValidationErrorCode =
  | "CATALOG_CAR_ID_INVALID"
  | "DUPLICATE_CATALOG_CAR_ID";

export interface CarsCatalogIdentityValidationError {
  code: CarsCatalogIdentityValidationErrorCode;
  referenceId: string;
}

export interface ValidatedCarsCatalog {
  readonly cars: readonly Readonly<Car>[];
}

export type CarsCatalogIdentityValidationResult =
  | {
      ok: true;
      value: ValidatedCarsCatalog;
    }
  | {
      ok: false;
      errors: readonly CarsCatalogIdentityValidationError[];
    };

export function validateCarsCatalogIdentity(
  catalog: readonly Car[],
): CarsCatalogIdentityValidationResult {
  const errors: CarsCatalogIdentityValidationError[] = [];
  const optionIds = new Set<string>();

  catalog.forEach((car, inputIndex) => {
    if (typeof car.id !== "string" || car.id.length === 0) {
      errors.push({
        code: "CATALOG_CAR_ID_INVALID",
        referenceId: String(inputIndex),
      });
      return;
    }

    if (optionIds.has(car.id)) {
      errors.push({
        code: "DUPLICATE_CATALOG_CAR_ID",
        referenceId: car.id,
      });
      return;
    }

    optionIds.add(car.id);
  });

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    value: {
      cars: catalog.map((car) => ({ ...car })),
    },
  };
}
