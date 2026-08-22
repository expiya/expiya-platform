export interface MoneyTry {
  readonly amount: number;
  readonly currency: "TRY";
}

export type FinanceFlexibility = "NONE" | "POSSIBLE" | "YES" | "UNKNOWN";
export type BudgetImportance = "HARD" | "IMPORTANT" | "SOFT" | "NONE" | "UNKNOWN";

export interface BudgetState {
  readonly minimumBudget?: MoneyTry;
  readonly availableCash?: MoneyTry;
  readonly preferredBudget?: MoneyTry;
  readonly maximumHardCeiling?: MoneyTry;
  readonly financeFlexibility: FinanceFlexibility;
  readonly unresolvedFinancedCeiling: boolean;
  readonly budgetImportance: BudgetImportance;
  readonly budgetUnknown: boolean;
  readonly budgetExcluded: boolean;
}
