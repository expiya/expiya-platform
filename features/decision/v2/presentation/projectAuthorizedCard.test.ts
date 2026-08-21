import { describe, expect, it } from "vitest";
import type { PersistedGovernedOffer } from "../offer/types";
import { loadPinnedHistoricalSnapshotForTest, loadActiveProductionSnapshotForTest } from "../catalog/productionSnapshotFixture.testSupport";
import { AuthorizedCardProjectionError, projectAuthorizedPublicCards } from "./projectAuthorizedCard.server";
import { resolveVehicleImage } from "@/features/vehicle-data/resolveVehicleImage";

async function fixture() {
  const loaded = await loadActiveProductionSnapshotForTest();
  if (loaded.status !== "READY") throw new Error("fixture unavailable");
  const publicVariant = loaded.snapshot.variants.find((variant) => variant.activeNewPrice?.realizationSafe && variant.activeNewPrice.consumerVisibility === "PUBLIC" && variant.activeNewPrice.priceType === "LIST") ?? loaded.snapshot.variants[0]!;
  const internalVariant = loaded.snapshot.variants.find((variant) => variant.activeNewPrice?.consumerVisibility === "INTERNAL_ONLY") ?? loaded.snapshot.variants[1]!;
  const ref = (variant: typeof publicVariant, permission: "EXACT_PUBLIC_PRICE_ALLOWED" | "APPROXIMATE_BUDGET_LANGUAGE_ONLY") => ({ exactVariantId: variant.id, modelFamilyId: loaded.snapshot.familyIndex.values().find((family) => family.variantIds.includes(variant.id))!.familyId, finalDisposition: permission === "EXACT_PUBLIC_PRICE_ALLOWED" ? "FULLY_ELIGIBLE_VERIFIED_PRICE" as const : "ELIGIBLE_INTERNAL_ESTIMATE_WITHIN_BUDGET" as const, rankingOrdinal: 1, caveatFactIds: [], priceRealizationPermission: permission });
  const offer: PersistedGovernedOffer = { offerId: "offer", conversationId: "conversation", candidateRefs: [ref(publicVariant, "EXACT_PUBLIC_PRICE_ALLOWED")], mode: "SINGLE_REQUESTED", catalogReleaseVersion: loaded.snapshot.authority.releaseVersion, catalogFingerprint: loaded.snapshot.authority.catalogFingerprint, decisionFingerprint: "decision", lifecycleState: "REVEALED", createdAt: "2026-08-19T00:00:00.000Z", expiresAt: "2026-08-19T01:00:00.000Z", revealedAt: "2026-08-19T00:01:00.000Z", authorizationVersion: "1.0.0", nonce: "nonce" };
  return { snapshot: loaded.snapshot, publicVariant, internalVariant, ref, offer };
}

async function historicalSnapshot() {
  const snapshot = await loadPinnedHistoricalSnapshotForTest("0.55.1", "2026-08-16T19:33:14.000Z", new Date("2026-08-19T00:00:00.000Z"));
  if (snapshot.status !== "READY") throw new Error("HISTORICAL_SNAPSHOT_UNAVAILABLE");
  return snapshot.snapshot;
}

describe("decision-safe authorized card projection", () => {
  it("projects only catalog-owned public fields and verified public price", async () => {
    const f = await fixture();
    const [card] = projectAuthorizedPublicCards({ offer: f.offer, conversationId: "conversation", decisionFingerprint: "decision", snapshot: f.snapshot });
    const image = resolveVehicleImage({ variantId: f.publicVariant.id, brand: f.publicVariant.brand, model: f.publicVariant.model, bodyStyle: f.publicVariant.decisionFacts.bodyStyle.value, modelYear: f.publicVariant.decisionFacts.modelYear.value });
    expect(card).toMatchObject({ exactVariantId: f.publicVariant.id, brand: f.publicVariant.brand, modelYear: f.publicVariant.decisionFacts.modelYear.value, image: image.path, imageStatus: image.status });
    expect(card!.verifiedPublicPrice?.amountTry).toBe(f.publicVariant.activeNewPrice?.amountTry);
  });

  it("states when a verified public price was used for the budget-nearest shortlist", async () => {
    const f = await fixture();
    const offer = { ...f.offer, candidateRefs: [{ ...f.offer.candidateRefs[0]!, selectionBasis: "BUDGET_NEAREST_DECISION_PRICE" as const }] } as PersistedGovernedOffer;
    const [card] = projectAuthorizedPublicCards({ offer, conversationId: "conversation", decisionFingerprint: "decision", snapshot: f.snapshot });
    expect(card?.decisionSummary.recommendation).toContain("bütçeye en yakın seçenekler arasında");
    expect(card?.decisionSummary.recommendation).not.toContain("bütçe filtre olarak uygulanmadı");
  });

  it("accepts a rights-approved media asset from a catalog-independent media release path", async () => {
    const f = await fixture();
    const variant = f.snapshot.variantById.get("29a16738-dd92-54cb-9e27-9e0ce8724a57");
    expect(variant).toBeDefined(); if (!variant) return;
    const offer = { ...f.offer, candidateRefs: [f.ref(variant, "APPROXIMATE_BUDGET_LANGUAGE_ONLY")] } as PersistedGovernedOffer;
    const [card] = projectAuthorizedPublicCards({ offer, conversationId: "conversation", decisionFingerprint: "decision", snapshot: f.snapshot });
    expect(card?.image).toMatch(/^https:\/\/wylflrzf7gws55yp\.public\.blob\.vercel-storage\.com\/cars\/v0\.55\.1\//u);
  });

  it("fails closed for conversation, catalog, decision and unknown candidate mismatch", async () => {
    const f = await fixture();
    const call = (offer = f.offer, conversationId = "conversation", decisionFingerprint = "decision") => projectAuthorizedPublicCards({ offer, conversationId, decisionFingerprint, snapshot: f.snapshot });
    expect(() => call(f.offer, "other")).toThrowError(AuthorizedCardProjectionError);
    expect(() => call({ ...f.offer, catalogFingerprint: "other" })).toThrow(/CATALOG_FINGERPRINT_MISMATCH/u);
    expect(() => call(f.offer, "conversation", "other")).toThrow(/DECISION_FINGERPRINT_MISMATCH/u);
    expect(() => call({ ...f.offer, candidateRefs: [{ ...f.offer.candidateRefs[0]!, exactVariantId: "outside" }] })).toThrow(/AUTHORIZED_VARIANT_NOT_IN_PINNED_SNAPSHOT/u);
  });

  it("projects a historical offer only from its explicitly pinned v0.55.1 snapshot", async () => {
    const current = await fixture(); const snapshot = await historicalSnapshot(); const variant = snapshot.variants[0]!;
    const family = snapshot.familyIndex.values().find((item) => item.variantIds.includes(variant.id))!;
    const offer = { ...current.offer, catalogReleaseVersion: snapshot.authority.releaseVersion, catalogFingerprint: snapshot.authority.catalogFingerprint, candidateRefs: [{ ...current.offer.candidateRefs[0]!, exactVariantId: variant.id, modelFamilyId: family.familyId }] } as PersistedGovernedOffer;
    expect(projectAuthorizedPublicCards({ offer, conversationId: "conversation", decisionFingerprint: "decision", snapshot }).map((card) => card.exactVariantId)).toEqual([variant.id]);
    expect(() => projectAuthorizedPublicCards({ offer, conversationId: "conversation", decisionFingerprint: "decision", snapshot: current.snapshot })).toThrow(/CATALOG_FINGERPRINT_MISMATCH/u);
  });

  it("never discloses internal estimate", async () => {
    const f = await fixture();
    const offer = { ...f.offer, candidateRefs: [{ ...f.ref(f.internalVariant, "APPROXIMATE_BUDGET_LANGUAGE_ONLY"), selectionBasis: "BUDGET_NEAREST_DECISION_PRICE" }] } as PersistedGovernedOffer;
    const [card] = projectAuthorizedPublicCards({ offer, conversationId: "conversation", decisionFingerprint: "decision", snapshot: f.snapshot });
    expect(card!.verifiedPublicPrice).toBeUndefined();
    expect(JSON.stringify(card)).not.toContain(String(f.internalVariant.activeNewPrice?.amountTry));
    expect(card?.decisionSummary.recommendation).toContain("Fiyatı kartta gösterilmez");
  });

  it("preserves authorization order, caps cards and rejects non-revealed lifecycle", async () => {
    const f = await fixture(); const variants = f.snapshot.variants.slice(0, 3);
    const refs = variants.map((variant, index) => ({ ...f.ref(variant, "APPROXIMATE_BUDGET_LANGUAGE_ONLY"), rankingOrdinal: index + 1 })) as unknown as PersistedGovernedOffer["candidateRefs"];
    const cards = projectAuthorizedPublicCards({ offer: { ...f.offer, candidateRefs: refs }, conversationId: "conversation", decisionFingerprint: "decision", snapshot: f.snapshot });
    expect(cards.map((card) => card.exactVariantId)).toEqual(variants.map((variant) => variant.id));
    expect(() => projectAuthorizedPublicCards({ offer: { ...f.offer, lifecycleState: "REVOKED" }, conversationId: "conversation", decisionFingerprint: "decision", snapshot: f.snapshot })).toThrow(/OFFER_NOT_REVEALED/u);
  });
});
