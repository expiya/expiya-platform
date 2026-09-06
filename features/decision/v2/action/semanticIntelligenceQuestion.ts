import type { CatalogSnapshot } from "../catalog/types";
import type { ConversationMemory } from "../domain/conversationMemory";
import { resolveReferenceAnalogy, type AutomotiveSemanticResult } from "../semantic-intelligence";
import type { QuestionCandidate } from "./types";

const optionId = (code: string, index: number) => `v2q.asil.${code.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]+/gu, "-").slice(0, 32)}.${index + 1}`;
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
function isCatalogUnsupportedEquipmentClarification(ambiguity: AutomotiveSemanticResult["ambiguities"][number]): boolean {
  const text = `${ambiguity.code} ${ambiguity.sourceSpan} ${ambiguity.clarificationCandidates.join(" ")}`.toLocaleLowerCase("tr-TR");
  return /air conditioning|climate control|multi-zone|dual-zone|tri-zone|klima|iklimlendirme/u.test(text);
}
function isEconomicMeaningClarification(ambiguity: AutomotiveSemanticResult["ambiguities"][number]): boolean {
  const text = `${ambiguity.code} ${ambiguity.sourceSpan}`.toLocaleLowerCase("tr-TR");
  return /ekonomik|bütçe.*fazla değil|uygun fiyat/u.test(text);
}
function selfContainedLabel(label: string, reference?: string): string {
  const meaning = label.toLocaleLowerCase("tr-TR");
  if (/\ba[ -]?segment|a sınıf|city car/u.test(meaning)) return "Şehir içinde kolay kullanılan, en küçük otomobil sınıfı";
  if (/\bb[ -]?segment|small hatchback/u.test(meaning)) return "Clio veya Polo boyutlarında küçük otomobil";
  if (/(?:any compact urban hatchback|regardless of exact segment)/u.test(meaning)) return "Kesin sınıfı önemli olmayan, şehirde kullanışlı küçük otomobil";
  if (/(?:micro car|microcar|mikro araç|iki kişilik)/u.test(meaning)) return "Çoğunlukla iki kişilik, çok küçük şehir aracı";
  if (/(?:compact class|compact car|kompakt sınıf)/u.test(meaning)) return "Şehirde pratik ama dört kişinin de kullanabileceği kompakt otomobil";
  if (/(?:compact hatchback|kompakt hatchback)/u.test(meaning)) return "Clio veya Polo boyutlarında, dört kişinin kullanabileceği küçük otomobil";
  if (/(?:small hatchback|küçük hatchback)/u.test(meaning)) return "Kısa gövdeli, park etmesi kolay küçük otomobil";
  if (/(?:karma|hem yolcu hem yük|yolcu ve yük)/u.test(meaning)) return "Yolcu ve yükü birlikte taşıyan karma kullanım";
  if (/(?:yolcu|minibüs|çok koltuk)/u.test(meaning) && !/(?:yük|eşya)/u.test(meaning)) return "Düzenli yolcu taşıma ve çok koltuklu kullanım";
  if (/(?:yük|eşya|kargo|ticari kullanım)/u.test(meaning)) return "Yük ve eşya taşıma odaklı ticari kullanım";
  if (/(?:geniş iç|iç hacim|pratik)/u.test(meaning)) return "Geniş iç hacim ve günlük pratiklik";
  if (/(?:boyut|kabin düzen)/u.test(meaning)) return "Benzer dış boyutlar ve kabin düzeni";
  if (/(?:yüksek oturma|oturma pozisyon)/u.test(meaning)) return "Daha yüksek oturma pozisyonu";
  if (/(?:yerden yüksek|yerden yükseklik)/u.test(meaning)) return "Daha yüksek yerden yükseklik";
  if (/(?:suv|crossover)/u.test(meaning)) return "Yüksek oturma pozisyonlu, daha iri gövdeli araç";
  if (/(?:sürüş hissi|yol tutuş)/u.test(meaning)) return "Benzer sürüş hissi ve yol tutuş karakteri";
  if (/(?:görünüm|tasarım|gövde|van|mpv)/u.test(meaning)) return "Benzer gövde biçimi ve görünüm";
  if (/(?:belirli|marka|model|referans)/u.test(meaning)) return "Belirli bir marka veya model referansı";
  let value = label.trim();
  if (reference) value = value.replace(new RegExp(`(?:${escapeRegExp(reference)})(?:\\s+(?:gibi|benzeri|tarzı))?`, "giu"), "");
  value = value.replace(/^\s*(?:gibi|benzeri|tarzı)\s+/iu, "").replace(/\s+(?:mı|mi|mu|mü)\s+kastedil(?:iyor|di)\??$/iu, "").replace(/^[\s/,:;-]+|[\s]+$/gu, "");
  return value ? `${value[0]!.toLocaleUpperCase("tr-TR")}${value.slice(1)}` : label.trim();
}

export function createAutomotiveSemanticClarificationQuestion(input: { readonly semantics?: AutomotiveSemanticResult; readonly memory: ConversationMemory; readonly snapshot: CatalogSnapshot; readonly candidateIds: readonly string[] }): QuestionCandidate | null {
  if (!input.semantics || input.semantics.providerStatus !== "AVAILABLE") return null;
  const ambiguity = input.semantics?.ambiguities.find((item) => item.clarificationCandidates.length >= 2 && !isCatalogUnsupportedEquipmentClarification(item) && !isEconomicMeaningClarification(item));
  if (!ambiguity) return null;
  const candidates = Object.freeze([...new Set(input.candidateIds)].sort());
  const key = `semanticIntelligence.${ambiguity.code}`;
  if (input.memory.materialQuestionHistory?.some((item) => item.stableSemanticKey === key && item.answerStatus !== "OPEN")) return null;
  const relatedAnalogy = input.semantics?.analogies.find((item) => ambiguity.sourceSpan.includes(item.sourceSpan) || item.sourceSpan.includes(ambiguity.sourceSpan));
  let referenceAuthority = `ASIL-0.1:${input.semantics!.messageId}`;
  if (relatedAnalogy && input.snapshot.familyIndex && input.snapshot.brandIndex) {
    const resolution = resolveReferenceAnalogy(input.snapshot, relatedAnalogy);
    if (resolution.status === "CATALOG_CONFIRMED_REFERENCE") referenceAuthority += `|CATALOG:${input.snapshot.authority.catalogFingerprint}:${resolution.familyId}`;
  }
  const normalizedOptions = [...new Set(ambiguity.clarificationCandidates.slice(0, 4).map((label) => selfContainedLabel(label, relatedAnalogy?.rawText)))];
  if (normalizedOptions.length < 2) return null;
  return Object.freeze({
    question: Object.freeze({ id: `v2q.asil.${input.memory.turn + 1}`, stableSemanticKey: key, field: "semanticMeaning", promptIntent: "CONFIRM_INTERPRETATION", options: Object.freeze(normalizedOptions.map((publicLabel, index) => Object.freeze({ id: optionId(ambiguity.code, index), semanticValue: publicLabel, userFacingLabel: publicLabel, provenance: Object.freeze({ source: "SEMANTIC_INTERPRETATION" as const, candidatePoolFingerprint: input.memory.decisionFingerprint, supportingCandidateIds: candidates, authorityReference: referenceAuthority }) }))), selectionMode: "SINGLE" as const, minimumSelections: 1, maximumSelections: 1, answerCapabilities: Object.freeze(["ANSWER", "SKIP", "UNKNOWN", "NOT_IMPORTANT"] as const), materialityReason: `“${ambiguity.sourceSpan}” ifadesinin karar anlamını kullanıcı doğrulamalı.` }),
    stage: "USAGE_CONTEXT" as const, eligible: true, blockedUntilStagesComplete: Object.freeze([]), materiality: 4, informationGain: 1, conversationalRelevance: 4, reasonCodes: Object.freeze(["ASIL_USER_CONFIRMATION_REQUIRED"]), decisionChangeProbability: 1, conflictResolutionValue: 0, candidateReductionValue: 0, contextualRelevance: 4, answerability: 1, cognitiveLoad: 0.2, repetitionRisk: 0, timingPenalty: 0, technicalMismatchPenalty: 0, compatibleCandidateIds: candidates,
  });
}
