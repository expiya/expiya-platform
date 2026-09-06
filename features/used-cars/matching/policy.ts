import type { UsedCarMatchDimensions, UsedCarMatchResult } from "./contracts";
import { assertValidMatchDimensions } from "./contracts";
import type { UsedCarPreferenceLedger } from "../risk/preferenceLedger";

export interface UsedCarCandidateFacts {
  readonly inventoryUnitId: string;
  readonly taxonomyFamilyId: string;
  readonly modelYear: number;
  readonly mileageKm: number;
  readonly askingPriceTry: number;
  readonly bodyStyle: string;
  readonly fuelType: string;
  readonly transmission: string;
  readonly heavyDamageDeclared: boolean | null;
  readonly maintenanceDocumented: boolean;
  readonly warrantyAvailable: boolean;
  readonly serviceAccessAvailable: boolean;
  readonly evidenceReadiness: number;
  readonly operationalAvailability: number;
}

export interface AgeMileageCorridor {
  readonly minimumModelYear: number;
  readonly maximumMileageKm: number;
  readonly rationaleCodes: readonly string[];
  readonly advisoryOnly: true;
}

export function deriveAgeMileageCorridor(ledger: UsedCarPreferenceLedger, currentYear: number): AgeMileageCorridor {
  const lowRisk = ledger.unexpectedExpenseTolerance === "LOW";
  const intensiveUse = (ledger.annualMileageKm ?? 0) >= 25_000;
  const defaultAge = lowRisk ? 4 : ledger.unexpectedExpenseTolerance === "HIGH" ? 10 : 7;
  const defaultMileage = lowRisk ? 70_000 : intensiveUse ? 140_000 : 110_000;
  return Object.freeze({
    minimumModelYear: ledger.minimumModelYear?.value ?? currentYear - defaultAge,
    maximumMileageKm: ledger.maximumMileageKm?.value ?? defaultMileage,
    rationaleCodes: Object.freeze([
      lowRisk ? "LOW_UNEXPECTED_EXPENSE_TOLERANCE" : "BALANCED_USED_CAR_RISK",
      ...(intensiveUse ? ["HIGH_ANNUAL_MILEAGE"] : []),
      ...(ledger.maintenanceExpectation === "DOCUMENTED" ? ["DOCUMENTED_MAINTENANCE_EXPECTED"] : []),
    ]),
    advisoryOnly: true,
  });
}

export interface CandidateEvaluation {
  readonly eligible: boolean;
  readonly rejectionCodes: readonly string[];
  readonly result?: UsedCarMatchResult;
}

const ratio = (value: number) => Math.max(0, Math.min(1, value));

export function evaluateUsedCarCandidate(input: {
  readonly ledger: UsedCarPreferenceLedger;
  readonly corridor: AgeMileageCorridor;
  readonly candidate: UsedCarCandidateFacts;
}): CandidateEvaluation {
  const { ledger, corridor, candidate } = input;
  const rejectionCodes = [
    ...(ledger.totalBudgetTry !== undefined && candidate.askingPriceTry > ledger.totalBudgetTry ? ["HARD_BUDGET_EXCEEDED"] : []),
    ...(ledger.minimumModelYear?.strength === "HARD" && candidate.modelYear < ledger.minimumModelYear.value ? ["HARD_MODEL_YEAR_FAILED"] : []),
    ...(ledger.maximumMileageKm?.strength === "HARD" && candidate.mileageKm > ledger.maximumMileageKm.value ? ["HARD_MILEAGE_FAILED"] : []),
    ...(ledger.heavyDamageApproach === "EXCLUDE" && candidate.heavyDamageDeclared !== false ? ["HEAVY_DAMAGE_NOT_SAFELY_EXCLUDED"] : []),
    ...(candidate.operationalAvailability < 1 ? ["NOT_OPERATIONALLY_AVAILABLE"] : []),
  ];
  if (rejectionCodes.length > 0) return Object.freeze({ eligible: false, rejectionCodes: Object.freeze(rejectionCodes) });

  const needSignals = [
    ledger.bodyStyles.length === 0 || ledger.bodyStyles.includes(candidate.bodyStyle),
    ledger.fuelTypes.length === 0 || ledger.fuelTypes.includes(candidate.fuelType),
    ledger.transmissions.length === 0 || ledger.transmissions.includes(candidate.transmission),
    !ledger.nearbyServiceAccessRequired || candidate.serviceAccessAvailable,
  ];
  const riskSignals = [
    candidate.modelYear >= corridor.minimumModelYear,
    candidate.mileageKm <= corridor.maximumMileageKm,
    ledger.maintenanceExpectation !== "DOCUMENTED" || candidate.maintenanceDocumented,
    ledger.warrantyExpectation !== "REQUIRED" || candidate.warrantyAvailable,
  ];
  const dimensions: UsedCarMatchDimensions = {
    needFit: ratio(needSignals.filter(Boolean).length / needSignals.length),
    budgetFit: ledger.totalBudgetTry ? ratio(1 - Math.max(0, candidate.askingPriceTry - ledger.totalBudgetTry * 0.75) / (ledger.totalBudgetTry * 0.25)) : 1,
    riskFit: ratio(riskSignals.filter(Boolean).length / riskSignals.length),
    evidenceReadiness: candidate.evidenceReadiness,
    operationalAvailability: candidate.operationalAvailability,
  };
  assertValidMatchDimensions(dimensions);
  return Object.freeze({
    eligible: true,
    rejectionCodes: [],
    result: Object.freeze({
      inventoryUnitId: candidate.inventoryUnitId,
      taxonomyFamilyId: candidate.taxonomyFamilyId,
      dimensions,
      reasons: Object.freeze(["Kullanım ve tercih uyumu ayrı boyutlarda değerlendirildi.", "Yaş ve kilometre koridoru açıklanabilir risk rehberidir."]),
      uncertainties: Object.freeze([
        ...(candidate.heavyDamageDeclared === null ? ["Ağır hasar bilgisi eksik."] : []),
        ...(!candidate.maintenanceDocumented ? ["Bakım geçmişi belgeli değil."] : []),
      ]),
      safeNextSteps: Object.freeze(["Satıcı beyanlarını belgelerle kontrol edin.", "Bağımsız ekspertiz planlayın."]),
      organic: true,
    }),
  });
}

export function rankOrganicMatches(results: readonly UsedCarMatchResult[]): readonly UsedCarMatchResult[] {
  const score = (item: UsedCarMatchResult) => item.dimensions.needFit * 0.35 + item.dimensions.budgetFit * 0.2 + item.dimensions.riskFit * 0.25 + item.dimensions.evidenceReadiness * 0.15 + item.dimensions.operationalAvailability * 0.05;
  return Object.freeze([...results].sort((left, right) => score(right) - score(left) || left.inventoryUnitId.localeCompare(right.inventoryUnitId, "en")));
}

