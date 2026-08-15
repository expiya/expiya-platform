import type {
  CarsActiveOptionSet,
  CarsConversationMessage,
  CarsConversationTrace,
  CarsOptionSelectionSource,
  CarsQuestionMemoryEntry,
  CarsQuestionPurpose,
  CarsRequirementKey,
  CarsRequirementLedgerEntry,
} from "@/types/carsConversation";

import {
  answeredPurposesFrom,
  carsQuestionPurpose,
  conversationStateFromPhase,
  budgetCategoryFromText,
  extractDeterministicFacts,
  isAffirmative,
  isHardBudgetCeiling,
  isNegative,
  pendingQuestionFromAssistant,
  upsertRequirement,
} from "./carsRequirementLedger";
import { advisorDefaults } from "./carsAdvisorState";

function normalize(text: string): string {
  return text.toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function ordinalIndex(text: string): number | undefined {
  const value = text.trim();
  if (/^(?:ilk(?:i| seçenek)?|birinci|1\.?|first(?: one)?)[.!]?$/iu.test(value)) return 0;
  if (/^(?:ikinci(?:si)?|2\.?|second(?: one)?)[.!]?$/iu.test(value)) return 1;
  if (/^(?:üçüncü(?:sü)?|3\.?|third(?: one)?)[.!]?$/iu.test(value)) return 2;
  return undefined;
}

function isConfirmingSelection(text: string): boolean {
  return /^(?:evet,?\s+o|o olsun|onu istiyorum|o da olsun|evet o)[.!]?$/iu.test(text.trim());
}

export function matchOptionSelection(
  text: string,
  optionSet: CarsActiveOptionSet | undefined,
  selectedOptionId?: string,
): { optionId: string; source: CarsOptionSelectionSource } | undefined {
  if (!optionSet?.active || optionSet.options.length === 0) return undefined;
  if (selectedOptionId && optionSet.options.some((option) => option.id === selectedOptionId)) {
    return { optionId: selectedOptionId, source: "button" };
  }
  const normalized = normalize(text);
  const exact = optionSet.options.find((option) => normalize(option.label) === normalized);
  if (exact) return { optionId: exact.id, source: "text" };
  const contained = optionSet.options.find((option) => {
    const label = normalize(option.label);
    const semantic = normalize(option.semanticValue.replaceAll("_", " "));
    return (label.length > 3 && normalized.includes(label)) || (semantic.length > 3 && normalized.includes(semantic));
  });
  if (contained && !optionSet.options.some((other) => other !== contained && normalized.includes(normalize(other.label)))) {
    return { optionId: contained.id, source: text.trim().length > contained.label.length + 4 ? "paraphrase" : "text" };
  }
  const index = ordinalIndex(text);
  if (index !== undefined && optionSet.options[index]) return { optionId: optionSet.options[index].id, source: "ordinal" };
  if (isConfirmingSelection(text) || (isAffirmative(text) && optionSet.options.length === 1)) {
    return { optionId: optionSet.options[0].id, source: "confirmation" };
  }
  return undefined;
}

function applyOptionSemantics(
  entries: Map<CarsRequirementKey, CarsRequirementLedgerEntry>,
  optionSet: CarsActiveOptionSet,
  optionId: string,
  sourceTurn: number,
  sourceText: string,
): CarsRequirementKey[] {
  const option = optionSet.options.find((item) => item.id === optionId);
  if (!option) return [];
  const captured: CarsRequirementKey[] = [];
  const semanticFacts = [
    ...extractDeterministicFacts(`${option.label} ${option.semanticValue.replaceAll("_", " ")}`),
  ];
  if (option.semanticValue === "SERIOUS_OFF_ROAD") semanticFacts.push({ key: "USAGE_SERIOUS_OFF_ROAD", value: "SERIOUS_OFF_ROAD" });
  if (option.semanticValue === "CAMP" || option.semanticValue === "STABILIZED_ROAD") {
    semanticFacts.push({ key: "USAGE_CAMP", value: "CAMP" });
    semanticFacts.push({ key: "USAGE_STABILIZED_ROAD", value: "STABILIZED_ROAD" });
  }
  if (option.semanticValue === "ROUGH_ROAD") semanticFacts.push({ key: "USAGE_ROUGH_ROAD", value: "ROUGH_ROAD" });
  for (const fact of semanticFacts) {
    if (upsertRequirement(entries, { ...fact, sourceTurn, sourceText })) captured.push(fact.key);
  }
  return [...new Set(captured)];
}

export function hydrateCarsConversationMemory(input: {
  readonly messages: readonly CarsConversationMessage[];
  readonly conversation?: CarsConversationTrace;
  readonly selectedOptionId?: string;
}): CarsConversationTrace {
  const entries = new Map<CarsRequirementKey, CarsRequirementLedgerEntry>();
  const asked = new Set<CarsQuestionPurpose>();
  const optionHistory: CarsActiveOptionSet[] = [];
  const questionMemory: CarsQuestionMemoryEntry[] = [...(input.conversation?.questionMemory ?? [])];
  const rejected = new Set<string>(input.conversation?.rejectedRecommendationIds ?? []);
  const userMessages = input.messages.filter((message) => message.role === "user");
  const latestUserTurn = userMessages.length;
  const capturedOnLatestTurn: CarsRequirementKey[] = [];
  const replayFromMessages = !input.conversation || input.conversation.requirements.length === 0;
  let userTurn = replayFromMessages ? 0 : Math.max(0, latestUserTurn - 1);
  let assistantTurn = replayFromMessages ? 0 : input.messages.filter((message) => message.role === "assistant").length;
  let pending = input.conversation?.lastAssistantQuestion;
  let activeOptionSet = input.conversation?.activeOptionSet && input.conversation.activeOptionSet.active
    ? { ...input.conversation.activeOptionSet }
    : undefined;
  let lastProgressEvent = input.conversation?.lastProgressEvent;
  const loopCount = input.conversation?.loopCount ?? 0;

  if (input.conversation) {
    for (const requirement of input.conversation.requirements) entries.set(requirement.key, requirement);
    for (const purpose of input.conversation.askedQuestionPurposes) asked.add(purpose);
    optionHistory.push(...input.conversation.optionHistory);
  }

  for (const message of input.messages) {
    if (!replayFromMessages && message !== userMessages.at(-1)) continue;
    if (message.role === "assistant") {
      assistantTurn += 1;
      const purpose = message.optionSet?.purpose ?? carsQuestionPurpose(message.content);
      if (purpose) asked.add(purpose);
      pending = pendingQuestionFromAssistant(message.content) ?? (purpose ? { purpose, prompt: message.content } : pending);
      if (purpose && !questionMemory.some((entry) => entry.sourceAssistantTurn === assistantTurn && entry.purpose === purpose)) {
        questionMemory.push({ purpose, prompt: message.content, status: "OPEN", sourceAssistantTurn: assistantTurn });
      }
      if (message.optionSet) {
        activeOptionSet = {
          ...message.optionSet,
          active: true,
          sourceAssistantTurn: message.optionSet.sourceAssistantTurn || assistantTurn,
        };
      }
      continue;
    }
    userTurn += 1;
    const capturedHere: CarsRequirementKey[] = [];
    const pendingAtStart = pending;
    let directlyAnsweredPending = false;
    const selection = matchOptionSelection(
      message.content,
      activeOptionSet,
      userTurn === latestUserTurn ? input.selectedOptionId : undefined,
    );
    if (selection && activeOptionSet) {
      capturedHere.push(...applyOptionSemantics(entries, activeOptionSet, selection.optionId, userTurn, message.content));
      activeOptionSet = {
        ...activeOptionSet,
        active: false,
        selectedOptionId: selection.optionId,
        selectionSource: selection.source,
      };
      optionHistory.push(activeOptionSet);
      lastProgressEvent = `option:${selection.optionId}:${selection.source}`;
      directlyAnsweredPending = true;
    }
    const facts = [...extractDeterministicFacts(message.content)];
    if ((isAffirmative(message.content) || /^evet\b/iu.test(message.content.trim())) && pending?.yesImplies) {
      const implied = pending.yesImplies;
      if (upsertRequirement(entries, {
        key: implied.key,
        value: implied.value,
        sourceTurn: userTurn,
        sourceText: message.content,
        confirmedFromAssistantTurn: assistantTurn,
      })) capturedHere.push(implied.key);
      lastProgressEvent = `confirm:${implied.key}`;
      directlyAnsweredPending = true;
    }
    if (isNegative(message.content) && pending?.yesImplies) {
      lastProgressEvent = `reject:${pending.yesImplies.key}`;
      directlyAnsweredPending = true;
    }
    const correction = message.content.match(/^(?:hayır|aslında)[,.]?\s+(\d{1,2})\s*(?:koltuk\s+)?yeter/iu);
    if (correction && (pending?.purpose === "MIN_SEATS" || pending?.purpose === "PARTY_CONFIRMATION" || entries.has("MIN_SEATS") || entries.has("PARTY_SIZE"))) {
      if (upsertRequirement(entries, {
        key: "MIN_SEATS",
        value: Number(correction[1]),
        sourceTurn: userTurn,
        sourceText: message.content,
        category: "CORRECTION",
        evaluability: "EVALUABLE_NOW",
      })) capturedHere.push("MIN_SEATS");
    }
    for (const fact of facts) {
      const category = fact.key === "BUDGET_MAX_TRY" ? budgetCategoryFromText(message.content) : undefined;
      if (upsertRequirement(entries, { ...fact, sourceTurn: userTurn, sourceText: message.content, category })) {
        capturedHere.push(fact.key);
      }
    }
    if (isHardBudgetCeiling(message.content)) {
      const existing = entries.get("BUDGET_MAX_TRY");
      if (existing && upsertRequirement(entries, {
        key: "BUDGET_MAX_TRY",
        value: existing.value,
        sourceTurn: userTurn,
        sourceText: message.content,
        category: "HARD_UNEVALUATED_CONSTRAINT",
      })) capturedHere.push("BUDGET_MAX_TRY");
    }
    if (/(?:beğenmedim|hoşuma gitmedi|istemiyorum|başka seçenek|bunlar olmaz)/iu.test(message.content)) {
      const prior = [...input.messages].slice(0, input.messages.indexOf(message)).reverse()
        .find((item) => item.role === "assistant" && item.recommendationIds?.length);
      for (const id of prior?.recommendationIds ?? []) rejected.add(id);
      lastProgressEvent = "recommendation-rejected";
    }
    if (userTurn === latestUserTurn) capturedOnLatestTurn.push(...capturedHere);
    if (pendingAtStart) {
      directlyAnsweredPending ||= purposeAnsweredByKeys(pendingAtStart.purpose, capturedHere);
      const status = directlyAnsweredPending ? "ANSWERED" : capturedHere.length > 0 ? "DEFERRED" : "OPEN";
      const index = [...questionMemory].reverse().findIndex((entry) => entry.purpose === pendingAtStart.purpose && entry.status === "OPEN");
      const actualIndex = index < 0 ? -1 : questionMemory.length - 1 - index;
      if (actualIndex >= 0) questionMemory[actualIndex] = {
        ...questionMemory[actualIndex],
        status,
        updatedOnUserTurn: userTurn,
        transitionReason: status === "ANSWERED"
          ? "The user answered or confirmed this question."
          : status === "DEFERRED"
            ? "The user supplied a different useful fact; the question remains material for reconsideration."
            : "The latest message did not resolve this question.",
      };
      if (status !== "OPEN") pending = undefined;
    }
  }

  if (entries.has("MIN_SEATS")) {
    const partySize = entries.get("PARTY_SIZE");
    if (partySize) {
      entries.set("PARTY_SIZE", {
        ...partySize,
        status: "SUPPORTED_NOT_YET_EVALUABLE",
        evaluability: "EVALUABLE_NOW",
        category: "USAGE_CONTEXT",
      });
    }
  }

  const requirements = [...entries.values()];
  const answered = answeredPurposesFrom(requirements);
  const didConversationProgress = capturedOnLatestTurn.length > 0
    || Boolean(activeOptionSet?.selectedOptionId && !activeOptionSet.active);
  const advisor = advisorDefaults(input.conversation);

  return {
    version: 1,
    state: conversationStateFromPhase("DISCOVERING"),
    phase: "DISCOVERING",
    ...advisor,
    vehicleIntentEstablished: advisor.vehicleIntentEstablished || requirements.length > 0,
    heldAuthorization: input.conversation?.heldAuthorization,
    requirements,
    askedQuestionPurposes: [...asked],
    answeredQuestionPurposes: answered,
    questionMemory,
    latestUserTurn,
    capturedOnLatestTurn: [...new Set(capturedOnLatestTurn)],
    didConversationProgress,
    textInputAllowed: true,
    lastAssistantQuestion: pending,
    activeOptionSet,
    optionHistory,
    rejectedRecommendationIds: [...rejected],
    lastProgressEvent,
    semanticFingerprint: JSON.stringify({
      keys: requirements.map((entry) => `${entry.key}:${entry.value}`).sort(),
      asked: [...asked].sort(),
      pending: pending?.purpose,
      option: activeOptionSet?.id,
      selected: activeOptionSet?.selectedOptionId,
      advisor: advisor.advisorStage,
      offer: advisor.recommendationOfferStatus,
    }),
    loopCount,
    addressForm: input.conversation?.addressForm,
  };
}

function purposeAnsweredByKeys(purpose: CarsQuestionPurpose, keys: readonly CarsRequirementKey[]): boolean {
  if (purpose === "DAILY_VS_OFFROAD") return keys.includes("USAGE_CITY");
  if (purpose === "MIN_SEATS" || purpose === "PARTY_CONFIRMATION") return keys.includes("MIN_SEATS");
  if (purpose === "MIN_CARGO") return keys.includes("MIN_CARGO_L");
  if (purpose === "BUDGET_MAX") return keys.includes("BUDGET_MAX_TRY");
  if (purpose === "EQUIPMENT_SCOPE") return keys.includes("EQUIPMENT_LEVEL");
  if (purpose === "SIZE") return keys.includes("SIZE_PREFERENCE");
  if (purpose === "BODY_TYPE") return keys.includes("BODY_TYPE");
  if (purpose === "DRIVETRAIN") return keys.includes("DRIVETRAIN");
  if (purpose === "USAGE_DETAIL") return keys.some((key) => ["USAGE_CAMP", "USAGE_SERIOUS_OFF_ROAD", "USAGE_STABILIZED_ROAD"].includes(key));
  if (purpose === "PRIMARY_USAGE") return keys.some((key) => key.startsWith("USAGE_"));
  return false;
}

export function buildCarsRequirementLedger(
  messages: readonly CarsConversationMessage[],
  conversation?: CarsConversationTrace,
): CarsConversationTrace {
  return hydrateCarsConversationMemory({ messages, conversation });
}

export function closeDeferredQuestions(
  trace: CarsConversationTrace,
  reason: string,
): CarsConversationTrace {
  return {
    ...trace,
    questionMemory: trace.questionMemory?.map((entry) => entry.status === "DEFERRED"
      ? { ...entry, status: "NO_LONGER_MATERIAL" as const, transitionReason: reason }
      : entry),
  };
}

export function applyAssistantMove(
  trace: CarsConversationTrace,
  input: {
    readonly phase: CarsConversationTrace["phase"];
    readonly purpose?: CarsQuestionPurpose;
    readonly prompt: string;
    readonly options?: CarsActiveOptionSet;
    readonly progressEvent?: string;
    readonly advisorStage?: CarsConversationTrace["advisorStage"];
    readonly vehicleIntentEstablished?: boolean;
    readonly humanReady?: boolean;
    readonly governedReady?: boolean;
    readonly recommendationOfferStatus?: CarsConversationTrace["recommendationOfferStatus"];
    readonly heldAuthorization?: string;
    readonly clearPendingQuestion?: boolean;
  },
): CarsConversationTrace {
  const asked = new Set(trace.askedQuestionPurposes);
  if (input.purpose) asked.add(input.purpose);
  const inferredPending = pendingQuestionFromAssistant(input.prompt);
  const pending = input.clearPendingQuestion
    ? undefined
    : input.purpose
      ? {
        purpose: input.purpose,
        prompt: input.prompt,
        pendingValue: inferredPending?.purpose === input.purpose ? inferredPending.pendingValue : undefined,
        yesImplies: inferredPending?.purpose === input.purpose
          ? inferredPending.yesImplies
          : input.purpose === "PARTY_CONFIRMATION" ? latestNumericImplication(trace, input.prompt) : undefined,
      }
      : undefined;
  const questionMemory = [...(trace.questionMemory ?? [])];
  if (input.purpose) {
    questionMemory.push({
      purpose: input.purpose,
      prompt: input.prompt,
      status: "OPEN",
      sourceAssistantTurn: trace.latestUserTurn,
      transitionReason: questionMemory.some((entry) => entry.purpose === input.purpose && entry.status === "DEFERRED")
        ? "A deferred material question was resumed in the current context."
        : "The assistant asked one focused question.",
    });
  }
  return {
    ...trace,
    phase: input.phase,
    state: conversationStateFromPhase(input.phase),
    advisorStage: input.advisorStage ?? trace.advisorStage,
    vehicleIntentEstablished: input.vehicleIntentEstablished ?? trace.vehicleIntentEstablished,
    humanReady: input.humanReady ?? trace.humanReady,
    governedReady: input.governedReady ?? trace.governedReady,
    recommendationOfferStatus: input.recommendationOfferStatus ?? trace.recommendationOfferStatus,
    heldAuthorization: input.heldAuthorization !== undefined ? input.heldAuthorization : trace.heldAuthorization,
    askedQuestionPurposes: [...asked],
    questionMemory,
    lastAssistantQuestion: pending,
    activeOptionSet: input.options,
    optionHistory: input.options ? [...trace.optionHistory, input.options] : trace.optionHistory,
    lastProgressEvent: input.progressEvent ?? trace.lastProgressEvent,
    textInputAllowed: input.phase !== "FINAL_TRADEOFF",
    semanticFingerprint: JSON.stringify({
      keys: trace.requirements.map((entry) => `${entry.key}:${entry.value}`).sort(),
      asked: [...asked].sort(),
      pending: pending?.purpose,
      option: input.options?.id,
      offer: input.recommendationOfferStatus ?? trace.recommendationOfferStatus,
    }),
  };
}

function latestNumericImplication(
  trace: CarsConversationTrace,
  prompt: string,
): { key: CarsRequirementKey; value: number } | undefined {
  const match = prompt.match(/(?:en az\s+)?(\d{1,2})\s*(?:koltuk|kişi)/iu);
  if (match) return { key: "MIN_SEATS", value: Number(match[1]) };
  const party = trace.requirements.find((entry) => entry.key === "PARTY_SIZE");
  if (typeof party?.value === "number") return { key: "MIN_SEATS", value: party.value };
}
