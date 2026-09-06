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

  it("honors origin rejection before rate limiting", async () => {
    mocks.verifySameOrigin.mockReturnValueOnce(new Response(null, { status: 403 }));
    expect((await POST(request("araba"))).status).toBe(403);
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
  });
});
