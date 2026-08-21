import { describe, expect, it } from "vitest";
import { createPreferenceAcknowledgement } from "./preferenceAcknowledgement";

const mutation = (fieldId: "fuelType" | "bodyStyle" | "transmission", value: string) => ({ operation: "ADD" as const, fieldId, normalizedValue: { operator: "EQUALS", value }, explicitness: "EXPLICIT_PREFERENCE" as const, confidence: 1, sourceSpan: value, deterministicDecisionUse: "STRONG_OR_SOFT_RANK" as const });

describe("preference acknowledgement", () => {
  it("responds to the meaning of common vehicle choices", () => {
    expect(createPreferenceAcknowledgement({ constraints: [mutation("fuelType", "BEV")], budgets: [] })).toMatch(/Elektrikli/);
    expect(createPreferenceAcknowledgement({ constraints: [mutation("bodyStyle", "Sedan")], budgets: [] })).toMatch(/Sedan/);
    expect(createPreferenceAcknowledgement({ constraints: [mutation("transmission", "AUTOMATIC")], budgets: [] })).toMatch(/Otomatik/);
  });
  it("does not describe a multi-fuel choice as electric-only", () => {
    const acknowledgement = createPreferenceAcknowledgement({ constraints: [{ ...mutation("fuelType", "BEV"), normalizedValue: { operator: "ONE_OF", value: ["BEV", "GASOLINE", "DIESEL"] } }], budgets: [] });
    expect(acknowledgement).toMatch(/alternatif olarak açık/);
    expect(acknowledgement).not.toMatch(/Elektrikli tarafı seçtin/);
  });
  it("acknowledges budget authority without inventing a vehicle fact", () => {
    expect(createPreferenceAcknowledgement({ constraints: [], budgets: [{ operation: "SET", field: "MAXIMUM_HARD_CEILING", value: { amount: 1_500_000, currency: "TRY" }, sourceSpan: "kesin bütçem" }] })).toMatch(/Bütçe tavanın net/);
  });
});
