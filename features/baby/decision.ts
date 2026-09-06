import { createHash } from "node:crypto";
import { STROLLER_PRODUCTS } from "./catalog";
import { STROLLER_AUTHORITY_DIGEST } from "./domainPack";
import type { StrollerNeed, StrollerProduct } from "./contracts";

export type StrollerPreferences = Partial<Record<StrollerNeed, string | number | boolean>>;
const knownTrue = (value: unknown) => value === true;
export function selectStrollers(preferences: StrollerPreferences) {
  let candidates = [...STROLLER_PRODUCTS];
  const retainUnknown = <T>(read: (p: StrollerProduct) => T | "UNKNOWN", accept: (v: T) => boolean) => { candidates = candidates.filter(p => { const value = read(p); return value === "UNKNOWN" || accept(value as T); }); };
  if (preferences.NEWBORN === true) retainUnknown(p => p.facts.newbornUse, v => v !== "NOT_DECLARED");
  if (preferences.CARRY_WEIGHT === "LIGHT") retainUnknown(p => p.facts.strollerWeightKg, v => Number(v) <= 8);
  if (preferences.CABIN_TRAVEL === true) retainUnknown(p => p.facts.cabinSizeClaim, knownTrue);
  if (preferences.SEAT_DIRECTION === "PARENT_FACING") retainUnknown(p => p.facts.reversibleSeat, knownTrue);
  if (preferences.TRAVEL_SYSTEM === true) retainUnknown(p => p.facts.travelSystemCompatible, knownTrue);
  if (typeof preferences.USE_STAGE === "number") retainUnknown(p => p.facts.childWeightMaxKg, v => Number(v) >= Number(preferences.USE_STAGE));
  return Object.freeze(candidates.sort((a, b) => a.exactProductId.localeCompare(b.exactProductId)));
}
export function authorizeStrollerCard(product: StrollerProduct, preferences: StrollerPreferences, revision: number) {
  const authority = { departmentId: "BABY_AND_CHILD", categoryId: "STROLLER", exactProductId: product.exactProductId, configurationIdentity: product.configurationIdentity, contextRevision: revision, catalogDigest: STROLLER_AUTHORITY_DIGEST } as const;
  const authorizationFingerprint = `sha256:${createHash("sha256").update(JSON.stringify({ authority, preferences })).digest("hex")}`;
  return { ...authority, authorizationFingerprint, manufacturer: product.manufacturer, model: product.model, facts: product.facts, included: product.included, separatelySold: product.separatelySold, limitations: ["Eksik bilgi bilinmiyor olarak korunur.", "Azami ağırlık gelişimsel uygunluk garantisi değildir.", "Kabin boyutu iddiası olsa bile son karar havayolunundur."] } as const;
}
