import { createHash, randomInt, randomUUID } from "node:crypto";
import { normalizePhone } from "./security.server";
import { LEGAL_READY } from "./legalArtifacts";

export interface SmsOtpAdapter { send(input: { readonly phone: string; readonly code: string; readonly purpose: "SALES_REQUEST_PHONE_VERIFICATION" }): Promise<{ readonly providerMessageId: string }> }
export class DisabledSmsOtpAdapter implements SmsOtpAdapter { async send(): Promise<{ readonly providerMessageId: string }> { throw new TypeError("SMS_PROVIDER_NOT_CONFIGURED"); } }
export class InMemorySmsOtpAdapter implements SmsOtpAdapter { readonly deliveries: { phone: string; code: string }[] = []; async send(input: { phone: string; code: string }) { this.deliveries.push({ phone: input.phone, code: input.code }); return { providerMessageId: `test-${this.deliveries.length}` }; } }
export class HttpSmsOtpAdapter implements SmsOtpAdapter { constructor(private readonly endpoint: string, private readonly bearerToken: string) {} async send(input: { phone: string; code: string }) { const response = await fetch(this.endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.bearerToken}` }, body: JSON.stringify({ recipient: input.phone, template: "EXPIYA_SALES_PHONE_VERIFICATION", variables: { code: input.code, expiresInMinutes: 5 } }) }); if (!response.ok) throw new TypeError("SMS_DELIVERY_FAILED"); const payload = await response.json() as { messageId?: string }; if (!payload.messageId) throw new TypeError("SMS_DELIVERY_INVALID"); return { providerMessageId: payload.messageId }; } }
const pilotAdapter = new InMemorySmsOtpAdapter();
export function isPhase3PilotTestMode() {
  const nonProductionRuntime = process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview";
  return nonProductionRuntime && process.env.CARS_PHASE3_TEST_MODE === "true";
}
export function configuredSmsOtpAdapter(): SmsOtpAdapter {
  if (isPhase3PilotTestMode()) return pilotAdapter;
  const externalExecutionEnabled = LEGAL_READY && process.env.CARS_PHASE3_EXTERNAL_EXECUTION_ENABLED === "true";
  if (!externalExecutionEnabled) return new DisabledSmsOtpAdapter();
  const endpoint = process.env.CARS_SMS_OTP_ENDPOINT;
  const token = process.env.CARS_SMS_OTP_BEARER_TOKEN;
  return endpoint && token ? new HttpSmsOtpAdapter(endpoint, token) : new DisabledSmsOtpAdapter();
}
type Challenge = { phone: string; handoffDigest: string; codeDigest: string; expiresAt: number; attempts: number; verified: boolean };
const challenges = new Map<string, Challenge>(); const verifications = new Map<string, { phone: string; handoffDigest: string; expiresAt: number; consumed: boolean }>();
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export async function issuePhoneOtp(input: { phone: string; handoff: string }, adapter: SmsOtpAdapter = new DisabledSmsOtpAdapter(), now = Date.now(), exposePilotCode = false) { const phone = normalizePhone(input.phone); const challengeId = randomUUID(); const code = String(randomInt(100000, 1_000_000)); challenges.set(challengeId, { phone, handoffDigest: digest(input.handoff), codeDigest: digest(`${challengeId}:${code}`), expiresAt: now + 5 * 60_000, attempts: 0, verified: false }); await adapter.send({ phone, code, purpose: "SALES_REQUEST_PHONE_VERIFICATION" }); return { challengeId, expiresAt: new Date(now + 5 * 60_000).toISOString(), ...(exposePilotCode ? { pilotCode: code } : {}) }; }
export function verifyPhoneOtp(input: { challengeId: string; code: string; handoff: string }, now = Date.now()) { const item = challenges.get(input.challengeId); if (!item || item.expiresAt <= now || item.verified || item.handoffDigest !== digest(input.handoff)) throw new TypeError("OTP_CHALLENGE_INVALID"); item.attempts += 1; if (item.attempts > 5) throw new TypeError("OTP_ATTEMPTS_EXCEEDED"); if (item.codeDigest !== digest(`${input.challengeId}:${input.code}`)) throw new TypeError("OTP_CODE_INVALID"); item.verified = true; const token = randomUUID(); verifications.set(token, { phone: item.phone, handoffDigest: item.handoffDigest, expiresAt: now + 30 * 60_000, consumed: false }); return { verificationToken: token, phone: item.phone, expiresAt: new Date(now + 30 * 60_000).toISOString() }; }
export function consumePhoneVerification(input: { token: string; phone: string; handoff: string }, now = Date.now()) { const item = verifications.get(input.token); const phone = normalizePhone(input.phone); if (!item || item.consumed || item.expiresAt <= now || item.phone !== phone || item.handoffDigest !== digest(input.handoff)) throw new TypeError("PHONE_NOT_VERIFIED"); item.consumed = true; return { phone, verifiedAt: new Date(now).toISOString() }; }
export function resetOtpForTests() { challenges.clear(); verifications.clear(); }
