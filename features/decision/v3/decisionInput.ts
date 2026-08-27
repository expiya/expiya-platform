import { activeDecisionPreferences, latestActiveLedgerEvent } from "./ledger";
import type { BudgetDecisionMode, PreferenceEvent } from "./types";

const isBudget = (item: PreferenceEvent) => item.concept === "budgetMax" || item.concept === "budgetTarget";

export function projectV3DecisionPreferences(ledger: readonly PreferenceEvent[], budgetMode: BudgetDecisionMode = "NEEDS_ONLY"): readonly PreferenceEvent[] {
  const needs = activeDecisionPreferences(ledger).filter((item) => item.field !== "equipmentFeature" && !isBudget(item));
  if (budgetMode !== "BUDGET_AS_DECISION_FILTER") return needs;
  const budget = latestActiveLedgerEvent(ledger, "budgetMax");
  return budget ? [...needs, { ...budget, field: "price", decisionUse: "HARD_FILTER" as const }] : needs;
}
