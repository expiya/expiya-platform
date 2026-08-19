import { createHash } from "node:crypto";

import type { EquipmentFeatureCode } from "@/types/equipmentEvidence";
import type { EquipmentDailyLifeShadowResult, EquipmentShadowContext } from "./equipmentDailyLifeShadowAdapter.server";
import { evaluateEquipmentDailyLifeCandidates } from "./equipmentDailyLifeShadowAdapter.server";
import { AMBIGUOUS_EQUIPMENT_PHRASES, EQUIPMENT_INTENT_VOCABULARY_VERSION, EQUIPMENT_TURKISH_ALIASES, UNKNOWN_AUTOMOTIVE_TERMS } from "./equipmentIntentVocabulary";

export type EquipmentUserIntent = "SOFT_PREFERENCE" | "STRONG_PREFERENCE" | "EXPLICIT_REQUIREMENT" | "NEGATIVE_PREFERENCE"
  | "CLEAR_PREFERENCE" | "CORRECTION" | "CONCEPT_QUESTION" | "BENEFIT_QUESTION" | "AMBIGUOUS_EQUIPMENT_INTENT" | "UNKNOWN_TERM";
export type EquipmentDeterministicStrength = "NONE" | "SOFT" | "STRONG" | "HARD" | "NEGATIVE" | "CLEAR";

export type EquipmentIntentMatch = Readonly<{
  featureCode: EquipmentFeatureCode | null; intent: EquipmentUserIntent; deterministicStrength: EquipmentDeterministicStrength;
  matchedPhraseClass: "CONTROLLED_ALIAS" | "AMBIGUOUS_PHRASE" | "UNCONTROLLED_AUTOMOTIVE_TERM"; matchedPhrase: string;
  negated: boolean; correctionTarget: EquipmentFeatureCode | null; confidenceClass: "HIGH" | "MEDIUM" | "LOW";
  reasonCodes: readonly string[]; conversationScoped: true; decisionAuthority: "SHADOW_ONLY"; publicEffectAllowed: false;
  clarificationCandidate: string | null;
}>;

export type EquipmentIntentEvaluation = Readonly<{ vocabularyVersion: typeof EQUIPMENT_INTENT_VOCABULARY_VERSION; normalizedUtterance: string;
  matches: readonly EquipmentIntentMatch[]; providerProposalIgnored: boolean }>;

const normalize = (value: string) => value.toLocaleLowerCase("tr-TR").replaceAll(/[,;.]+/gu, " ama ").normalize("NFKD").replaceAll(/\p{M}/gu, "").replaceAll("ı", "i")
  .replaceAll(/[^a-z0-9]+/gu, " ").replaceAll(/\s+/gu, " ").trim();
const hard = /\b(mutlaka(?: bulunmali)?|olmazsa olmaz|sart)\b/u;
const strong = /\b(benim icin onemli|ozellikle istiyorum|ozellikle olsun|cok onemli)\b/u;
const clear = /\b(vazgectim|onemli degil|fark etmez|gerekmiyor|gerek yok|sart degil)\b/u;
const negative = /\b(istemiyorum|istemem|olmasin|gerekmiyor|gerek yok)\b/u;
const concept = /\b(ne demek|nedir|ne oluyor)\b/u;
const benefit = /\b(ne ise yarar|faydasi ne|gerekli mi|gercekten gerekli mi|ne faydasi var)\b/u;
const correction = /\b(demek istedim|yanlis soyledim|duzelteyim|vazgectim|fikrimi degistirdim|kastediyorum)\b/u;

const make = (input: Omit<EquipmentIntentMatch, "conversationScoped" | "decisionAuthority" | "publicEffectAllowed" | "reasonCodes"> & { reasonCodes: readonly string[] }): EquipmentIntentMatch =>
  Object.freeze({ ...input, reasonCodes: Object.freeze([...input.reasonCodes]), conversationScoped: true, decisionAuthority: "SHADOW_ONLY", publicEffectAllowed: false });

type Located = { code: EquipmentFeatureCode; phrase: string; start: number; end: number };
function locateControlledAliases(text: string): Located[] {
  const candidates: Located[] = [];
  for (const [code, values] of Object.entries(EQUIPMENT_TURKISH_ALIASES) as [EquipmentFeatureCode, readonly string[]][]) for (const raw of values) {
    const phrase = normalize(raw); const at = ` ${text} `.indexOf(` ${phrase} `);
    if (at >= 0) candidates.push({ code, phrase: raw, start: at, end: at + phrase.length });
  }
  candidates.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  return candidates.filter((item, index, all) => !all.slice(0, index).some((kept) => item.start >= kept.start && item.end <= kept.end));
}

function scopedText(text: string, item: Located): string {
  const boundaries = [...text.matchAll(/\b(ama|fakat|ancak|yerine)\b|[,;.]/gu)].map((match) => match.index ?? 0);
  const start = Math.max(-1, ...boundaries.filter((value) => value < item.start)) + 1;
  const end = Math.min(text.length, ...boundaries.filter((value) => value > item.end));
  return text.slice(start, end);
}

export function evaluateEquipmentUserIntent(userText: string, _providerProposal?: unknown): EquipmentIntentEvaluation {
  const text = normalize(userText); const located = locateControlledAliases(text); const matches: EquipmentIntentMatch[] = [];
  const betweenFirstTwo = located.length >= 2 ? text.slice(located[0].end, located[1].start) : "";
  const isCorrection = located.length >= 2 && (correction.test(text) || /\bdegil\b/u.test(betweenFirstTwo));
  for (let index = 0; index < located.length; index += 1) {
    const item = located[index]; const scope = scopedText(text, item); const prior = located[index - 1];
    let intent: EquipmentUserIntent; let strength: EquipmentDeterministicStrength; const reasons: string[] = [];
    let correctionTarget: EquipmentFeatureCode | null = null;
    if (isCorrection && index === located.length - 1) { intent = "CORRECTION"; strength = "SOFT"; correctionTarget = prior?.code ?? null; reasons.push("EXPLICIT_LOCAL_SUPERSESSION_LANGUAGE"); }
    else if (located.length === 1 && (/\bfikrimi degistirdim\b/u.test(text) || /\bsart degil\b.*\bolsa iyi olur\b/u.test(text))) { intent = "CORRECTION"; strength = "SOFT"; correctionTarget = item.code; reasons.push("EXPLICIT_SAME_FEATURE_CORRECTION_LANGUAGE"); }
    else if (concept.test(scope) || concept.test(text) && located.length === 1) { intent = "CONCEPT_QUESTION"; strength = "NONE"; reasons.push("CONCEPT_QUERY_NOT_PREFERENCE"); }
    else if (benefit.test(scope) || benefit.test(text) && located.length === 1) { intent = "BENEFIT_QUESTION"; strength = "NONE"; reasons.push("BENEFIT_QUERY_NOT_PREFERENCE"); }
    else if (clear.test(scope) || located.length === 1 && clear.test(text)) { intent = "CLEAR_PREFERENCE"; strength = "CLEAR"; reasons.push("LOCAL_CLEAR_LANGUAGE"); }
    else if (negative.test(scope) || /\bolmadigi araci istemiyorum\b/u.test(text)) { intent = /\bolmadigi araci istemiyorum\b/u.test(text) ? "EXPLICIT_REQUIREMENT" : "NEGATIVE_PREFERENCE"; strength = intent === "EXPLICIT_REQUIREMENT" ? "HARD" : "NEGATIVE"; reasons.push(intent === "EXPLICIT_REQUIREMENT" ? "EXPLICIT_ABSENCE_REJECTION_LANGUAGE" : "LOCAL_NEGATION_LANGUAGE"); }
    else if (hard.test(scope) || /\bkesinlikle\b.*\bolmali\b/u.test(scope) || (hard.test(text) || /\bkesinlikle\b.*\bolmali\b/u.test(text)) && located.length === 1) { intent = "EXPLICIT_REQUIREMENT"; strength = "HARD"; reasons.push("EXPLICIT_MANDATORY_LANGUAGE"); }
    else if (strong.test(scope)) { intent = "STRONG_PREFERENCE"; strength = "STRONG"; reasons.push("EXPLICIT_IMPORTANCE_LANGUAGE"); }
    else { intent = "SOFT_PREFERENCE"; strength = "SOFT"; reasons.push("DESIRE_LANGUAGE_NOT_HARD_AUTHORITY"); }
    if (/\b(istiyorum|olsun|tercih ederim|isterim)\b/u.test(scope) && intent === "SOFT_PREFERENCE") reasons.push("PLAIN_DESIRE_CAPPED_AT_SOFT");
    matches.push(make({ featureCode: item.code, intent, deterministicStrength: strength, matchedPhraseClass: "CONTROLLED_ALIAS", matchedPhrase: item.phrase,
      negated: intent === "NEGATIVE_PREFERENCE" || intent === "CLEAR_PREFERENCE", correctionTarget, confidenceClass: "HIGH", reasonCodes: reasons, clarificationCandidate: null }));
  }
  if (!matches.length) {
    const ambiguousPhrase = AMBIGUOUS_EQUIPMENT_PHRASES.find((phrase) => text.includes(normalize(phrase)));
    const unknownPhrase = UNKNOWN_AUTOMOTIVE_TERMS.find((phrase) => text.includes(normalize(phrase)));
    if (ambiguousPhrase) matches.push(make({ featureCode: null, intent: "AMBIGUOUS_EQUIPMENT_INTENT", deterministicStrength: "NONE", matchedPhraseClass: "AMBIGUOUS_PHRASE",
      matchedPhrase: ambiguousPhrase, negated: false, correctionTarget: null, confidenceClass: "HIGH", reasonCodes: ["GENERIC_PHRASE_CANNOT_BIND_SINGLE_FEATURE"], clarificationCandidate: null }));
    else if (unknownPhrase) matches.push(make({ featureCode: null, intent: "UNKNOWN_TERM", deterministicStrength: "NONE", matchedPhraseClass: "UNCONTROLLED_AUTOMOTIVE_TERM",
      matchedPhrase: unknownPhrase, negated: false, correctionTarget: null, confidenceClass: "LOW", reasonCodes: ["NO_CONTROLLED_VOCABULARY_AUTHORITY", "CONVERSATION_SCOPED_CLARIFICATION_ONLY"],
      clarificationCandidate: unknownPhrase === "hayalet ekran" ? "‘Hayalet ekran’ derken dijital gösterge panelini mi, ön cama bilgi yansıtan head-up display’i mi kastediyorsun?" : `“${unknownPhrase}” ile neyi kastettiğini biraz açar mısın?` }));
  } else {
    const unknownPhrase = UNKNOWN_AUTOMOTIVE_TERMS.find((phrase) => text.includes(normalize(phrase)));
    if (unknownPhrase) matches.push(make({ featureCode: null, intent: "UNKNOWN_TERM", deterministicStrength: "NONE", matchedPhraseClass: "UNCONTROLLED_AUTOMOTIVE_TERM",
      matchedPhrase: unknownPhrase, negated: false, correctionTarget: null, confidenceClass: "LOW", reasonCodes: ["NO_CONTROLLED_VOCABULARY_AUTHORITY", "CONVERSATION_SCOPED_CLARIFICATION_ONLY"],
      clarificationCandidate: `“${unknownPhrase}” ile neyi kastettiğini biraz açar mısın?` }));
  }
  return Object.freeze({ vocabularyVersion: EQUIPMENT_INTENT_VOCABULARY_VERSION, normalizedUtterance: text, matches: Object.freeze(matches), providerProposalIgnored: _providerProposal !== undefined });
}

export type EquipmentCoverageDiagnostic = Readonly<{ candidateCount: number; confirmedIncluded: number; optional: number; packageDependent: number;
  associationOnly: number; verifiedNotAvailable: number; unknownUncovered: number; conflicting: number; comparableCoverageRatio: number }>;
export type EquipmentQuestionCandidate = Readonly<{ questionId: string; featureCodes: readonly EquipmentFeatureCode[]; stage: "FUNCTIONAL_NEEDS" | "SOFT_DIFFERENTIATION";
  selectionMode: "SINGLE" | "MULTIPLE"; options: readonly Readonly<{ id: string; label: string; exclusive: boolean }>[];
  materiality: "MATERIAL" | "NOT_MATERIAL"; coverageDiagnostic: Readonly<Record<string, EquipmentCoverageDiagnostic>>;
  eligibleForFuturePublicUse: false; blockedReasonCodes: readonly string[]; decisionAuthority: "SHADOW_ONLY"; publicEffectAllowed: false }>;

export function createEquipmentExplanationShadowPlan(context: EquipmentShadowContext, match: EquipmentIntentMatch) {
  const entry = match.featureCode ? context.dailyLifeEntries.get(match.featureCode) : undefined;
  const eligible = Boolean(entry) && (match.intent === "CONCEPT_QUESTION" || match.intent === "BENEFIT_QUESTION");
  return Object.freeze({ featureCode: match.featureCode, intent: match.intent, dailyLifeEntryResolved: Boolean(entry),
    controlledExplanation: eligible ? entry?.userFacingExplanation ?? null : null, caveat: eligible ? entry?.caveat ?? null : null,
    vehiclePresenceClaimAllowed: false as const, decisionAuthority: "SHADOW_ONLY" as const, publicEffectAllowed: false as const,
    reasonCodes: Object.freeze(eligible ? ["OWNER_APPROVED_DAILY_LIFE_TEXT_ONLY", "VEHICLE_PRESENCE_NOT_INFERRED"] : ["NO_AUTHORIZED_EXPLANATION_PLAN"]) });
}

const diagnostic = (items: readonly EquipmentDailyLifeShadowResult[]): EquipmentCoverageDiagnostic => {
  const count = (disposition: EquipmentDailyLifeShadowResult["disposition"]) => items.filter((item) => item.disposition === disposition).length;
  const unknown = count("UNKNOWN_NO_CLAIM") + count("INCOMPATIBLE_NO_CLAIM") + count("LEGACY_PROVISION_UNRESOLVED");
  const comparable = items.length - unknown - count("ASSOCIATION_PROVISION_UNRESOLVED") - count("CONFLICT_NO_CLAIM");
  return Object.freeze({ candidateCount: items.length, confirmedIncluded: count("CONFIRMED_INCLUDED_EXPLANATION_ELIGIBLE"), optional: count("OPTIONAL_STOCK_CONFIRMATION_REQUIRED"),
    packageDependent: count("PACKAGE_CONFIRMATION_REQUIRED"), associationOnly: count("ASSOCIATION_PROVISION_UNRESOLVED"), verifiedNotAvailable: count("VERIFIED_NOT_AVAILABLE"),
    unknownUncovered: unknown, conflicting: count("CONFLICT_NO_CLAIM"), comparableCoverageRatio: items.length ? comparable / items.length : 0 });
};

export function createEquipmentQuestionCandidate(input: Readonly<{ context: EquipmentShadowContext; candidateIds: readonly string[];
  featureCodes: readonly EquipmentFeatureCode[]; coreStagesComplete: boolean; material: boolean; stage?: "FUNCTIONAL_NEEDS" | "SOFT_DIFFERENTIATION" }>): EquipmentQuestionCandidate {
  const rows = evaluateEquipmentDailyLifeCandidates(input.context, input.candidateIds, input.featureCodes);
  const coverage = Object.fromEntries(input.featureCodes.map((code) => [code, diagnostic(rows.map((row) => row.diagnostics.find((item) => item.featureCode === code)!))]));
  const blocked = new Set<string>(["EQUIPMENT_PUBLIC_AUTHORITY_DISABLED", "EXPLANATION_ONLY_NOT_QUESTION_AUTHORITY"]);
  if (!input.coreStagesComplete) blocked.add("CORE_STAGE_NOT_COMPLETE");
  if (!input.material) blocked.add("FEATURE_NOT_MATERIAL");
  for (const value of Object.values(coverage)) {
    if (value.comparableCoverageRatio < 0.5) blocked.add("INSUFFICIENT_COHORT_COVERAGE");
    if (value.unknownUncovered > value.candidateCount / 2) blocked.add("UNKNOWN_DOMINATES_COHORT");
    if (value.conflicting) blocked.add("EVIDENCE_CONFLICT");
    if (value.associationOnly && value.confirmedIncluded + value.optional + value.packageDependent + value.verifiedNotAvailable === 0) blocked.add("ASSOCIATION_ONLY_CANNOT_CONFIRM");
  }
  const key = `${input.candidateIds.join(",")}|${input.featureCodes.join(",")}|${input.stage ?? "SOFT_DIFFERENTIATION"}`;
  return Object.freeze({ questionId: `equipment-shadow-q-${createHash("sha256").update(key).digest("hex").slice(0, 16)}`,
    featureCodes: Object.freeze([...input.featureCodes]), stage: input.stage ?? "SOFT_DIFFERENTIATION", selectionMode: input.featureCodes.length > 1 ? "MULTIPLE" : "SINGLE",
    options: Object.freeze([...input.featureCodes.map((code) => Object.freeze({ id: code, label: EQUIPMENT_TURKISH_ALIASES[code][0], exclusive: false })),
      Object.freeze({ id: "NOT_IMPORTANT", label: "Fark etmez", exclusive: true }), Object.freeze({ id: "UNKNOWN", label: "Bilmiyorum", exclusive: true }), Object.freeze({ id: "SKIP", label: "Atla", exclusive: true })]),
    materiality: input.material ? "MATERIAL" : "NOT_MATERIAL", coverageDiagnostic: Object.freeze(coverage), eligibleForFuturePublicUse: false,
    blockedReasonCodes: Object.freeze([...blocked].sort()), decisionAuthority: "SHADOW_ONLY", publicEffectAllowed: false });
}

export function compareEquipmentIntentQuestionShadowOnOff<T>(publicDecision: T, evaluate: () => unknown) {
  const off = JSON.stringify(publicDecision); const diagnostics = evaluate(); const on = JSON.stringify(publicDecision);
  return Object.freeze({ equivalent: off === on, off, on, diagnostics });
}
