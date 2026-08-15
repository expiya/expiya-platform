import type { CarsConversationTrace } from "@/types/carsConversation";

export type CarsDirectRecommendationCoverage =
  | "DIRECT_RECOMMENDATION_SUPPORTED"
  | "DIRECT_RECOMMENDATION_BLOCKED_BY_COVERAGE"
  | "DIRECT_RECOMMENDATION_NEEDS_ONE_MATERIAL_FACT";

export function assessDirectRecommendationCoverage(input: {
  readonly namedModel?: string;
  readonly wantsNamedAlternatives: boolean;
  readonly memory: CarsConversationTrace;
}): CarsDirectRecommendationCoverage {
  if (!input.wantsNamedAlternatives) return "DIRECT_RECOMMENDATION_BLOCKED_BY_COVERAGE";
  if (input.namedModel) return "DIRECT_RECOMMENDATION_BLOCKED_BY_COVERAGE";
  const hasSeats = input.memory.requirements.some((entry) => entry.key === "MIN_SEATS");
  const hasCargo = input.memory.requirements.some((entry) => entry.key === "MIN_CARGO_L");
  if (hasSeats && hasCargo) return "DIRECT_RECOMMENDATION_SUPPORTED";
  if (hasSeats !== hasCargo) return "DIRECT_RECOMMENDATION_NEEDS_ONE_MATERIAL_FACT";
  return "DIRECT_RECOMMENDATION_BLOCKED_BY_COVERAGE";
}

export function coverageLimitationMessage(namedModel?: string, addressForm?: "SEN" | "SIZ"): string {
  const model = namedModel ? namedModel.charAt(0).toUpperCase() + namedModel.slice(1) : "bu modele";
  const invite = addressForm === "SIZ"
    ? "İsterseniz kullanımı netleştiririz ya da burada dururuz."
    : "İstersen kullanımı netleştiririz ya da burada dururuz.";
  return `${model} için elimde güvenilir isimli bir alternatif yok. Rastgele model uydurmak istemem. ${invite}`;
}

export function alreadyStatedCoverageLimitation(messages: readonly { role: string; content: string }[]): boolean {
  return messages.some((message) => (
    message.role === "assistant"
    && /güvenilir isimli bir alternatif yok|rastgele model uydurmak/iu.test(message.content)
  ));
}

export function coverageLimitationRepeat(addressForm?: "SEN" | "SIZ"): string {
  return addressForm === "SIZ"
    ? "İsim uyduramam; burada durabiliriz."
    : "İsim uyduramam; burada durabiliriz.";
}
