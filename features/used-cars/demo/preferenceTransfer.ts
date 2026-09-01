export interface DemoMatchQuery extends Readonly<Record<string, string>> {
  readonly budget: string;
  readonly body: "ALL" | "SUV" | "HATCHBACK" | "SEDAN";
  readonly risk: "LOW" | "BALANCED" | "FLEXIBLE";
  readonly minYear: string;
  readonly maxMileage: string;
  readonly brand: string;
  readonly model: string;
  readonly cities: string;
}

const bodyMap: Readonly<Record<string, DemoMatchQuery["body"]>> = { SUV: "SUV", Hatchback: "HATCHBACK", Sedan: "SEDAN", "Fark etmez": "ALL" };
const riskMap: Readonly<Record<string, DemoMatchQuery["risk"]>> = { Düşük: "LOW", Dengeli: "BALANCED", Yüksek: "FLEXIBLE" };

export function createDemoMatchQuery(values: Readonly<Record<string,string>>): DemoMatchQuery {
  const maximumVehicleAge = values.maximumVehicleAge || "5";
  const minYear = maximumVehicleAge === "20+" ? "1950" : String(2026 - Number(maximumVehicleAge));
  return Object.freeze({
    budget: values.totalBudgetTry || "1600000",
    body: bodyMap[values.bodyStyle] ?? "ALL",
    risk: riskMap[values.unexpectedExpenseTolerance] ?? "BALANCED",
    minYear,
    maxMileage: values.maximumMileageKm || "90000",
    brand: !values.preferredBrand || values.preferredBrand === "Fark etmez" ? "ALL" : values.preferredBrand,
    model: !values.preferredModel || values.preferredModel === "Fark etmez" ? "ALL" : values.preferredModel,
    cities: values.preferredCities || "ALL",
  });
}

export function parseDemoMatchNumber(value: string | null, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(minimum, Math.min(maximum, parsed)) : fallback;
}
