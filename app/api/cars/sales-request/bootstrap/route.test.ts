import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/sales-advisor/handoff.server", () => ({ openPhase3IntentHandoff: async () => ({ handoff: { intent: "REQUEST_QUOTE", selectedExactVariantId: "raw-variant-id", conversationId: "raw-conversation-id", offerId: "raw-offer-id", approvedNeeds: [] }, artifact: { title: "Marka Model Paket" } }) }));
vi.mock("@/features/sales-request/security.server", () => ({ issueCsrfToken: () => "public-csrf-token", redactError: () => "SALES_REQUEST_REJECTED" }));
vi.mock("@/features/sales-request/salesSummary.server", () => ({ buildShareableSalesSummary: () => ({ version: "sales-conversation-summary/v1", text: "Özet", mainText: "Özet", budgetText: null, checksum: "a".repeat(64), sourceStages: [] }) }));
vi.mock("@/features/sales-request/dealerDirectory.server", () => ({ isFakeDealerPilotEnabled: () => true, PILOT_FAKE_DEALER: { id: "raw-dealer-id", displayName: "Test Satıcısı", legalEntity: "Test tüzel kişisi", notificationEmail: "private@example.test", status: "PILOT_FAKE" } }));

import { POST } from "./route";

describe("Cars AŞAMA 3 bootstrap public projection", () => {
  it("keeps exact decision and dealer identifiers server-side", async () => {
    const response = await POST(new Request("http://localhost/api/cars/sales-request/bootstrap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handoff: `p3.${"a".repeat(30)}`, intent: "REQUEST_QUOTE" }) }));
    expect(response.status).toBe(200);
    const body = await response.json() as Record<string, unknown>; const serialized = JSON.stringify(body);
    expect(body).toMatchObject({ vehicleTitle: "Marka Model Paket", intentLabel: "Teklif iste", pilotDealer: { displayName: "Test Satıcısı" } });
    expect(serialized).not.toMatch(/raw-variant-id|raw-conversation-id|raw-offer-id|raw-dealer-id|private@example\.test/u);
  });
});
