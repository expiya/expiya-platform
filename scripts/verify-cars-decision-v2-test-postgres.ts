import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";

import { CARS_MEMORY_FINGERPRINT_POLICY_V1 } from "../features/decision/v2/fingerprint/policy";
import { replayConversationMemoryV2 } from "../features/decision/v2/memory/reducer";
import { authorizePersistedCards } from "../features/decision/v2/offer/authorize";
import { createHmacOfferSigner } from "../features/decision/v2/offer/signer.server";
import type { PersistedGovernedOffer } from "../features/decision/v2/offer/types";
import type { DecisionTurnV2Output, StoredV2Conversation } from "../features/decision/v2/orchestrator/types";
import { PostgresV2ConversationStore } from "../features/decision/v2/persistence/postgresStore.server";

const testUrl = process.env.CARS_DECISION_V2_TEST_DATABASE_URL;
const environment = process.env.CARS_DECISION_V2_DATABASE_ENV;
if (!testUrl || !["development", "staging"].includes(environment ?? "")) throw new Error("SAFE_TEST_DATABASE_ENV_REQUIRED");
if (testUrl === process.env.DATABASE_URL) throw new Error("TEST_DATABASE_MUST_DIFFER_FROM_DEFAULT");

const pool = new Pool({ connectionString: testUrl, max: 4, application_name: "cars-v2-pre-manual-gate" });
const prefix = `v2gate_${randomUUID().replaceAll("-", "")}`;
const conversationIds = [`${prefix}_main`, `${prefix}_fault`] as const;
const authority = { market: "TR" as const, releaseVersion: "0.55.1", catalogFingerprint: "catalog-test", manifestFingerprint: "manifest-test", activatedAt: "2026-08-16T00:00:00.000Z" };
const event = (conversationId: string, id: string, sourceTurn = 1, sequence = 0) => ({ schemaVersion: 1 as const, conversationId, id, sourceMessageId: `m${sourceTurn}`, sourceTurn, sequence, createdAt: "2026-08-16T00:00:00.000Z", eventType: "VEHICLE_INTENT_ESTABLISHED" as const });
const memory = (conversationId: string, events: readonly ReturnType<typeof event>[]) => replayConversationMemoryV2({ conversationId, events, catalogAuthority: authority, fingerprintPolicy: CARS_MEMORY_FINGERPRINT_POLICY_V1 });
const output = (conversationId: string, revision: number): DecisionTurnV2Output => ({ conversationId, revision, state: "READY", message: "ok", options: [], cards: [] });

async function main() {
try {
  const store = new PostgresV2ConversationStore(pool);
  const firstEvent = event(conversationIds[0], `${prefix}_e1`);
  const firstMemory = memory(conversationIds[0], [firstEvent]);
  const offer: PersistedGovernedOffer = { offerId: `${prefix}_offer`, conversationId: conversationIds[0], candidateRefs: [{ exactVariantId: "variant-test", modelFamilyId: "family-test", finalDisposition: "FULLY_ELIGIBLE_VERIFIED_PRICE", rankingOrdinal: 1, caveatFactIds: [], priceRealizationPermission: "EXACT_PUBLIC_PRICE_ALLOWED" }], mode: "SINGLE_REQUESTED", catalogReleaseVersion: "0.55.1", catalogFingerprint: firstMemory.catalogAuthority.catalogFingerprint, decisionFingerprint: firstMemory.decisionFingerprint, lifecycleState: "CREATED", createdAt: "2026-08-16T00:00:00.000Z", expiresAt: "2026-08-16T01:00:00.000Z", authorizationVersion: "1.0.0", nonce: `${prefix}_nonce` };
  const firstOutput = output(conversationIds[0], 1);
  const first = await store.commit({ expectedRevision: 0, next: { conversationId: conversationIds[0], revision: 1, memory: firstMemory, messageResults: { m1: { payloadHash: "p1", output: firstOutput } } }, events: [firstEvent], offer });
  const loaded = (await store.load(conversationIds[0]))!;
  const secondEvent = event(conversationIds[0], `${prefix}_e2`, 2);
  const secondMemory = memory(conversationIds[0], [firstEvent, secondEvent]);
  const next = (messageId: string): StoredV2Conversation => ({ conversationId: conversationIds[0], revision: 2, memory: secondMemory, messageResults: { ...loaded.messageResults, [messageId]: { payloadHash: messageId, output: output(conversationIds[0], 2) } } });
  const race = await Promise.all([store.commit({ expectedRevision: 1, next: next("m2a"), events: [secondEvent] }), store.commit({ expectedRevision: 1, next: next("m2b"), events: [{ ...secondEvent, id: `${prefix}_e2b`, sourceMessageId: "m2b" }] })]);
  let faultRollback = false;
  try { const duplicate = event(conversationIds[1], `${prefix}_duplicate`); await store.commit({ expectedRevision: 0, next: { conversationId: conversationIds[1], revision: 1, memory: memory(conversationIds[1], [duplicate]), messageResults: {} }, events: [duplicate, duplicate] }); } catch { const check = await pool.query("select count(*)::int n from cars_decision_v2_conversations where conversation_id=$1", [conversationIds[1]]); faultRollback = check.rows[0]?.n === 0; }
  const revision = (await store.load(conversationIds[0]))!.revision;
  const thirdEvent = event(conversationIds[0], `${prefix}_e3`, 3);
  const thirdMemory = memory(conversationIds[0], [firstEvent, secondEvent, thirdEvent]);
  const beforeAtomic = (await store.load(conversationIds[0]))!;
  const auditTransition = (idempotencyKey: string) => ({ kind: "ACCEPT_RECOMMENDATION_TERMS_AND_REVEAL" as const, offerId: offer.offerId, conversationId: conversationIds[0], to: "REVEALED" as const, recommendationTermsVersion: "REC-2026.08-v1.1" as const, acceptedAt: "2026-08-16T00:10:59.999Z", revealedAt: "2026-08-16T00:11:00.000Z", acceptanceSequence: 1 as const, revealSequence: 2 as const, idempotencyKey, offerIdentityFingerprint: `sha256:${"0".repeat(64)}` as const });
  let transitionRollback = false;
  try {
    await store.commit({
      expectedRevision: revision,
      next: { conversationId: conversationIds[0], revision: revision + 1, memory: thirdMemory, messageResults: { ...beforeAtomic.messageResults, consent: { payloadHash: "consent", output: output(conversationIds[0], revision + 1) } } },
      events: [thirdEvent, thirdEvent],
      offerTransition: auditTransition("rollback"),
    });
  } catch {
    const afterFaultOffer = await store.get(offer.offerId);
    const afterFaultConversation = await store.load(conversationIds[0]);
    transitionRollback = afterFaultOffer?.lifecycleState === "CREATED" && afterFaultConversation?.revision === revision && !afterFaultConversation.messageResults.consent;
  }
  const atomicNext = (messageId: string): StoredV2Conversation => ({ conversationId: conversationIds[0], revision: revision + 1, memory: thirdMemory, messageResults: { ...beforeAtomic.messageResults, [messageId]: { payloadHash: "consent-payload", output: output(conversationIds[0], revision + 1) } } });
  const atomicRace = await Promise.all([
    store.commit({ expectedRevision: revision, next: atomicNext("consent"), events: [thirdEvent], offerTransition: auditTransition("consent") }),
    store.commit({ expectedRevision: revision, next: atomicNext("consent-race"), events: [{ ...thirdEvent, id: `${prefix}_e3race`, sourceMessageId: "consent-race" }], offerTransition: auditTransition("consent-race") }),
  ]);
  const restartedStore = new PostgresV2ConversationStore(pool);
  const persistedOffer = await restartedStore.get(offer.offerId);
  const persistedConversation = await restartedStore.load(conversationIds[0]);
  const signer = createHmacOfferSigner({ secret: randomBytes(48).toString("base64url"), now: () => new Date("2026-08-16T00:12:00.000Z") });
  const token = signer.sign(offer);
  const authorized = await authorizePersistedCards({ token, signer, store, conversationId: conversationIds[0], catalogFingerprint: offer.catalogFingerprint, decisionFingerprint: offer.decisionFingerprint });
  const cross = await authorizePersistedCards({ token, signer, store, conversationId: `${prefix}_other`, catalogFingerprint: offer.catalogFingerprint, decisionFingerprint: offer.decisionFingerprint });
  const counts = await pool.query("select (select count(*)::int from cars_decision_v2_events where conversation_id=$1) events,(select count(*)::int from cars_decision_v2_messages where conversation_id=$1) messages,(select count(*)::int from cars_decision_v2_offers where conversation_id=$1) offers", [conversationIds[0]]);
  console.log(JSON.stringify({ environment, creation: first.status, loadedRevision: loaded.revision, persisted: counts.rows[0], concurrency: { committed: race.filter((item) => item.status === "OK").length, conflicted: race.filter((item) => item.status === "REVISION_CONFLICT").length }, faultRollback, transitionRollback, atomicConsentRace: { committed: atomicRace.filter((item) => item.status === "OK").length, conflicted: atomicRace.filter((item) => item.status === "REVISION_CONFLICT").length }, persistedAfterRestart: persistedOffer?.lifecycleState === "REVEALED" && persistedConversation?.revision === revision + 1, responseRetryRecoverable: Boolean(persistedConversation?.messageResults.consent || persistedConversation?.messageResults["consent-race"]), authorizedCards: authorized.status === "AUTHORIZED" ? authorized.cards.length : 0, crossConversationRejected: cross.status === "UNAUTHORIZED", tamperRejected: signer.verify(`${token}x`).status === "INVALID" }, null, 2));
} finally {
  for (const conversationId of conversationIds) await pool.query("delete from cars_decision_v2_conversations where conversation_id=$1", [conversationId]);
  await pool.end();
}
}

void main();
