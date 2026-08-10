import { ImprovementExecution } from "@/types/improvementExecution";

export interface ImprovementExecutionStore {
  save(execution: ImprovementExecution): void;
  get(id: string): ImprovementExecution | undefined;
  getAll(): ImprovementExecution[];
}

export class InMemoryImprovementExecutionStore
  implements ImprovementExecutionStore
{
  private readonly executions = new Map<string, ImprovementExecution>();

  save(execution: ImprovementExecution): void {
    this.executions.set(execution.id, execution);
  }

  get(id: string): ImprovementExecution | undefined {
    return this.executions.get(id);
  }

  getAll(): ImprovementExecution[] {
    return Array.from(this.executions.values());
  }
}

export const improvementExecutionStore: ImprovementExecutionStore =
  new InMemoryImprovementExecutionStore();
