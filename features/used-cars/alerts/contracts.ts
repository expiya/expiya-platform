export type VehicleAlertCadence = "WEEKLY" | "INSTANT";
export type VehicleAlertPlan = "FREE" | "PRO";
export interface VehicleAlertRequest { readonly alertId: string; readonly preferenceFingerprint: string; readonly email: string; readonly emailChallengeId: string; readonly cadence: VehicleAlertCadence; readonly plan: VehicleAlertPlan; readonly geography: "SELECTED_CITIES" | "NATIONWIDE_TR"; readonly selectedCities: readonly string[]; readonly expiresAt: string; readonly serviceNotificationAccepted: boolean; readonly marketingConsentBundled: boolean; readonly organicRankingBenefit: false; readonly paymentCollected: false; readonly activationAuthorized: false }
function maximumExpiryFor(plan: VehicleAlertPlan, now: Date) {
  const maximum = new Date(now);
  if (plan === "FREE") maximum.setUTCDate(maximum.getUTCDate() + 84);
  else maximum.setUTCFullYear(maximum.getUTCFullYear() + 1);
  return maximum;
}
export function validateVehicleAlertRequest(request: VehicleAlertRequest, now: string, emailProof: VehicleAlertEmailVerificationProof | null = null) {
  const codes: string[] = [];
  const nowDate = new Date(now);
  const expiresAtDate = new Date(request.expiresAt);
  if (!/^hmac-sha256:[^:]+:[a-f0-9]{64}$/u.test(request.preferenceFingerprint)) codes.push("PREFERENCE_FINGERPRINT_INVALID");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(request.email)) codes.push("EMAIL_INVALID");
  if (!validateVehicleAlertEmailProof(request.email, request.emailChallengeId, emailProof).valid) codes.push("VERIFIED_EMAIL_REQUIRED");
  if (!request.serviceNotificationAccepted) codes.push("SERVICE_NOTIFICATION_ACCEPTANCE_REQUIRED");
  if (request.marketingConsentBundled) codes.push("MARKETING_CONSENT_BUNDLING_FORBIDDEN");
  if (request.plan === "FREE" && request.cadence !== "WEEKLY") codes.push("FREE_CADENCE_INVALID");
  if (request.plan === "PRO" && request.cadence !== "INSTANT") codes.push("PRO_CADENCE_INVALID");
  if (request.plan === "FREE" && (request.geography !== "SELECTED_CITIES" || request.selectedCities.length === 0 || request.selectedCities.length > 5)) codes.push("FREE_CITY_SCOPE_INVALID");
  if (request.plan === "PRO" && (request.geography !== "NATIONWIDE_TR" || request.selectedCities.length !== 0)) codes.push("PRO_NATIONWIDE_SCOPE_INVALID");
  if (Number.isNaN(nowDate.getTime()) || Number.isNaN(expiresAtDate.getTime())) codes.push("ALERT_DATE_INVALID");
  else {
    if (expiresAtDate <= nowDate) codes.push("ALERT_EXPIRED");
    if (expiresAtDate > maximumExpiryFor(request.plan, nowDate)) codes.push(request.plan === "FREE" ? "FREE_DURATION_EXCEEDED" : "PRO_DURATION_EXCEEDED");
  }
  if (request.organicRankingBenefit || request.paymentCollected || request.activationAuthorized) codes.push("COMMERCIAL_OR_ACTIVATION_BOUNDARY_VIOLATION");
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), emailDeliveryAuthorized: false as const, paymentCollectionAuthorized: false as const });
}
import { validateVehicleAlertEmailProof, type VehicleAlertEmailVerificationProof } from "./emailVerification";
