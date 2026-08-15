import type {
  CarsActiveOptionSet,
  CarsConversationMessage,
  CarsConversationTrace,
  CarsOptionSelectionSource,
  CarsQuestionPurpose,
  CarsRequirementKey,
  CarsRequirementLedgerEntry,
} from "@/types/carsConversation";

import {
  answeredPurposesFrom,
  carsQuestionPurpose,
  conversationStateFromPhase,
  extractDeterministicFacts,
  isAffirmative,
  isNegative,
  pendingQuestionFromAssistant,
  upsertRequirement,
} from "./carsRequirementLedger";

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
  const rejected = new Set<string>(input.conversation?.rejectedRecommendationIds ?? []);
  const userMessages = input.messages.filter((message) => message.role === "user");
  const latestUserTurn = userMessages.length;
  const capturedOnLatestTurn: CarsRequirementKey[] = [];
  let userTurn = 0;
  let assistantTurn = 0;
  let pending = input.conversation?.lastAssistantQuestion;
  let activeOptionSet = input.conversation?.activeOptionSet && input.conversation.activeOptionSet.active
    ? { ...input.conversation.activeOptionSet }
    : undefined;
  let lastProgressEvent = input.conversation?.lastProgressEvent;
  const loopCount = input.conversation?.loopCount ?? 0;
  const replayFromMessages = !input.conversation || input.conversation.requirements.length === 0;

  if (input.conversation) {
    for (const requirement of input.conversation.requirements) entries.set(requirement.key, requirement);
    for (const purpose of input.conversation.askedQuestionPurposes) asked.add(purpose);
    optionHistory.push(...input.conversation.optionHistory);
  }

  for (const message of input.messages) {
    if (message.role === "assistant") {
      assistantTurn += 1;
      const purpose = message.optionSet?.purpose ?? carsQuestionPurpose(message.content);
      if (purpose) asked.add(purpose);
      pending = pendingQuestionFromAssistant(message.content) ?? (purpose ? { purpose, prompt: message.content } : pending);
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
    if (!replayFromMessages && userTurn < latestUserTurn) continue;
    const capturedHere: CarsRequirementKey[] = [];
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
      pending = undefined;
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
    }
    if (isNegative(message.content) && pending?.yesImplies) {
      lastProgressEvent = `reject:${pending.yesImplies.key}`;
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
      if (upsertRequirement(entries, { ...fact, sourceTurn: userTurn, sourceText: message.content })) {
        capturedHere.push(fact.key);
      }
    }
    if (/(?:beğenmedim|hoşuma gitmedi|istemiyorum|başka seçenek|bunlar olmaz)/iu.test(message.content)) {
      const prior = [...input.messages].slice(0, input.messages.indexOf(message)).reverse()
        .find((item) => item.role === "assistant" && item.recommendationIds?.length);
      for (const id of prior?.recommendationIds ?? []) rejected.add(id);
      lastProgressEvent = "recommendation-rejected";
    }
    if (userTurn === latestUserTurn) capturedOnLatestTurn.push(...capturedHere);
    if (facts.length > 0 || capturedHere.length > 0) pending = undefined;
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

  return {
    version: 1,
    state: conversationStateFromPhase("DISCOVERING"),
    phase: "DISCOVERING",
    requirements,
    askedQuestionPurposes: [...asked],
    answeredQuestionPurposes: answered,
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
    }),
    loopCount,
  };
}

export function buildCarsRequirementLedger(
  messages: readonly CarsConversationMessage[],
  conversation?: CarsConversationTrace,
): CarsConversationTrace {
  return hydrateCarsConversationMemory({ messages, conversation });
}

export function applyAssistantMove(
  trace: CarsConversationTrace,
  input: {
    readonly phase: CarsConversationTrace["phase"];
    readonly purpose?: CarsQuestionPurpose;
    readonly prompt: string;
    readonly options?: CarsActiveOptionSet;
    readonly progressEvent?: string;
  },
): CarsConversationTrace {
  const asked = new Set(trace.askedQuestionPurposes);
  if (input.purpose) asked.add(input.purpose);
  const pending = input.purpose
    ? pendingQuestionFromAssistant(input.prompt) ?? {
      purpose: input.purpose,
      prompt: input.prompt,
      yesImplies: input.purpose === "PARTY_CONFIRMATION"
        ? latestNumericImplication(trace, input.prompt)
        : undefined,
    }
    : undefined;
  return {
    ...trace,
    phase: input.phase,
    state: conversationStateFromPhase(input.phase),
    askedQuestionPurposes: [...asked],
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
