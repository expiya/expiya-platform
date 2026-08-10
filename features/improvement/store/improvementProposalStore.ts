import { ImprovementProposal } from "@/types/improvementProposal";

export interface ImprovementProposalStore {
  save(proposal: ImprovementProposal): void;
  get(id: string): ImprovementProposal | undefined;
  getAll(): ImprovementProposal[];
}

export class InMemoryImprovementProposalStore
  implements ImprovementProposalStore
{
  private readonly proposals = new Map<string, ImprovementProposal>();

  save(proposal: ImprovementProposal): void {
    this.proposals.set(proposal.id, proposal);
  }

  get(id: string): ImprovementProposal | undefined {
    return this.proposals.get(id);
  }

  getAll(): ImprovementProposal[] {
    return Array.from(this.proposals.values());
  }
}

export const improvementProposalStore: ImprovementProposalStore =
  new InMemoryImprovementProposalStore();
