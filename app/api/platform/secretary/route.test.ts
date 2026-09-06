import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ enforceRateLimit: vi.fn(), verifySameOrigin: vi.fn() }));
vi.mock("@/lib/security/requestSecurity", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  verifySameOrigin: mocks.verifySameOrigin,
  readJsonWithLimit: (request: Request) => request.json(),
}));

import { POST } from "./route";

const request = (message: string) => new Request("https://www.expiya.com/api/platform/secretary", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://www.expiya.com" }, body: JSON.stringify({ message }) });

describe("POST /api/platform/secretary", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns the server-authorized Appliances destination", async () => {
    const response = await POST(request("Çamaşır makinesi almak istiyorum"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ kind: "PROPOSE_NAVIGATION", departmentId: "APPLIANCES", destination: "/appliances?entry=secretary&category=WASHING_MACHINE" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("routes an oven request to the oven-selected landing conversation", async () => {
    const response = await POST(request("Fırın almak istiyorum"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ kind: "PROPOSE_NAVIGATION", departmentId: "APPLIANCES", destination: "/appliances?entry=secretary&category=BUILT_IN_OVEN" });
  });

  it("returns governed clarification and correction outcomes for natural sentences", async () => {
    const coffee = await POST(request("Kahve makinesi var mı sizde?"));
    expect(await coffee.json()).toMatchObject({ kind: "CLARIFY_DESTINATION", choices: expect.arrayContaining([expect.objectContaining({ label: "Türk kahvesi makinesi" })]) });
    const correction = await POST(request("Kulaklık değil, hoparlör arıyorum."));
    expect(await correction.json()).toMatchObject({ kind: "CLARIFY_DESTINATION", choices: expect.not.arrayContaining([expect.objectContaining({ label: "Kulaklık" })]) });
    const stroller = await POST(request("Bebek arabası var mı?"));
    expect(await stroller.json()).toMatchObject({ kind: "PROPOSE_NAVIGATION", departmentId: "BABY_AND_CHILD" });
    const toy = await POST(request("Oyuncak araba almak istiyorum."));
    expect(await toy.json()).toMatchObject({ kind: "UNSUPPORTED_DESTINATION" });
  });

  it("honors origin rejection before rate limiting", async () => {
    mocks.verifySameOrigin.mockReturnValueOnce(new Response(null, { status: 403 }));
    expect((await POST(request("araba"))).status).toBe(403);
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
  });
});
