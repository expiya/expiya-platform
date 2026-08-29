import type { AnalystCorrection, AnalystExplicitFact, AnalystHypothesis, SemanticNeedsAnalysisV1 } from "./contract";
import { detectExplicitUsagePurpose } from "../usageSemantics";

export interface RejectedSignal { readonly concept: string; readonly reasonCode: string }
export interface GovernedAnalystFact extends AnalystExplicitFact { readonly governance: "ACCEPTED_EXPLICIT" }
export interface GovernedAnalystHypothesis extends AnalystHypothesis { readonly governance: "ACCEPTED_QUESTION_INPUT" | "ACCEPTED_NONE" }
export interface GovernedAnalysis {
  readonly acceptedExplicitFacts: readonly GovernedAnalystFact[]; readonly rejectedExplicitFacts: readonly RejectedSignal[];
  readonly acceptedHypotheses: readonly GovernedAnalystHypothesis[]; readonly rejectedHypotheses: readonly RejectedSignal[];
  readonly acceptedCorrections: readonly AnalystCorrection[]; readonly rejectedCorrections: readonly RejectedSignal[];
}

const exactSpan = (message: string, span: { start: number; end: number; text: string }) => span.start >= 0 && span.end > span.start && span.end <= message.length && message.slice(span.start, span.end) === span.text;
const canonicalExplicitValue = (fact: AnalystExplicitFact, message: string): AnalystExplicitFact["normalizedValue"] | undefined => {
  const source = fact.sourceSpan.text;
  if (fact.concept === "primaryUsage") {
    if (/köyde|kırsalda|bağ bahçe/iu.test(message)) return "RURAL_DAILY";
    return detectExplicitUsagePurpose(message)?.value;
  }
  if (fact.concept === "roadCondition") return /bozuk|stabilize|toprak|asfaltsız|mıcırlı|engebeli/iu.test(source) ? "ROUGH_UNPAVED" : undefined;
  if (fact.concept === "parkingDifficulty") return /park|dar sokak/iu.test(source) ? "HIGH" : undefined;
  if (fact.concept === "cargoRequirement") return /yük|koli|ürün|kargo|paket|malzeme/iu.test(source) ? "GOODS_TRANSPORT" : undefined;
  if (fact.concept === "passengerCapacity") { const count = Number(source.match(/\d{1,2}/u)?.[0]); return Number.isInteger(count) && count > 0 ? count : undefined; }
  if (fact.concept === "fuelPreference") {
    const value = source.match(/elektrikli|benzinli|dizel|hibrit|lpg/iu)?.[0]; return value?.toLocaleUpperCase("tr-TR");
  }
  if (fact.concept === "transmissionPreference") {
    const value = source.match(/otomatik|manuel/iu)?.[0]; return value?.toLocaleUpperCase("tr-TR");
  }
  if (fact.concept === "bodyStyleReference") {
    const value = source.match(/suv|sedan|hatchback|station wagon|pick-?up|panelvan|mpv/iu)?.[0]; return value?.toLocaleUpperCase("tr-TR");
  }
  if (fact.concept === "designCharacterPreference") return /şirin|sevimli|sempatik|tatlı görünümlü|retro görünümlü/iu.test(source) ? "CHARMING" : undefined;
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
    const canonicalValue = canonicalExplicitValue(fact, message);
    const reason = !exactSpan(message, fact.sourceSpan) ? "SOURCE_SPAN_MISMATCH" : fact.confidence < 0.9 ? "EXPLICIT_CONFIDENCE_TOO_LOW" : acceptedFactConcepts.has(fact.concept) ? "DUPLICATE_EXPLICIT_CONCEPT" : canonicalValue === undefined ? "NORMALIZED_VALUE_NOT_ALLOWED" : undefined;
    if (reason) rejectedExplicitFacts.push({ concept: fact.concept, reasonCode: reason });
    else { acceptedFactConcepts.add(fact.concept); acceptedExplicitFacts.push({ ...fact, normalizedValue: canonicalValue!, governance: "ACCEPTED_EXPLICIT" }); }
  }
  const acceptedHypotheses: GovernedAnalystHypothesis[] = []; const rejectedHypotheses: RejectedSignal[] = [];
  const acceptedHypothesisConcepts = new Set<string>();
  for (const hypothesis of analysis.hypotheses) {
    const canonicalValue = canonicalHypothesisValue(hypothesis);
    const reason = !hypothesis.sourceSpans.every((span) => exactSpan(message, span)) ? "SOURCE_SPAN_MISMATCH"
      : hypothesis.decisionUse === "QUESTION_INPUT" && hypothesis.confidence < 0.7 ? "QUESTION_INPUT_CONFIDENCE_TOO_LOW"
      : acceptedHypothesisConcepts.has(hypothesis.concept) ? "DUPLICATE_HYPOTHESIS_CONCEPT" : canonicalValue === undefined ? "PROPOSED_VALUE_NOT_ALLOWED" : undefined;
    if (reason) rejectedHypotheses.push({ concept: hypothesis.concept, reasonCode: reason });
    else { acceptedHypothesisConcepts.add(hypothesis.concept); acceptedHypotheses.push({ ...hypothesis, proposedValue: canonicalValue!, governance: hypothesis.decisionUse === "QUESTION_INPUT" ? "ACCEPTED_QUESTION_INPUT" : "ACCEPTED_NONE" }); }
  }
  const acceptedCorrections: AnalystCorrection[] = []; const rejectedCorrections: RejectedSignal[] = [];
  for (const correction of analysis.corrections) {
    const reason = !exactSpan(message, correction.sourceSpan) ? "SOURCE_SPAN_MISMATCH" : correction.confidence < 0.9 ? "CORRECTION_CONFIDENCE_TOO_LOW" : correction.operation === "SUPERSEDE" && correction.replacementValue === undefined ? "SUPERSEDE_REPLACEMENT_REQUIRED" : undefined;
    if (reason) rejectedCorrections.push({ concept: correction.concept, reasonCode: reason }); else acceptedCorrections.push(correction);
  }
  return { acceptedExplicitFacts, rejectedExplicitFacts, acceptedHypotheses, rejectedHypotheses, acceptedCorrections, rejectedCorrections };
}
