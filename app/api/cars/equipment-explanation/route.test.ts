import { describe, expect, it } from "vitest";
import { POST } from "./route";
describe("Equipment explanation route", () => {
  it("is fail-closed while integration policy is not active", async () => {
    const response = await POST(new Request("http://localhost/api/cars/equipment-explanation", { method: "POST", body: JSON.stringify({ conversationId: "c", offerToken: "sealed", actionId: "EPEA_EXPLAIN_BYD_DOLPHIN_COMFORT_MY2025", operation: "OPEN_SOLICITATION" }) }));
    expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ error: "EQUIPMENT_EXPLANATION_NOT_ACTIVE" });
  });
  it("rejects client feature and vehicle injection", async () => {
    const response = await POST(new Request("http://localhost/api/cars/equipment-explanation", { method: "POST", body: JSON.stringify({ conversationId: "c", offerToken: "sealed", actionId: "x", operation: "DIRECT_QUESTION", exactVariantId: byd, featureCode: "APPLE_CARPLAY" }) }));
    expect(response.status).toBe(400);
  });
});
const byd = "6cb56615-37ef-51a8-9202-a73e59d4e14b";
