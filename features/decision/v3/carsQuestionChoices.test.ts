import { describe, expect, it } from "vitest";
import { carsQuestionChoices, validateCarsChoice } from "./carsQuestionChoices";

describe("Cars question choices through the XPY contract", () => {
  it("keeps Cars vocabulary in its pack and supplies uncertainty", () => {
    expect(carsQuestionChoices("primaryUsage")?.options).toHaveLength(6);
    expect(carsQuestionChoices("fuelType")).toMatchObject({ source: "DOMAIN_PACK", selectionMode: "MULTIPLE" });
    expect(carsQuestionChoices("fuelType")!.options.some(option => option.exclusive)).toBe(true);
  });
  it("rejects an Appliances value and an answer for a stale question", () => {
    expect(validateCarsChoice("fuelType", { questionKey: "fuelType", values: ["Hibrit"] })).toBe(true);
    expect(validateCarsChoice("fuelType", { questionKey: "fuelType", values: ["HEPA filtre zorunlu"] })).toBe(false);
    expect(validateCarsChoice("bodyStyle", { questionKey: "fuelType", values: ["Hibrit"] })).toBe(false);
    expect(validateCarsChoice("primaryUsage", { questionKey: "primaryUsage", values: ["Aile kullanımı"] })).toBe(true);
  });
});
