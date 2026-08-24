import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { V3ConversationState } from "./types";

const secret = process.env.CARS_DECISION_V2_SIGNING_SECRET || process.env.CARS_PILOT_SESSION_SECRET || randomBytes(32).toString("hex");
const sign = (payload: string) => createHmac("sha256", secret).update(payload).digest("base64url");
export function sealV31State(state: V3ConversationState) { const payload = Buffer.from(JSON.stringify(state)).toString("base64url"); return `v38.${payload}.${sign(payload)}`; }
export function unsealV31State(token: string | undefined, conversationId: string): V3ConversationState | undefined {
  if (!token) return undefined; try { const [version, payload, supplied] = token.split("."); if (version !== "v38" || !payload || !supplied) return undefined; const expected = sign(payload); const left = Buffer.from(supplied); const right = Buffer.from(expected); if (left.length !== right.length || !timingSafeEqual(left, right)) return undefined; const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as V3ConversationState; return state.version === "3.8" && state.conversationId === conversationId ? state : undefined; } catch { return undefined; }
}
