import { describe, expect, it } from "vitest";
import { analyzeSemanticNeedsFallback } from "./fallback";
import { governSemanticNeedsAnalysis } from "./governance";
import { OWNER_REVIEWED_ANALYST_CORPUS_V1 } from "./ownerReviewedCorpus";

describe("owner-reviewed Semantic Needs Analyst corpus v1", () => {
  it.each(OWNER_REVIEWED_ANALYST_CORPUS_V1)("$id", (entry) => {
    const raw = analyzeSemanticNeedsFallback({ message: entry.message, sourceMessageId: entry.id, conversationRevision: 0 }); const governed = governSemanticNeedsAnalysis(entry.message, raw);
    if (entry.noSignals) { expect(governed.acceptedExplicitFacts).toEqual([]); expect(governed.acceptedHypotheses).toEqual([]); }
    for (const expected of entry.expectedExplicit ?? []) expect(governed.acceptedExplicitFacts).toContainEqual(expect.objectContaining({ concept: expected.concept, normalizedValue: expected.value }));
    for (const expected of entry.expectedHypotheses ?? []) expect(governed.acceptedHypotheses).toContainEqual(expect.objectContaining({ concept: expected.concept, decisionUse: expected.decisionUse }));
    for (const expected of entry.expectedCorrections ?? []) expect(governed.acceptedCorrections).toContainEqual(expect.objectContaining({ concept: expected.concept, operation: expected.operation }));
    for (const forbidden of entry.forbiddenExplicitValues ?? []) expect(governed.acceptedExplicitFacts.some((item) => String(item.normalizedValue).toLocaleUpperCase("tr-TR") === forbidden)).toBe(false);
  });
});
