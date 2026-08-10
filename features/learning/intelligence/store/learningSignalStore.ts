import { LearningSignal } from "@/types/learningSignal";

export interface LearningSignalStore {
  save(signal: LearningSignal): void;
  get(id: string): LearningSignal | undefined;
  getAll(): LearningSignal[];
}

export class InMemoryLearningSignalStore implements LearningSignalStore {
  private readonly signals = new Map<string, LearningSignal>();

  save(signal: LearningSignal): void {
    this.signals.set(signal.id, signal);
  }

  get(id: string): LearningSignal | undefined {
    return this.signals.get(id);
  }

  getAll(): LearningSignal[] {
    return Array.from(this.signals.values());
  }
}

export const learningSignalStore: LearningSignalStore =
  new InMemoryLearningSignalStore();
