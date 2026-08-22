import { createHash } from "node:crypto";

export interface PilotTranscriptMessage { readonly id: string; readonly role: "user" | "assistant"; readonly content: string }
const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value && typeof value === "object" ? `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}` : JSON.stringify(value);
export function createPilotArchiveIdentity(input: { readonly conversationId: string; readonly pilotUsername: string; readonly messages: readonly PilotTranscriptMessage[]; readonly conversation?: unknown }) {
  const userTurnCount = input.messages.filter((message) => message.role === "user").length;
  const assistantTurnCount = input.messages.filter((message) => message.role === "assistant").length;
  if (userTurnCount === 0) throw new Error("PILOT_ARCHIVE_EMPTY_CONVERSATION");
  const archiveChecksum = `sha256:${createHash("sha256").update(canonical({ conversationId: input.conversationId, pilotUsername: input.pilotUsername, messages: input.messages, conversation: input.conversation ?? null })).digest("hex")}`;
  return Object.freeze({ userTurnCount, assistantTurnCount, archiveChecksum });
}
