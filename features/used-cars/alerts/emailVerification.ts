export interface VehicleAlertEmailChallenge {
  readonly challengeId: string;
  readonly normalizedEmail: string;
  readonly purpose: "VEHICLE_ALERT";
  readonly codeDigest: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly attemptCount: number;
  readonly maximumAttempts: 5;
  readonly resendAvailableAt: string;
  readonly consumedAt: string | null;
}

export interface VehicleAlertEmailVerificationProof {
  readonly challengeId: string;
  readonly normalizedEmail: string;
  readonly purpose: "VEHICLE_ALERT";
  readonly verifiedAt: string;
}

export function normalizeVehicleAlertEmail(email: string) {
  return email.trim().toLocaleLowerCase("en-US");
}

export function assessVehicleAlertEmailChallenge(challenge: VehicleAlertEmailChallenge, now: string) {
  const codes: string[] = [];
  if (!/^email-challenge-[a-zA-Z0-9_-]+$/u.test(challenge.challengeId)) codes.push("CHALLENGE_ID_INVALID");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(challenge.normalizedEmail)) codes.push("EMAIL_INVALID");
  if (!/^hmac-sha256:[^:]+:[a-f0-9]{64}$/u.test(challenge.codeDigest)) codes.push("CODE_DIGEST_INVALID");
  if (challenge.attemptCount >= challenge.maximumAttempts) codes.push("ATTEMPT_LIMIT_REACHED");
  if (challenge.consumedAt) codes.push("CHALLENGE_ALREADY_CONSUMED");
  if (new Date(challenge.expiresAt) <= new Date(now)) codes.push("CHALLENGE_EXPIRED");
  return Object.freeze({ usable: codes.length === 0, codes: Object.freeze(codes), emailDeliveryAuthorized: false as const });
}

export function validateVehicleAlertEmailProof(email: string, challengeId: string, proof: VehicleAlertEmailVerificationProof | null) {
  const valid = Boolean(proof && proof.purpose === "VEHICLE_ALERT" && proof.challengeId === challengeId && proof.normalizedEmail === normalizeVehicleAlertEmail(email) && !Number.isNaN(new Date(proof.verifiedAt).getTime()));
  return Object.freeze({ valid, code: valid ? null : "VERIFIED_EMAIL_REQUIRED" as const });
}
