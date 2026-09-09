import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { P_RUNTIME_CONSUMER_VERSION, type PMaterialityRuntimeSlice } from "./runtimeConsumer";

const secret = process.env.CARS_DECISION_V2_SIGNING_SECRET || process.env.CARS_PILOT_SESSION_SECRET || randomBytes(32).toString("hex");
const sign = (payload: string) => createHmac("sha256", secret).update(payload).digest("base64url");

export function sealRootPMaterialityState(state: PMaterialityRuntimeSlice): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `pm1.${payload}.${sign(payload)}`;
}

export function unsealRootPMaterialityState(token: string | undefined, categoryId: string): PMaterialityRuntimeSlice | undefined {
  if (!token) return undefined;
  try {
    const [version, payload, supplied] = token.split(".");
    if (version !== "pm1" || !payload || !supplied) return undefined;
    const expected = sign(payload), left = Buffer.from(supplied), right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) return undefined;
    const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PMaterialityRuntimeSlice;
    return state.version === P_RUNTIME_CONSUMER_VERSION && state.categoryId === categoryId ? state : undefined;
  } catch { return undefined; }
}
