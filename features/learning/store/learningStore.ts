import { LearningRecord } from "@/types/learning";

export interface LearningStore {
  save(record: LearningRecord): void;
  get(id: string): LearningRecord | undefined;
  getAll(): LearningRecord[];
  findByDecisionId(decisionId: string): LearningRecord[];
}

export class InMemoryLearningStore implements LearningStore {
  private readonly records = new Map<string, LearningRecord>();

  save(record: LearningRecord): void {
    this.records.set(record.id, record);
  }

  get(id: string): LearningRecord | undefined {
    return this.records.get(id);
  }

  getAll(): LearningRecord[] {
    return Array.from(this.records.values());
  }

  findByDecisionId(decisionId: string): LearningRecord[] {
    return this.getAll().filter(
      (record) => record.decisionId === decisionId,
    );
  }
}

export const learningStore: LearningStore = new InMemoryLearningStore();
