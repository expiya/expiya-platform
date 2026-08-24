import type { V3ConversationState, V3PublicResponse } from "./types";

interface Record { state: V3ConversationState; outputs: Map<string, { hash: string; response: V3PublicResponse }> }
const records = new Map<string, Record>();
const hash = async (value: string) => Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))).toString("hex");

export async function runStoredV31Turn(input: { readonly conversationId: string; readonly messageId: string; readonly message: string; readonly expectedRevision: number; readonly trustedSeed?: V3ConversationState; readonly run: (state: V3ConversationState | undefined) => Promise<V3PublicResponse> }) {
  const current = records.get(input.conversationId) ?? (input.trustedSeed ? { state: input.trustedSeed, outputs: new Map() } : undefined); const payloadHash = await hash(input.message); const replay = current?.outputs.get(input.messageId);
  if (replay) { if (replay.hash !== payloadHash) throw new TypeError("V3_MESSAGE_PAYLOAD_CONFLICT"); return replay.response; }
  if ((current?.state.revision ?? 0) !== input.expectedRevision) throw new TypeError("V3_REVISION_CONFLICT");
  const response = await input.run(current?.state); const outputs = new Map(current?.outputs ?? []); outputs.set(input.messageId, { hash: payloadHash, response }); records.set(input.conversationId, { state: response.state, outputs }); return response;
}

export function resetV31StoreForTests() { records.clear(); }
