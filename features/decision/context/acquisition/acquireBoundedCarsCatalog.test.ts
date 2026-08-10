import { describe, expect, it } from "vitest";

import {
  acquireBoundedCarsCatalog,
  CARS_CATALOG_APPROVED_SNAPSHOT,
  CARS_CATALOG_REVISION,
  CARS_CATALOG_SOURCE_ID,
  validateBoundedCarsCatalogPayload,
} from "@/features/decision/context/acquisition/acquireBoundedCarsCatalog";
import type { Car } from "@/types/car";

function car(id: string): Car {
  return {
    id,
    brand: "Brand",
    model: `Model-${id}`,
    year: 2024,
    price: 1_000_000,
    km: 10_000,
    fuel: "Gasoline",
    transmission: "Automatic",
    bodyType: "Sedan",
    image: `/cars/${id}.jpg`,
    createdAt: "2026-08-01",
    updatedAt: "2026-08-01",
  };
}

function approvedPayload(): Car[] {
  return [car("1"), car("2"), car("3")];
}

function validate(payload: unknown, revision: string = CARS_CATALOG_REVISION) {
  return validateBoundedCarsCatalogPayload(payload, revision);
}

describe("bounded runtime Cars catalog acquisition", () => {
  it("acquires the approved static payload with the exact trace", () => {
    const result = acquireBoundedCarsCatalog();

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected acquisition success.");

    expect(result.value.catalog.map((item) => item.id)).toEqual(["1", "2", "3"]);
    expect(result.value.trace).toEqual({
      sourceId: CARS_CATALOG_SOURCE_ID,
      approvedSnapshot: CARS_CATALOG_APPROVED_SNAPSHOT,
      catalogRevision: CARS_CATALOG_REVISION,
      acquiredOptionIds: ["1", "2", "3"],
      limitations: ["catalog-only", "no evidence authority"],
    });
  });

  it.each([
    "id",
    "brand",
    "model",
    "year",
    "price",
    "km",
    "fuel",
    "transmission",
    "bodyType",
    "image",
    "createdAt",
    "updatedAt",
  ] as const)("requires the complete Car shape including %s", (field) => {
    const payload: Record<string, unknown>[] = approvedPayload().map((item) => ({
      ...item,
    }));
    delete payload[0][field];

    expect(validate(payload)).toEqual({
      ok: false,
      errors: [{ code: "CATALOG_PAYLOAD_INVALID" }],
    });
  });

  it.each([
    ["brand", 7],
    ["year", "2024"],
    ["fuel", "Hydrogen"],
  ])("rejects malformed %s without coercion or defaulting", (field, value) => {
    const payload: Record<string, unknown>[] = approvedPayload().map((item) => ({
      ...item,
    }));
    payload[0][field] = value;

    expect(validate(payload)).toEqual({
      ok: false,
      errors: [{ code: "CATALOG_PAYLOAD_INVALID" }],
    });
  });

  it("fails closed for an empty catalog", () => {
    expect(validate([])).toEqual({
      ok: false,
      errors: [
        { code: "APPROVED_CATALOG_ID_MISSING", referenceId: "1" },
        { code: "APPROVED_CATALOG_ID_MISSING", referenceId: "2" },
        { code: "APPROVED_CATALOG_ID_MISSING", referenceId: "3" },
      ],
    });
  });

  it.each(["1", "2", "3"])("fails when approved ID %s is missing", (id) => {
    const payload = approvedPayload().filter((item) => item.id !== id);

    expect(validate(payload)).toEqual({
      ok: false,
      errors: [{ code: "APPROVED_CATALOG_ID_MISSING", referenceId: id }],
    });
  });

  it("fails when an unexpected ID is present", () => {
    expect(validate([...approvedPayload(), car("4")])).toEqual({
      ok: false,
      errors: [{ code: "UNEXPECTED_CATALOG_ID", referenceId: "4" }],
    });
  });

  it("surfaces the existing empty-ID catalog identity error", () => {
    const payload = approvedPayload();
    payload[0] = car("");

    expect(validate(payload)).toEqual({
      ok: false,
      errors: [
        {
          code: "CATALOG_IDENTITY_VALIDATION_FAILED",
          identityErrors: [{ code: "CATALOG_CAR_ID_INVALID", referenceId: "0" }],
        },
      ],
    });
  });

  it("surfaces the existing duplicate-ID catalog identity error", () => {
    const payload = approvedPayload();
    payload[2] = car("1");

    expect(validate(payload)).toEqual({
      ok: false,
      errors: [
        {
          code: "CATALOG_IDENTITY_VALIDATION_FAILED",
          identityErrors: [{ code: "DUPLICATE_CATALOG_CAR_ID", referenceId: "1" }],
        },
      ],
    });
  });

  it("fails when the supplied catalog revision differs", () => {
    expect(validate(approvedPayload(), "git-blob:different")).toEqual({
      ok: false,
      errors: [
        {
          code: "CATALOG_REVISION_MISMATCH",
          expectedRevision: CARS_CATALOG_REVISION,
          actualRevision: "git-blob:different",
        },
      ],
    });
  });

  it("preserves catalog order without treating it as ID authority", () => {
    const result = validate([car("3"), car("1"), car("2")]);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected acquisition success.");
    expect(result.value.catalog.map((item) => item.id)).toEqual(["3", "1", "2"]);
    expect(result.value.trace.acquiredOptionIds).toEqual(["3", "1", "2"]);
  });

  it("does not mutate inputs and returns isolated frozen structures", () => {
    const payload = approvedPayload();
    const snapshot = structuredClone(payload);
    const result = validate(payload);

    expect(payload).toEqual(snapshot);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected acquisition success.");

    expect(result.value.catalog).not.toBe(payload);
    expect(result.value.catalog[0]).not.toBe(payload[0]);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.catalog)).toBe(true);
    expect(result.value.catalog.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(result.value.trace)).toBe(true);
    expect(Object.isFrozen(result.value.trace.acquiredOptionIds)).toBe(true);
    expect(Object.isFrozen(result.value.trace.limitations)).toBe(true);
  });

  it("produces only the bounded catalog and trace contract", () => {
    const result = validate(approvedPayload());

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected acquisition success.");

    expect(Object.keys(result.value).sort()).toEqual(["catalog", "trace"]);
    expect(result.value).not.toHaveProperty("candidate");
    expect(result.value).not.toHaveProperty("evidence");
    expect(result.value).not.toHaveProperty("provenance");
    expect(result.value).not.toHaveProperty("availability");
  });

  it("is deterministic and returns independent results", () => {
    const first = validate(approvedPayload());
    const second = validate(approvedPayload());

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    if (!first.ok || !second.ok) throw new Error("Expected acquisition success.");
    expect(first.value.catalog).not.toBe(second.value.catalog);
    expect(first.value.catalog[0]).not.toBe(second.value.catalog[0]);
  });
});
