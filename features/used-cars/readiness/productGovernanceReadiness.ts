import { usedCarsArchitectureDecisions, validateArchitectureDecisionRegister } from "../governance/architectureDecisions";
import { assessProductDecisionRegister, usedCarsProductDecisions } from "../governance/productDecisions";
import { usedCarsFounderDecisionRatification, validateFounderDecisionRatification } from "../governance/founderDecisionRatification";

export function assessProductGovernanceReadiness() {
  const architectureCodes = validateArchitectureDecisionRegister(usedCarsArchitectureDecisions);
  const product = assessProductDecisionRegister(usedCarsProductDecisions);
  const founder = validateFounderDecisionRatification(usedCarsFounderDecisionRatification);
  const missing = [...architectureCodes, ...product.unresolved.map((id) => `DECISION_APPROVAL_REQUIRED:${id}`)];
  return Object.freeze({ ready: missing.length === 0, missing: Object.freeze(missing), architectureRegisterValid: architectureCodes.length === 0, founderRecommendationsAccepted: founder.founderRecommendationsAccepted, productDefaultsAutoApproved: false as const, productionScopeAuthorized: false as const });
}
export const currentUsedCarsProductGovernanceReadiness = assessProductGovernanceReadiness();
