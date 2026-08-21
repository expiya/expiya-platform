import { getOpenAIClient } from "@/lib/openai";
import { loadActiveVehiclePersonaSafeTraits } from "@/features/vehicle-data/vehiclePersonaSafeTraits.server";
import { createProductionCatalogReleaseRepository } from "../catalog/fileSystemRepository.server";
import { loadActiveCatalogSnapshot } from "../catalog/snapshot";
import { createCarsDecisionV2ProductionComposition } from "../composition/production.server";
import { assessCarsDecisionV2ProductionReadiness } from "../composition/readiness.server";
import { loadProductionDecisionLayers } from "../layers/productionAdapter.server";
import { createHmacOfferSigner } from "../offer/signer.server";
import { runCarsDecisionTurnV2 } from "../orchestrator/runCarsDecisionTurnV2";
import { PostgresV2ConversationStore } from "../persistence/postgresStore.server";
import { createOpenAIStructuredProviderTransport, readCarsDecisionV2ProviderConfig } from "../provider/openaiTransport.server";
import { createStructuredProviderAdapters } from "../provider/structuredProvider";
import { initializeCarsDecisionV2DurableStore } from "./durableStoreInitialization.server";
import { parseCarsDecisionV2Flags } from "./flags";
import { createEquipmentExplanationCtas } from "@/features/vehicle-data/equipmentPublicExplanationFacade.server";
import type { OfferSigner } from "../offer/types";
import type { RecommendationOfferAuditIntent } from "../orchestrator/types";
import { loadActiveRecOfferAuditFoundation } from "../offer/recOfferAuditFoundationRuntime.server";

export interface PublicRouteV2Request {
  readonly conversationId: string;
  readonly selectedOptionId?: string;
  readonly selectedOptionIds?: readonly string[];
  readonly v2OfferToken?: string;
  readonly messages: readonly { readonly id: string; readonly role: "user" | "assistant"; readonly content: string; readonly recommendationTermsAcceptance?: { readonly version: string; readonly acceptedAt?: string } }[];
}

export async function createServerRecommendationOfferAuditIntent(input: { readonly conversationId: string; readonly messageId: string; readonly offerToken: string; readonly acceptanceVersion: string; readonly signer: OfferSigner; readonly clock?: () => Date; readonly wait?: () => Promise<void> }): Promise<RecommendationOfferAuditIntent> {
  if (input.acceptanceVersion !== "REC-2026.08-v1.1") throw new TypeError("REC_VERSION_MISMATCH");
  const verified = input.signer.verify(input.offerToken);
  if (verified.status !== "VALID" || verified.conversationId !== input.conversationId) throw new TypeError("REC_OFFER_BINDING_INVALID");
  const clock = input.clock ?? (() => new Date());
  const acceptedAt = clock();
  let revealedAt = clock();
  for (let attempt = 0; revealedAt.getTime() <= acceptedAt.getTime() && attempt < 5; attempt += 1) { await (input.wait?.() ?? new Promise((resolve) => setTimeout(resolve, 1))); revealedAt = clock(); }
  if (revealedAt.getTime() <= acceptedAt.getTime()) throw new TypeError("REC_CLOCK_DID_NOT_ADVANCE");
  return { kind: "ACCEPT_RECOMMENDATION_TERMS_AND_REVEAL", conversationId: input.conversationId, offerId: verified.offerId, recommendationTermsVersion: "REC-2026.08-v1.1", acceptedAt: acceptedAt.toISOString(), revealedAt: revealedAt.toISOString(), acceptanceSequence: 1, revealSequence: 2, idempotencyKey: `${input.conversationId}:${input.messageId}:rec-audit` };
}

export type PublicRouteV2Response = {
  readonly kind: "V2_DECISION";
  readonly message: string;
  readonly options: readonly { readonly id: string; readonly label: string }[];
  readonly optionSelection?: import("../orchestrator/types").PublicOptionSelection;
  readonly candidateSummary?: import("../orchestrator/types").PublicCandidateSummary;
  readonly cards: readonly import("../presentation/publicCardSchema").DecisionSafePublicCard[];
  readonly offer?: { readonly token: string; readonly expiresAt: string };
  readonly equipmentExplanationActions: readonly { readonly actionId: string; readonly exactVariantId: string; readonly label: "Bu aracı anlat" }[];
};

type PublicV2Stage = "CATALOG" | "LAYERS" | "PERSONA" | "DURABLE_STORE" | "CONVERSATION_LOAD" | "TURN";

async function runPublicV2Stage<T>(stage: PublicV2Stage, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const safeDetail = error instanceof Error && /^[A-Z0-9_:,-]{1,100}$/u.test(error.message)
      ? error.message
      : error instanceof Error
        ? error.name.replace(/[^A-Za-z0-9]/gu, "").toUpperCase().slice(0, 40) || "ERROR"
        : "UNKNOWN";
    throw new TypeError(`CARS_DECISION_V2_STAGE_${stage}:${safeDetail}`);
  }
}

export function selectCarsDecisionRoute(publicFlag: boolean, readiness: { readonly ready: boolean }): "V1" | "V2" | "V2_UNAVAILABLE" {
  if (!publicFlag) return "V1";
  return readiness.ready ? "V2" : "V2_UNAVAILABLE";
}

export function resolveAuthorizedOptionAnswer(input: { readonly selectedOptionId?: string; readonly selectedOptionIds?: readonly string[]; readonly priorOutput?: import("../orchestrator/types").DecisionTurnV2Output }): string | undefined {
  const ids = input.selectedOptionIds ?? (input.selectedOptionId ? [input.selectedOptionId] : []); if (ids.length === 0) return undefined;
  const output = input.priorOutput; const selection = output?.optionSelection; if (!output || !selection || new Set(ids).size !== ids.length) throw new TypeError("V2_OPTION_SELECTION_INVALID");
  if (input.selectedOptionIds && selection.mode !== "MULTIPLE") throw new TypeError("V2_OPTION_SELECTION_MODE_MISMATCH");
  if (ids.length < selection.minimumSelections || ids.length > selection.maximumSelections) throw new TypeError("V2_OPTION_SELECTION_COUNT_INVALID");
  const labels = ids.map((id) => output.options.find((option) => option.id === id)?.label); if (labels.some((label) => !label)) throw new TypeError("V2_OPTION_SELECTION_UNKNOWN_ID");
  return labels.join(" veya ");
}

export async function tryRunCarsDecisionV2Public(input: PublicRouteV2Request, signal?: AbortSignal): Promise<PublicRouteV2Response | null> {
  const flags = parseCarsDecisionV2Flags(process.env);
  if (!flags.public) return null;
  const now = new Date(); const root = process.cwd();
  const catalog = await runPublicV2Stage("CATALOG", () => loadActiveCatalogSnapshot({ repository: createProductionCatalogReleaseRepository(root), now }));
  const layers = catalog.status === "READY" ? await runPublicV2Stage("LAYERS", () => loadProductionDecisionLayers(catalog.snapshot, root)) : undefined;
  const persona = catalog.status === "READY" ? await runPublicV2Stage("PERSONA", () => loadActiveVehiclePersonaSafeTraits({ repositoryRoot: root, catalogRelease: catalog.snapshot.authority.releaseVersion.startsWith("v") ? catalog.snapshot.authority.releaseVersion : `v${catalog.snapshot.authority.releaseVersion}`, catalogFingerprint: catalog.snapshot.authority.catalogFingerprint, catalogVariantIds: catalog.snapshot.variants.map((variant) => variant.id), catalogFamilies: catalog.snapshot.familyIndex.values().map((family) => ({ familyId: family.familyId, variantIds: family.variantIds })) })) : undefined;
  const providerConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const signingSecret = process.env.CARS_DECISION_V2_SIGNING_SECRET;
  const signingSecretValid = Boolean(signingSecret && Buffer.byteLength(signingSecret, "utf8") >= 32);
  const database = await runPublicV2Stage("DURABLE_STORE", () => initializeCarsDecisionV2DurableStore({
    environment: { DATABASE_URL: process.env.DATABASE_URL, DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX },
    ...(process.env.CARS_DECISION_V2_DATABASE_ENV === "development" || process.env.CARS_DECISION_V2_DATABASE_ENV === "staging"
      ? { expectedDatabaseUrl: process.env.CARS_DECISION_V2_TEST_DATABASE_URL }
      : {}),
  }));
  const pool = database.status === "READY" ? database.pool : undefined;
  const readiness = assessCarsDecisionV2ProductionReadiness({ catalog, dailyLifeReady: layers?.dailyLife.status === "READY", personaReady: persona?.status === "READY", personaApproved: persona?.status === "READY" && Boolean(persona.release.approval), providerConfigured, durableStoreConfigured: database.status === "READY", signingSecretValid, migrationAvailable: database.status === "READY", presentationReady: true, routeContractReady: true, publicFlag: flags.public });
  const selectedRoute = selectCarsDecisionRoute(flags.public, readiness);
  if (selectedRoute === "V2_UNAVAILABLE" || catalog.status !== "READY" || !pool || !signingSecret) {
    console.info("cars_decision_v2_public_fallback", { failures: readiness.failures, ...(database.status === "UNAVAILABLE" ? { durableStoreFailure: database.failure } : {}) });
    throw new TypeError("CARS_DECISION_V2_NOT_READY");
  }
  const latest = [...input.messages].reverse().find((message) => message.role === "user");
  if (!latest) return null;
  const store = new PostgresV2ConversationStore(pool);
  const previous = await runPublicV2Stage("CONVERSATION_LOAD", () => store.load(input.conversationId));
  const priorOutput = previous ? Object.values(previous.messageResults).map((item) => item.output).sort((a, b) => b.revision - a.revision)[0] : undefined;
  const authorizedOptionAnswer = resolveAuthorizedOptionAnswer({ selectedOptionId: input.selectedOptionId, selectedOptionIds: input.selectedOptionIds, priorOutput });
  const config = readCarsDecisionV2ProviderConfig(process.env);
  const adapters = createStructuredProviderAdapters({ transport: createOpenAIStructuredProviderTransport(getOpenAIClient(), config), timeoutMs: config.timeoutMs, signal });
  const signer = createHmacOfferSigner({ secret: signingSecret, now: () => now });
  const auditFoundation = loadActiveRecOfferAuditFoundation(root);
  const recommendationOfferAuditIntent = auditFoundation.status === "ACTIVE" && latest.recommendationTermsAcceptance && input.v2OfferToken ? await createServerRecommendationOfferAuditIntent({ conversationId: input.conversationId, messageId: latest.id, offerToken: input.v2OfferToken, acceptanceVersion: latest.recommendationTermsAcceptance.version, signer }) : undefined;
  const composition = createCarsDecisionV2ProductionComposition({ store, offerStore: store, interpreter: adapters.interpreter, realizer: adapters.realizer, signer });
  const committedOutput = await runPublicV2Stage("TURN", () => runCarsDecisionTurnV2({ conversationId: input.conversationId, messageId: latest.id, idempotencyKey: `${input.conversationId}:${latest.id}`, expectedConversationRevision: previous?.revision ?? 0, userMessage: authorizedOptionAnswer ?? latest.content, typedOptionId: input.selectedOptionId, typedOptionIds: input.selectedOptionIds, offerToken: input.v2OfferToken, recommendationOfferAuditIntent, requestTime: now.toISOString(), signal }, composition));
  const committed = input.v2OfferToken && committedOutput.state === "REVEALED" ? await store.load(input.conversationId) : undefined;
  const cards = input.v2OfferToken && committedOutput.state === "REVEALED" && committed?.memory && catalog.status === "READY" ? await composition.stages.authorizeCards?.({ token: input.v2OfferToken, conversationId: input.conversationId, catalog: catalog.snapshot, memory: committed.memory, now }) ?? [] : committedOutput.cards;
  const output = { ...committedOutput, cards };
  const equipmentExplanationActions = createEquipmentExplanationCtas({ conversationId: input.conversationId, offerId: output.offer?.offerId ?? "NO_OFFER", lifecycleState: output.cards.length ? "REVEALED" : "NOT_REVEALED", revealedExactVariantIds: output.cards.map((card) => card.exactVariantId) });
  return { kind: "V2_DECISION", message: output.message, options: output.options, ...(output.optionSelection ? { optionSelection: output.optionSelection } : {}), ...(output.candidateSummary ? { candidateSummary: output.candidateSummary } : {}), cards: output.cards, equipmentExplanationActions, ...(output.offer ? { offer: { token: output.offer.token, expiresAt: output.offer.expiresAt } } : {}) };
}
