import { describe, expect, it } from "vitest";
import { POST } from "./route";
import { resetV31StoreForTests } from "@/features/decision/v3/store.server";

describe("POST /api/cars/conversation/v3", () => {
  it("serves advisory, structured choice and free-text parity on the public V3.8 API", async () => {
    resetV31StoreForTests();
    const request = (body: unknown) => POST(new Request("http://localhost/api/cars/conversation/v3", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
    const firstResponse = await request({ conversationId: "public-advisory-choice", messageId: "m1", message: "Araçlar hakkında hiçbir şey bilmiyorum, yardımcı ol", expectedRevision: 0 });
    expect(firstResponse.status).toBe(200);
    const first = await firstResponse.json();
    expect(first).toMatchObject({ advisory: { source: "DOMAIN_PACK", contextMutation: "NONE" }, choices: { questionKey: "purchaseInterest" }, state: { ledger: [] } });
    expect(first.variantCounts).toBeUndefined();
    const optedIn = await (await request({ conversationId: "public-advisory-choice", messageId: "m2", message: "ignored", expectedRevision: 1, stateToken: first.stateToken, choice: { questionKey: "purchaseInterest", values: ["Kendi kullanımım için araç seçmeyi düşünüyorum"] } })).json();
    expect(optedIn.choices.questionKey).toBe("primaryUsage");
    const clicked = await (await request({ conversationId: "public-advisory-choice", messageId: "m3", message: "ignored", expectedRevision: 2, stateToken: optedIn.stateToken, choice: { questionKey: "primaryUsage", values: ["Aile kullanımı"] } })).json();
    expect(clicked.state.ledger).toContainEqual(expect.objectContaining({ concept: "primaryUsage", normalizedValue: "FAMILY" }));

    resetV31StoreForTests();
    const freeStart = await (await request({ conversationId: "public-advisory-free", messageId: "m1", message: "Arac secmeyi bilmiorum, nerden baslamaliyim", expectedRevision: 0 })).json();
    const freeOptIn = await (await request({ conversationId: "public-advisory-free", messageId: "m2", message: "Kendi kullanımım için araç seçmeyi düşünüyorum", expectedRevision: 1, stateToken: freeStart.stateToken })).json();
    const typed = await (await request({ conversationId: "public-advisory-free", messageId: "m3", message: "Aile kullanımı", expectedRevision: 2, stateToken: freeOptIn.stateToken })).json();
    expect(typed.state.ledger).toContainEqual(expect.objectContaining({ concept: "primaryUsage", normalizedValue: "FAMILY" }));
  });
  it("keeps generic buyer guidance informational on the public V3.8 API", async () => {
    resetV31StoreForTests();
    const response = await POST(new Request("http://localhost/api/cars/conversation/v3", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId: "public-general-guidance", messageId: "m1", message: "araba alırken en çok neye dikkat etmek gerekir?", expectedRevision: 0, includePilotDiagnostics: true }) }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ state: { purchaseIntent: "NOT_EXPRESSED", ledger: [] } });
    expect(body.state.lastQuestionKey).toBeUndefined();
    expect(body.choices).toBeUndefined();
    expect(body.variantCounts).toBeUndefined();
    expect(body.message).toMatch(/yalnızca bilgi.*kendi kullanımın/iu);
  });
  it("runs the V3 runtime and returns no internal candidate count", async () => {
    const response = await POST(new Request("http://localhost/api/cars/conversation/v3", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId: "http-v3", messageId: "m1", message: "Araç almak istiyorum", expectedRevision: 0 }) }));
    expect(response.status).toBe(200); const body = await response.json(); expect(body.kind).toBe("V3_CONVERSATION"); expect(body.message).not.toMatch(/candidate|\d+ seçenek/iu);
  });
  it("restores only a signed state token after server-memory loss", async () => {
    const request = (body: unknown) => POST(new Request("http://localhost/api/cars/conversation/v3", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
    const first = await request({ conversationId: "signed-restore", messageId: "m1", message: "Araç almak istiyorum", expectedRevision: 0 }); const initial = await first.json(); expect(initial.stateToken).toMatch(/^v38\./u);
    resetV31StoreForTests(); const restored = await request({ conversationId: "signed-restore", messageId: "m2", message: "Elektrikli olsun", expectedRevision: 1, stateToken: initial.stateToken }); expect(restored.status).toBe(200);
    resetV31StoreForTests(); const tampered = await request({ conversationId: "signed-restore", messageId: "m3", message: "SUV olsun", expectedRevision: 2, stateToken: `${initial.stateToken}x` }); expect(tampered.status).toBe(409);
  });
  it("returns aggregate variant counts only when pilot diagnostics are requested", async () => {
    resetV31StoreForTests();
    const response = await POST(new Request("http://localhost/api/cars/conversation/v3", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId: "pilot-counts", messageId: "m1", message: "Ticari amaçlı dizel kamyonet istiyorum", expectedRevision: 0, includePilotDiagnostics: true }) }));
    const body = await response.json();
    expect(body.variantCounts.total).toBeGreaterThan(0); expect(body.variantCounts.remaining).toBeGreaterThan(0); expect(body.variantCounts.remaining).toBeLessThan(body.variantCounts.total);
  });
  it("projects catalog brand/model constraints into visible pilot counts", async () => {
    resetV31StoreForTests();
    const response = await POST(new Request("http://localhost/api/cars/conversation/v3", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId: "pilot-golf-counts", messageId: "m1", message: "Benzinli otomatik Volkswagen Golf almayı planlıyorum.", expectedRevision: 0, includePilotDiagnostics: true }) }));
    const body = await response.json();
    expect(body.state.ledger).toEqual(expect.arrayContaining([expect.objectContaining({ concept: "modelPreference", normalizedValue: "Golf" })]));
    expect(body.variantCounts).toMatchObject({ total: expect.any(Number), remaining: 1 });
    expect(body.message).not.toMatch(/nerede ve ne için|günlük ihtiyaç/iu);
  });
  it("makes the visible pilot count follow the conversation-scoped budget selector", async () => {
    resetV31StoreForTests();
    const request = (conversationId: string, message: string) => POST(new Request("http://localhost/api/cars/conversation/v3", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId, messageId: "m1", message, expectedRevision: 0, includePilotDiagnostics: true }) }));
    const needsOnly = await (await request("pilot-budget-needs", "Şehir içi benzinli otomatik SUV istiyorum. Kesin bütçem 2 milyon TL.")).json();
    const budgetFiltered = await (await request("pilot-budget-filter", "Şehir içi benzinli otomatik SUV istiyorum. Kesin bütçem 2 milyon TL; bütçemi karar filtresi olarak kullan.")).json();
    expect(needsOnly.state.budgetMode).toBe("NEEDS_ONLY");
    expect(budgetFiltered.state.budgetMode).toBe("BUDGET_AS_DECISION_FILTER");
    expect(budgetFiltered.variantCounts.remaining).toBeLessThan(needsOnly.variantCounts.remaining);
  });
});
