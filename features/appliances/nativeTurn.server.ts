import type { AppliancesConversationStore } from "./persistence/types";
import type { AppliancesConversationState, AppliancesLedgerEvent, AppliancesRuntimeOutcome } from "./contracts";
import type { RunAppliancesTurnResult } from "./context/runtime.server";
import { createFileSystemAppliancesArtifactRepository, loadActiveAppliancesAuthority } from "./authority/loader.server";
import { recomputeWashingMachineBudgetOutcome, runAppliancesConversationTurn } from "./conversation.server";
import { loadActiveDryerAuthority } from "./dryer/authority.server";
import { recomputeDryerBudgetOutcome, runDryerConversationTurn } from "./dryer/conversation.server";
import { loadActiveRefrigeratorAuthority } from "./refrigerator/authority.server";
import { recomputeRefrigeratorBudgetOutcome, runRefrigeratorConversationTurn } from "./refrigerator/conversation.server";
import { isBoundedType, loadActiveBoundedAuthority } from "./bounded/authority.server";
import { recomputeBoundedBudgetOutcome, runBoundedConversationTurn } from "./bounded/conversation.server";
import { constrainPackAuthority } from "./brandConstraint";
import { loadRecommendationAuthority } from "./recommendation/current.server";
import { executeNativeXpyTurn } from "@/features/xpy/nativeRuntime";
import { deterministicPayloadHash } from "./persistence/service";
import { proposePriceInformation, resolvePriceInformation, type AppliancesPriceSnapshot } from "./xpy/priceInformation";
import { proposeQuestionDisposition, reduceQuestionDeferral } from "./xpy/questionDeferral";
import { proposeBrandControl, reduceBrandControl, unknownBrandOutcome, validateBrandProposal, type BrandProposal } from "./xpy/brandControl";
import { proposeBudgetControl, reduceBudgetControl, type BudgetProposal } from "./xpy/budgetControl";
import type { XpyChoiceSubmission } from "@/features/xpy/contracts";
import { presentAppliancesOutcome, validateAppliancesChoice } from "./questionPack";
import { choiceSubmissionText } from "@/features/xpy/questionGuidance";
import { requireXpyDomainPack } from "@/features/xpy/domainPacks";
import { bindXpyRuntime } from "@/features/xpy/runtimeContract";

export type NativeAppliancesTurnInput = {
  readonly store: AppliancesConversationStore;
  readonly conversationId: string;
  readonly messageId: string;
  readonly expectedRevision: number;
  readonly message: string;
  readonly choice?: XpyChoiceSubmission;
  readonly now?: Date;
};

export type NativeAppliancesTurnDispatch =
  | { readonly status: "OK"; readonly result: Extract<RunAppliancesTurnResult, { status: "OK" }> }
  | { readonly status: "TURN_FAILURE"; readonly reason: Exclude<RunAppliancesTurnResult["status"], "OK"> }
  | { readonly status: "AUTHORITY_UNAVAILABLE"; readonly message: string }
  | { readonly status: "CHOICE_REJECTED"; readonly message: string };

/**
 * The category-resolving native TURN entry. HTTP transport deliberately knows
 * nothing about semantic intent handlers or category engines.
 */
export async function runNativeAppliancesTurn(input: NativeAppliancesTurnInput): Promise<NativeAppliancesTurnDispatch> {
  const loaded = await input.store.load(input.conversationId);
  if (!loaded) return { status: "TURN_FAILURE", reason: "STATE_UNAVAILABLE" };
  const state = loaded.state;
  // Every active category is admitted by the same executable XPY runtime baseline
  // before a category compatibility projection can inspect or mutate context.
  bindXpyRuntime(requireXpyDomainPack("APPLIANCES"), state.productType);
  if (input.choice && !validateAppliancesChoice(state.productType, state.lastQuestionKey, input.choice)) return { status: "CHOICE_REJECTED", message: "Seçenek bu kategori veya bekleyen soru için geçerli değil." };
  const turnInput = input.choice ? { ...input, message: choiceSubmissionText(input.choice) } : input;
  // The transaction owner resolves the snapshot once. Legacy category adapters
  // receive a read-through view so their preflight observes the same snapshot.
  const store: AppliancesConversationStore = { load: async () => loaded, commit: update => input.store.commit(update) };
  const now = input.now ?? new Date();
  let result: RunAppliancesTurnResult;
  if (state.productType === "DRYER") {
    const authority = await loadActiveDryerAuthority(process.cwd());
    if (authority.status !== "READY") return { status: "AUTHORITY_UNAVAILABLE", message: "Kurutma makinesi yetkisi doğrulanamadı." };
    const constrained = constrainPackAuthority(authority.snapshot, state);
    const brands = [...new Map(authority.snapshot.pack.products.map(product => [product.brand.toLocaleLowerCase("tr-TR"), { id: product.brand.toLocaleLowerCase("tr-TR"), label: product.brand }])).values()];
    const recompute = (next: AppliancesConversationState) => recomputeDryerBudgetOutcome(constrainPackAuthority(authority.snapshot, next), next);
    result = await runNativeSemanticAdapter({ ...turnInput, store, now, state, brands, recompute });
    if (result.status === "INTEGRITY_FAILURE") result = await runDryerConversationTurn({ ...turnInput, store, authority: constrained });
  } else if (state.productType === "REFRIGERATOR") {
    const authority = await loadActiveRefrigeratorAuthority(process.cwd());
    if (authority.status !== "READY") return { status: "AUTHORITY_UNAVAILABLE", message: "Buzdolabı yetkisi doğrulanamadı." };
    const constrained = constrainPackAuthority(authority.snapshot, state);
    const brands = [...new Map(authority.snapshot.pack.products.map(product => [product.brand.toLocaleLowerCase("tr-TR"), { id: product.brand.toLocaleLowerCase("tr-TR"), label: product.brand }])).values()];
    const recompute = (next: AppliancesConversationState) => recomputeRefrigeratorBudgetOutcome(constrainPackAuthority(authority.snapshot, next), next);
    result = await runNativeSemanticAdapter({ ...turnInput, store, now, state, brands, recompute });
    if (result.status === "INTEGRITY_FAILURE") result = await runRefrigeratorConversationTurn({ ...turnInput, store, authority: constrained });
  } else if (isBoundedType(state.productType)) {
    const authority = await loadActiveBoundedAuthority(process.cwd(), state.productType);
    if (authority.status !== "READY") return { status: "AUTHORITY_UNAVAILABLE", message: "Kategori yetkisi doğrulanamadı." };
    const constrained = constrainPackAuthority(authority.snapshot, state);
    const brands = [...new Map(authority.snapshot.pack.products.map(product => [product.brand.toLocaleLowerCase("tr-TR"), { id: product.brand.toLocaleLowerCase("tr-TR"), label: product.brand }])).values()];
    const recompute = (next: AppliancesConversationState) => recomputeBoundedBudgetOutcome(constrainPackAuthority(authority.snapshot, next), next);
    result = await runNativeSemanticAdapter({ ...turnInput, store, now, state, brands, recompute });
    if (result.status === "INTEGRITY_FAILURE") result = await runBoundedConversationTurn({ ...turnInput, store, authority: constrained });
  } else {
    const repository = createFileSystemAppliancesArtifactRepository(process.cwd());
    const authority = await loadActiveAppliancesAuthority({ repository });
    if (authority.status !== "READY") return { status: "AUTHORITY_UNAVAILABLE", message: "Appliances yetkisi doğrulanamadı." };
    const products = (authority.snapshot.catalog as { readonly products: readonly { readonly brandId: string }[] }).products;
    const brands = [...new Map(products.map(product => [product.brandId.toLocaleLowerCase("tr-TR"), { id: product.brandId.toLocaleLowerCase("tr-TR"), label: product.brandId }])).values()];
    const recommendation = await loadRecommendationAuthority(process.cwd(), now);
    const recompute = (next: AppliancesConversationState) => recomputeWashingMachineBudgetOutcome(next, now);
    const priceSnapshot = toPriceSnapshot(recommendation);
    result = await runNativeSemanticAdapter({ ...turnInput, store, now, state, brands, recompute, priceSnapshot });
    if (result.status === "INTEGRITY_FAILURE") result = await runAppliancesConversationTurn({ ...turnInput, store, authority: authority.snapshot, loadAuthority: async () => recommendation });
  }
  return result.status === "OK" ? { status: "OK", result } : { status: "TURN_FAILURE", reason: result.status };
}

type Recompute = (state: AppliancesConversationState) => Promise<{ state: AppliancesConversationState; outcome: AppliancesRuntimeOutcome }> | { state: AppliancesConversationState; outcome: AppliancesRuntimeOutcome };

async function runNativeSemanticAdapter(input: NativeAppliancesTurnInput & { store: AppliancesConversationStore; now: Date; state: AppliancesConversationState; brands: readonly { id: string; label: string }[]; recompute: Recompute; priceSnapshot?: AppliancesPriceSnapshot }): Promise<RunAppliancesTurnResult> {
  const price = proposePriceInformation(input.message);
  const disposition = proposeQuestionDisposition(input.message, input.state.lastQuestionKey);
  const brand = proposeBrandControl({ message: input.message, brands: input.brands, state: input.state });
  const budget = proposeBudgetControl(input.message);
  if (price.kind === "PRICE_INFORMATION" || disposition.kind === "DEFER" || brand.kind !== "NONE" || budget.kind !== "NONE") return runPureSemanticTurn(input);
  return { status: "INTEGRITY_FAILURE" };
}

type PureProposal = ReturnType<typeof proposePriceInformation> | ReturnType<typeof proposeQuestionDisposition> | BrandProposal | BudgetProposal;
type PurePlan = { readonly kind: "PRICE" } | { readonly kind: "DEFER"; readonly disposition: Extract<ReturnType<typeof proposeQuestionDisposition>, { kind: "DEFER" }> } | { readonly kind: "BRAND"; readonly proposal: ReturnType<typeof validateBrandProposal> } | { readonly kind: "BUDGET"; readonly proposal: Extract<BudgetProposal, { kind: "CONTROL" }> };

async function runPureSemanticTurn(input: NativeAppliancesTurnInput & { store: AppliancesConversationStore; now: Date; state: AppliancesConversationState; brands: readonly { id: string; label: string }[]; recompute: Recompute; priceSnapshot?: AppliancesPriceSnapshot }): Promise<RunAppliancesTurnResult> {
  const payloadFingerprint = deterministicPayloadHash({ action: "TURN", conversationId: input.conversationId, messageId: input.messageId, expectedRevision: input.expectedRevision, message: input.message });
  return executeNativeXpyTurn<AppliancesConversationState, PureProposal, PureProposal, PurePlan, AppliancesLedgerEvent, AppliancesRuntimeOutcome, RunAppliancesTurnResult>({
    runtime: bindXpyRuntime(requireXpyDomainPack("APPLIANCES"), input.state.productType),
    expectedRevision: input.expectedRevision, messageId: input.messageId, payloadFingerprint,
    transaction: {
      load: async () => { const loaded = await input.store.load(input.conversationId); if (!loaded) return null; const replay = loaded.messages[input.messageId]; return { state: loaded.state, ...(replay?.outcome.publicOutcome ? { replay: { payloadFingerprint: replay.payloadHash, state: replay.outcome.state, outcome: replay.outcome.publicOutcome } } : {}) }; },
      authorityMatches: state => state.pinnedCatalogDigest === input.state.pinnedCatalogDigest && state.pinnedSemanticDigest === input.state.pinnedSemanticDigest,
      commit: async update => { const committed = await input.store.commit({ expectedRevision: update.expectedRevision, messageId: update.messageId, payloadHash: update.payloadFingerprint, nextState: update.state, events: update.events, outcomeKind: "CONTEXT_MUTATED", publicOutcome: update.outcome }); return committed.status === "OK" ? { status: "OK", outcome: committed.outcome.publicOutcome!, state: committed.outcome.state, replayed: false } : { status: committed.status }; },
    },
    x: { interpret: state => {
      const price = proposePriceInformation(input.message); if (price.kind === "PRICE_INFORMATION") return price;
      const disposition = proposeQuestionDisposition(input.message, state.lastQuestionKey); if (disposition.kind === "DEFER") return disposition;
      const brand = proposeBrandControl({ message: input.message, brands: input.brands, state }); if (brand.kind !== "NONE") return brand;
      return proposeBudgetControl(input.message);
    } },
    validation: { validate: (_state, proposal) => proposal },
    p: { plan: (_state, proposal) => {
      if (proposal.kind === "PRICE_INFORMATION") return { kind: "PRICE" };
      if (proposal.kind === "DEFER") return { kind: "DEFER", disposition: proposal };
      if (["SET", "RELAX", "CLEAR", "UNKNOWN"].includes(proposal.kind)) return { kind: "BRAND", proposal: validateBrandProposal(proposal as BrandProposal, input.brands) };
      if (proposal.kind === "CONTROL") return { kind: "BUDGET", proposal };
      return { kind: "PRICE" };
    } },
    withoutY: (state, _proposal, plan) => {
      if (plan.kind === "PRICE") return { state: { ...state, revision: state.revision + 1, updatedAt: input.now.toISOString() }, events: [], outcome: resolvePriceInformation({ state, snapshot: input.priceSnapshot }) };
      if (plan.kind === "BRAND" && plan.proposal.kind === "UNKNOWN") return { state: { ...state, revision: state.revision + 1, updatedAt: input.now.toISOString() }, events: [], outcome: unknownBrandOutcome(state, plan.proposal.label) };
      if (plan.kind === "BUDGET") { const reduced = reduceBudgetControl({ state, proposal: plan.proposal, messageId: input.messageId, createdAt: input.now.toISOString() }); if (reduced.terminalOutcome) return { state: reduced.state, events: reduced.events, outcome: reduced.terminalOutcome }; }
      return undefined;
    },
    y: { decide: async (state, _proposal, plan) => {
      if (plan.kind === "DEFER") { const reduced = reduceQuestionDeferral({ state, disposition: plan.disposition, messageId: input.messageId, createdAt: input.now.toISOString() }); const advanced = await input.recompute(reduced); return { state: advanced.state, events: [], outcome: advanced.outcome }; }
      if (plan.kind === "BRAND" && plan.proposal.kind === "ACCEPTED") { const reduced = reduceBrandControl({ state, proposal: plan.proposal.proposal, messageId: input.messageId, message: input.message, createdAt: input.now.toISOString() }); const advanced = await input.recompute(reduced); return { state: advanced.state, events: [], outcome: advanced.outcome }; }
      if (plan.kind === "BUDGET") { const reduced = reduceBudgetControl({ state, proposal: plan.proposal, messageId: input.messageId, createdAt: input.now.toISOString() }); const advanced = await input.recompute(reduced.state); return { state: advanced.state, events: reduced.events, outcome: advanced.outcome }; }
      throw new Error("INVALID_PURE_PLAN");
    } },
    isTerminalResult: () => false,
    replay: stored => ({ status: "OK", outcome: stored.outcome, state: stored.state, replayed: true }),
    unavailable: () => ({ status: "STATE_UNAVAILABLE" }), payloadConflict: () => ({ status: "MESSAGE_PAYLOAD_CONFLICT" }), revisionConflict: () => ({ status: "REVISION_CONFLICT" }), authorityMismatch: () => ({ status: "AUTHORITY_MISMATCH" }),
  });
}

function toPriceSnapshot(bundle: Awaited<ReturnType<typeof loadRecommendationAuthority>>): AppliancesPriceSnapshot {
  const products = bundle.price.status === "READY" ? bundle.price.projection.products as AppliancesPriceSnapshot["products"] : [];
  const observations = bundle.price.status === "READY" ? bundle.price.projection.observations as readonly Record<string, unknown>[] : [];
  const catalogProducts = (bundle.authority.catalog as { products?: readonly { productId: string; brandId: string; manufacturerModelIdentifier: string }[] }).products ?? [];
  return { status: bundle.price.status === "READY" ? "READY" : "UNAVAILABLE", products, observations, identities: new Map(catalogProducts.map(item => [item.productId, `${item.brandId.charAt(0).toLocaleUpperCase("tr-TR")}${item.brandId.slice(1)} ${item.manufacturerModelIdentifier}`])) };
}

export function projectNativeAppliancesTurn(result: Extract<RunAppliancesTurnResult, { status: "OK" }>, sourceMessageId?: string): AppliancesRuntimeOutcome & {
  readonly conversationId: string;
  readonly revision: number;
  readonly ended: boolean;
  readonly budgetMode: NonNullable<AppliancesConversationState["budgetMode"]>;
  readonly budgetMetadata?: AppliancesConversationState["budgetMetadata"];
  readonly replayed: boolean;
} {
  const events = sourceMessageId ? result.state.ledger.filter(event => event.sourceMessageId === sourceMessageId) : [];
  const outcome = projectPublicAppliancesOutcome(presentAppliancesOutcome(result.state.productType, result.outcome, events));
  return { ...outcome, conversationId: result.state.conversationId, revision: result.state.revision, ended: result.state.ended, budgetMode: result.state.budgetMode ?? "NEEDS_ONLY", budgetMetadata: result.state.budgetMetadata, replayed: result.replayed };
}

/** Removes internal identity keys from unresolved public states; labels are mandatory. */
export function projectPublicAppliancesOutcome(outcome: AppliancesRuntimeOutcome): AppliancesRuntimeOutcome {
  if (!("message" in outcome)) return outcome;
  const message = humanizePublicMessage(outcome.message);
  if ((outcome.kind === "ASK" || outcome.kind === "CLARIFY") && !outcome.choices && /(?:^|\s)(?:mı|mi|mu|mü)\?$/iu.test(message.trim())) return { ...outcome, message, choices: { questionKey: outcome.questionKey, selectionMode: "SINGLE", source: "DOMAIN_PACK", options: [{ value: "Evet", label: "Evet" }, { value: "Hayır", label: "Hayır" }, { value: "Henüz bilmiyorum", label: "Henüz bilmiyorum" }] } };
  if ((outcome.kind !== "ASK" && outcome.kind !== "CLARIFY") || !outcome.selectionState) return { ...outcome, message };
  if (outcome.selectionState.identities.some(identity => !identity.brand.trim() || !identity.model.trim())) {
    return { kind: "FAILED_CLOSED", message: "Ürün adları güvenli biçimde doğrulanamadığı için seçenekler gösterilemiyor." };
  }
  return {
    ...outcome,
    message,
    selectionState: {
      ...outcome.selectionState,
      identities: outcome.selectionState.identities.map(identity => ({
        brand: identity.brand,
        model: identity.model,
        configurationIdentity: identity.configurationIdentity,
        market: identity.market,
      })) as unknown as typeof outcome.selectionState.identities,
      comparisons: [],
    },
  };
}

/** Final public-language boundary: category engines may retain precise internal vocabulary. */
function humanizePublicMessage(message: string): string {
  return message
    .replace(/non-dominated/giu, "farklı ihtiyaçlarda öne çıkan")
    .replace(/exact (?:ürün|model|ürüne|modele|modellerde|modelleri)/giu, match => ({
      "exact ürün": "doğrulanmış ürün",
      "exact model": "doğrulanmış model",
      "exact ürüne": "doğrulanmış ürüne",
      "exact modele": "doğrulanmış modele",
      "exact modellerde": "doğrulanmış modellerde",
      "exact modelleri": "doğrulanmış modelleri",
    })[match.toLocaleLowerCase("tr-TR")] ?? "doğrulanmış ürün")
    .replace(/runtime-seçilebilir/giu, "seçime açık")
    .replace(/runtime/giu, "sistem")
    .replace(/otoritesi/giu, "bilgi kaynağı")
    .replace(/yetkilendirilebilir/giu, "güvenle önerilebilir");
}
