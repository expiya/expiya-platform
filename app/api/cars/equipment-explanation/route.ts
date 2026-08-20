import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { initializeCarsDecisionV2DurableStore } from "@/features/decision/v2/integration/durableStoreInitialization.server";
import { canonicalize } from "@/features/decision/v2/fingerprint/canonicalize";
import { createHmacOfferSigner } from "@/features/decision/v2/offer/signer.server";
import { PostgresV2ConversationStore } from "@/features/decision/v2/persistence/postgresStore.server";
import { resolveEquipmentAuditAuthorization } from "@/features/vehicle-data/equipmentAuditAuthorizationResolver.server";
import { createEquipmentExplanationCtas, EQUIPMENT_EXPLANATION_ACTIONS, EQUIPMENT_EXPLANATION_FALLBACK, EQUIPMENT_EXPLANATION_SOLICITATION, explainEquipment } from "@/features/vehicle-data/equipmentPublicExplanationFacade.server";

export const runtime = "nodejs";

const requestSchema = z.object({ conversationId: z.string().min(1).max(100), offerToken: z.string().min(1).max(8_000), actionId: z.string().min(1).max(100),
  operation: z.enum(["OPEN_SOLICITATION", "ACCEPT", "DECLINE", "DIRECT_QUESTION"]), question: z.string().min(1).max(500).optional(), sessionToken: z.string().max(8_000).optional() }).strict();

type Session = Readonly<{ v: 1; conversationId: string; offerId: string; exactVariantId: string; actionId: string; expiresAt: string; noticeShown: boolean }>;
const encode = (value: string) => Buffer.from(value).toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");
function sessionCodec(secret: string, now: () => Date) {
  const sign = (payload: string) => createHmac("sha256", secret).update(`equipment-session|${payload}`).digest("base64url");
  return Object.freeze({
    create(value: Session) { const payload = encode(canonicalize(value)); return `epei1.${payload}.${sign(payload)}`; },
    verify(token: string | undefined): Session | null { try { if (!token) return null; const [version, payload, supplied] = token.split("."); if (version !== "epei1" || !payload || !supplied) return null; const expected = sign(payload); const left = Buffer.from(supplied); const right = Buffer.from(expected); if (left.length !== right.length || !timingSafeEqual(left, right)) return null; const value = JSON.parse(decode(payload)) as Session; return value.v === 1 && Date.parse(value.expiresAt) >= now().getTime() ? value : null; } catch { return null; } },
  });
}

type EquipmentRouteDependencies = Readonly<{ store: Pick<PostgresV2ConversationStore, "get" | "resolveRecommendationOfferAuditProof">; signer: ReturnType<typeof createHmacOfferSigner>; signingSecret: string; now: () => Date }>;

async function handleEquipmentExplanationRequest(raw: unknown, deps: EquipmentRouteDependencies): Promise<Response> {
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "INVALID_EQUIPMENT_EXPLANATION_REQUEST" }, { status: 400 });
  const input = parsed.data;
  const offerVerification = deps.signer.verify(input.offerToken);
  if (offerVerification.status !== "VALID" || offerVerification.conversationId !== input.conversationId) return Response.json({ error: "EQUIPMENT_EXPLANATION_AUTHORIZATION_FAILED", message: EQUIPMENT_EXPLANATION_FALLBACK }, { status: 409 });
  const resolved = await resolveEquipmentAuditAuthorization({ store: deps.store, signer: deps.signer, conversationId: input.conversationId, offerToken: input.offerToken, expectedCatalogFingerprint: offerVerification.catalogFingerprint });
  if (!resolved) return Response.json({ error: "EQUIPMENT_EXPLANATION_AUDIT_UNAVAILABLE", message: EQUIPMENT_EXPLANATION_FALLBACK }, { status: 409 });
  const exactVariantId = EQUIPMENT_EXPLANATION_ACTIONS[input.actionId as keyof typeof EQUIPMENT_EXPLANATION_ACTIONS];
  const actions = createEquipmentExplanationCtas({ conversationId: input.conversationId, offerId: resolved.offer.offerId, lifecycleState: resolved.offer.lifecycleState, revealedExactVariantIds: resolved.revealedCardExactVariantIds });
  if (!exactVariantId || !actions.some((item) => item.actionId === input.actionId && item.exactVariantId === exactVariantId)) return Response.json({ error: "EQUIPMENT_EXPLANATION_ACTION_NOT_AUTHORIZED", message: EQUIPMENT_EXPLANATION_FALLBACK }, { status: 409 });
  const codec = sessionCodec(deps.signingSecret, deps.now);
  const currentSession = codec.verify(input.sessionToken);
  if (input.operation === "OPEN_SOLICITATION") {
    const session: Session = { v: 1, conversationId: input.conversationId, offerId: resolved.offer.offerId, exactVariantId, actionId: input.actionId, expiresAt: resolved.offer.expiresAt, noticeShown: false };
    return Response.json({ message: EQUIPMENT_EXPLANATION_SOLICITATION, sessionToken: codec.create(session), options: [{ id: "ACCEPT", label: "Evet, anlat" }, { id: "DECLINE", label: "Şimdilik anlatma" }] });
  }
  if (!currentSession || currentSession.conversationId !== input.conversationId || currentSession.offerId !== resolved.offer.offerId || currentSession.exactVariantId !== exactVariantId || currentSession.actionId !== input.actionId) return Response.json({ error: "EQUIPMENT_EXPLANATION_SESSION_INVALID", message: EQUIPMENT_EXPLANATION_FALLBACK }, { status: 409 });
  if (input.operation === "DECLINE") return Response.json({ message: "Tamam; bu araç için donanım anlatımını şimdilik geçiyorum." });
  const modelYear = exactVariantId === "6cb56615-37ef-51a8-9202-a73e59d4e14b" ? 2025 : exactVariantId === "90e65f94-6fdb-5eea-ad7e-0b4e18435427" ? 2026 : null;
  if (!modelYear) return Response.json({ error: "EQUIPMENT_EXPLANATION_CONTEXT_UNAVAILABLE", message: EQUIPMENT_EXPLANATION_FALLBACK }, { status: 409 });
  const authorization = { ...resolved.audit, conversationId: input.conversationId, offerConsentCompleted: true, offer: { offerId: resolved.offer.offerId, conversationId: input.conversationId, lifecycleState: "REVEALED" as const,
    catalogFingerprint: resolved.offer.catalogFingerprint, candidateRefs: resolved.offer.candidateRefs.map(({ exactVariantId: id }) => ({ exactVariantId: id })), expiresAt: resolved.offer.expiresAt,
    revealAt: resolved.audit.revealAt, revealSequence: resolved.audit.revealSequence }, revealedCardExactVariantIds: resolved.revealedCardExactVariantIds, catalogFingerprint: resolved.offer.catalogFingerprint, now: deps.now().toISOString(), publicContext: { market: "Türkiye" as const, modelYear, source: "REVEALED_CARD" as const } };
  const result = explainEquipment({ actionId: input.actionId, authorization, session: { conversationId: input.conversationId, exactVariantId, offerId: resolved.offer.offerId, preference: "ACCEPTED", noticeShown: currentSession.noticeShown }, ...(input.operation === "DIRECT_QUESTION" ? { userQuestion: input.question } : {}) });
  if (!result.ok) return Response.json({ message: result.message, options: result.options, telemetry: result.telemetry }, { status: result.telemetry.outcome === "CLARIFICATION_REQUIRED" ? 200 : 409 });
  const nextToken = codec.create({ ...currentSession, noticeShown: true });
  return Response.json({ message: result.message, notice: result.notice, items: result.items, options: result.options, sessionToken: nextToken, telemetry: result.telemetry });
}

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  if (!requestSchema.safeParse(raw).success) return Response.json({ error: "INVALID_EQUIPMENT_EXPLANATION_REQUEST" }, { status: 400 });
  const signingSecret = process.env.CARS_DECISION_V2_SIGNING_SECRET;
  if (!signingSecret || Buffer.byteLength(signingSecret, "utf8") < 32) return Response.json({ error: "EQUIPMENT_EXPLANATION_NOT_ACTIVE", message: EQUIPMENT_EXPLANATION_FALLBACK }, { status: 409 });
  const database = await initializeCarsDecisionV2DurableStore({ environment: { DATABASE_URL: process.env.DATABASE_URL, DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX }, ...(process.env.CARS_DECISION_V2_DATABASE_ENV === "development" || process.env.CARS_DECISION_V2_DATABASE_ENV === "staging" ? { expectedDatabaseUrl: process.env.CARS_DECISION_V2_TEST_DATABASE_URL } : {}) });
  if (database.status !== "READY") return Response.json({ error: "EQUIPMENT_EXPLANATION_NOT_ACTIVE", message: EQUIPMENT_EXPLANATION_FALLBACK }, { status: 409 });
  const now = () => new Date();
  return handleEquipmentExplanationRequest(raw, { store: new PostgresV2ConversationStore(database.pool), signer: createHmacOfferSigner({ secret: signingSecret, now }), signingSecret, now });
}
