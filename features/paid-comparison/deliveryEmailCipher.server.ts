import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function keyFromEnvironment(environment: NodeJS.ProcessEnv = process.env): Buffer {
  const raw = environment.PAID_REPORT_PII_KEY;
  if (!raw) throw new TypeError("PAID_REPORT_PII_KEY_REQUIRED");
  const key = Buffer.from(raw, "base64url");
  if (key.length !== 32) throw new TypeError("PAID_REPORT_PII_KEY_INVALID");
  return key;
}

export function encryptPaidReportDeliveryEmail(email: string, environment?: NodeJS.ProcessEnv): string {
  const normalized = email.trim().toLocaleLowerCase("tr-TR");
  if (!normalized.includes("@") || normalized.length > 254) throw new TypeError("PAID_REPORT_DELIVERY_EMAIL_INVALID");
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", keyFromEnvironment(environment), iv);
  const encrypted = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${encrypted.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
}

export function decryptPaidReportDeliveryEmail(value: string, environment?: NodeJS.ProcessEnv): string {
  const [version, iv, encrypted, tag, extra] = value.split(".");
  if (version !== "v1" || !iv || !encrypted || !tag || extra) throw new TypeError("PAID_REPORT_DELIVERY_EMAIL_CIPHERTEXT_INVALID");
  const decipher = createDecipheriv("aes-256-gcm", keyFromEnvironment(environment), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

export function maskPaidReportDeliveryEmail(email: string): string {
  const [local, domain] = email.trim().toLocaleLowerCase("tr-TR").split("@");
  if (!local || !domain) throw new TypeError("PAID_REPORT_DELIVERY_EMAIL_INVALID");
  return `${local.slice(0, 1)}***@${domain}`;
}
