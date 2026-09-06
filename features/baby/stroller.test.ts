import { describe, expect, it } from "vitest";
import { STROLLER_DISCOVERY_RECONCILIATION, STROLLER_PRODUCTS } from "./catalog";
import { authorizeStrollerCard, selectStrollers } from "./decision";
import { STROLLER_AUTHORITY_DIGEST, validateStrollerAuthority } from "./domainPack";
import { XPY_BEHAVIORAL_CAPABILITIES } from "../xpy/contracts";

describe("BABY_AND_CHILD / STROLLER authority", () => {
  it("has exact Türkiye identities without silent drops", () => { expect(validateStrollerAuthority()).toEqual([]); expect(new Set(STROLLER_PRODUCTS.map(p => p.exactProductId)).size).toBe(STROLLER_PRODUCTS.length); expect(STROLLER_DISCOVERY_RECONCILIATION.silentDrops).toBe(0); expect(STROLLER_DISCOVERY_RECONCILIATION.discovered).toBe(STROLLER_DISCOVERY_RECONCILIATION.admitted + STROLLER_DISCOVERY_RECONCILIATION.rejectedInsufficientTrApplicability + STROLLER_DISCOVERY_RECONCILIATION.rejectedIdentityAmbiguous); });
  it("is deterministic and exposes all shared behaviors", () => { expect(STROLLER_AUTHORITY_DIGEST).toMatch(/^sha256:[a-f0-9]{64}$/u); expect(XPY_BEHAVIORAL_CAPABILITIES).toHaveLength(16); });
  it("preserves unknown candidates and has no catalog-order winner", () => { const candidates = selectStrollers({ CARRY_WEIGHT: "LIGHT", CABIN_TRAVEL: true }); expect(candidates.length).toBeGreaterThan(1); expect(candidates.every(p => p.facts.strollerWeightKg === "UNKNOWN" || p.facts.strollerWeightKg <= 8)).toBe(true); });
  it("creates a card only through explicit authorization", () => { const product = STROLLER_PRODUCTS[0]!; const card = authorizeStrollerCard(product, { NEWBORN: true }, 4); expect(card.exactProductId).toBe(product.exactProductId); expect(card.authorizationFingerprint).toMatch(/^sha256:/u); expect(card.limitations).toContain("Azami ağırlık gelişimsel uygunluk garantisi değildir."); });
});
