export const allowedDecisionFeatures = Object.freeze([
  "totalBudget", "downPayment", "financeLimit", "usagePurpose", "annualKm", "cityRoadRatio",
  "bodyType", "energyType", "transmission", "minimumModelYear", "maximumMileage", "maximumAge",
  "damageTolerance", "paintTolerance", "replacedPartTolerance", "heavyDamageApproach",
  "maintenanceExpectation", "warrantyExpectation", "serviceAccess", "resalePriority",
  "unexpectedCostTolerance", "classicInterest", "useMode",
] as const);

export const prohibitedDecisionFeatures = Object.freeze([
  "religion", "ethnicity", "politicalOpinion", "healthData", "biometricData", "gender",
  "sexualOrientation", "disability", "exactAddress", "nationalId", "protectedClassProxy",
] as const);

export function validateDecisionFeatureSet(features: readonly string[]) {
  const prohibited = features.filter((feature) => (prohibitedDecisionFeatures as readonly string[]).includes(feature));
  const unknown = features.filter((feature) => !(allowedDecisionFeatures as readonly string[]).includes(feature) && !prohibited.includes(feature));
  return Object.freeze({ valid: prohibited.length === 0 && unknown.length === 0, prohibited: Object.freeze(prohibited), unknown: Object.freeze(unknown), proxyInferenceAuthorized: false as const });
}
