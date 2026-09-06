import { loadActiveAppliancesAuthority, loadCurrentPriceProjection, type AppliancesArtifactRepository } from "../authority/loader.server";
import { evaluateAppliancesCandidates } from "../candidate/evaluate";
import type { AppliancesConversationState } from "../contracts";
import { loadActiveWashingMachineQuestionPolicy, type QuestionPolicyArtifactRepository } from "../governance/questionPolicyLoader.server";
import { loadActiveWashingMachineSufficiencyRecommendationPolicy, type SufficiencyRecommendationPolicyRepository } from "../governance/sufficiencyRecommendationPolicyLoader.server";
import { planAppliancesQuestion } from "../planner/plan";
import { evaluateAppliancesSufficiency } from "./evaluate";
import type { AppliancesSufficiencyResult } from "./types";

export async function evaluateCurrentAppliancesSufficiency(input: { readonly artifactRepository: AppliancesArtifactRepository; readonly questionPolicyRepository: QuestionPolicyArtifactRepository; readonly sufficiencyPolicyRepository: SufficiencyRecommendationPolicyRepository; readonly state: AppliancesConversationState; readonly now: Date }): Promise<AppliancesSufficiencyResult> {
  const authority = await loadActiveAppliancesAuthority({ repository: input.artifactRepository }); if (authority.status !== "READY") return { kind: "FAILED_CLOSED", reason: "AUTHORITY_BINDING_MISMATCH" };
  const questionPolicy = await loadActiveWashingMachineQuestionPolicy({ repository: input.questionPolicyRepository, authority: authority.snapshot }); if (questionPolicy.status !== "READY") return { kind: "FAILED_CLOSED", reason: "QUESTION_POLICY_BINDING_MISMATCH" };
  const policy = await loadActiveWashingMachineSufficiencyRecommendationPolicy({ repository: input.sufficiencyPolicyRepository, authority: authority.snapshot, questionPolicy: questionPolicy.snapshot });
  const price = await loadCurrentPriceProjection({ repository: input.artifactRepository, authority: authority.snapshot, now: input.now });
  const evaluation = evaluateAppliancesCandidates({ authority: authority.snapshot, state: input.state, price });
  const planner = planAppliancesQuestion({ authority: authority.snapshot, policy: questionPolicy, state: input.state, evaluation, price });
  return evaluateAppliancesSufficiency({ authority: authority.snapshot, state: input.state, evaluation, planner, price, policy });
}
