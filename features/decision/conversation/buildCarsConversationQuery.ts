import type { CarsConversationMessage } from "@/types/carsConversation";
import { buildCarsRequirementLedger } from "./carsConversationMemory";

export function buildCarsConversationQuery(
  messages: readonly CarsConversationMessage[],
): string {
  const userMessages = messages.filter((message) => message.role === "user");
  const ledger = buildCarsRequirementLedger(messages);
  const confirmedSeats = ledger.requirements.find((entry) => entry.key === "MIN_SEATS");
  const confirmedCargo = ledger.requirements.find((entry) => entry.key === "MIN_CARGO_L");

  return [
    "Automobile decision conversation (oldest to newest):",
    ...userMessages.map(
      (message, index) => `User turn ${index + 1}: ${message.content.trim()}`,
    ),
    confirmedSeats ? `Confirmed structured requirement: at least ${confirmedSeats.value} seats.` : undefined,
    confirmedCargo ? `Confirmed structured requirement: at least ${confirmedCargo.value} litres cargo volume.` : undefined,
    "Use the complete conversation as the request. When the user explicitly changes or corrects a preference, the newest statement replaces the older one.",
  ].filter((line): line is string => Boolean(line)).join("\n");
}
