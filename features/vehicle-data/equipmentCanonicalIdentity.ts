import { createHash } from "node:crypto";

export const EQUIPMENT_CANONICAL_IDENTITY_POLICY_VERSION = "1.0.0" as const;
const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase("tr-TR").replaceAll(/[^\p{L}\p{N}]+/gu, " ").trim().replaceAll(/\s+/gu, " ");
const digest = (parts: readonly string[]) => createHash("sha256").update(parts.map(normalize).join("\u001f")).digest("hex").slice(0, 20);

export function createCanonicalTrimId(input: { market: string; brand: string; modelFamily: string; modelYear: number; trimName: string; configurationIdentity?: string }): string {
  return `trim-${digest([input.market, input.brand, input.modelFamily, String(input.modelYear), input.trimName, input.configurationIdentity ?? "-"])}`;
}

export function createCanonicalPackageId(input: { market: string; brand: string; modelFamily: string; modelYearFrom: number; modelYearTo: number; packageName: string; revision?: string }): string {
  return `package-${digest([input.market, input.brand, input.modelFamily, String(input.modelYearFrom), String(input.modelYearTo), input.packageName, input.revision ?? "-"])}`;
}
