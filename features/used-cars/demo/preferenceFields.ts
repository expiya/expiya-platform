export const USED_CAR_PREFERENCE_FIELD_IDS = Object.freeze([
  "totalBudgetTry", "downPaymentTry", "monthlyFinanceLimitTry", "usePurpose",
  "annualMileageKm", "cityDrivingRatio", "preferredCities", "bodyStyle", "fuelType", "transmission", "preferredBrand", "preferredModel",
  "maximumMileageKm", "maximumVehicleAge", "paintTolerance",
  "changedPartTolerance", "heavyDamageApproach", "maintenanceExpectation",
  "warrantyExpectation", "nearbyServiceAccess", "resalePriority",
  "unexpectedExpenseTolerance", "classicInterest", "vehicleUseMode",
] as const);

export type UsedCarPreferenceFieldId = typeof USED_CAR_PREFERENCE_FIELD_IDS[number];
export interface DemoPreferenceSection { readonly id: string; readonly title: string; readonly fields: readonly UsedCarPreferenceFieldId[] }
export const DEMO_PREFERENCE_SECTIONS: readonly DemoPreferenceSection[] = Object.freeze([
  { id: "budget", title: "Bütçe ve finansman", fields: ["totalBudgetTry", "downPaymentTry", "monthlyFinanceLimitTry"] },
  { id: "usage", title: "Kullanım biçimi", fields: ["usePurpose", "annualMileageKm", "cityDrivingRatio", "preferredCities", "bodyStyle", "fuelType", "transmission"] },
  { id: "risk", title: "Araç ve risk sınırları", fields: ["preferredBrand", "preferredModel", "maximumVehicleAge", "maximumMileageKm", "paintTolerance", "changedPartTolerance", "heavyDamageApproach"] },
  { id: "ownership", title: "Sahiplik beklentisi", fields: ["maintenanceExpectation", "warrantyExpectation", "nearbyServiceAccess", "resalePriority", "unexpectedExpenseTolerance", "classicInterest", "vehicleUseMode"] },
]);
