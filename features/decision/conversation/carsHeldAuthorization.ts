import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import type { CarsConversationTrace, CarsRequirementKey } from "@/types/carsConversation";

export interface CarsHeldCandidateAuthorization {
  readonly conversationId: string;
  readonly runtimeVehicleCandidateId: string;
  readonly vehicleVariantId: string;
  readonly requirementFingerprint: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly offerStatus: "ACTIVE" | "DECLINED" | "REVEALED" | "INVALIDATED";
  readonly discriminatorChoiceId?: "MAX_SEATS" | "MAX_CARGO";
}

const HOLD_TTL_MS = 60 * 60_000;
const MATERIAL_KEYS: readonly CarsRequirementKey[] = ["MIN_SEATS", "MIN_CARGO_L"];

function holdKey(): Buffer {
  const configured = process.env.CARS_CONVERSATION_HOLD_SECRET?.trim()
    || process.env.OPENAI_API_KEY
    || "expiya-cars-held-authorization-dev";
  return createHash("sha256").update(configured).digest();
}

export function requirementFingerprint(trace: CarsConversationTrace): string {
  const material = trace.requirements
    .filter((entry) => MATERIAL_KEYS.includes(entry.key))
    .map((entry) => `${entry.key}:${entry.value}`)
    .sort();
  return createHash("sha256").update(material.join("|")).digest("hex");
}

export function sealHeldAuthorization(input: Omit<CarsHeldCandidateAuthorization, "issuedAt" | "expiresAt" | "offerStatus"> & {
  readonly offerStatus?: CarsHeldCandidateAuthorization["offerStatus"];
  readonly now?: number;
}): string {
  const now = input.now ?? Date.now();
  const payload: CarsHeldCandidateAuthorization = {
    conversationId: input.conversationId,
    runtimeVehicleCandidateId: input.runtimeVehicleCandidateId,
    vehicleVariantId: input.vehicleVariantId,
    requirementFingerprint: input.requirementFingerprint,
    discriminatorChoiceId: input.discriminatorChoiceId,
    issuedAt: now,
    expiresAt: now + HOLD_TTL_MS,
    offerStatus: input.offerStatus ?? "ACTIVE",
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", holdKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${encrypted.toString("base64url")}.${tag.toString("base64url")}`;
}

export function openHeldAuthorization(token: string | undefined): CarsHeldCandidateAuthorization | undefined {
  if (!token?.startsWith("v1.")) return undefined;
  const parts = token.split(".");
  if (parts.length !== 4) return undefined;
  try {
    const iv = Buffer.from(parts[1], "base64url");
    const encrypted = Buffer.from(parts[2], "base64url");
    const tag = Buffer.from(parts[3], "base64url");
    const decipher = createDecipheriv("aes-256-gcm", holdKey(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(json) as CarsHeldCandidateAuthorization;
    if (!parsed.conversationId || !parsed.runtimeVehicleCandidateId || !parsed.vehicleVariantId) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

export function resealHeldAuthorization(
  token: string | undefined,
  offerStatus: CarsHeldCandidateAuthorization["offerStatus"],
): string | undefined {
  const opened = openHeldAuthorization(token);
  if (!opened) return undefined;
  return sealHeldAuthorization({ ...opened, offerStatus, now: opened.issuedAt });
}

export function heldAuthorizationIsUsable(input: {
  readonly token: string | undefined;
  readonly conversationId: string;
  readonly memory: CarsConversationTrace;
  readonly now?: number;
  readonly requireActiveOffer?: boolean;
}): CarsHeldCandidateAuthorization | undefined {
  const opened = openHeldAuthorization(input.token);
  if (!opened) return undefined;
  if (opened.conversationId !== input.conversationId) return undefined;
  if ((input.now ?? Date.now()) > opened.expiresAt) return undefined;
  if (opened.offerStatus === "INVALIDATED" || opened.offerStatus === "REVEALED") return undefined;
  if (input.requireActiveOffer !== false && opened.offerStatus !== "ACTIVE") return undefined;
  if (opened.requirementFingerprint !== requirementFingerprint(input.memory)) return undefined;
  if (input.memory.rejectedRecommendationIds.includes(opened.runtimeVehicleCandidateId)
    || input.memory.rejectedRecommendationIds.includes(opened.vehicleVariantId)) {
    return undefined;
  }
  return opened;
}

export function tokenLeaksCandidateIdentity(token: string | undefined): boolean {
  if (!token) return false;
  return /RVC-|Hyundai|IONIQ|Toyota|Honda|brand|trim/i.test(token);
}
