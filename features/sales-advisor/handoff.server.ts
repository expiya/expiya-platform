import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getRevealedV31Offer } from "@/features/decision/v3/offerGovernance.server";
import { unsealV31State } from "@/features/decision/v3/stateToken.server";
import { evaluateV3Catalog } from "@/features/decision/v3/catalogAdapter.server";
import { projectV3DecisionPreferences } from "@/features/decision/v3/decisionInput";
import type { PreferenceEvent, V3ConversationState } from "@/features/decision/v3/types";
import { buildVariantContentArtifact, validateVariantContentArtifact } from "./artifact.server";
import { SALES_ADVISOR_VERSION, type Phase2HandoffPayload } from "./types";
import { z } from "zod";

const localSecret = randomBytes(32).toString("hex");
const signingSecret = () => {
  const configured = process.env.CARS_DECISION_V2_SIGNING_SECRET || process.env.CARS_PILOT_SESSION_SECRET;
  if (!configured && (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production")) throw new TypeError("PHASE2_SIGNING_KEY_UNAVAILABLE");
  return configured || localSecret;
};
const sign = (payload: string) => createHmac("sha256", signingSecret()).update(payload).digest("base64url");
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const cache = new Map<string, string>();
const MAX_HANDOFF_CACHE = 5_000;

const handoffPayloadSchema = z.strictObject({
  version: z.literal(SALES_ADVISOR_VERSION), conversationId: z.string().min(1).max(200), decisionFingerprint: z.string().regex(/^[a-f0-9]{64}$/u), offerId: z.string().min(1).max(200), selectedExactVariantId: z.string().min(1).max(300), catalogRelease: z.string().min(1).max(100), catalogFingerprint: z.string().min(1).max(120),
  approvedNeeds: z.array(z.strictObject({ concept: z.string().min(1).max(100), summary: z.string().min(1).max(300), value: z.union([z.string().max(200), z.number().finite(), z.array(z.string().max(200)).max(20)]).optional() })).max(40), personaMatchSummary: z.array(z.string().min(1).max(300)).max(10), recommendationTerms: z.strictObject({ version: z.string().min(1).max(100), acceptedAt: z.string().datetime() }), decisionStateDigest: z.string().regex(/^[a-f0-9]{64}$/u), nonce: z.string().regex(/^[A-Za-z0-9_-]{16,80}$/u), issuedAt: z.string().datetime(), expiresAt: z.string().datetime(),
});

const publicValues: Readonly<Record<string, string>> = {
  URBAN_DAILY: "şehir içi günlük kullanım", FAMILY: "aile kullanımı", LONG_DISTANCE: "uzun yol", COMMERCIAL: "ticari kullanım", CORPORATE_TRAVEL: "kurumsal seyahat", MIXED_ROAD: "karma yol kullanımı",
  HATCHBACK: "kompakt hatchback", SUV: "SUV", SEDAN: "sedan", PICKUP: "pick-up", VAN: "van / panelvan",
  BEV: "tam elektrikli", HEV: "hibrit", PHEV: "şarj edilebilir hibrit", MHEV: "hafif hibrit", GASOLINE: "benzinli", DIESEL: "dizel", LPG: "LPG",
  NOT_IMPORTANT: "bu başlık karar için önemli değil", REAR_VIEW_CAMERA: "geri görüş kamerası", SURROUND_VIEW_CAMERA_360: "360° çevre görüş kamerası", PARKING_SENSORS: "park sensörleri", ADAPTIVE_CRUISE_CONTROL: "adaptif hız sabitleyici", BLIND_SPOT_MONITOR: "kör nokta izleme",
  AUTOMATIC: "otomatik", MANUAL: "manuel", MINIMAL: "başka bir donanım zorunlu değil",
};
const formatPublicValue = (value: string | number | readonly string[]) => Array.isArray(value) ? value.map((item) => publicValues[String(item)] ?? String(item)).join(", ") : publicValues[String(value)] ?? String(value);

export const publicSummary = (event: PreferenceEvent): string => {
  const value = formatPublicValue(event.normalizedValue);
  const labels: Record<string, string> = { primaryUsage: "Ana kullanım", bodyStyle: "Gövde tercihi", fuelType: "Yakıt tercihi", transmission: "Şanzıman tercihi", minimumSeats: "Kullanım kapasitesi", equipmentNotImportant: "Ek donanım şartı", budgetMax: "Kesin bütçe üst sınırı", budgetTarget: "Hedef bütçe", budgetNotImportant: "Bütçe yaklaşımı", brandPreference: "Marka tercihi", modelPreference: "Model tercihi", equipmentFeature: "Donanım ihtiyacı" };
  if (event.concept === "minimumSeats" && typeof event.normalizedValue === "number") return `Kullanım kapasitesi: en az ${event.normalizedValue} kişi`;
  return `${labels[event.concept] ?? "Onaylı tercih"}: ${value}`;
};

const approvedNeeds = (state: V3ConversationState) => state.ledger.filter((item) => item.status === "ACTIVE" && ["USER_EXPLICIT", "USER_CONFIRMED"].includes(item.authority) && ["EXPLICIT_HARD", "EXPLICIT_STRONG", "CONFIRMED_STRONG"].includes(item.strength)).map((item) => ({ concept: item.concept, summary: publicSummary(item), value: item.normalizedValue }));
const decisionFingerprint = (state: V3ConversationState) => digest(projectV3DecisionPreferences(state.ledger, state.budgetMode ?? "NEEDS_ONLY").map(({ concept, normalizedValue, decisionUse }) => ({ concept, normalizedValue, decisionUse })));

export async function createPhase2Handoff(input: { conversationId: string; stateToken?: string; offerId: string; selectedExactVariantId: string; now?: Date }): Promise<{ token: string; exactVariantId: string }> {
  const state = unsealV31State(input.stateToken, input.conversationId);
  const offer = getRevealedV31Offer(input.offerId);
  if (!state || !offer || offer.conversationId !== input.conversationId) throw new TypeError("PHASE2_HANDOFF_NOT_REVEALED");
  if (state.recommendationTermsAcceptance?.offerId !== offer.offerId || !offer.candidateRefs.some((item) => item.exactVariantId === input.selectedExactVariantId)) throw new TypeError("PHASE2_HANDOFF_BINDING_INVALID");
  if (decisionFingerprint(state) !== offer.decisionFingerprint) throw new TypeError("PHASE2_DECISION_FINGERPRINT_CHANGED");
  const catalog = await evaluateV3Catalog([], input.now);
  if (catalog.catalogReleaseVersion !== offer.catalogReleaseVersion || catalog.catalogFingerprint !== offer.catalogFingerprint) throw new TypeError("PHASE2_CATALOG_STALE");
  if (!catalog.variants.some((variant) => variant.id === input.selectedExactVariantId)) throw new TypeError("PHASE2_VARIANT_STALE");
  const key = `${offer.offerId}:${input.selectedExactVariantId}:${state.revision}`;
  const replay = cache.get(key); if (replay) return { token: replay, exactVariantId: input.selectedExactVariantId };
  const issued = input.now ?? new Date();
  const payload: Phase2HandoffPayload = { version: SALES_ADVISOR_VERSION, conversationId: state.conversationId, decisionFingerprint: offer.decisionFingerprint, offerId: offer.offerId, selectedExactVariantId: input.selectedExactVariantId, catalogRelease: offer.catalogReleaseVersion, catalogFingerprint: offer.catalogFingerprint, approvedNeeds: approvedNeeds(state), personaMatchSummary: ["Seçilen varyant, Aşama 1'deki onaylı tercih bağlamıyla eşleşti."], recommendationTerms: { version: state.recommendationTermsAcceptance.version, acceptedAt: state.recommendationTermsAcceptance.acceptedAt }, decisionStateDigest: digest(state), nonce: randomBytes(18).toString("base64url"), issuedAt: issued.toISOString(), expiresAt: new Date(issued.getTime() + 24 * 60 * 60_000).toISOString() };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url"); const token = `p2.${encoded}.${sign(encoded)}`; cache.set(key, token); while (cache.size > MAX_HANDOFF_CACHE) cache.delete(cache.keys().next().value!);
  return { token, exactVariantId: input.selectedExactVariantId };
}

export async function openPhase2Experience(token: string, now = new Date()) {
  const [version, encoded, supplied] = token.split(".");
  if (version !== "p2" || !encoded || !supplied || token.split(".").length !== 3 || encoded.length > 64_000) throw new TypeError("PHASE2_HANDOFF_INVALID");
  const expected = sign(encoded); const left = Buffer.from(supplied); const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new TypeError("PHASE2_HANDOFF_TAMPERED");
  const payload = handoffPayloadSchema.parse(JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")));
  const issuedAt = Date.parse(payload.issuedAt); const expiresAt = Date.parse(payload.expiresAt);
  if (expiresAt <= now.getTime() || issuedAt > now.getTime() + 60_000 || expiresAt - issuedAt > 24 * 60 * 60_000) throw new TypeError("PHASE2_HANDOFF_STALE");
  const offer = getRevealedV31Offer(payload.offerId);
  if (!offer || offer.conversationId !== payload.conversationId || offer.decisionFingerprint !== payload.decisionFingerprint || !offer.candidateRefs.some((item) => item.exactVariantId === payload.selectedExactVariantId)) throw new TypeError("PHASE2_HANDOFF_REVOKED");
  const catalog = await evaluateV3Catalog([], now);
  if (catalog.catalogReleaseVersion !== payload.catalogRelease || catalog.catalogFingerprint !== payload.catalogFingerprint) throw new TypeError("PHASE2_CATALOG_STALE");
  const variant = catalog.variants.find((item) => item.id === payload.selectedExactVariantId);
  if (!variant) throw new TypeError("PHASE2_VARIANT_STALE");
  const artifact = buildVariantContentArtifact({ variant, catalogRelease: catalog.catalogReleaseVersion, catalogFingerprint: catalog.catalogFingerprint });
  validateVariantContentArtifact(artifact, { exactVariantId: payload.selectedExactVariantId, catalogRelease: payload.catalogRelease, catalogFingerprint: payload.catalogFingerprint });
  return { handoff: payload, artifact };
}

export type Phase3Intent = "REQUEST_QUOTE" | "REQUEST_TEST_DRIVE" | "REQUEST_DEALER_CONTACT";
export type Phase3IntentPayload = {
  readonly version: "phase3-intent/v1"; readonly conversationId: string; readonly decisionFingerprint: string;
  readonly offerId: string; readonly selectedExactVariantId: string; readonly catalogRelease: string;
  readonly intent: Phase3Intent; readonly nonce: string; readonly issuedAt: string; readonly expiresAt: string; readonly executionAuthorized: false;
  readonly approvedNeeds: Phase2HandoffPayload["approvedNeeds"];
};
const phase3IntentPayloadSchema = z.strictObject({ version: z.literal("phase3-intent/v1"), conversationId: z.string().min(1).max(200), decisionFingerprint: z.string().regex(/^[a-f0-9]{64}$/u), offerId: z.string().min(1).max(200), selectedExactVariantId: z.string().min(1).max(300), catalogRelease: z.string().min(1).max(100), intent: z.enum(["REQUEST_QUOTE", "REQUEST_TEST_DRIVE", "REQUEST_DEALER_CONTACT"]), nonce: z.string().regex(/^[A-Za-z0-9_-]{16,80}$/u), issuedAt: z.string().datetime(), expiresAt: z.string().datetime(), executionAuthorized: z.literal(false), approvedNeeds: handoffPayloadSchema.shape.approvedNeeds });
export async function createPhase3IntentHandoff(input: { phase2Token: string; intent: Phase3Intent; now?: Date }) {
  const opened = await openPhase2Experience(input.phase2Token, input.now);
  const issuedAt = input.now ?? new Date();
  const payload: Phase3IntentPayload = { version: "phase3-intent/v1", conversationId: opened.handoff.conversationId, decisionFingerprint: opened.handoff.decisionFingerprint, offerId: opened.handoff.offerId, selectedExactVariantId: opened.handoff.selectedExactVariantId, catalogRelease: opened.handoff.catalogRelease, intent: input.intent, nonce: randomBytes(18).toString("base64url"), issuedAt: issuedAt.toISOString(), expiresAt: new Date(issuedAt.getTime() + 30 * 60_000).toISOString(), executionAuthorized: false, approvedNeeds: opened.handoff.approvedNeeds };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { status: "HANDOFF_READY" as const, intent: input.intent, token: `p3.${encoded}.${sign(encoded)}`, executionAuthorized: false as const };
}

export async function openPhase3IntentHandoff(token: string, expectedIntent?: Phase3Intent, now = new Date()) {
  if (token.startsWith("p3r_")) {
    const [{ PostgresPaidReportSalesHandoffRepository }, { getPostgresDatabase }] = await Promise.all([
      import("@/features/paid-comparison/salesHandoff.server"), import("@/lib/server/postgres"),
    ]);
    return new PostgresPaidReportSalesHandoffRepository(getPostgresDatabase()).open(token, expectedIntent, now);
  }
  const [version, encoded, supplied] = token.split(".");
  if (version !== "p3" || !encoded || !supplied || token.split(".").length !== 3 || encoded.length > 64_000) throw new TypeError("PHASE3_HANDOFF_INVALID");
  const expected = sign(encoded); const left = Buffer.from(supplied); const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new TypeError("PHASE3_HANDOFF_TAMPERED");
  const payload = phase3IntentPayloadSchema.parse(JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")));
  const issuedAt = Date.parse(payload.issuedAt); const expiresAt = Date.parse(payload.expiresAt);
  if (expiresAt <= now.getTime() || issuedAt > now.getTime() + 60_000 || expiresAt - issuedAt > 30 * 60_000) throw new TypeError("PHASE3_HANDOFF_STALE");
  if (expectedIntent && payload.intent !== expectedIntent) throw new TypeError("PHASE3_INTENT_MISMATCH");
  const offer = getRevealedV31Offer(payload.offerId);
  if (!offer || offer.conversationId !== payload.conversationId || offer.decisionFingerprint !== payload.decisionFingerprint || offer.catalogReleaseVersion !== payload.catalogRelease || !offer.candidateRefs.some((item) => item.exactVariantId === payload.selectedExactVariantId)) throw new TypeError("PHASE3_HANDOFF_REVOKED");
  const catalog = await evaluateV3Catalog([], now);
  if (catalog.catalogReleaseVersion !== payload.catalogRelease) throw new TypeError("PHASE3_CATALOG_STALE");
  const variant = catalog.variants.find((item) => item.id === payload.selectedExactVariantId);
  if (!variant) throw new TypeError("PHASE3_VARIANT_STALE");
  const artifact = buildVariantContentArtifact({ variant, catalogRelease: catalog.catalogReleaseVersion, catalogFingerprint: catalog.catalogFingerprint });
  return { handoff: payload, artifact };
}

export function resetPhase2HandoffsForTests() { cache.clear(); }
