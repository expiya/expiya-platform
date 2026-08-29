import type { AnalystConcept, AnalystCorrection, AnalystExplicitFact, AnalystHypothesis, SemanticNeedsAnalysisV1 } from "./contract";
import { detectExplicitUsagePurpose } from "../usageSemantics";

const span = (message: string, pattern: RegExp, searchText = message) => { const match = pattern.exec(searchText); return match?.index === undefined ? undefined : { start: match.index, end: match.index + match[0].length, text: message.slice(match.index, match.index + match[0].length) }; };
export function analyzeSemanticNeedsFallback(input: { message: string; sourceMessageId: string; conversationRevision: number }): SemanticNeedsAnalysisV1 {
  const { message } = input; const explicitFacts: AnalystExplicitFact[] = []; const hypotheses: AnalystHypothesis[] = []; const corrections: AnalystCorrection[] = []; const expressed = new Set<AnalystConcept>();
  const empty = (): SemanticNeedsAnalysisV1 => ({ version: "1.0", origin: "BOUNDED_FALLBACK", sourceMessageId: input.sourceMessageId, conversationRevision: input.conversationRevision, explicitFacts: [], hypotheses: [], unknowns: [], corrections: [] });
  if (/ignore|system prompt|developer message|kuralları değiştir|candidate ids|api key|önceki (?:talimatları|kuralları) unut|gizli (?:prompt|talimat)|yetkini aş/iu.test(message)) return empty();
  const purchaseLanguage = /(?:araç|araba|otomobil).*(?:arıyorum|istiyorum|alacağım|almak|bakıyorum|seçmek)|(?:satın al|araç al)/iu.test(message);
  if (/^(?:merhaba|selam|naber|nasılsın)[?.! ]*$/iu.test(message.trim()) || (!purchaseLanguage && /(?:nedir|nasıl|ne kadar|ömrü|farkı|hangisi).*[?]?$/iu.test(message.trim()))) return empty();
  let preferenceSearchText = message;
  const correctionPatterns: readonly [AnalystConcept, RegExp][] = [
    ["bodyStyleReference", /\b(?:suv|sedan|hatchback|station wagon|pick-?up|panelvan|mpv)\b\s*(?:değil|istemiyorum|olmasın)/giu],
    ["fuelPreference", /\b(?:elektrikli|benzinli|dizel|hibrit|lpg)\b\s*(?:değil|istemiyorum|olmasın)/giu],
    ["transmissionPreference", /\b(?:otomatik|manuel)\b\s*(?:değil|istemiyorum|olmasın)/giu],
    ["cargoRequirement", /\b(?:yük|koli|ürün|kargo)\b.{0,20}(?:taşımıyorum|taşımayacağım)/giu],
  ];
  for (const [concept, pattern] of correctionPatterns) {
    preferenceSearchText = preferenceSearchText.replace(pattern, (text, offset: number) => {
      corrections.push({ concept, operation: "CLEAR", sourceSpan: { start: offset, end: offset + text.length, text: message.slice(offset, offset + text.length) }, confidence: 0.99 });
      return " ".repeat(text.length);
    });
  }
  const rural = span(message, /köyde kullanacağım|kırsalda kullanacağım/iu); const rough = span(message, /(?:yollar? )?(?:bozuk(?: ve stabilize)?|stabilize|toprak|asfaltsız|mıcırlı)(?: yollar?(?:da)?)?/iu);
  if (rural) { explicitFacts.push({ concept: "primaryUsage", normalizedValue: "RURAL_DAILY", sourceSpan: rural, confidence: 0.98, explicitness: "USER_EXPLICIT", confirmationRequired: false }); expressed.add("primaryUsage"); }
  if (!rural) { const usage = detectExplicitUsagePurpose(message); if (usage) { explicitFacts.push({ concept: "primaryUsage", normalizedValue: usage.value, sourceSpan: usage.sourceSpan, confidence: usage.confidence, explicitness: "USER_EXPLICIT", confirmationRequired: false }); expressed.add("primaryUsage"); } }
  if (rough) { explicitFacts.push({ concept: "roadCondition", normalizedValue: "ROUGH_UNPAVED", sourceSpan: rough, confidence: 0.98, explicitness: "USER_EXPLICIT", confirmationRequired: false }); expressed.add("roadCondition"); hypotheses.push({ concept: "groundClearanceNeed", proposedValue: "HIGHER_THAN_STANDARD", sourceSpans: [rough], confidence: 0.84, decisionUse: "QUESTION_INPUT", reasonCode: "ROUGH_UNPAVED_ROAD_CONTEXT", confirmationRequired: true }); hypotheses.push({ concept: "tractionNeed", proposedValue: "ALL_WHEEL_DRIVE", sourceSpans: [rough], confidence: 0.34, decisionUse: "NONE", reasonCode: "NO_SEVERE_TRACTION_EVIDENCE", confirmationRequired: true }); }
  const severe = span(message, /(?:şiddetli|derin) çamur|dik ve kaygan yokuş|sık sık patinaj/iu); if (severe) hypotheses.push({ concept: "tractionNeed", proposedValue: "ALL_WHEEL_DRIVE", sourceSpans: [severe], confidence: 0.82, decisionUse: "QUESTION_INPUT", reasonCode: "SEVERE_TRACTION_CONTEXT", confirmationRequired: true });
  const parking = span(message, /park(?: yeri)? (?:zor|sorun)|dar sokak|kolay park/iu); if (parking) { explicitFacts.push({ concept: "parkingDifficulty", normalizedValue: "HIGH", sourceSpan: parking, confidence: 0.96, explicitness: "USER_EXPLICIT", confirmationRequired: false }); expressed.add("parkingDifficulty"); hypotheses.push({ concept: "maneuverabilityNeed", proposedValue: "HIGH", sourceSpans: [parking], confidence: 0.82, decisionUse: "QUESTION_INPUT", reasonCode: "PARKING_CONTEXT", confirmationRequired: true }); }
  const seats = span(message, /(?:sürücü dahil )?(\d{1,2}) kişilik/iu); if (seats) { const count = Number(seats.text.match(/\d{1,2}/u)?.[0]); explicitFacts.push({ concept: "passengerCapacity", normalizedValue: count, sourceSpan: seats, confidence: 0.99, explicitness: "USER_EXPLICIT", confirmationRequired: false }); expressed.add("passengerCapacity"); }
  const cargo = span(message, /(?:yük|koli|ürün|kargo)[\p{L}]*.{0,50}(?:taşı|dağıt)/iu, preferenceSearchText); if (cargo) { explicitFacts.push({ concept: "cargoRequirement", normalizedValue: "GOODS_TRANSPORT", sourceSpan: cargo, confidence: 0.98, explicitness: "USER_EXPLICIT", confirmationRequired: false }); expressed.add("cargoRequirement"); }
  const body = span(message, /\b(?:suv|sedan|hatchback|station wagon|pick-?up|panelvan|mpv)\b/iu, preferenceSearchText); if (body) { explicitFacts.push({ concept: "bodyStyleReference", normalizedValue: body.text.toLocaleUpperCase("tr-TR"), sourceSpan: body, confidence: 0.99, explicitness: "USER_EXPLICIT", confirmationRequired: false }); expressed.add("bodyStyleReference"); }
  const fuel = span(message, /\b(?:elektrikli|benzinli|dizel|hibrit|lpg)\b/iu, preferenceSearchText); if (fuel) { explicitFacts.push({ concept: "fuelPreference", normalizedValue: fuel.text.toLocaleUpperCase("tr-TR"), sourceSpan: fuel, confidence: 0.99, explicitness: "USER_EXPLICIT", confirmationRequired: false }); expressed.add("fuelPreference"); }
  const transmission = span(message, /\b(?:otomatik|manuel)\b/iu, preferenceSearchText); if (transmission) { explicitFacts.push({ concept: "transmissionPreference", normalizedValue: transmission.text.toLocaleUpperCase("tr-TR"), sourceSpan: transmission, confidence: 0.99, explicitness: "USER_EXPLICIT", confirmationRequired: false }); expressed.add("transmissionPreference"); }
  const unknownConcepts: AnalystConcept[] = ["passengerCapacity", "cargoRequirement", "fuelPreference", "transmissionPreference"];
  return { version: "1.0", origin: "BOUNDED_FALLBACK", sourceMessageId: input.sourceMessageId, conversationRevision: input.conversationRevision, explicitFacts, hypotheses, unknowns: unknownConcepts.filter((concept) => !expressed.has(concept)).map((concept) => ({ concept, reasonCode: "NOT_EXPRESSED" as const })), corrections };
}
