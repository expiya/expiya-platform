import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("POST /api/cars/conversation evidence-backed journey", () => {
  it("crosses the real HTTP handler, transcript bridge, governed runtime, and additive response contract", async () => {
    const response = await POST(new Request("http://localhost/api/cars/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: "http-evidence-journey", messages: [
        { id: "1", role: "user", content: "En az 7 koltuk istiyorum." },
        { id: "2", role: "assistant", content: "Bagaj için zorunlu minimum hacim nedir?" },
        { id: "3", role: "user", content: "300 litre bagaj istiyorum." },
      ] }),
    }));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({ kind: "QUESTION", decision: {
      conversationState: "DECISION_READY", decisionStatus: "DECISION_READY", evidenceBacked: true,
      selectedRuntimeVehicleCandidateId: "RVC-PILOT-0001", selectedVehicle: { brand: "Hyundai", model: "IONIQ 9" },
      requirements: [
        { factKey: "seats", predicate: "AT_LEAST", value: 7 },
        { factKey: "cargo_volume_l", predicate: "AT_LEAST", value: 300 },
      ],
    } });
    expect(payload.message).toMatch(/7 koltuk.*338 L bagaj/iu);
  });
});
