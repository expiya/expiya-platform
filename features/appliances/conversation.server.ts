import type { AppliancesAuthoritySnapshot } from "./authority/types";
import type { AppliancesConversationState, AppliancesRuntimeOutcome } from "./contracts";
import { interpretAppliancesTurn } from "./context/interpretation";
import { runAppliancesContextTurn, type RunAppliancesTurnResult } from "./context/runtime.server";
import { deterministicPayloadHash } from "./persistence/service";
import type { AppliancesConversationStore } from "./persistence/types";
import { authorizeRecommendation } from "./recommendation/authorize";
import { constructRecommendation, evaluateRecommendationChain } from "./recommendation/construct";
import { loadRecommendationAuthority, type RecommendationAuthority } from "./recommendation/current.server";
import { projectAuthorizedAppliancesCard } from "./recommendation/projectCard.server";
import { preflightTurn, recordAskedQuestion } from "../conversation-kernel/lifecycle";
import { projectAppliancesBudgetStatus } from "./budgetPublic";
import { isAppliancesPriceInformationRequest, isSoftCheapPreferenceWithoutMaximum, runAppliancesPriceInformationTurn } from "./conversation/priceInformation.server";
import { isContextualQuestionDeferral, runAppliancesQuestionDeferralTurn } from "./conversation/questionDeferral.server";
import { activeBrandConstraint, brandRelaxationOutcome } from "./brandConstraint";
import { runBrandConstraintTurn } from "./brandConstraint/runtime.server";

export const safeAppliancesFailure = (): AppliancesRuntimeOutcome => ({ kind: "FAILED_CLOSED", message: "Güncel ürün bilgilerini doğrulayamadım. Bilgilerin korunuyor; yeniden deneyebilir veya yeni konuşma başlatabilirsin." });

function advanceCore(bundle: RecommendationAuthority, state: AppliancesConversationState, options?: { readonly deferBudgetQuestion?: boolean }): { state: AppliancesConversationState; outcome: AppliancesRuntimeOutcome } {
  let chain = evaluateRecommendationChain(bundle, state);
  if (options?.deferBudgetQuestion && chain.planner.kind === "ASK" && chain.planner.questionKey === "appliances.wm.budget.maximumTry") {
    chain = evaluateRecommendationChain(bundle, { ...recordAskedQuestion(state, chain.planner.questionKey), candidateSnapshotRef: chain.planner.materialityAuthorityFingerprint });
  }
  if (chain.planner.kind === "FAILED_CLOSED" || chain.sufficiency.kind === "FAILED_CLOSED") return { state, outcome: safeAppliancesFailure() };
  if (chain.planner.kind === "ASK") return { state: { ...recordAskedQuestion(state,chain.planner.questionKey), candidateSnapshotRef: chain.planner.materialityAuthorityFingerprint }, outcome: { kind: "ASK", questionKey: chain.planner.questionKey, message: chain.planner.message } };
  if (chain.planner.kind === "CLARIFY") return { state, outcome: { kind: "CLARIFY", questionKey: chain.planner.questionKey, message: chain.planner.message } };
  if (chain.sufficiency.kind !== "RECOMMENDATION_POOL_ELIGIBLE" && activeBrandConstraint(state)) { const relaxation=brandRelaxationOutcome(state); if(relaxation)return relaxation; }
  if (chain.sufficiency.kind !== "RECOMMENDATION_POOL_ELIGIBLE") return { state, outcome: { kind: "CLARIFY", questionKey: chain.sufficiency.kind, message: chain.sufficiency.kind === "NO_RECOMMENDATION_ELIGIBLE_CANDIDATE" ? "Belirttiğin koşullarda uygunluğu doğrulanmış aday kalmadı. Hangi şartı değiştirmek istersin?" : "Zorunlu şartın için yeterli doğrulanmış kanıt yok. Bu şartı açıkça değiştirebilir ya da yeni veri geldiğinde yeniden deneyebiliriz." } };
  const result = constructRecommendation(bundle, state, chain.selection);
  if (result.status !== "CONSTRUCTED") return { state, outcome: safeAppliancesFailure() };
  const artifact = result.artifact;
  if (artifact.artifactKind !== "SINGLE_PRODUCT_RECOMMENDATION") { const brand=activeBrandConstraint(state);const disclosures=[...artifact.requiredDisclosures,...(brand?[{id:"brand-hard-filter",category:"SELECTION",message:`${brand.brandLabel} tercihi zorunlu koşul olarak uygulandı; gizli puanlama yapılmadı.`,evidenceRefs:[brand.policyId,brand.policyDigest]}]:[])];return { state, outcome: { kind: "CLARIFY", questionKey: artifact.artifactKind, message: `${artifact.governedReasons.join(" ")} Tercihini değiştirmek veya netleştirmek ister misin?`, selectionState: { kind: artifact.artifactKind, identities: artifact.exactProductIdentities, disclosures, comparisons: artifact.selectionEvidence.pairwiseComparisons } } }; } 
  const authorization = authorizeRecommendation(bundle, state, artifact);
  if (!authorization) return { state, outcome: safeAppliancesFailure() };
  const card = projectAuthorizedAppliancesCard(bundle, state, artifact, authorization);
  return { state: { ...state, currentDecisionFingerprint: authorization.authorityFingerprint, decisionRecord: { artifact, authorization } }, outcome: { kind: "DECISION_READY", message: `${card.identity.brand} ${card.identity.model}: ${card.reasons.join(" ")}`, decisionFingerprint: authorization.authorityFingerprint, card } };
}

function advance(bundle: RecommendationAuthority, state: AppliancesConversationState, options?: { readonly deferBudgetQuestion?: boolean }): { state: AppliancesConversationState; outcome: AppliancesRuntimeOutcome } {
  const result=advanceCore(bundle,state,options),chain=evaluateRecommendationChain(bundle,state);let compatible=0,incompatible=0,unknown=0;
  if(chain.evaluation.status==="READY")for(const candidate of chain.evaluation.projection.candidates){if(candidate.reasons.some(r=>r.code==="PRICE_COMPATIBLE"))compatible++;else if(candidate.reasons.some(r=>r.code==="BUDGET_INCOMPATIBLE"))incompatible++;else if(candidate.reasons.some(r=>r.code==="BUDGET_ELIGIBILITY_UNKNOWN"))unknown++;}
  return{state:result.state,outcome:{...result.outcome,budget:projectAppliancesBudgetStatus(state,{compatible,incompatible,unknown,hasUsableCoverage:compatible+incompatible>0})}};
}

export async function recomputeWashingMachineBudgetOutcome(state:AppliancesConversationState,now:Date){try{const deferBudgetQuestion=!!activeBrandConstraint(state)&&!(state.questionDeferrals??[]).some(item=>item.questionKey==="appliances.wm.budget.maximumTry");return advance(await loadRecommendationAuthority(process.cwd(),now),state,{deferBudgetQuestion});}catch{return{state,outcome:{...safeAppliancesFailure(),budget:projectAppliancesBudgetStatus(state)}};}}

export async function runAppliancesConversationTurn(input: { store: AppliancesConversationStore; authority: AppliancesAuthoritySnapshot; conversationId: string; messageId: string; expectedRevision: number; message: string; now?: Date; loadAuthority?: () => Promise<RecommendationAuthority> }): Promise<RunAppliancesTurnResult> {
  const now = input.now ?? new Date();
  const loaded = await input.store.load(input.conversationId);
  if (!loaded) return { status: "STATE_UNAVAILABLE" };
  const payloadHash = deterministicPayloadHash({ action: "TURN", conversationId: input.conversationId, messageId: input.messageId, expectedRevision: input.expectedRevision, message: input.message });
  const replay = loaded.messages[input.messageId];
  const preflight=preflightTurn({expectedRevision:input.expectedRevision,currentRevision:loaded.state.revision,priorPayloadFingerprint:replay?.payloadHash,payloadFingerprint:payloadHash});
  if (preflight.kind==="REPLAY" && replay) {
    let outcome = replay.outcome.publicOutcome;
    if (!outcome) return { status: "INTEGRITY_FAILURE" };
    if (outcome.kind === "DECISION_READY") {
      try {
        const bundle = await (input.loadAuthority?.() ?? loadRecommendationAuthority(process.cwd(), now));
        const record = loaded.state.decisionRecord;
        if (!record || loaded.state.revision !== replay.committedRevision) throw new Error("STALE_REPLAY");
        const card = projectAuthorizedAppliancesCard(bundle, loaded.state, record.artifact, record.authorization);
        outcome = { ...outcome, card };
      } catch { outcome = safeAppliancesFailure(); }
    }
    return { status: "OK", outcome, state: loaded.state, replayed: true };
  }
  if(preflight.kind==="PAYLOAD_CONFLICT")return{status:"MESSAGE_PAYLOAD_CONFLICT"};
  if(preflight.kind==="REVISION_CONFLICT")return{status:"REVISION_CONFLICT"};
  const catalogProducts=(input.authority.catalog as {products?:readonly {brandId:string}[]}).products??[];const brands=[...new Map(catalogProducts.map(p=>[p.brandId.toLocaleLowerCase("tr-TR"),{id:p.brandId.toLocaleLowerCase("tr-TR"),label:p.brandId}])).values()];const brandTurn=await runBrandConstraintTurn({...input,now,brands,recompute:async state=>advance(await (input.loadAuthority?.()??loadRecommendationAuthority(process.cwd(),now)),state,{deferBudgetQuestion:true})});if(brandTurn)return brandTurn;
  if (isContextualQuestionDeferral(input.message, loaded.state.lastQuestionKey)) {
    const deferred = await runAppliancesQuestionDeferralTurn({ ...input, now, recompute: async state => advance(await (input.loadAuthority?.() ?? loadRecommendationAuthority(process.cwd(), now)), state) });
    if (deferred) return deferred;
  }
  if (isAppliancesPriceInformationRequest(input.message)) {
    const informationBundle = await (input.loadAuthority?.() ?? loadRecommendationAuthority(process.cwd(), now));
    const information = await runAppliancesPriceInformationTurn({ ...input, now, washingMachineAuthority: informationBundle });
    if (information) return information;
  }
  const route = interpretAppliancesTurn(input.message, input.messageId, loaded.state.lastQuestionKey).route;
  const confirmation = !!loaded.state.pendingConfirmation && /^(?:evet|doğru|aynen|tamam|hayır|değil|istemiyorum)[.! ]*$/iu.test(input.message.trim());
  const shouldAdvance = !loaded.state.ended && (route === "DECISION_CONTEXT" || confirmation);
  let committed = false;
  // Decorates the existing transaction boundary: no intermediate context commit and no second store.
  const store: AppliancesConversationStore = {
    load: async () => loaded,
    commit: async update => {
      let state: AppliancesConversationState = { ...update.nextState, decisionRecord: undefined, currentDecisionFingerprint: undefined };
      let outcome = update.publicOutcome ?? safeAppliancesFailure();
      if (shouldAdvance && outcome.kind === "RESPOND" && outcome.responseKind !== "DOMAIN_INFORMATION") {
        try {
          const bundle = await (input.loadAuthority?.() ?? loadRecommendationAuthority(process.cwd(), now));
          const advanced = advance(bundle, state, { deferBudgetQuestion: isSoftCheapPreferenceWithoutMaximum(input.message) });
          state = advanced.state; outcome = advanced.outcome;
        } catch { outcome = safeAppliancesFailure(); }
      } else if (route === "UNRESOLVED" && outcome.kind === "RESPOND") {
        try {
          const bundle = await (input.loadAuthority?.() ?? loadRecommendationAuthority(process.cwd(), now));
          const guided = advance(bundle, state);
          state = guided.state; outcome = guided.outcome;
        } catch { outcome = safeAppliancesFailure(); }
      }
      committed = true;
      return input.store.commit({ ...update, nextState: state, publicOutcome: outcome });
    },
  };
  const result = await runAppliancesContextTurn({ ...input, store, now });
  if (committed || result.status !== "OK") return result;
  // Context clarification/unsupported early returns also receive durable idempotency.
  const state = { ...loaded.state, revision: loaded.state.revision + 1, decisionRecord: undefined, currentDecisionFingerprint: undefined, updatedAt: now.toISOString() };
  const saved = await input.store.commit({ expectedRevision: loaded.state.revision, messageId: input.messageId, payloadHash, nextState: state, events: [], outcomeKind: "CONTEXT_MUTATED", publicOutcome: result.outcome });
  return saved.status === "OK" ? { status: "OK", outcome: saved.outcome.publicOutcome!, state: saved.outcome.state, replayed: false } : { status: saved.status };
}
