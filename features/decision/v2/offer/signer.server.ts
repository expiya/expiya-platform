import { createHmac, timingSafeEqual } from "node:crypto";
import { canonicalize } from "../fingerprint/canonicalize";
import type { OfferSigner, PersistedGovernedOffer } from "./types";

const encode = (value: string): string => Buffer.from(value).toString("base64url");
const decode = (value: string): string => Buffer.from(value, "base64url").toString("utf8");
export function createHmacOfferSigner(input: { readonly secret: string | undefined; readonly now: () => Date }): OfferSigner {
  if (!input.secret?.trim()) throw new Error("OFFER_SIGNING_SECRET_MISSING");
  const signature = (payload: string) => createHmac("sha256", input.secret!).update(payload).digest("base64url");
  return Object.freeze({
    sign(offer: PersistedGovernedOffer) { const payload = encode(canonicalize({ v: offer.authorizationVersion, offerId: offer.offerId, conversationId: offer.conversationId, catalogFingerprint: offer.catalogFingerprint, decisionFingerprint: offer.decisionFingerprint, expiresAt: offer.expiresAt, nonce: offer.nonce })); return `v2.${payload}.${signature(payload)}`; },
    verify(token: string) { try { const [version, payload, supplied] = token.split("."); if (version !== "v2" || !payload || !supplied) return { status: "INVALID" as const }; const expected = signature(payload); const left = Buffer.from(supplied); const right = Buffer.from(expected); if (left.length !== right.length || !timingSafeEqual(left, right)) return { status: "INVALID" as const }; const parsed = JSON.parse(decode(payload)) as Record<string, string>; if (new Date(parsed.expiresAt!).getTime() < input.now().getTime()) return { status: "EXPIRED" as const }; return { status: "VALID" as const, offerId: parsed.offerId!, conversationId: parsed.conversationId!, catalogFingerprint: parsed.catalogFingerprint!, decisionFingerprint: parsed.decisionFingerprint!, expiresAt: parsed.expiresAt! }; } catch { return { status: "INVALID" as const }; } },
  });
}
