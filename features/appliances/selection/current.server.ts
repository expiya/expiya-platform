import { loadActiveAppliancesAuthority, loadCurrentPriceProjection, type AppliancesArtifactRepository } from "../authority/loader.server";
import { evaluateAppliancesCandidates } from "../candidate/evaluate";
import type { AppliancesConversationState } from "../contracts";
import { createFileSystemCandidateSelectionPolicyRepository, loadActiveWashingMachineCandidateSelectionPolicy, type CandidateSelectionPolicyRepository } from "../governance/candidateSelectionPolicyLoader.server";
import { loadActiveWashingMachineQuestionPolicy, type QuestionPolicyArtifactRepository } from "../governance/questionPolicyLoader.server";
import { loadActiveWashingMachineSufficiencyRecommendationPolicy, type SufficiencyRecommendationPolicyRepository } from "../governance/sufficiencyRecommendationPolicyLoader.server";
import { planAppliancesQuestion } from "../planner/plan";
import { evaluateAppliancesSufficiency } from "../sufficiency/evaluate";
import { evaluateAppliancesCandidateSelection } from "./evaluate";
import type { AppliancesCandidateSelectionResult } from "./types";

export async function evaluateCurrentAppliancesCandidateSelection(input: { readonly artifactRepository: AppliancesArtifactRepository; readonly questionPolicyRepository: QuestionPolicyArtifactRepository; readonly sufficiencyPolicyRepository: SufficiencyRecommendationPolicyRepository; readonly selectionPolicyRepository: CandidateSelectionPolicyRepository; readonly state: AppliancesConversationState; readonly now: Date }): Promise<AppliancesCandidateSelectionResult> {
  const authority = await loadActiveAppliancesAuthority({ repository: input.artifactRepository }); if (authority.status !== "READY") return closed("DEPENDENCY_BINDING_MISMATCH");
  const questionPolicy = await loadActiveWashingMachineQuestionPolicy({ repository: input.questionPolicyRepository, authority: authority.snapshot }); if (questionPolicy.status !== "READY") return closed("DEPENDENCY_BINDING_MISMATCH");
  const sufficiencyPolicy = await loadActiveWashingMachineSufficiencyRecommendationPolicy({ repository: input.sufficiencyPolicyRepository, authority: authority.snapshot, questionPolicy: questionPolicy.snapshot });
  const selectionPolicy = sufficiencyPolicy.status === "READY" ? await loadActiveWashingMachineCandidateSelectionPolicy({ repository: input.selectionPolicyRepository, authority: authority.snapshot, questionPolicy: questionPolicy.snapshot, sufficiencyPolicy: sufficiencyPolicy.snapshot }) : { status: "FAILED_CLOSED" as const, reason: "SUFFICIENCY_POLICY_BINDING_MISMATCH" as const };
  const price = await loadCurrentPriceProjection({ repository: input.artifactRepository, authority: authority.snapshot, now: input.now }), evaluation = evaluateAppliancesCandidates({ authority: authority.snapshot, state: input.state, price }), planner = planAppliancesQuestion({ authority: authority.snapshot, policy: questionPolicy, state: input.state, evaluation, price }), sufficiency = evaluateAppliancesSufficiency({ authority: authority.snapshot, state: input.state, evaluation, planner, price, policy: sufficiencyPolicy });
  return evaluateAppliancesCandidateSelection({ authority: authority.snapshot, state: input.state, evaluation, sufficiency, policy: selectionPolicy });
}
function closed(reason: "DEPENDENCY_BINDING_MISMATCH"): AppliancesCandidateSelectionResult { return { outcome: "FAILED_CLOSED", reason, deterministicResultFingerprint: "392e6b0d385be01add5c428733206492afcf74cdfec5aa500048bc924c9a3c5a" }; }
export { createFileSystemCandidateSelectionPolicyRepository };
