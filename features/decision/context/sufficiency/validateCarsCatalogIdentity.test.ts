import { describe, expect, it } from "vitest";

import { validateCarsCatalogIdentity } from "@/features/decision/context/sufficiency/validateCarsCatalogIdentity";
import type { Car } from "@/types/car";

function car(id: string): Car {
  return {
    id,
    brand: "Brand",
    model: `Model-${id}`,
    year: 2024,
    price: 1,
    km: 0,
    fuel: "Gasoline",
    transmission: "Automatic",
    bodyType: "Sedan",
    image: `/cars/${id}.jpg`,
    createdAt: "2026-08-01",
    updatedAt: "2026-08-01",
  };
}

describe("validateCarsCatalogIdentity", () => {
  it("accepts an operation-scoped catalog with unique canonical Car.id values", () => {
    const input = [car("1"), car("2"), car("3")];

    expect(validateCarsCatalogIdentity(input)).toEqual({
      ok: true,
      value: {
        cars: input,
      },
    });
  });

  it("preserves catalog order", () => {
    const result = validateCarsCatalogIdentity([
      car("3"),
      car("1"),
      car("2"),
    ]);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected catalog validation success.");
    }

    expect(result.value.cars.map((candidate) => candidate.id)).toEqual([
      "3",
      "1",
      "2",
    ]);
  });

  it("rejects duplicate catalog Car.id values before matching", () => {
    expect(
      validateCarsCatalogIdentity([
        car("car-1"),
        car("car-2"),
        car("car-1"),
      ]),
    ).toEqual({
      ok: false,
      errors: [
        {
          code: "DUPLICATE_CATALOG_CAR_ID",
          referenceId: "car-1",
        },
      ],
    });
  });

  it("rejects an empty catalog Car.id", () => {
    expect(
      validateCarsCatalogIdentity([
        car("1"),
        car(""),
      ]),
    ).toEqual({
      ok: false,
      errors: [
        {
          code: "CATALOG_CAR_ID_INVALID",
          referenceId: "1",
        },
      ],
    });
  });

  it("does not normalize catalog identities", () => {
    const result = validateCarsCatalogIdentity([
      car("car-1"),
      car("CAR-1"),
      car(" car-1 "),
    ]);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected exact identities to remain distinct.");
    }

    expect(result.value.cars.map((candidate) => candidate.id)).toEqual([
      "car-1",
      "CAR-1",
      " car-1 ",
    ]);
  });

  it("does not mutate the catalog input", () => {
    const input = [car("1"), car("2")];
    const snapshot = structuredClone(input);

    validateCarsCatalogIdentity(input);

    expect(input).toEqual(snapshot);
  });

  it("returns a new catalog array and new car objects", () => {
    const first = car("1");
    const second = car("2");
    const input = [first, second];

    const result = validateCarsCatalogIdentity(input);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected catalog validation success.");
    }

    expect(result.value.cars).not.toBe(input);
    expect(result.value.cars[0]).not.toBe(first);
    expect(result.value.cars[1]).not.toBe(second);
  });

  it("produces deterministic output for equivalent catalogs", () => {
    const first = validateCarsCatalogIdentity([
      car("1"),
      car("2"),
    ]);
    const second = validateCarsCatalogIdentity([
      car("1"),
      car("2"),
    ]);

    expect(first).toEqual(second);
  });
});
