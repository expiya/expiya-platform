import type { AppliancesSemanticProposal } from "./interpretation";

export type ProposalSetValidation =
  | { readonly status: "VALID"; readonly accepted: readonly AppliancesSemanticProposal[]; readonly rejectedProposalIds: readonly string[] }
  | { readonly status: "INCONSISTENT_SET"; readonly conceptId: string };

function valueIsValid(proposal: AppliancesSemanticProposal): boolean {
  if (proposal.kind === "CLEAR" || proposal.kind === "REJECT") return true;
  if (proposal.conceptId === "HIGH_LAUNDRY_VOLUME") {
    const kg = (proposal.normalizedValue as { minimumCapacityKg?: unknown } | undefined)?.minimumCapacityKg;
    return typeof kg !== "number" || (Number.isFinite(kg) && kg >= 1 && kg <= 30);
  }
  if (proposal.conceptId === "BUDGET_SENSITIVITY") {
    const amount = (proposal.normalizedValue as { maximumTry?: unknown } | undefined)?.maximumTry;
    return typeof amount === "number" && Number.isFinite(amount) && amount >= 1_000 && amount <= 10_000_000;
  }
  return proposal.normalizedValue !== undefined;
}

export function validateAppliancesProposalSet(proposals: readonly AppliancesSemanticProposal[]): ProposalSetValidation {
  const accepted = proposals.filter(valueIsValid);
  const rejectedProposalIds = proposals.filter((proposal) => !valueIsValid(proposal)).map((proposal) => proposal.proposalId);
  const byConcept = new Map<string, string>();
  for (const proposal of accepted) {
    if (proposal.kind === "CLEAR" || proposal.kind === "REJECT") continue;
    const value = JSON.stringify(proposal.normalizedValue);
    const prior = byConcept.get(proposal.conceptId);
    if (prior !== undefined && prior !== value) return { status: "INCONSISTENT_SET", conceptId: proposal.conceptId };
    byConcept.set(proposal.conceptId, value);
  }
  return { status: "VALID", accepted, rejectedProposalIds };
}
