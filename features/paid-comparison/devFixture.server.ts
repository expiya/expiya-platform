import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const secret = randomBytes(32).toString("hex");
const PREFIX = "p2d";
const MAX_AGE_MS = 2 * 60 * 60_000;

type DevFixturePayload = {
  readonly version: "paid-comparison-dev-fixture/v1";
  readonly conversationId: string;
  readonly offerId: string;
  readonly selectedExactVariantId: string;
  readonly catalogRelease: string;
  readonly catalogFingerprint: string;
  readonly approvedNeeds: readonly { concept: string; summary: string; value?: string }[];
  readonly issuedAt: string;
  readonly expiresAt: string;
};

function assertDevelopment(): void {
  if (process.env.NODE_ENV === "production") throw new TypeError("PAID_COMPARISON_DEV_FIXTURE_DISABLED");
}

function sign(encoded: string): string {
  return createHmac("sha256", secret).update(encoded).digest("base64url");
}

export function createDevPaidComparisonHandoff(input: {
  readonly exactVariantId: string;
  readonly bodyStyle: string;
  readonly catalogRelease: string;
  readonly catalogFingerprint: string;
  readonly now?: Date;
}): string {
  assertDevelopment();
  const now = input.now ?? new Date();
  const payload: DevFixturePayload = {
    version: "paid-comparison-dev-fixture/v1",
    conversationId: `dev-comparison-${input.exactVariantId}`,
    offerId: `dev-offer-${input.exactVariantId}`,
    selectedExactVariantId: input.exactVariantId,
    catalogRelease: input.catalogRelease,
    catalogFingerprint: input.catalogFingerprint,
    approvedNeeds: [{ concept: "bodyStyle", summary: `Araç sınıfı: ${input.bodyStyle}`, value: input.bodyStyle }],
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + MAX_AGE_MS).toISOString(),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${PREFIX}.${encoded}.${sign(encoded)}`;
}

export function isDevPaidComparisonHandoff(token: string): boolean {
  return token.startsWith(`${PREFIX}.`);
}

export function openDevPaidComparisonHandoff(token: string, now = new Date()): { handoff: DevFixturePayload } {
  assertDevelopment();
  const [prefix, encoded, supplied, extra] = token.split(".");
  if (prefix !== PREFIX || !encoded || !supplied || extra) throw new TypeError("PAID_COMPARISON_DEV_FIXTURE_INVALID");
  const expected = sign(encoded);
  const left = Buffer.from(supplied); const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new TypeError("PAID_COMPARISON_DEV_FIXTURE_INVALID");
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as DevFixturePayload;
  if (payload.version !== "paid-comparison-dev-fixture/v1" || !payload.selectedExactVariantId || !payload.catalogRelease || !payload.catalogFingerprint) throw new TypeError("PAID_COMPARISON_DEV_FIXTURE_INVALID");
  const issuedAt = Date.parse(payload.issuedAt); const expiresAt = Date.parse(payload.expiresAt);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= now.getTime() || expiresAt - issuedAt > MAX_AGE_MS) throw new TypeError("PAID_COMPARISON_DEV_FIXTURE_STALE");
  return { handoff: payload };
}
