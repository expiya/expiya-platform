import { describe, expect, it } from "vitest";
import { CARS_XPY_STAGE_TWO_ADAPTER, answerCarsStageTwo, projectCarsStageTwo, resolveCarsComparison, type CarsStageTwoOpened } from "./xpyStageTwoAdapter.server";
import { requireXpyStageTwoAdapter } from "@/features/xpy/stageTwo/registry";
import type { Phase2HandoffPayload, VariantContentArtifact } from "./types";

const now = Date.now();
const handoff: Phase2HandoffPayload = { version: "2.0.0", conversationId: "conversation", decisionRevision: 4, decisionFingerprint: "decision", offerId: "offer", selectedExactVariantId: "selected", catalogRelease: "0.55.4", catalogFingerprint: "catalog", approvedNeeds: [{ concept: "primaryUsage", summary: "Ana kullanım: şehir" }], personaMatchSummary: [], recommendationTerms: { version: "terms", acceptedAt: new Date(now - 60_000).toISOString() }, decisionStateDigest: "state", nonce: "nonce-123456789012", issuedAt: new Date(now - 60_000).toISOString(), expiresAt: new Date(now + 60_000).toISOString() };
const artifact = (id: string, title = "Marka Model Paket"): VariantContentArtifact => ({ schemaVersion: "variant-content/v2", artifactVersion: "2.0.0", exactVariantId: id, catalogRelease: "0.55.4", catalogFingerprint: "catalog", title, identity: { brand: "Marka", model: id, trim: "Paket", modelYear: 2026 }, facts: [{ key: "luggage", label: "Bagaj", value: "420 litre", disposition: "VERIFIED", dailyMeaning: "Günlük yük alanını gösterir." }, { key: "power", label: "Güç", value: "100 kW", disposition: "FAMILY_LEVEL", scopeNote: "Model ailesi düzeyi" }], equipment: [{ key: "camera", label: "Kamera", value: "Geri görüş kamerası", disposition: "VERIFIED" }], colors: [], media: [], price: { status: "UNAVAILABLE", display: "Güncel fiyat doğrulanıyor", note: "Yetkili kayıt yok." }, researchStatus: { lastReviewedAt: "2026-09-06", exactFacts: 1, scopedFacts: 1 }, sourceChecksum: "source", checksum: `checksum-${id}` });
const opened: CarsStageTwoOpened = { handoff, artifact: artifact("selected") };

describe("Cars shared AŞAMA 2 adapter", () => {
  it("is the sole registered Cars adapter and preserves exact identity, evidence and governed states", () => {
    expect(requireXpyStageTwoAdapter("CARS", "NEW_CAR")).toBe(CARS_XPY_STAGE_TWO_ADAPTER);
    const projection = projectCarsStageTwo(opened, { status: "NOT_PURCHASED" });
    expect(projection.authority).toMatchObject({ exactProductId: "selected", decisionRevision: 4, evidence: { release: "0.55.4", fingerprint: "catalog" } });
    expect(projection.selected).toMatchObject({ exactProductId: "selected", media: { state: "UNAVAILABLE" }, price: { state: "UNAVAILABLE" } });
    expect(projection.selected.facts.find(item => item.key === "power")?.evidenceState).toBe("SCOPED");
    expect(projection.comparison).toMatchObject({ access: "LOCKED", offerPlacement: "AFTER_SELECTED_PRODUCT_BEFORE_ADVISOR", products: [], rows: [] });
  });

  it("projects only purchased exact comparison members into Cars-owned rows", () => {
    const rival = artifact("rival", "Rakip Model");
    const projection = projectCarsStageTwo({ ...opened, comparisonArtifacts: [rival, artifact("not-entitled")] }, { status: "PURCHASED", entitlementId: "entitlement", authorizedExactProductIds: ["selected", "rival"], evidenceSetFingerprint: "evidence" });
    expect(projection.comparison.products.map(item => item.exactProductId)).toEqual(["selected", "rival"]);
    expect(projection.comparison.rows.map(item => item.key)).toEqual(["price", "power", "seats", "luggage", "consumption"]);
    expect(answerCarsStageTwo({ ...opened, projection, comparisonArtifacts: [rival], question: "Marka rival ile bagajı karşılaştır" }).messages.join(" ")).toContain("Rakip Model");
  });

  it("fails closed on artifact identity/evidence and entitlement escalation", () => {
    expect(() => projectCarsStageTwo({ ...opened, artifact: artifact("other") }, { status: "NOT_PURCHASED" })).toThrow("CARS_STAGE_TWO_ARTIFACT_BINDING_MISMATCH");
    expect(() => projectCarsStageTwo(opened, { status: "PURCHASED", entitlementId: "entitlement", authorizedExactProductIds: ["rival"], evidenceSetFingerprint: "evidence" })).toThrow("CARS_COMPARISON_ENTITLEMENT_MISMATCH");
    expect(() => projectCarsStageTwo({ ...opened, handoff: { ...handoff, issuedAt: new Date(now + 120_000).toISOString(), expiresAt: new Date(now + 180_000).toISOString() } }, { status: "NOT_PURCHASED" })).toThrow("CARS_STAGE_TWO_AUTHORITY_MISMATCH");
    for (const status of ["REVOKED", "EXPIRED"] as const) expect(projectCarsStageTwo(opened, { status }).comparison).toMatchObject({ access: "LOCKED", products: [], rows: [] });
  });

  it("keeps valid Cars answers and applies the shared comparison/Stage 1 guard", () => {
    const locked = projectCarsStageTwo(opened, { status: "NOT_PURCHASED" });
    expect(answerCarsStageTwo({ ...opened, projection: locked, question: "Bagaj kaç litre?" }).messages[0]).toBe("Bagaj: 420 litre. Günlük yük alanını gösterir.");
    expect(answerCarsStageTwo({ ...opened, projection: locked, question: "Bir rakiple karşılaştır" }).messages[0]).toMatch(/satın alınmış/u);
    expect(answerCarsStageTwo({ ...opened, projection: locked, question: "Kararımı değiştir ve başka araç öner" }).messages[0]).toMatch(/yeniden açamaz/u);
  });

  it("fails closed to not purchased when no server-side entitlement repository is configured", async () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    await expect(resolveCarsComparison(opened)).resolves.toEqual({ entitlement: { status: "NOT_PURCHASED" }, comparisonArtifacts: [] });
    if (previous) process.env.DATABASE_URL = previous;
  });
});
