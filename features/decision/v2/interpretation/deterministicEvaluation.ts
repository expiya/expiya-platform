import type { InterpretationResult } from "./types";

export interface DeterministicInterpretationEvaluationCase {
  readonly id: string;
  readonly category: "BODY" | "BUDGET" | "QUESTION_BINDING" | "USAGE" | "KNOWLEDGE_NEUTRALITY" | "CAPACITY" | "TRANSMISSION" | "MODEL_SCOPE" | "CONSENT" | "DISCOVERY";
  readonly group: string;
  readonly userText: string;
  readonly openMaterialQuestionField?: string;
  readonly requiredSignals: readonly string[];
  readonly forbiddenSignals?: readonly string[];
}

export interface DeterministicInterpretationEvaluationReport {
  readonly schemaVersion: "1.0.0";
  readonly caseCount: number;
  readonly groupCount: number;
  readonly passedCaseCount: number;
  readonly casePassRate: number;
  readonly requiredSignalRecall: number;
  readonly forbiddenSignalViolationRate: number;
  readonly metamorphicConsistencyRate: number;
  readonly repeatabilityRate: number;
  readonly categoryMetrics: Readonly<Record<string, Readonly<{ caseCount: number; casePassRate: number; requiredSignalRecall: number; forbiddenSignalViolationRate: number }>>>;
  readonly failures: readonly Readonly<{ caseId: string; missing: readonly string[]; forbiddenPresent: readonly string[] }>[];
}

const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
};

export function interpretationSignals(result: InterpretationResult): readonly string[] {
  return Object.freeze([
    ...result.acts.map((act) => `act:${act}`),
    ...result.directAnswerRequests.map((request) => `answer:${request.kind}`),
    ...result.constraintMutations.map((mutation) => `constraint:${mutation.operation}:${mutation.fieldId}:${stable(mutation.normalizedValue)}`),
    ...result.budgetMutations.map((mutation) => `budget:${mutation.operation}:${mutation.field}:${stable(mutation.value)}`),
    ...result.modelReferences.map((reference) => `model:${reference.purpose}:${reference.parsedBrandText ?? ""}:${reference.parsedModelText ?? reference.rawText}`),
    ...result.personaMutations.flatMap((mutation) => mutation.traits.map((trait) => `persona:${mutation.operation}:${trait}`)),
    ...(result.candidateRejection ? [`rejection:${result.candidateRejection.scope}`] : []),
  ].sort());
}

export function evaluateDeterministicInterpretation(
  cases: readonly DeterministicInterpretationEvaluationCase[],
  interpret: (item: DeterministicInterpretationEvaluationCase) => InterpretationResult,
): DeterministicInterpretationEvaluationReport {
  const runs = cases.map((item) => {
    const first = interpretationSignals(interpret(item));
    const second = interpretationSignals(interpret(item));
    const available = new Set(first);
    const missing = item.requiredSignals.filter((signal) => !available.has(signal));
    const forbiddenPresent = (item.forbiddenSignals ?? []).filter((signal) => available.has(signal));
    return { item, first, repeated: stable(first) === stable(second), missing, forbiddenPresent };
  });
  const requiredCount = cases.reduce((sum, item) => sum + item.requiredSignals.length, 0);
  const missingCount = runs.reduce((sum, run) => sum + run.missing.length, 0);
  const forbiddenCount = cases.reduce((sum, item) => sum + (item.forbiddenSignals?.length ?? 0), 0);
  const forbiddenPresentCount = runs.reduce((sum, run) => sum + run.forbiddenPresent.length, 0);
  const groups = [...new Set(cases.map((item) => item.group))];
  const consistentGroups = groups.filter((group) => {
    const members = runs.filter((run) => run.item.group === group);
    if (members.length < 2) return true;
    const contractProjection = (run: typeof members[number]) => stable(run.first.filter((signal) => run.item.requiredSignals.includes(signal) || (run.item.forbiddenSignals ?? []).includes(signal)));
    return members.every((member) => contractProjection(member) === contractProjection(members[0]!));
  });
  const failures = runs.filter((run) => run.missing.length > 0 || run.forbiddenPresent.length > 0)
    .map((run) => Object.freeze({ caseId: run.item.id, missing: Object.freeze(run.missing), forbiddenPresent: Object.freeze(run.forbiddenPresent) }));
  const categoryMetrics = Object.fromEntries([...new Set(cases.map((item) => item.category))].sort().map((category) => {
    const categoryRuns = runs.filter((run) => run.item.category === category);
    const categoryRequired = categoryRuns.reduce((sum, run) => sum + run.item.requiredSignals.length, 0);
    const categoryForbidden = categoryRuns.reduce((sum, run) => sum + (run.item.forbiddenSignals?.length ?? 0), 0);
    const categoryMissing = categoryRuns.reduce((sum, run) => sum + run.missing.length, 0);
    const categoryForbiddenPresent = categoryRuns.reduce((sum, run) => sum + run.forbiddenPresent.length, 0);
    const passed = categoryRuns.filter((run) => run.missing.length === 0 && run.forbiddenPresent.length === 0).length;
    return [category, Object.freeze({ caseCount: categoryRuns.length, casePassRate: passed / categoryRuns.length,
      requiredSignalRecall: categoryRequired === 0 ? 1 : (categoryRequired - categoryMissing) / categoryRequired,
      forbiddenSignalViolationRate: categoryForbidden === 0 ? 0 : categoryForbiddenPresent / categoryForbidden })];
  }));
  return Object.freeze({
    schemaVersion: "1.0.0", caseCount: cases.length, groupCount: groups.length,
    passedCaseCount: cases.length - failures.length,
    casePassRate: cases.length === 0 ? 1 : (cases.length - failures.length) / cases.length,
    requiredSignalRecall: requiredCount === 0 ? 1 : (requiredCount - missingCount) / requiredCount,
    forbiddenSignalViolationRate: forbiddenCount === 0 ? 0 : forbiddenPresentCount / forbiddenCount,
    metamorphicConsistencyRate: groups.length === 0 ? 1 : consistentGroups.length / groups.length,
    repeatabilityRate: cases.length === 0 ? 1 : runs.filter((run) => run.repeated).length / cases.length,
    categoryMetrics: Object.freeze(categoryMetrics),
    failures: Object.freeze(failures),
  });
}
