import { createHmac } from "node:crypto";

export type SensitiveVehicleIdentifierType = "VIN" | "PLATE" | "CHASSIS_SERIAL";

export interface IdentifierEncryptionProvider {
  readonly provider: "KMS_ENVELOPE";
  encrypt(input: { readonly plaintext: Uint8Array; readonly context: Readonly<Record<string,string>> }): Promise<{ readonly ciphertext: string; readonly keyVersion: string }>;
}

export interface ProtectedVehicleIdentifier {
  readonly version: "used-cars-protected-identifier/v1";
  readonly tenantId: string;
  readonly inventoryUnitId: string;
  readonly identifierType: SensitiveVehicleIdentifierType;
  readonly ciphertext: string;
  readonly encryptionKeyVersion: string;
  readonly fingerprint: string;
  readonly fingerprintKeyVersion: string;
  readonly normalizedLength: number;
  readonly publicDisplayAllowed: false;
}

export function normalizeVehicleIdentifier(type: SensitiveVehicleIdentifierType, value: string): string {
  const normalized = value.normalize("NFKC").toLocaleUpperCase("tr-TR").replace(/[\s.-]/gu, "");
  if (type === "VIN" && !/^[A-HJ-NPR-Z0-9]{17}$/u.test(normalized)) throw new Error("INVALID_VIN");
  if (type === "PLATE" && !/^[0-9]{2}[A-ZÇĞİÖŞÜ]{1,3}[0-9]{2,5}$/u.test(normalized)) throw new Error("INVALID_TR_PLATE");
  if (type === "CHASSIS_SERIAL" && (normalized.length < 4 || normalized.length > 64)) throw new Error("INVALID_CHASSIS_SERIAL");
  return normalized;
}

export function fingerprintVehicleIdentifier(input: {
  readonly normalizedValue: string; readonly tenantId: string; readonly identifierType: SensitiveVehicleIdentifierType;
  readonly fingerprintSecret: Uint8Array; readonly fingerprintKeyVersion: string;
}): string {
  if (input.fingerprintSecret.byteLength < 32) throw new Error("FINGERPRINT_KEY_TOO_SHORT");
  const payload = ["used-cars-identifier/v1", input.tenantId, input.identifierType, input.normalizedValue].join("\u0000");
  return `hmac-sha256:${input.fingerprintKeyVersion}:${createHmac("sha256", input.fingerprintSecret).update(payload).digest("hex")}`;
}

export function fingerprintVehicleIdentifierForFraud(input:{readonly normalizedValue:string;readonly identifierType:SensitiveVehicleIdentifierType;readonly fraudSecret:Uint8Array;readonly fraudKeyVersion:string}):string {
  if(input.fraudSecret.byteLength<32)throw new Error("FRAUD_FINGERPRINT_KEY_TOO_SHORT");
  const payload=["used-cars-fraud-identifier/v1",input.identifierType,input.normalizedValue].join("\u0000");
  return `hmac-sha256:${input.fraudKeyVersion}:${createHmac("sha256",input.fraudSecret).update(payload).digest("hex")}`;
}

export async function protectVehicleIdentifier(input: {
  readonly tenantId: string; readonly inventoryUnitId: string; readonly identifierType: SensitiveVehicleIdentifierType; readonly rawValue: string;
  readonly fingerprintSecret: Uint8Array; readonly fingerprintKeyVersion: string; readonly encryptionProvider: IdentifierEncryptionProvider;
}): Promise<ProtectedVehicleIdentifier> {
  const normalized = normalizeVehicleIdentifier(input.identifierType, input.rawValue);
  const context = Object.freeze({ tenantId: input.tenantId, inventoryUnitId: input.inventoryUnitId, identifierType: input.identifierType, schemaVersion: "v1" });
  const encrypted = await input.encryptionProvider.encrypt({ plaintext: new TextEncoder().encode(normalized), context });
  if (!encrypted.ciphertext || !encrypted.keyVersion) throw new Error("ENCRYPTION_PROVIDER_INVALID_RESPONSE");
  return Object.freeze({ version: "used-cars-protected-identifier/v1", tenantId: input.tenantId, inventoryUnitId: input.inventoryUnitId,
    identifierType: input.identifierType, ciphertext: encrypted.ciphertext, encryptionKeyVersion: encrypted.keyVersion,
    fingerprint: fingerprintVehicleIdentifier({ normalizedValue: normalized, tenantId: input.tenantId, identifierType: input.identifierType, fingerprintSecret: input.fingerprintSecret, fingerprintKeyVersion: input.fingerprintKeyVersion }),
    fingerprintKeyVersion: input.fingerprintKeyVersion, normalizedLength: normalized.length, publicDisplayAllowed: false });
}

export function projectIdentifierFreePublicReference(value: ProtectedVehicleIdentifier): { readonly inventoryUnitId: string; readonly identifierTypePresent: true } {
  return Object.freeze({ inventoryUnitId: value.inventoryUnitId, identifierTypePresent: true });
}
