import type {
  CarsConversationMessage,
  CarsConversationState,
  CarsConversationTrace,
  CarsQuestionPurpose,
  CarsRequirementKey,
  CarsRequirementLedgerEntry,
} from "@/types/carsConversation";

const evaluableKeys = new Set<CarsRequirementKey>(["MIN_SEATS", "MIN_CARGO_L"]);

export function carsQuestionPurpose(content: string): CarsQuestionPurpose | undefined {
  if (/(?:kamp.*stabilize|çamurlu|ciddi arazi|hangi.*kullan)/iu.test(content)) return "PRIMARY_USAGE";
  if (/(?:bütçe|üst sınır|fiyat|budget|maximum)/iu.test(content)) return "BUDGET_MAX";
  if (/(?:kaç koltuk|minimum.*koltuk|minimum number of seats)/iu.test(content)) return "MIN_SEATS";
  if (/(?:bagaj.*minimum|minimum.*bagaj|cargo volume)/iu.test(content)) return "MIN_CARGO";
  if (/(?:vazgeçilmez|kararı.*değiştirecek|en çok değiştirecek|non-negotiable)/iu.test(content)) return "FINAL_PRIORITY";
}

function budgetValue(text: string): number | undefined {
  const million = text.match(/(\d+(?:[.,]\d+)?)\s*(?:milyon|million)\s*(?:tl|try|₺)?/iu);
  if (million) return Math.round(Number(million[1].replace(",", ".")) * 1_000_000);
  const explicit = text.match(/(\d[\d.\s,]*)\s*(?:tl|try|₺|lira)\b/iu);
  if (!explicit) return undefined;
  const digits = explicit[1].replace(/[^\d]/g, "");
  return digits ? Number(digits) : undefined;
}

function captures(text: string): readonly { key: CarsRequirementKey; value: string | number }[] {
  const found: { key: CarsRequirementKey; value: string | number }[] = [];
  if (/(?:\barazi\b|off[\s-]?road|kötü yol|rough road)/iu.test(text)) found.push({ key: "USAGE_ROUGH_ROAD", value: "ROUGH_ROAD" });
  if (/\bkamp\b/iu.test(text)) found.push({ key: "USAGE_CAMP", value: "CAMP" });
  if (/\bstabilize\b/iu.test(text)) found.push({ key: "USAGE_STABILIZED_ROAD", value: "STABILIZED_ROAD" });
  const budget = budgetValue(text);
  if (budget !== undefined) found.push({ key: "BUDGET_MAX_TRY", value: budget });
  if (/(?:\b4\s*[x×]\s*4\b|\bawd\b|dört çeker)/iu.test(text)) found.push({ key: "DRIVETRAIN", value: "AWD_OR_4X4" });
  if (/(?:\bpick[\s-]?up\b|\bpikap\b)/iu.test(text)) found.push({ key: "BODY_TYPE", value: "PICKUP" });
  const seats = text.match(/(?:en az\s+)?(\d{1,2})\s*(?:koltuk|koltuklu)(?:\s+(?:lazım|gerekli|istiyorum|olsun|yeter))?/iu);
  if (seats) found.push({ key: "MIN_SEATS", value: Number(seats[1]) });
  const cargo = text.match(/(?:en az\s+)?(\d{2,4})\s*(?:litre|liter|l)\s*(?:bagaj|cargo)/iu)
    ?? text.match(/(?:bagaj|cargo)[^\d]{0,30}(?:en az\s+)?(\d{2,4})\s*(?:litre|liter|l)/iu);
  if (cargo) found.push({ key: "MIN_CARGO_L", value: Number(cargo[1]) });
  return found;
}

function statusFor(key: CarsRequirementKey) {
  return evaluableKeys.has(key) ? "SUPPORTED_EVALUABLE" as const : "UNDERSTOOD_BUT_UNSUPPORTED" as const;
}

export function buildCarsRequirementLedger(messages: readonly CarsConversationMessage[]): CarsConversationTrace {
  const entries = new Map<CarsRequirementKey, CarsRequirementLedgerEntry>();
  const asked = new Set<CarsQuestionPurpose>();
  const userMessages = messages.filter((message) => message.role === "user");
  const latestUserTurn = userMessages.length;
  const capturedOnLatestTurn: CarsRequirementKey[] = [];
  let userTurn = 0;

  for (const message of messages) {
    if (message.role === "assistant") {
      const purpose = carsQuestionPurpose(message.content);
      if (purpose) asked.add(purpose);
      continue;
    }
    userTurn += 1;
    for (const capture of captures(message.content)) {
      const previous = entries.get(capture.key);
      if (previous && previous.value === capture.value) continue;
      entries.set(capture.key, {
        key: capture.key,
        value: capture.value,
        status: statusFor(capture.key),
        sourceTurn: userTurn,
        sourceText: message.content,
        previousValue: previous && previous.value !== capture.value ? previous.value : previous?.previousValue,
        usedInDecision: evaluableKeys.has(capture.key),
      });
      if (userTurn === latestUserTurn) {
        capturedOnLatestTurn.push(capture.key);
      }
    }
  }

  const requirements = [...entries.values()];
  const answered = new Set<CarsQuestionPurpose>();
  if (requirements.some((entry) => entry.key.startsWith("USAGE_"))) answered.add("PRIMARY_USAGE");
  if (entries.has("BUDGET_MAX_TRY")) answered.add("BUDGET_MAX");
  if (entries.has("MIN_SEATS")) answered.add("MIN_SEATS");
  if (entries.has("MIN_CARGO_L")) answered.add("MIN_CARGO");
  if (entries.has("DRIVETRAIN") || entries.has("BODY_TYPE") || entries.has("MIN_SEATS") || entries.has("MIN_CARGO_L")) answered.add("FINAL_PRIORITY");

  return {
    state: "COLLECTING_CONTEXT",
    requirements,
    askedQuestionPurposes: [...asked],
    answeredQuestionPurposes: [...answered],
    latestUserTurn,
    capturedOnLatestTurn,
    didConversationProgress: capturedOnLatestTurn.length > 0,
    textInputAllowed: true,
  };
}

export function withCarsConversationState(
  trace: CarsConversationTrace,
  state: CarsConversationState,
): CarsConversationTrace {
  return { ...trace, state, textInputAllowed: state !== "FINAL_DISCRIMINATOR_REQUIRED" };
}

export function latestRequirement(
  trace: CarsConversationTrace,
  key: CarsRequirementKey,
): CarsRequirementLedgerEntry | undefined {
  return trace.requirements.find((entry) => entry.key === key);
}
