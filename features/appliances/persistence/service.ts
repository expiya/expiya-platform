import { createHash } from "node:crypto";
import type { AppliancesConversationState } from "../contracts";
import type { AppliancesConversationStore } from "./types";
export function deterministicPayloadHash(value: unknown): string { const canonical = JSON.stringify(sortValue(value)); return createHash("sha256").update(canonical).digest("hex"); }
function sortValue(value: unknown): unknown { if (Array.isArray(value)) return value.map(sortValue); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sortValue(item)])); return value; }
export async function commitAppliancesBootstrap(input: { readonly store: AppliancesConversationStore; readonly state: AppliancesConversationState; readonly messageId: string; readonly payload: unknown }) { const now = input.state.updatedAt; const nextState = { ...input.state, revision: 1, updatedAt: now }; return input.store.commit({ expectedRevision: 0, messageId: input.messageId, payloadHash: deterministicPayloadHash(input.payload), nextState, events: [], outcomeKind: "CONVERSATION_BOOTSTRAPPED" }); }

