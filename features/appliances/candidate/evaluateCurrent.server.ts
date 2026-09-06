import { loadActiveAppliancesAuthority, loadCurrentPriceProjection, type AppliancesArtifactRepository } from "../authority/loader.server";
import type { AppliancesConversationState } from "../contracts";
import { evaluateAppliancesCandidates } from "./evaluate";
import type { AppliancesCandidateEvaluationResult } from "./types";

export async function evaluateCurrentAppliancesCandidates(input: { readonly repository: AppliancesArtifactRepository; readonly state: AppliancesConversationState; readonly now: Date }): Promise<AppliancesCandidateEvaluationResult> {
  const authority = await loadActiveAppliancesAuthority({ repository: input.repository });
  if (authority.status !== "READY") return { status: "FAILED_CLOSED", reason: "CATALOG_INTEGRITY_FAILURE" };
  const price = await loadCurrentPriceProjection({ repository: input.repository, authority: authority.snapshot, now: input.now });
  return evaluateAppliancesCandidates({ authority: authority.snapshot, state: input.state, price });
}
