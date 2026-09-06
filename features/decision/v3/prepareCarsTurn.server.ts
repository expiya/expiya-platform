import { createHash } from "node:crypto";
import { evaluateV3Catalog, resolveV3CatalogEntities, type V3CatalogEntitySignals, type V3CatalogEvaluation } from "./catalogAdapter.server";
import { applyCatalogEntitySignals, applyPreferenceMessage, applySemanticContextSignals, applySemanticPreferenceSignals, latestActiveLedgerEvent } from "./ledger";
import { productScopeReply } from "./productScope";
import { interpretV31Message, type V31SemanticInterpretation } from "./semanticProvider.server";
import type { CarsPrepareInput, CarsValidatedContext } from "./carsStages";
import type { BudgetDecisionMode, PurchaseIntentState, RouterResult, V3ConversationState } from "./types";

export interface CarsPrepareDependencies {
  readonly interpretMessage: typeof interpretV31Message;
  readonly resolveCatalogEntities: (message: string) => Promise<V3CatalogEntitySignals>;
  readonly bindCatalog: (ledger: V3ConversationState["ledger"], budgetMode: BudgetDecisionMode) => Promise<V3CatalogEvaluation>;
}

const productionDependencies: CarsPrepareDependencies = {
  interpretMessage: interpretV31Message,
  resolveCatalogEntities: resolveV3CatalogEntities,
  bindCatalog: (ledger, budgetMode) => evaluateV3Catalog(ledger, undefined, budgetMode),
};

const budgetModeOf = (state: V3ConversationState) => state.budgetMode ?? "NEEDS_ONLY";

function nextIntent(prior: PurchaseIntentState, route: string, turn: number, priorQuestion: string | undefined, message: string, semanticAssessment: "NOT_EXPRESSED" | "POSSIBLE" | "EXPLICIT"): PurchaseIntentState {
  if (prior === "ENDED_WITHOUT_INTENT") return prior;
  if (route === "PURCHASE_INTENT_DISCOVERY" || route === "RECOMMENDATION_OR_OFFER") return prior === "ACTIVE_DISCOVERY" || prior === "READY_FOR_DECISION" ? prior : prior === "EXPLICIT" && priorQuestion ? "ACTIVE_DISCOVERY" : "EXPLICIT";
  if (semanticAssessment === "EXPLICIT" && ["NOT_EXPRESSED", "POSSIBLE"].includes(prior)) return "EXPLICIT";
  if (semanticAssessment === "POSSIBLE" && prior === "NOT_EXPRESSED") return "POSSIBLE";
  if (priorQuestion === "purchaseInterest" && /(?:evet|olabilir|değerlendir|düşünüyorum|bakabilirim|ilgileniyorum|açığım)/iu.test(message)) return "EXPLICIT";
  if (route === "CLOSING_OR_TERMINATION") return prior === "NOT_EXPRESSED" || prior === "POSSIBLE" ? "ENDED_WITHOUT_INTENT" : prior;
  if (["VEHICLE_PREFERENCE_UPDATE", "QUESTION_ANSWER", "CORRECTION_OR_RELAXATION"].includes(route) && ["EXPLICIT", "ACTIVE_DISCOVERY"].includes(prior)) return "ACTIVE_DISCOVERY";
  if (prior === "NOT_EXPRESSED" && turn >= 3) return "POSSIBLE";
  return prior;
}

function validatePreparationInput(state: V3ConversationState, input: CarsPrepareInput): void {
  if (state.version !== "3.8" || state.conversationId !== input.conversationId) throw new TypeError("V3_STATE_BINDING_INVALID");
  if (!input.message.trim() || input.message.length > 4_000) throw new TypeError("V3_PROPOSAL_INVALID");
}

export async function prepareCarsTurn(state: V3ConversationState, input: CarsPrepareInput, dependencies: CarsPrepareDependencies = productionDependencies): Promise<CarsValidatedContext> {
  validatePreparationInput(state, input);
  const prior = state;
  const budgetFilterRejected = /bütçe(?:mi|yi)?.*(?:(?:karar )?filtresine\s+(?:dahil\s+)?(?:etmek\s+)?istemiyorum|(?:karar )?filtresini\s+kullanma|karardan çıkar|filtre dışı)|ihtiyaç odaklı devam/iu.test(input.message);
  const requestedBudgetMode = budgetFilterRejected ? "NEEDS_ONLY" as const : /bütçe(?:mi|yi)?.*(?:karar filtresi|filtreye dahil|filtre olarak kullan)|bütçeme göre filtrele/iu.test(input.message) ? "BUDGET_AS_DECISION_FILTER" as const : undefined;
  const priorBudgetMode = budgetModeOf(prior);
  const budgetMode = requestedBudgetMode ?? priorBudgetMode;
  const budgetModeEvents = requestedBudgetMode && requestedBudgetMode !== priorBudgetMode ? [...(prior.budgetModeEvents ?? []), { id: `${input.messageId}:budget-mode`, sourceMessageId: input.messageId, revision: prior.revision + 1, from: priorBudgetMode, to: requestedBudgetMode, authority: "USER_EXPLICIT" as const }] : (prior.budgetModeEvents ?? []);
  const interpretationPrior = { ...prior, budgetMode, budgetModeEvents };
  const semantic: V31SemanticInterpretation = await dependencies.interpretMessage({ message: input.message, hasPurchaseIntent: !["NOT_EXPRESSED", "POSSIBLE", "ENDED_WITHOUT_INTENT"].includes(prior.purchaseIntent), hasOpenQuestion: Boolean(prior.lastQuestionKey), signal: input.signal });
  let catalogEntities: V3CatalogEntitySignals = { brands: [], models: [] };
  try { catalogEntities = await dependencies.resolveCatalogEntities(input.message); } catch { /* bounded catalog entity fallback */ }
  const entityBackedPurchase = (catalogEntities.brands.length > 0 || catalogEntities.models.length > 0) && /(?:satın|alacağ|alacağız|alabileceğ|alımı|almak|almayı|arıyor|arıyorum|bakıyor|bakıyorum|yazıyorum|teklif|kapat|kapora|niyet|planlıyor|kafaya koy|hazırım|var mı)/iu.test(input.message);
  const explicitBudgetCorrection = Boolean(latestActiveLedgerEvent(prior.ledger, "budgetMax") || latestActiveLedgerEvent(prior.ledger, "budgetTarget")) && /bütçe(?:mi|yi|m)?.*(?:%\s*\d+.*(?:artır|yükselt)|\d.*(?:çıkar|çıkart|yükselt|yap|olsun))/iu.test(input.message);
  const router: RouterResult = explicitBudgetCorrection
    ? { ...semantic.router, route: "CORRECTION_OR_RELAXATION", confidence: 0.99, decisionMutationAllowed: true, catalogEvaluationRequired: true, directAnswerRequired: false, purchaseIntentEvidence: [], conversationReason: "Explicit correction of an active conversation-scoped budget", clarificationRequirement: null }
    : entityBackedPurchase && ["SOCIAL_CONVERSATION", "OFF_TOPIC_REQUEST", "VEHICLE_PREFERENCE_UPDATE", "QUESTION_ANSWER", "AUTOMOTIVE_INFORMATION"].includes(semantic.router.route)
      ? { ...semantic.router, route: "PURCHASE_INTENT_DISCOVERY", confidence: 0.98, decisionMutationAllowed: true, catalogEvaluationRequired: true, directAnswerRequired: false, purchaseIntentEvidence: [{ start: 0, end: input.message.length, text: input.message }], conversationReason: "Catalog entity with explicit purchase language", clarificationRequirement: null }
      : semantic.router;
  const scopeReply = productScopeReply(input.message);
  const observationTurns = prior.intentObservationTurns + (["SOCIAL_CONVERSATION", "OFF_TOPIC_REQUEST"].includes(router.route) ? 1 : 0);
  const purchaseIntent = nextIntent(prior.purchaseIntent, router.route, observationTurns, prior.lastQuestionKey, input.message, semantic.purchaseIntentAssessment);
  const acceptedBrandRelaxation = prior.pendingAction === "RELAX_BRAND_FOR_POWERTRAIN" && /(?:evet|olur|tamam|esnet|başka marka|marka fark etmez|seçelim)/iu.test(input.message);
  const acceptedEquipmentRelaxation = prior.pendingAction === "RELAX_UNSUPPORTED_EQUIPMENT" && /(?:evet|olur|tamam|çıkar|esnet|vazgeç|önemli değil|şart değil)/iu.test(input.message);
  let ledger = prior.ledger;
  let pendingConfirmation = prior.pendingConfirmation;
  if (router.decisionMutationAllowed && scopeReply?.kind !== "USED_VEHICLE_SELECTION") ({ ledger, pending: pendingConfirmation } = applyPreferenceMessage(interpretationPrior, input.messageId, input.message));
  if (router.decisionMutationAllowed && scopeReply?.kind !== "USED_VEHICLE_SELECTION") {
    ledger = applyCatalogEntitySignals(prior, ledger, input.messageId, input.message, catalogEntities);
    ledger = applySemanticPreferenceSignals(prior, ledger, input.messageId, semantic.preferenceSignals);
  }
  ledger = applySemanticContextSignals(prior, ledger, input.messageId, semantic.contextSignals);
  const budgetEvent = latestActiveLedgerEvent(ledger, "budgetMax") ?? latestActiveLedgerEvent(ledger, "budgetTarget");
  const requestedRecommendationLimit = /(?:tek|bir)\s+(?:araç|model|seçim|öneri)/iu.test(input.message) ? 1 as const : /(?:üç|3)\s+(?:araç|model|seçenek|alternatif)/iu.test(input.message) ? 3 as const : prior.preferredRecommendationLimit;
  const base: V3ConversationState = { ...prior, budgetMode, budgetModeEvents, ...(budgetEvent ? { budgetMetadata: { amountTry: Number(budgetEvent.normalizedValue), currency: "TRY", taxBasis: "CATALOG_GROSS_LIST_PRICE", financing: "EXCLUDED", timeScope: "CURRENT_ACTIVE_CATALOG", includedInDecision: budgetMode === "BUDGET_AS_DECISION_FILTER" } as const } : {}), revision: prior.revision + 1, processedMessages: { ...prior.processedMessages, [input.messageId]: createHash("sha256").update(input.message).digest("hex") }, purchaseIntent, intentObservationTurns: observationTurns, ledger, pendingConfirmation, ended: purchaseIntent === "ENDED_WITHOUT_INTENT", lastRoute: router.route, pendingAction: acceptedBrandRelaxation || acceptedEquipmentRelaxation ? undefined : prior.pendingAction, finalBrandModelQuestionAsked: prior.finalBrandModelQuestionAsked || prior.lastQuestionKey === "brandModel", ...(requestedRecommendationLimit ? { preferredRecommendationLimit: requestedRecommendationLimit } : {}) };
  const recommendationRequested = router.route === "RECOMMENDATION_OR_OFFER" || /(?:tek araç|alternatif|öner(?:i|ini|inizi)?|seç(?:elim|ebilirsin| lütfen)?|göster|paylaş)/iu.test(input.message);
  let catalog: V3CatalogEvaluation | undefined;
  if (["EXPLICIT", "ACTIVE_DISCOVERY", "READY_FOR_DECISION"].includes(purchaseIntent) || router.catalogEvaluationRequired || recommendationRequested || prior.pendingAction === "RELAX_BRAND_FOR_POWERTRAIN") {
    try { catalog = await dependencies.bindCatalog(ledger, budgetMode); } catch { catalog = undefined; }
  }
  return Object.freeze({ state: prior, input, prior, base, semantic, router, scopeReply, observationTurns, purchaseIntent, acceptedBrandRelaxation, acceptedEquipmentRelaxation, ledger, budgetMode, priorBudgetMode, requestedBudgetMode, budgetEvent, recommendationRequested, catalog });
}
