import type { DemoUsedCar, DemoRiskLevel } from "./catalog";
import type { UsedCarPreferenceLedger } from "../risk/preferenceLedger";
import { deriveAgeMileageCorridor, evaluateUsedCarCandidate, rankOrganicMatches } from "../matching/policy";
import type { UsedCarMatchResult } from "../matching/contracts";

export interface DemoMatchingInput { readonly budget: number; readonly risk: DemoRiskLevel; readonly body: "ALL" | "SUV" | "HATCHBACK" | "SEDAN"; readonly minimumModelYear: number; readonly maximumMileageKm: number }
export interface RankedDemoMatch { readonly car: DemoUsedCar; readonly result: UsedCarMatchResult; readonly scorePercent: number }
export interface DemoMatchingRun { readonly matches: readonly RankedDemoMatch[]; readonly rejectedCount: number; readonly rejectionCodes: readonly string[] }

export function createDemoPreferenceLedger(input: DemoMatchingInput): UsedCarPreferenceLedger {
  const ledger: UsedCarPreferenceLedger = { version: "used-car-preference-ledger/v1", totalBudgetTry: input.budget, usagePurposes: ["DAILY_USE"], annualMileageKm: 18_000, cityDrivingRatio: 0.7,
    bodyStyles: input.body === "ALL" ? [] : [input.body], fuelTypes: [], transmissions: [], minimumModelYear: { value: input.minimumModelYear, strength: "HARD" },
    maximumMileageKm: { value: input.maximumMileageKm, strength: "HARD" }, paintTolerance: "LIMITED", replacedPartTolerance: "LIMITED", heavyDamageApproach: "EXCLUDE",
    maintenanceExpectation: input.risk === "LOW" ? "DOCUMENTED" : "PREFERRED", warrantyExpectation: input.risk === "LOW" ? "REQUIRED" : "PREFERRED",
    unexpectedExpenseTolerance: input.risk === "LOW" ? "LOW" : input.risk === "FLEXIBLE" ? "HIGH" : "MEDIUM", nearbyServiceAccessRequired: input.risk === "LOW", resalePriority: "MEDIUM", classicInterest: false };
  return Object.freeze(ledger);
}

const readiness = { STRONG: 0.9, PARTIAL: 0.65, LIMITED: 0.35 } as const;
export function runDemoMatching(cars: readonly DemoUsedCar[], input: DemoMatchingInput): DemoMatchingRun {
  const ledger = createDemoPreferenceLedger(input);
  const corridor = deriveAgeMileageCorridor(ledger, 2026);
  const evaluated = cars.map((car) => ({
    car,
    evaluation: evaluateUsedCarCandidate({
      ledger,
      corridor,
      candidate: {
        inventoryUnitId: car.id,
        taxonomyFamilyId: `family-${car.title.toLowerCase().replaceAll(" ", "-")}`,
        modelYear: car.year,
        mileageKm: car.mileageKm,
        askingPriceTry: car.priceTry,
        bodyStyle: car.bodyStyle,
        fuelType: car.fuelType,
        transmission: "AUTOMATIC",
        heavyDamageDeclared: false,
        maintenanceDocumented: car.maintenanceDocumented,
        warrantyAvailable: car.warrantyMonths > 0,
        serviceAccessAvailable: true,
        evidenceReadiness: readiness[car.evidence],
        operationalAvailability: 1,
      },
    }),
  }));
  const ranked = rankOrganicMatches(evaluated.flatMap(item => item.evaluation.result ? [item.evaluation.result] : []));
  const byId = new Map(evaluated.map(item => [item.car.id,item.car]));
  return Object.freeze({ matches: Object.freeze(ranked.map(result => ({ car: byId.get(result.inventoryUnitId)!, result, scorePercent: Math.round((result.dimensions.needFit*.35+result.dimensions.budgetFit*.2+result.dimensions.riskFit*.25+result.dimensions.evidenceReadiness*.15+result.dimensions.operationalAvailability*.05)*100) }))), rejectedCount: evaluated.filter(item=>!item.evaluation.eligible).length, rejectionCodes: Object.freeze([...new Set(evaluated.flatMap(item=>item.evaluation.rejectionCodes))]) });
}
