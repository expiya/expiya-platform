import type { V3CatalogEvaluation } from "./catalogAdapter.server";
import type { V3ProductScopeReply } from "./productScope";
import type { V31SemanticInterpretation } from "./semanticProvider.server";
import type { BudgetDecisionMode, RouterResult, V3ConversationState, V3PublicResponse } from "./types";

export interface CarsValidatedContext {
  /** Compatibility view of the transaction state entering preparation. */
  readonly state: V3ConversationState;
  readonly input: CarsPrepareInput;
  readonly prior: V3ConversationState;
  readonly base: V3ConversationState;
  readonly semantic: V31SemanticInterpretation;
  readonly router: RouterResult;
  readonly scopeReply: V3ProductScopeReply | undefined;
  readonly observationTurns: number;
  readonly purchaseIntent: V3ConversationState["purchaseIntent"];
  readonly acceptedBrandRelaxation: boolean;
  readonly acceptedEquipmentRelaxation: boolean;
  readonly ledger: V3ConversationState["ledger"];
  readonly budgetMode: BudgetDecisionMode;
  readonly priorBudgetMode: BudgetDecisionMode;
  readonly requestedBudgetMode: BudgetDecisionMode | undefined;
  readonly budgetEvent: V3ConversationState["ledger"][number] | undefined;
  readonly recommendationRequested: boolean;
  readonly catalog: V3CatalogEvaluation | undefined;
}

export interface CarsPrepareInput {
  readonly conversationId: string;
  readonly messageId: string;
  readonly message: string;
  readonly expectedRevision: number;
  readonly signal?: AbortSignal;
  readonly recommendationTermsAcceptance?: import("@/lib/legal/recommendationTerms").RecommendationTermsAcceptance;
}

export type CarsPPlan =
  | { readonly kind: "TERMINAL"; readonly mutation: CarsDecisionMutation }
  | { readonly kind: "DECIDE"; readonly context: CarsValidatedContext; readonly decision: CarsYDecision };

export type CarsYDecision =
  | { readonly kind: "CREATE_OFFER"; readonly limit: 1 | 3; readonly plannedState: V3ConversationState; readonly message: string }
  | { readonly kind: "REVEAL_OFFER"; readonly plannedState: V3ConversationState }
  | { readonly kind: "RUN_COMPATIBILITY_ADAPTER" };

export interface CarsDecisionMutation {
  readonly state: V3ConversationState;
  readonly outcome: V3PublicResponse;
}

export interface CarsStagedPorts {
  prepare(state: V3ConversationState): Promise<CarsValidatedContext>;
  plan(context: CarsValidatedContext): Promise<CarsPPlan>;
  decide(plan: Extract<CarsPPlan, { readonly kind: "DECIDE" }>): Promise<CarsDecisionMutation>;
}

export function adaptWholeTurnToCarsStages(run: (state: V3ConversationState) => Promise<V3PublicResponse>): CarsStagedPorts {
  return { prepare: async state => ({ state } as CarsValidatedContext), plan: async context => ({ kind: "DECIDE", context, decision: { kind: "RUN_COMPATIBILITY_ADAPTER" } }), decide: async plan => { const outcome = await run(plan.context.state); return { state: outcome.state, outcome }; } };
}
