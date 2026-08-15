import type {
  CarsConversationPhase,
  CarsConversationState,
  CarsConversationTrace,
  CarsPendingQuestion,
  CarsQuestionPurpose,
  CarsRequirementCategory,
  CarsRequirementEvaluability,
  CarsRequirementKey,
  CarsRequirementLedgerEntry,
  CarsRequirementStatus,
} from "@/types/carsConversation";

const EVALUABLE_KEYS = new Set<CarsRequirementKey>([
  "MIN_SEATS", "MIN_CARGO_L", "PARTY_SIZE", "TRANSMISSION", "SIZE_PREFERENCE",
]);

const USAGE_KEYS = new Set<CarsRequirementKey>([
  "USAGE_CAMP",
  "USAGE_SERIOUS_OFF_ROAD",
  "USAGE_ROUGH_ROAD",
  "USAGE_STABILIZED_ROAD",
  "USAGE_CITY",
  "USAGE_HIGHWAY",
  "USAGE_FAMILY",
]);

export function carsQuestionPurpose(content: string): CarsQuestionPurpose | undefined {
  if (/(?:en az\s+\d+\s+koltuk.*zorunlu mu|zorunlu mu\?|koltuğun.*kesin şart mı)/iu.test(content) && /koltuk|kişi/iu.test(content)) {
    return "PARTY_CONFIRMATION";
  }
  if (/(?:şehirde de mi kullanıl|günlük şehir|günlük.*arazi|arazi önceliği|asıl işi arazi)/iu.test(content)) {
    return "DAILY_VS_OFFROAD";
  }
  if (/(?:hangisine daha yakın|kamp ve stabilize|çamurlu\/kötü|ciddi arazi mi|daha çok kamp)/iu.test(content)) {
    return "USAGE_DETAIL";
  }
  if (/(?:günlük hayatınızda en çok|nasıl kullan|işe gid|şehir içi|how will you use)/iu.test(content)) return "PRIMARY_USAGE";
  if (/(?:bütçe|üst sınır|fiyat|budget|maximum)/iu.test(content)) return "BUDGET_MAX";
  if (/(?:sıfır mı|ikinci el de olur mu|yeni mi ikinci el|sıfır mı düşün)/iu.test(content)) return "ACQUISITION_MARKET";
  if (/(?:kaç koltuk|(?:minimum|en az).*koltuk|minimum number of seats)/iu.test(content)) return "MIN_SEATS";
  if (/(?:kaç kişi|kaç kişiyi taşımalı|party size|passenger)/iu.test(content)) return "PARTY_CONFIRMATION";
  if (/(?:bagaj.*minimum|minimum.*bagaj|cargo volume|litre olarak)/iu.test(content)) return "MIN_CARGO";
  if (/(?:sürüş destek|multimedya|iklim konfor|donanım.*belirleyici)/iu.test(content)) return "EQUIPMENT_SCOPE";
  if (/(?:vazgeçilmez|kararı.*değiştirecek|en çok değiştirecek|non-negotiable)/iu.test(content)) return "FINAL_PRIORITY";
  if (/(?:beğenmedi|rahatsız eden|hangi noktada uymadı)/iu.test(content)) return "REJECTION_DIAGNOSTIC";
}

export function budgetValue(text: string): number | undefined {
  const million = text.match(/(\d+(?:[.,]\d+)?)\s*(?:milyon|million)(?:\s+(\d{1,3})\s*bin)?\s*(?:tl|try|₺)?/iu);
  if (million) return Math.round(Number(million[1].replace(",", ".")) * 1_000_000) + Number(million[2] ?? 0) * 1_000;
  const explicit = text.match(/(\d[\d.\s,]*)\s*(?:tl|try|₺|lira)\b/iu);
  if (!explicit) return undefined;
  const digits = explicit[1].replace(/[^\d]/g, "");
  return digits ? Number(digits) : undefined;
}

export function isHardBudgetCeiling(text: string): boolean {
  return /(?:üzerine|üstüne)\s+(?:kesinlikle\s+)?(?:çıkmak istemiyorum|çıkmam|çıkamam)/iu.test(text)
    || /kesinlikle\s+(?:üzerine|üstüne)\s+çıkmak/iu.test(text)
    || /en fazla\s+\d/iu.test(text)
    || /kesin üst sınır/iu.test(text)
    || /üst sınırım/iu.test(text)
    || /(?:bütçeyi\s+)?aşamam/iu.test(text)
    || /tavan(?:ım|ı)\b/iu.test(text);
}

export function budgetCategoryFromText(text: string): CarsRequirementCategory {
  return isHardBudgetCeiling(text) ? "HARD_UNEVALUATED_CONSTRAINT" : "SOFT_CONTEXT";
}

export function extractDeterministicFacts(text: string): readonly { key: CarsRequirementKey; value: string | number }[] {
  const found: { key: CarsRequirementKey; value: string | number }[] = [];
  if (/\bciddi arazi\b/iu.test(text)) found.push({ key: "USAGE_SERIOUS_OFF_ROAD", value: "SERIOUS_OFF_ROAD" });
  if (/(?:\barazi\b|off[\s-]?road|kötü yol|rough road)/iu.test(text)) found.push({ key: "USAGE_ROUGH_ROAD", value: "ROUGH_ROAD" });
  if (/\bkamp\b/iu.test(text)) found.push({ key: "USAGE_CAMP", value: "CAMP" });
  if (/\bstabilize\b/iu.test(text)) found.push({ key: "USAGE_STABILIZED_ROAD", value: "STABILIZED_ROAD" });
  if (/(?:şehir(?:de| içi)|city driving|commut)/iu.test(text)) found.push({ key: "USAGE_CITY", value: "CITY" });
  if (/(?:uzun yol|highway|long trip)/iu.test(text)) found.push({ key: "USAGE_HIGHWAY", value: "HIGHWAY" });
  if (/(?:\baile\b|family use|çocuk)/iu.test(text)) found.push({ key: "USAGE_FAMILY", value: "FAMILY" });
  const budget = budgetValue(text);
  if (budget !== undefined) found.push({ key: "BUDGET_MAX_TRY", value: budget });
  if (/(?:\b4\s*[x×]\s*4\b|\bawd\b|dört çeker)/iu.test(text)) found.push({ key: "DRIVETRAIN", value: "AWD_OR_4X4" });
  if (/(?:\bpick[\s-]?up\b|\bpikap\b)/iu.test(text)) found.push({ key: "BODY_TYPE", value: "PICKUP" });
  if (/(?:\bsuv\b|cross[\s-]?over)/iu.test(text)) found.push({ key: "BODY_TYPE", value: "SUV_CROSSOVER" });
  if (/\bhatchback\b/iu.test(text)) found.push({ key: "BODY_TYPE", value: "HATCHBACK" });
  if (/\bsedan\b/iu.test(text)) found.push({ key: "BODY_TYPE", value: "SEDAN" });
  if (/(?:donanım(?:ı)?\s+(?:yüksek|dolu)|(?:yüksek|dolu)\s+donanım)/iu.test(text)) found.push({ key: "EQUIPMENT_LEVEL", value: "HIGH" });
  if (/(?:küçük\s+olmasın|küçük\s+(?:araç\s+)?istemiyorum|ufak\s+olmasın)/iu.test(text)) found.push({ key: "SIZE_PREFERENCE", value: "NOT_SMALL" });
  if (/(?:küçük dış ölç|kompakt(?: dış ölç| olsun)|şehir içinde hantal olmasın|dışarıdan küçük)/iu.test(text)) found.push({ key: "SIZE_PREFERENCE", value: "COMPACT_EXTERIOR" });
  if (/(?:\botomatik\b|automatic)/iu.test(text)) found.push({ key: "TRANSMISSION", value: "AUTOMATIC" });
  if (/(?:\bmanuel\b|\bmanual\b)/iu.test(text)) found.push({ key: "TRANSMISSION", value: "MANUAL" });
  const numberWords: Record<string, number> = { iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7 };
  const party = text.match(/(?:^|\s)(\d{1,2}|iki|üç|dört|beş|altı|yedi)\s*(?:kişi(?:lik)?|kişiyiz)(?:\s|[,.;:!?]|$)/iu);
  if (party) found.push({ key: "PARTY_SIZE", value: Number(party[1]) || numberWords[party[1].toLocaleLowerCase("tr-TR")] });
  const seats = text.match(/(?:en az\s+)?(\d{1,2})\s*(?:koltuk|koltuklu)(?:\s+(?:lazım|gerekli|istiyorum|olsun|yeter))?/iu);
  if (seats) found.push({ key: "MIN_SEATS", value: Number(seats[1]) });
  const cargo = text.match(/(?:en az\s+)?(\d{2,4})\s*(?:litre|liter|l)\s*(?:bagaj|cargo)/iu)
    ?? text.match(/(?:bagaj|cargo)[^\d]{0,30}(?:en az\s+)?(\d{2,4})\s*(?:litre|liter|l)/iu);
  if (cargo) found.push({ key: "MIN_CARGO_L", value: Number(cargo[1]) });
  return found;
}

export function categoryFor(key: CarsRequirementKey): CarsRequirementCategory {
  if (USAGE_KEYS.has(key)) return "USAGE_CONTEXT";
  if (key === "BUDGET_MAX_TRY") return "SOFT_CONTEXT";
  if (key === "ACQUISITION_MARKET") return "USAGE_CONTEXT";
  if (key === "MIN_SEATS" || key === "MIN_CARGO_L" || key === "DRIVETRAIN" || key === "TRANSMISSION") return "HARD_CONSTRAINT";
  if (key === "PARTY_SIZE") return "HARD_CONSTRAINT";
  return "SOFT_PREFERENCE";
}

export function evaluabilityFor(key: CarsRequirementKey): CarsRequirementEvaluability {
  return EVALUABLE_KEYS.has(key) ? "EVALUABLE_NOW" : "UNDERSTOOD_NOT_EVALUABLE";
}

export function statusFor(key: CarsRequirementKey): CarsRequirementStatus {
  return EVALUABLE_KEYS.has(key) ? "SUPPORTED_EVALUABLE" : "UNDERSTOOD_BUT_UNSUPPORTED";
}

export function isAffirmative(text: string): boolean {
  return /^(?:evet|aynen|doğru|olur|yes|correct|tamam|ok)(?:[,.]?\s+(?:o|onu|o olsun|o da olsun|öyle))?[.!\s]*$/iu.test(text.trim());
}

export function isNegative(text: string): boolean {
  return /^(?:hayır|yok|değil|no|nope)[.!\s]*$/iu.test(text.trim());
}

export function isFrustration(text: string): boolean {
  return /(?:dedim ya|anlamadın mı|anlamdın mı|az önce söyledim|yine aynı|salaksın|aptal|anlamıyor musun)/iu.test(text);
}

export function isOffTopic(text: string): boolean {
  const normalized = text.trim();
  if (normalized.length > 180) return false;
  if (/(?:araba|araç|otomobil|koltuk|bagaj|bütçe|arazi|kamp|pickup|pikap|donanım|4x4|suv|sedan|car|vehicle|seat|cargo|budget)/iu.test(normalized)) {
    return false;
  }
  return /(?:hava nasıl|saat kaç|borsa|bitcoin|tarif|yemek|film|maç kaç)/iu.test(normalized);
}

export function pendingQuestionFromAssistant(content: string): CarsPendingQuestion | undefined {
  const purpose = carsQuestionPurpose(content);
  if (!purpose) return undefined;
  const seatsConfirm = content.match(/(?:en az\s+)?(\d{1,2})\s*(?:koltuk|kişi)/iu);
  const yesImplies = purpose === "PARTY_CONFIRMATION" && seatsConfirm
    ? { key: "MIN_SEATS" as const, value: Number(seatsConfirm[1]) }
    : purpose === "MIN_SEATS" && seatsConfirm
      ? { key: "MIN_SEATS" as const, value: Number(seatsConfirm[1]) }
      : undefined;
  return {
    purpose,
    prompt: content,
    pendingValue: yesImplies?.value,
    yesImplies,
  };
}

export function upsertRequirement(
  entries: Map<CarsRequirementKey, CarsRequirementLedgerEntry>,
  input: {
    key: CarsRequirementKey;
    value: string | number;
    sourceTurn: number;
    sourceText: string;
    category?: CarsRequirementCategory;
    evaluability?: CarsRequirementEvaluability;
    confirmedFromAssistantTurn?: number;
  },
): boolean {
  const previous = entries.get(input.key);
  const hardBudget = input.key === "BUDGET_MAX_TRY" && (
    isHardBudgetCeiling(input.sourceText)
    || input.category === "HARD_UNEVALUATED_CONSTRAINT"
    || previous?.category === "HARD_UNEVALUATED_CONSTRAINT"
  );
  if (previous && previous.value === input.value && previous.evaluability !== "SUPERSEDED") {
    if (hardBudget && previous.category !== "HARD_UNEVALUATED_CONSTRAINT") {
      entries.set(input.key, {
        ...previous,
        category: "HARD_UNEVALUATED_CONSTRAINT",
        sourceTurn: input.sourceTurn,
        sourceText: input.sourceText,
      });
      return true;
    }
    return false;
  }
  const supportedBody = input.key === "BODY_TYPE" && ["SUV_CROSSOVER", "HATCHBACK", "SEDAN"].includes(String(input.value));
  const evaluability = input.evaluability ?? (supportedBody ? "EVALUABLE_NOW" : evaluabilityFor(input.key));
  const category = hardBudget
    ? "HARD_UNEVALUATED_CONSTRAINT"
    : input.category ?? (previous && previous.value !== input.value ? "CORRECTION" : categoryFor(input.key));
  entries.set(input.key, {
    key: input.key,
    value: input.value,
    status: supportedBody ? "SUPPORTED_EVALUABLE" : statusFor(input.key),
    category,
    evaluability: previous && previous.value !== input.value ? "EVALUABLE_NOW" === evaluability ? evaluability : evaluability : evaluability,
    sourceTurn: input.sourceTurn,
    sourceText: input.sourceText,
    previousValue: previous && previous.value !== input.value ? previous.value : previous?.previousValue,
    usedInDecision: EVALUABLE_KEYS.has(input.key) || supportedBody,
    confirmedFromAssistantTurn: input.confirmedFromAssistantTurn,
  });
  if (previous && previous.value !== input.value) {
    entries.set(input.key, {
      ...entries.get(input.key)!,
      category: hardBudget ? "HARD_UNEVALUATED_CONSTRAINT" : "CORRECTION",
      evaluability: previous.evaluability === "EVALUABLE_NOW" || evaluability === "EVALUABLE_NOW"
        ? evaluability
        : previous.evaluability,
    });
  }
  return true;
}

export function answeredPurposesFrom(requirements: readonly CarsRequirementLedgerEntry[]): CarsQuestionPurpose[] {
  const answered = new Set<CarsQuestionPurpose>();
  if (requirements.some((entry) => USAGE_KEYS.has(entry.key))) {
    answered.add("PRIMARY_USAGE");
    if (requirements.some((entry) => entry.key === "USAGE_CAMP" || entry.key === "USAGE_SERIOUS_OFF_ROAD" || entry.key === "USAGE_STABILIZED_ROAD")) {
      answered.add("USAGE_DETAIL");
    }
  }
  if (requirements.some((entry) => entry.key === "BUDGET_MAX_TRY")) answered.add("BUDGET_MAX");
  if (requirements.some((entry) => entry.key === "ACQUISITION_MARKET")) answered.add("ACQUISITION_MARKET");
  if (requirements.some((entry) => entry.key === "MIN_SEATS" || entry.key === "PARTY_SIZE")) {
    answered.add("MIN_SEATS");
    answered.add("PARTY_CONFIRMATION");
  }
  if (requirements.some((entry) => entry.key === "MIN_CARGO_L")) answered.add("MIN_CARGO");
  if (requirements.some((entry) => entry.key === "BODY_TYPE")) answered.add("BODY_TYPE");
  if (requirements.some((entry) => entry.key === "DRIVETRAIN")) answered.add("DRIVETRAIN");
  if (requirements.some((entry) => entry.key === "SIZE_PREFERENCE")) answered.add("SIZE");
  if (requirements.some((entry) => entry.key === "EQUIPMENT_LEVEL")) answered.add("EQUIPMENT_SCOPE");
  return [...answered];
}

export { conversationStateFromPhase } from "./carsAdvisorState";

export function emptyConversationTrace(): CarsConversationTrace {
  return {
    version: 1,
    state: "SOCIAL_OPEN",
    phase: "SOCIAL_OPEN",
    advisorStage: "SOCIAL_OPEN",
    vehicleIntentEstablished: false,
    humanReady: false,
    governedReady: false,
    recommendationOfferStatus: "NONE",
    requirements: [],
    askedQuestionPurposes: [],
    answeredQuestionPurposes: [],
    latestUserTurn: 0,
    capturedOnLatestTurn: [],
    didConversationProgress: false,
    textInputAllowed: true,
    optionHistory: [],
    rejectedRecommendationIds: [],
    semanticFingerprint: "",
    loopCount: 0,
    addressForm: undefined,
    acquisitionMarket: "NEW_ONLY",
    affordabilityState: "AFFORDABILITY_NOT_REQUESTED",
  };
}

export function withCarsConversationState(
  trace: CarsConversationTrace,
  state: CarsConversationState,
): CarsConversationTrace {
  const phase: CarsConversationPhase = state === "FINAL_DISCRIMINATOR_REQUIRED" ? "FINAL_TRADEOFF"
    : state === "OFFER_AWAITING_CONSENT" ? "OFFERING"
      : state === "RECOMMENDATION_SHOWN" || state === "DECISION_READY" ? "RECOMMENDATION_SHOWN"
        : state === "SOCIAL_OPEN" ? "SOCIAL_OPEN"
          : state === "SOCIAL_DETOUR" ? "SOCIAL_DETOUR"
            : state === "INSUFFICIENT_SUPPORTED_EVIDENCE" ? "LIMITED_BY_EVIDENCE"
              : state === "SYSTEM_FAILURE" ? "RECOVERING"
                : state === "CLARIFICATION_REQUIRED" ? "CLARIFYING"
                  : trace.phase === "READY_TO_EVALUATE" || trace.phase === "EVALUATING" || trace.phase === "DISCOVERING"
                    ? trace.phase
                    : "DISCOVERING";
  return {
    ...trace,
    state,
    phase,
    textInputAllowed: state !== "FINAL_DISCRIMINATOR_REQUIRED",
  };
}

export function latestRequirement(
  trace: CarsConversationTrace,
  key: CarsRequirementKey,
): CarsRequirementLedgerEntry | undefined {
  return trace.requirements.find((entry) => entry.key === key);
}
