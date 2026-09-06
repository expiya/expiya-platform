import { createFileSystemAppliancesArtifactRepository, loadActiveAppliancesAuthority, loadCurrentPriceProjection } from "../authority/loader.server";
import { createFileSystemQuestionPolicyRepository, loadActiveWashingMachineQuestionPolicy } from "../governance/questionPolicyLoader.server";
import { createFileSystemSufficiencyRecommendationPolicyRepository, loadActiveWashingMachineSufficiencyRecommendationPolicy } from "../governance/sufficiencyRecommendationPolicyLoader.server";
import { createFileSystemCandidateSelectionPolicyRepository, loadActiveWashingMachineCandidateSelectionPolicy } from "../governance/candidateSelectionPolicyLoader.server";
import { createFileSystemRecommendationConstructionPolicyRepository, loadActiveWashingMachineRecommendationConstructionPolicy } from "../governance/recommendationConstructionPolicyLoader.server";

export async function loadRecommendationAuthority(root: string, now: Date) {
  const repository = createFileSystemAppliancesArtifactRepository(root);
  const a = await loadActiveAppliancesAuthority({ repository });
  if (a.status !== "READY") throw new Error(a.reason);
  const authority = a.snapshot;
  const question = await loadActiveWashingMachineQuestionPolicy({ repository: createFileSystemQuestionPolicyRepository(root), authority });
  if (question.status !== "READY") throw new Error(question.reason);
  const sufficiency = await loadActiveWashingMachineSufficiencyRecommendationPolicy({ repository: createFileSystemSufficiencyRecommendationPolicyRepository(root), authority, questionPolicy: question.snapshot });
  if (sufficiency.status !== "READY") throw new Error(sufficiency.reason);
  const selection = await loadActiveWashingMachineCandidateSelectionPolicy({ repository: createFileSystemCandidateSelectionPolicyRepository(root), authority, questionPolicy: question.snapshot, sufficiencyPolicy: sufficiency.snapshot });
  if (selection.status !== "READY") throw new Error(selection.reason);
  const construction = await loadActiveWashingMachineRecommendationConstructionPolicy({ repository: createFileSystemRecommendationConstructionPolicyRepository(root), authority, questionPolicy: question.snapshot, sufficiencyPolicy: sufficiency.snapshot, selectionPolicy: selection.snapshot });
  if (construction.status !== "READY") throw new Error(construction.reason);
  const price = await loadCurrentPriceProjection({ repository, authority, now });
  return { authority, question, sufficiency, selection, construction, price, now };
}
export type RecommendationAuthority = Awaited<ReturnType<typeof loadRecommendationAuthority>>;
