import { OWNER_REVIEWED_ANALYST_CORPUS_V1 } from "../features/decision/v3/analyst/ownerReviewedCorpus";
import { evaluateAnalystActivation } from "../features/decision/v3/analyst/activationGate";
import { analyzeSemanticNeedsFallback } from "../features/decision/v3/analyst/fallback";
import { createDecisionNeutralityFingerprint, runV3TurnWithAnalyst, type AnalystTraceEnvelope } from "../features/decision/v3/analyst/shadowRuntime.server";

process.env.CARS_V31_PROVIDER_DISABLED = "true";
process.env.CARS_SEMANTIC_ANALYST_PROVIDER_DISABLED = "true";
async function main() {
  const results = [];
  for (const [index, entry] of OWNER_REVIEWED_ANALYST_CORPUS_V1.entries()) {
    const common = { messageId: `m-${index}`, message: entry.message, expectedRevision: 0 } as const;
    const off = await runV3TurnWithAnalyst({ conversationId: `baseline-off-${entry.id}`, ...common, analystMode: "OFF" }); let trace: AnalystTraceEnvelope | undefined;
    const shadow = await runV3TurnWithAnalyst({ conversationId: `baseline-shadow-${entry.id}`, ...common, analystMode: "SHADOW", analystProvider: async (input) => analyzeSemanticNeedsFallback(input), onAnalystTrace: (value) => { trace = value; } });
    const offFingerprint = await createDecisionNeutralityFingerprint(off); const shadowFingerprint = await createDecisionNeutralityFingerprint(shadow);
    results.push({ id: entry.id, neutral: offFingerprint === shadowFingerprint, offFingerprint, shadowFingerprint, selectedV3Question: shadow.state.lastQuestionKey, plannerShadowQuestion: trace?.trace.selectedQuestionKey, acceptedFacts: trace?.trace.acceptedExplicitFacts ?? [], acceptedHypotheses: trace?.trace.acceptedHypotheses ?? [] });
  }
  const failures = results.filter((item) => !item.neutral);
  const plannerQuestions = results.filter((item) => item.plannerShadowQuestion).length;
  const shadowActivation = evaluateAnalystActivation("SHADOW", {
    ownerReviewedCases: OWNER_REVIEWED_ANALYST_CORPUS_V1.length,
    shadowCases: results.length,
    neutralShadowCases: results.length - failures.length,
    structuredSchemaPassed: true,
    sourceSpanGovernancePassed: true,
    dependencyAndReductionTestsPassed: true,
    publicPayloadLeakageTestsPassed: true,
    promptfooConfigurationValidated: true,
    liveModelEvaluationPassed: false,
    explicitFactProjectionPassed: false,
    correctionProjectionPassed: false,
  });
  const payload = { version: "semantic-needs-shadow-report/v1", mode: "BOUNDED_FALLBACK", cases: results.length, neutralCases: results.length - failures.length, failedCases: failures.map((item) => item.id), plannerQuestionCoverage: plannerQuestions / results.length, shadowActivation, ...(process.argv.includes("--details") ? { results } : {}) };
  console.log(JSON.stringify(payload, null, 2));
  if (failures.length) process.exitCode = 1;
}
void main();
