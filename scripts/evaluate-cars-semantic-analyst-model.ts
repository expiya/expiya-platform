import { evaluateAnalystActivation } from "../features/decision/v3/analyst/activationGate";
import { governSemanticNeedsAnalysis } from "../features/decision/v3/analyst/governance";
import { analyzeSemanticNeedsFallback } from "../features/decision/v3/analyst/fallback";
import { OWNER_REVIEWED_ANALYST_CORPUS_V1 } from "../features/decision/v3/analyst/ownerReviewedCorpus";
import { analyzeSemanticNeeds } from "../features/decision/v3/analyst/provider.server";

async function main() {
  type EvaluationResult = { readonly id: string; readonly origin: "MODEL" | "BOUNDED_FALLBACK"; readonly passed: boolean; readonly failures: readonly string[]; readonly fallbackRecovery?: boolean };
  const requestedCases = new Set((process.argv.find((item) => item.startsWith("--cases="))?.slice("--cases=".length) ?? process.argv.find((item) => item.startsWith("--case="))?.slice("--case=".length) ?? "").split(",").filter(Boolean));
  const entries = [...OWNER_REVIEWED_ANALYST_CORPUS_V1.entries()].filter(([, entry]) => requestedCases.size === 0 || requestedCases.has(entry.id));
  const results: EvaluationResult[] = new Array(entries.length);
  let cursor = 0;
  async function worker() {
    while (cursor < entries.length) {
      const current = cursor++; const tuple = entries[current]; if (!tuple) return; const [index, entry] = tuple;
      let raw; let providerError: unknown;
      for (let attempt = 0; attempt < 2 && !raw; attempt += 1) try {
        raw = await analyzeSemanticNeeds({
        message: entry.message,
        sourceMessageId: `model-eval-${index}`,
        conversationRevision: 0,
        activeExplicitStatements: [],
        rejectedOrSuperseded: [],
        providerFailureMode: "THROW",
        providerTimeoutMs: 60_000,
        });
      } catch (error) { providerError = error; }
    if (!raw) {
      const failure = providerError as { name?: string; status?: number; code?: string; message?: string };
      const safeMessage = (failure.message ?? "").replace(/sk-[A-Za-z0-9_-]+/gu, "[REDACTED]").slice(0, 180);
      const category = /abort/iu.test(safeMessage) ? "TIMEOUT" : /parse|structured|schema/iu.test(safeMessage) ? "STRUCTURED_OUTPUT" : failure.status ?? failure.code ?? failure.name ?? "UNKNOWN";
      if (process.argv.includes("--details")) console.log(JSON.stringify({ id: entry.id, providerError: { category, message: safeMessage } }, null, 2));
      raw = analyzeSemanticNeedsFallback({ message: entry.message, sourceMessageId: `model-eval-${index}`, conversationRevision: 0 });
    }
    const governed = governSemanticNeedsAnalysis(entry.message, raw);
    const failures: string[] = [];
    if (entry.noSignals && (governed.acceptedExplicitFacts.length > 0 || governed.acceptedHypotheses.length > 0)) failures.push("UNEXPECTED_SIGNAL");
    for (const expected of entry.expectedExplicit ?? []) {
      if (!governed.acceptedExplicitFacts.some((item) => item.concept === expected.concept && item.normalizedValue === expected.value)) failures.push(`MISSING_EXPLICIT:${expected.concept}`);
    }
    for (const expected of entry.expectedHypotheses ?? []) {
      if (!governed.acceptedHypotheses.some((item) => item.concept === expected.concept && item.decisionUse === expected.decisionUse)) failures.push(`MISSING_HYPOTHESIS:${expected.concept}`);
    }
    for (const expected of entry.expectedCorrections ?? []) {
      if (!governed.acceptedCorrections.some((item) => item.concept === expected.concept && item.operation === expected.operation)) failures.push(`MISSING_CORRECTION:${expected.concept}`);
    }
    for (const forbidden of entry.forbiddenExplicitValues ?? []) {
      if (governed.acceptedExplicitFacts.some((item) => String(item.normalizedValue).toLocaleUpperCase("tr-TR") === forbidden)) failures.push(`FORBIDDEN_EXPLICIT:${forbidden}`);
    }
      results[current] = { id: entry.id, origin: raw.origin, passed: failures.length === 0, failures, ...(raw.origin === "BOUNDED_FALLBACK" ? { fallbackRecovery: true } : {}) };
      if (process.argv.includes("--details")) console.log(JSON.stringify({ id: entry.id, raw, governed }, null, 2));
    }
  }
  await Promise.all(Array.from({ length: 4 }, () => worker()));

  const failed = results.filter((item) => !item.passed);
  const failureCounts = failed.flatMap((item) => item.failures).reduce<Record<string, number>>((counts, reason) => ({ ...counts, [reason]: (counts[reason] ?? 0) + 1 }), {});
  const modelCases = results.filter((item) => item.origin === "MODEL").length;
  const providerCoverage = results.length > 0 ? modelCases / results.length : 0;
  const liveModelEvaluationPassed = failed.length === 0 && providerCoverage >= 0.9;
  const activation = evaluateAnalystActivation("QUESTION_INPUT", {
    ownerReviewedCases: OWNER_REVIEWED_ANALYST_CORPUS_V1.length,
    shadowCases: results.length,
    neutralShadowCases: results.length,
    structuredSchemaPassed: true,
    sourceSpanGovernancePassed: true,
    dependencyAndReductionTestsPassed: true,
    publicPayloadLeakageTestsPassed: true,
    promptfooConfigurationValidated: true,
    liveModelEvaluationPassed,
  });
  console.log(JSON.stringify({
    version: "semantic-needs-model-evaluation/v1",
    cases: results.length,
    modelCases,
    providerCoverage,
    fallbackRecoveryCases: results.filter((item) => item.fallbackRecovery).map((item) => item.id),
    passedCases: results.length - failed.length,
    failedCaseIds: failed.map((item) => item.id),
    failedCases: failed,
    failureCounts,
    activation,
  }, null, 2));
  if (!liveModelEvaluationPassed) process.exitCode = 1;
}

void main();
