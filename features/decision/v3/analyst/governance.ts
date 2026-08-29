import type { AnalystCorrection, AnalystExplicitFact, AnalystHypothesis, SemanticNeedsAnalysisV1 } from "./contract";

export interface RejectedSignal { readonly concept: string; readonly reasonCode: string }
export interface GovernedAnalystFact extends AnalystExplicitFact { readonly governance: "ACCEPTED_EXPLICIT" }
export interface GovernedAnalystHypothesis extends AnalystHypothesis { readonly governance: "ACCEPTED_QUESTION_INPUT" | "ACCEPTED_NONE" }
export interface GovernedAnalysis {
  readonly acceptedExplicitFacts: readonly GovernedAnalystFact[]; readonly rejectedExplicitFacts: readonly RejectedSignal[];
  readonly acceptedHypotheses: readonly GovernedAnalystHypothesis[]; readonly rejectedHypotheses: readonly RejectedSignal[];
  readonly acceptedCorrections: readonly AnalystCorrection[]; readonly rejectedCorrections: readonly RejectedSignal[];
}

type AnalystSourceSpan = { readonly start: number; readonly end: number; readonly text: string };

// Structured-output models can count Unicode code points instead of JavaScript
// UTF-16 code units. The quoted text is still the authority: repair offsets only
// when that exact quote occurs once in the untrusted user message.
const resolveExactSpan = (message: string, span: AnalystSourceSpan): AnalystSourceSpan | undefined => {
  if (span.start >= 0 && span.end > span.start && span.end <= message.length && message.slice(span.start, span.end) === span.text) return span;
  if (!span.text) return undefined;
  const start = message.indexOf(span.text);
  if (start < 0 || message.indexOf(span.text, start + 1) >= 0) return undefined;
  return { start, end: start + span.text.length, text: span.text };
};
const canonicalExplicitValue = (fact: AnalystExplicitFact): AnalystExplicitFact["normalizedValue"] | undefined => {
  const source = fact.sourceSpan.text;
  if (fact.concept === "primaryUsage") {
    const value = String(fact.normalizedValue);
    return ["URBAN_DAILY", "FAMILY", "LONG_DISTANCE", "COMMERCIAL", "CORPORATE_TRAVEL", "PASSENGER_TRANSPORT", "MIXED_ROAD", "RURAL_DAILY"].includes(value) ? value : undefined;
  }
  if (fact.concept === "roadCondition") return fact.normalizedValue === "ROUGH_UNPAVED" ? "ROUGH_UNPAVED" : undefined;
  if (fact.concept === "parkingDifficulty") return fact.normalizedValue === "HIGH" ? "HIGH" : undefined;
  if (fact.concept === "cargoRequirement") return fact.normalizedValue === "GOODS_TRANSPORT" ? "GOODS_TRANSPORT" : undefined;
  if (fact.concept === "passengerCapacity") { const count = Number(source.match(/\d{1,2}/u)?.[0]); return Number.isInteger(count) && count > 0 ? count : undefined; }
  if (fact.concept === "fuelPreference") return ["ELEKTRİKLİ", "BENZİNLİ", "DİZEL", "HİBRİT", "LPG"].includes(String(fact.normalizedValue)) ? fact.normalizedValue : undefined;
  if (fact.concept === "transmissionPreference") return ["OTOMATİK", "MANUEL"].includes(String(fact.normalizedValue)) ? fact.normalizedValue : undefined;
  if (fact.concept === "bodyStyleReference") return ["SUV", "SEDAN", "HATCHBACK", "STATION WAGON", "PICK-UP", "PICKUP", "PANELVAN", "MPV"].includes(String(fact.normalizedValue).toLocaleUpperCase("tr-TR")) ? String(fact.normalizedValue).toLocaleUpperCase("tr-TR") : undefined;
  if (fact.concept === "designCharacterPreference") return fact.normalizedValue === "CHARMING" ? "CHARMING" : undefined;
  if (fact.concept === "brandReference" || fact.concept === "modelReference" || fact.concept === "equipmentRequirement") return source;
  return undefined;
};
const canonicalHypothesisValue = (hypothesis: AnalystHypothesis): AnalystHypothesis["proposedValue"] | undefined => {
  if (hypothesis.concept === "groundClearanceNeed") return "HIGHER_THAN_STANDARD";
  if (hypothesis.concept === "tractionNeed" && (hypothesis.reasonCode === "SEVERE_TRACTION_CONTEXT" || hypothesis.reasonCode === "NO_SEVERE_TRACTION_EVIDENCE")) return "ALL_WHEEL_DRIVE";
  if (hypothesis.concept === "maneuverabilityNeed" && hypothesis.reasonCode === "PARKING_CONTEXT") return "HIGH";
  return undefined;
};

export function governSemanticNeedsAnalysis(message: string, analysis: SemanticNeedsAnalysisV1): GovernedAnalysis {
  const acceptedExplicitFacts: GovernedAnalystFact[] = []; const rejectedExplicitFacts: RejectedSignal[] = [];
  const acceptedFactConcepts = new Set<string>();
  for (const fact of analysis.explicitFacts) {
    const sourceSpan = resolveExactSpan(message, fact.sourceSpan);
    const canonicalValue = canonicalExplicitValue(fact);
    const reason = !sourceSpan ? "SOURCE_SPAN_MISMATCH" : fact.confidence < 0.9 ? "EXPLICIT_CONFIDENCE_TOO_LOW" : acceptedFactConcepts.has(fact.concept) ? "DUPLICATE_EXPLICIT_CONCEPT" : canonicalValue === undefined ? "NORMALIZED_VALUE_NOT_ALLOWED" : undefined;
    if (reason) rejectedExplicitFacts.push({ concept: fact.concept, reasonCode: reason });
    else { acceptedFactConcepts.add(fact.concept); acceptedExplicitFacts.push({ ...fact, sourceSpan: sourceSpan!, normalizedValue: canonicalValue!, governance: "ACCEPTED_EXPLICIT" }); }
  }
  const acceptedHypotheses: GovernedAnalystHypothesis[] = []; const rejectedHypotheses: RejectedSignal[] = [];
  const acceptedHypothesisConcepts = new Set<string>();
  for (const hypothesis of analysis.hypotheses) {
    const sourceSpans = hypothesis.sourceSpans.map((span) => resolveExactSpan(message, span));
    const canonicalValue = canonicalHypothesisValue(hypothesis);
    const reason = sourceSpans.some((span) => !span) ? "SOURCE_SPAN_MISMATCH"
      : hypothesis.decisionUse === "QUESTION_INPUT" && hypothesis.confidence < 0.7 ? "QUESTION_INPUT_CONFIDENCE_TOO_LOW"
      : acceptedHypothesisConcepts.has(hypothesis.concept) ? "DUPLICATE_HYPOTHESIS_CONCEPT" : canonicalValue === undefined ? "PROPOSED_VALUE_NOT_ALLOWED" : undefined;
    if (reason) rejectedHypotheses.push({ concept: hypothesis.concept, reasonCode: reason });
    else { acceptedHypothesisConcepts.add(hypothesis.concept); acceptedHypotheses.push({ ...hypothesis, sourceSpans: sourceSpans as readonly AnalystSourceSpan[], proposedValue: canonicalValue!, governance: hypothesis.decisionUse === "QUESTION_INPUT" ? "ACCEPTED_QUESTION_INPUT" : "ACCEPTED_NONE" }); }
  }
  const acceptedCorrections: AnalystCorrection[] = []; const rejectedCorrections: RejectedSignal[] = [];
  for (const correction of analysis.corrections) {
    const sourceSpan = resolveExactSpan(message, correction.sourceSpan);
    const reason = !sourceSpan ? "SOURCE_SPAN_MISMATCH" : correction.confidence < 0.9 ? "CORRECTION_CONFIDENCE_TOO_LOW" : correction.operation === "SUPERSEDE" && correction.replacementValue === undefined ? "SUPERSEDE_REPLACEMENT_REQUIRED" : undefined;
    if (reason) rejectedCorrections.push({ concept: correction.concept, reasonCode: reason }); else acceptedCorrections.push({ ...correction, sourceSpan: sourceSpan! });
  }
  return { acceptedExplicitFacts, rejectedExplicitFacts, acceptedHypotheses, rejectedHypotheses, acceptedCorrections, rejectedCorrections };
}
