import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getRevealedV31Offer } from "@/features/decision/v3/offerGovernance.server";
import { unsealV31State } from "@/features/decision/v3/stateToken.server";
import { evaluateV3Catalog, v35EquipmentMatchAuthority } from "@/features/decision/v3/catalogAdapter.server";
import { projectV3DecisionPreferences } from "@/features/decision/v3/decisionInput";
import { publicPreferenceSummary } from "@/features/decision/v3/preferencePresentation";
import { activeDecisionPreferences } from "@/features/decision/v3/ledger";
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
  approvedNeeds: z.array(z.strictObject({ concept: z.string().min(1).max(100), summary: z.string().min(1).max(300) })).max(40), personaMatchSummary: z.array(z.string().min(1).max(300)).max(10), recommendationTerms: z.strictObject({ version: z.string().min(1).max(100), acceptedAt: z.string().datetime() }), decisionStateDigest: z.string().regex(/^[a-f0-9]{64}$/u), nonce: z.string().regex(/^[A-Za-z0-9_-]{16,80}$/u), issuedAt: z.string().datetime(), expiresAt: z.string().datetime(),
});

export const publicSummary = (event: PreferenceEvent): string => publicPreferenceSummary(event);

const LEGACY_HARD_CONCEPTS = new Set(["primaryUsage", "bodyStyle", "fuelType", "transmission", "minimumSeats", "budgetMax", "brandPreference", "modelPreference", "equipmentFeature", "minimumElectricRange"]);
const dedupeNeeds = (needs: readonly { readonly concept: string; readonly summary: string }[]) => {
  const latest = new Map<string, { readonly concept: string; readonly summary: string }>();
  for (const need of needs) if (LEGACY_HARD_CONCEPTS.has(need.concept)) latest.set(need.concept === "equipmentFeature" ? `${need.concept}:${need.summary}` : need.concept, need);
  return [...latest.values()];
};
export const approvedNeedsForPhase2 = (state: V3ConversationState, appliedEquipment: readonly PreferenceEvent[] = []) => {
  const projected = projectV3DecisionPreferences(state.ledger, state.budgetMode ?? "NEEDS_ONLY");
  const appliedEquipmentIds = new Set(appliedEquipment.map((item) => item.id));
  const equipment = activeDecisionPreferences(state.ledger).filter((item) => item.field === "equipmentFeature" && item.decisionUse === "HARD_FILTER" && appliedEquipmentIds.has(item.id));
  return dedupeNeeds([...projected, ...equipment]
    .filter((item) => item.decisionUse === "HARD_FILTER" && ["USER_EXPLICIT", "USER_CONFIRMED"].includes(item.authority))
    .map((item) => ({ concept: item.concept, summary: publicSummary(item) })));
};
const decisionFingerprint = (state: V3ConversationState) => digest(projectV3DecisionPreferences(state.ledger, state.budgetMode ?? "NEEDS_ONLY").map(({ concept, normalizedValue, decisionUse }) => ({ concept, normalizedValue, decisionUse })));

export async function createPhase2Handoff(input: { conversationId: string; stateToken?: string; offerId: string; selectedExactVariantId: string; now?: Date }): Promise<{ token: string; exactVariantId: string }> {
  const state = unsealV31State(input.stateToken, input.conversationId);
  const offer = await getRevealedV31Offer(input.offerId);
  if (!state || !offer || offer.conversationId !== input.conversationId) throw new TypeError("PHASE2_HANDOFF_NOT_REVEALED");
  if (state.recommendationTermsAcceptance?.offerId !== offer.offerId || !offer.candidateRefs.some((item) => item.exactVariantId === input.selectedExactVariantId)) throw new TypeError("PHASE2_HANDOFF_BINDING_INVALID");
  if (decisionFingerprint(state) !== offer.decisionFingerprint) throw new TypeError("PHASE2_DECISION_FINGERPRINT_CHANGED");
  const catalog = await evaluateV3Catalog(state.ledger, input.now, state.budgetMode ?? "NEEDS_ONLY");
  if (catalog.catalogReleaseVersion !== offer.catalogReleaseVersion || catalog.catalogFingerprint !== offer.catalogFingerprint) throw new TypeError("PHASE2_CATALOG_STALE");
  const selectedVariant = catalog.variants.find((variant) => variant.id === input.selectedExactVariantId);
  if (!selectedVariant) throw new TypeError("PHASE2_VARIANT_STALE");
  const key = `${offer.offerId}:${input.selectedExactVariantId}:${state.revision}`;
  const replay = cache.get(key); if (replay) return { token: replay, exactVariantId: input.selectedExactVariantId };
  const issued = input.now ?? new Date();
  const positiveEquipment = catalog.appliedEquipment.filter((item) => v35EquipmentMatchAuthority(selectedVariant, String(item.normalizedValue)) === "VERIFIED");
  const payload: Phase2HandoffPayload = { version: SALES_ADVISOR_VERSION, conversationId: state.conversationId, decisionFingerprint: offer.decisionFingerprint, offerId: offer.offerId, selectedExactVariantId: input.selectedExactVariantId, catalogRelease: offer.catalogReleaseVersion, catalogFingerprint: offer.catalogFingerprint, approvedNeeds: approvedNeedsForPhase2(state, positiveEquipment), personaMatchSummary: ["Seçilen varyant, Aşama 1'deki onaylı tercih bağlamıyla eşleşti."], recommendationTerms: { version: state.recommendationTermsAcceptance.version, acceptedAt: state.recommendationTermsAcceptance.acceptedAt }, decisionStateDigest: digest(state), nonce: randomBytes(18).toString("base64url"), issuedAt: issued.toISOString(), expiresAt: new Date(issued.getTime() + 24 * 60 * 60_000).toISOString() };
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
  const offer = await getRevealedV31Offer(payload.offerId);
  if (!offer || offer.conversationId !== payload.conversationId || offer.decisionFingerprint !== payload.decisionFingerprint || !offer.candidateRefs.some((item) => item.exactVariantId === payload.selectedExactVariantId)) throw new TypeError("PHASE2_HANDOFF_REVOKED");
  const catalog = await evaluateV3Catalog([], now);
  if (catalog.catalogReleaseVersion !== payload.catalogRelease || catalog.catalogFingerprint !== payload.catalogFingerprint) throw new TypeError("PHASE2_CATALOG_STALE");
  const variant = catalog.variants.find((item) => item.id === payload.selectedExactVariantId);
  if (!variant) throw new TypeError("PHASE2_VARIANT_STALE");
  const artifact = buildVariantContentArtifact({ variant, catalogRelease: catalog.catalogReleaseVersion, catalogFingerprint: catalog.catalogFingerprint, peerVariants: catalog.variants });
  validateVariantContentArtifact(artifact, { exactVariantId: payload.selectedExactVariantId, catalogRelease: payload.catalogRelease, catalogFingerprint: payload.catalogFingerprint });
  return { handoff: { ...payload, approvedNeeds: dedupeNeeds(payload.approvedNeeds) }, artifact };
}

export type Phase3Intent = "REQUEST_QUOTE" | "REQUEST_TEST_DRIVE" | "REQUEST_DEALER_CONTACT";
export type Phase3IntentPayload = {
  readonly version: "phase3-intent/v1"; readonly conversationId: string; readonly decisionFingerprint: string;
  readonly offerId: string; readonly selectedExactVariantId: string; readonly catalogRelease: string;
  readonly intent: Phase3Intent; readonly nonce: string; readonly issuedAt: string; readonly expiresAt: string; readonly executionAuthorized: false;
  readonly approvedNeeds: readonly { readonly concept: string; readonly summary: string }[];
};
const phase3IntentPayloadSchema = z.strictObject({ version: z.literal("phase3-intent/v1"), conversationId: z.string().min(1).max(200), decisionFingerprint: z.string().regex(/^[a-f0-9]{64}$/u), offerId: z.string().min(1).max(200), selectedExactVariantId: z.string().min(1).max(300), catalogRelease: z.string().min(1).max(100), intent: z.enum(["REQUEST_QUOTE", "REQUEST_TEST_DRIVE", "REQUEST_DEALER_CONTACT"]), nonce: z.string().regex(/^[A-Za-z0-9_-]{16,80}$/u), issuedAt: z.string().datetime(), expiresAt: z.string().datetime(), executionAuthorized: z.literal(false), approvedNeeds: z.array(z.strictObject({ concept: z.string().min(1).max(100), summary: z.string().min(1).max(300) })).max(40) });
export async function createPhase3IntentHandoff(input: { phase2Token: string; intent: Phase3Intent; now?: Date }) {
  const opened = await openPhase2Experience(input.phase2Token, input.now);
  const issuedAt = input.now ?? new Date();
  const payload: Phase3IntentPayload = { version: "phase3-intent/v1", conversationId: opened.handoff.conversationId, decisionFingerprint: opened.handoff.decisionFingerprint, offerId: opened.handoff.offerId, selectedExactVariantId: opened.handoff.selectedExactVariantId, catalogRelease: opened.handoff.catalogRelease, intent: input.intent, nonce: randomBytes(18).toString("base64url"), issuedAt: issuedAt.toISOString(), expiresAt: new Date(issuedAt.getTime() + 30 * 60_000).toISOString(), executionAuthorized: false, approvedNeeds: opened.handoff.approvedNeeds };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { status: "HANDOFF_READY" as const, intent: input.intent, token: `p3.${encoded}.${sign(encoded)}`, executionAuthorized: false as const };
}

export async function openPhase3IntentHandoff(token: string, expectedIntent?: Phase3Intent, now = new Date()) {
  const [version, encoded, supplied] = token.split(".");
  if (version !== "p3" || !encoded || !supplied || token.split(".").length !== 3 || encoded.length > 64_000) throw new TypeError("PHASE3_HANDOFF_INVALID");
  const expected = sign(encoded); const left = Buffer.from(supplied); const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new TypeError("PHASE3_HANDOFF_TAMPERED");
  const payload = phase3IntentPayloadSchema.parse(JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")));
  const issuedAt = Date.parse(payload.issuedAt); const expiresAt = Date.parse(payload.expiresAt);
  if (expiresAt <= now.getTime() || issuedAt > now.getTime() + 60_000 || expiresAt - issuedAt > 30 * 60_000) throw new TypeError("PHASE3_HANDOFF_STALE");
  if (expectedIntent && payload.intent !== expectedIntent) throw new TypeError("PHASE3_INTENT_MISMATCH");
  const offer = await getRevealedV31Offer(payload.offerId);
  if (!offer || offer.conversationId !== payload.conversationId || offer.decisionFingerprint !== payload.decisionFingerprint || offer.catalogReleaseVersion !== payload.catalogRelease || !offer.candidateRefs.some((item) => item.exactVariantId === payload.selectedExactVariantId)) throw new TypeError("PHASE3_HANDOFF_REVOKED");
  const catalog = await evaluateV3Catalog([], now);
  if (catalog.catalogReleaseVersion !== payload.catalogRelease) throw new TypeError("PHASE3_CATALOG_STALE");
  const variant = catalog.variants.find((item) => item.id === payload.selectedExactVariantId);
  if (!variant) throw new TypeError("PHASE3_VARIANT_STALE");
  const artifact = buildVariantContentArtifact({ variant, catalogRelease: catalog.catalogReleaseVersion, catalogFingerprint: catalog.catalogFingerprint, peerVariants: catalog.variants });
  return { handoff: payload, artifact };
}

export function resetPhase2HandoffsForTests() { cache.clear(); }
