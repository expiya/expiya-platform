import { createHash } from "node:crypto";
import { activeDecisionPreferences, latestActiveLedgerEvent } from "./ledger";
import { evaluateV3Catalog, rankV3Candidates, scoreV3Candidate } from "./catalogAdapter.server";
import { createV31Offer, revealV31Offer } from "./offerGovernance.server";
import { projectV3DecisionPreferences } from "./decisionInput";
import { projectEquipmentCardDisclosure } from "./equipmentCardProjection";
import { resolveVehicleImage } from "@/features/vehicle-data/resolveVehicleImage";
import { cars as legacyRepresentativeCars } from "@/data/car";
import { runNativeCarsStateTurn, type CarsNativeTurnInput } from "./nativeXpy.server";
import { prepareCarsTurn } from "./prepareCarsTurn.server";
import { planCarsTurn } from "./planCarsTurn.server";
import type { CarsDecisionMutation, CarsPrepareInput, CarsPPlan } from "./carsStages";
import type { V3ConversationState, V3PublicResponse } from "./types";

export function createV3ConversationState(conversationId: string): V3ConversationState {
  return { version: "3.8", conversationId, revision: 0, processedMessages: {}, purchaseIntent: "NOT_EXPRESSED", intentObservationTurns: 0, ledger: [], askedQuestionKeys: [], ended: false, budgetMode: "NEEDS_ONLY", budgetModeEvents: [] };
}

export async function executePreparedCarsDecision(plan: Extract<CarsPPlan, { readonly kind: "DECIDE" }>): Promise<CarsDecisionMutation> {
  const { context, decision } = plan;
  if (decision.kind === "RUN_COMPATIBILITY_ADAPTER") throw new TypeError("V3_COMPATIBILITY_DECISION_NOT_EXECUTABLE");
  const { prior, ledger, budgetMode, input } = context;
  if (decision.kind === "CREATE_OFFER") {
    const catalog = context.catalog;
    if (!catalog?.variants.length) throw new TypeError("V3_CATALOG_DECISION_UNAVAILABLE");
    const allRanked = rankV3Candidates(catalog.variants, ledger, budgetMode);
    if (decision.limit === 1 && allRanked.length > 1 && scoreV3Candidate(allRanked[0]!, ledger, budgetMode) === scoreV3Candidate(allRanked[1]!, ledger, budgetMode)) throw new TypeError("V31_UNIQUE_SELECTION_REQUIRED");
    const ranked = allRanked.slice(0, decision.limit);
    const decisionFingerprint = createHash("sha256").update(JSON.stringify(projectV3DecisionPreferences(ledger, budgetMode).map(({ concept, normalizedValue, decisionUse }) => ({ concept, normalizedValue, decisionUse })))).digest("hex");
    const governed = createV31Offer({ conversationId: prior.conversationId, variants: ranked, catalogReleaseVersion: catalog.catalogReleaseVersion, catalogFingerprint: catalog.catalogFingerprint, decisionFingerprint, limit: decision.limit });
    const state = { ...decision.plannedState, pendingOffer: { offerId: governed.offer.offerId, token: governed.token, candidateIds: ranked.map((item) => item.id), limit: decision.limit } };
    const outcome = { kind: "V3_CONVERSATION", message: decision.message, state, offerAwaitingConsent: true } satisfies V3PublicResponse;
    return { state, outcome };
  }
  if (!prior.pendingOffer) throw new TypeError("V31_OFFER_MISSING");
  const current = await evaluateV3Catalog(ledger, undefined, budgetMode);
  const ranked = rankV3Candidates(current.variants, ledger, budgetMode);
  const bound = ranked.filter((variant) => prior.pendingOffer!.candidateIds.includes(variant.id));
  if (bound.length !== prior.pendingOffer.candidateIds.length) throw new TypeError("V31_OFFER_DECISION_CHANGED");
  revealV31Offer({ conversationId: prior.conversationId, token: prior.pendingOffer.token, candidateIds: prior.pendingOffer.candidateIds, recommendationTermsAcceptance: input.recommendationTermsAcceptance });
  const state = { ...decision.plannedState, recommendationTermsAcceptance: { ...input.recommendationTermsAcceptance!, offerId: prior.pendingOffer.offerId } };
  const equipmentPreferences = activeDecisionPreferences(ledger).filter((item) => item.field === "equipmentFeature");
  const unmappedEquipment = latestActiveLedgerEvent(ledger, "unmappedEquipmentRequirement");
  const recommendations = bound.map((variant) => {
    const disclosures = equipmentPreferences.map((preference) => projectEquipmentCardDisclosure({ variant, preference, catalogRelease: current.catalogReleaseVersion, catalogFingerprint: current.catalogFingerprint }));
    const warning = disclosures.find((item) => item.warning)?.warning ?? (unmappedEquipment ? `${String(unmappedEquipment.normalizedValue)} bu versiyon için doğrulanamadı; araçta bulunduğuna dair kesin bir iddiada bulunmuyoruz.` : undefined);
    const badge = disclosures.find((item) => item.badge)?.badge;
    const resolvedImage = resolveVehicleImage({ variantId: variant.id, brand: variant.brand, model: variant.model, bodyStyle: variant.decisionFacts.bodyStyle.value, modelYear: variant.decisionFacts.modelYear.value });
    const representative = resolvedImage.status === "PLACEHOLDER" ? legacyRepresentativeCars.find((item) => item.brand.localeCompare(variant.brand, "tr", { sensitivity: "base" }) === 0 && item.model.localeCompare(variant.model, "tr", { sensitivity: "base" }) === 0 && item.bodyType.localeCompare(variant.decisionFacts.bodyStyle.value, "tr", { sensitivity: "base" }) === 0) : undefined;
    const image = representative ? { path: representative.image, status: "REPRESENTATIVE" as const, representedModel: `${representative.brand} ${representative.model} (${representative.year})` } : resolvedImage;
    const publicAttribution = image.attributionText?.match(/—\s*CC0\s*$/iu) ? "Wikimedia Commons · CC0" : image.attributionText;
    return { id: variant.id, title: `${variant.brand} ${variant.model} ${variant.trim}`, image: image.path, imageStatus: image.status, ...(publicAttribution ? { imageAttribution: publicAttribution } : {}), ...(image.representedModel ? { representedModel: image.representedModel } : {}), ...(warning ? { warning } : {}), ...(badge ? { badge } : {}) };
  });
  const outcome = { kind: "V3_CONVERSATION", message: bound.length === 1 ? "Karar motorunun seçtiği aracı paylaşıyorum." : "Karar motorunun seçtiği üç aracı paylaşıyorum.", state, recommendations } satisfies V3PublicResponse;
  return { state, outcome };
}

export async function executeCarsDomainDecision(input: CarsPrepareInput & { readonly state?: V3ConversationState }): Promise<V3PublicResponse> {
  const context = await prepareCarsTurn(input.state ?? createV3ConversationState(input.conversationId), input);
  const plan = await planCarsTurn(context);
  return plan.kind === "TERMINAL" ? plan.mutation.outcome : (await executePreparedCarsDecision(plan)).outcome;
}

export async function runV3Turn(input: CarsNativeTurnInput): Promise<V3PublicResponse> {
  return runNativeCarsStateTurn(input, input.state ?? createV3ConversationState(input.conversationId), executeCarsDomainDecision);
}
