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

export interface PublicRouteV2Request {
  readonly conversationId: string;
  readonly selectedOptionId?: string;
  readonly selectedOptionIds?: readonly string[];
  readonly v2OfferToken?: string;
  readonly messages: readonly { readonly id: string; readonly role: "user" | "assistant"; readonly content: string }[];
}

export type PublicRouteV2Response = {
  readonly kind: "V2_DECISION";
  readonly message: string;
  readonly options: readonly { readonly id: string; readonly label: string }[];
  readonly optionSelection?: import("../orchestrator/types").PublicOptionSelection;
  readonly cards: readonly import("../presentation/publicCardSchema").DecisionSafePublicCard[];
  readonly offer?: { readonly token: string; readonly expiresAt: string };
};

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
  const catalog = await loadActiveCatalogSnapshot({ repository: createProductionCatalogReleaseRepository(root), now });
  const layers = catalog.status === "READY" ? await loadProductionDecisionLayers(catalog.snapshot, root) : undefined;
  const persona = catalog.status === "READY" ? await loadActiveVehiclePersonaSafeTraits({ repositoryRoot: root, catalogRelease: catalog.snapshot.authority.releaseVersion.startsWith("v") ? catalog.snapshot.authority.releaseVersion : `v${catalog.snapshot.authority.releaseVersion}`, catalogFingerprint: catalog.snapshot.authority.catalogFingerprint, catalogVariantIds: catalog.snapshot.variants.map((variant) => variant.id), catalogFamilies: catalog.snapshot.familyIndex.values().map((family) => ({ familyId: family.familyId, variantIds: family.variantIds })) }) : undefined;
  const providerConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const signingSecret = process.env.CARS_DECISION_V2_SIGNING_SECRET;
  const signingSecretValid = Boolean(signingSecret && Buffer.byteLength(signingSecret, "utf8") >= 32);
  const database = await initializeCarsDecisionV2DurableStore({
    environment: { DATABASE_URL: process.env.DATABASE_URL, DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX },
    ...(process.env.CARS_DECISION_V2_DATABASE_ENV === "development" || process.env.CARS_DECISION_V2_DATABASE_ENV === "staging"
      ? { expectedDatabaseUrl: process.env.CARS_DECISION_V2_TEST_DATABASE_URL }
      : {}),
  });
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
  const previous = await store.load(input.conversationId);
  const priorOutput = previous ? Object.values(previous.messageResults).map((item) => item.output).sort((a, b) => b.revision - a.revision)[0] : undefined;
  const authorizedOptionAnswer = resolveAuthorizedOptionAnswer({ selectedOptionId: input.selectedOptionId, selectedOptionIds: input.selectedOptionIds, priorOutput });
  const config = readCarsDecisionV2ProviderConfig(process.env);
  const adapters = createStructuredProviderAdapters({ transport: createOpenAIStructuredProviderTransport(getOpenAIClient(), config), timeoutMs: config.timeoutMs, signal });
  const signer = createHmacOfferSigner({ secret: signingSecret, now: () => now });
  const output = await runCarsDecisionTurnV2({ conversationId: input.conversationId, messageId: latest.id, idempotencyKey: `${input.conversationId}:${latest.id}`, expectedConversationRevision: previous?.revision ?? 0, userMessage: authorizedOptionAnswer ?? latest.content, typedOptionId: input.selectedOptionId, typedOptionIds: input.selectedOptionIds, offerToken: input.v2OfferToken, requestTime: now.toISOString(), signal }, createCarsDecisionV2ProductionComposition({ store, offerStore: store, interpreter: adapters.interpreter, realizer: adapters.realizer, signer }));
  return { kind: "V2_DECISION", message: output.message, options: output.options, ...(output.optionSelection ? { optionSelection: output.optionSelection } : {}), cards: output.cards, ...(output.offer ? { offer: { token: output.offer.token, expiresAt: output.offer.expiresAt } } : {}) };
}
