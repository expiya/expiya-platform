import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ enforceRateLimit: vi.fn(), verifySameOrigin: vi.fn() }));
vi.mock("@/lib/security/requestSecurity", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  verifySameOrigin: mocks.verifySameOrigin,
  readJsonWithLimit: (request: Request) => request.json(),
}));

import { POST } from "./route";

function request(message: string) {
  return new Request("https://www.expiya.com/api/platform/secretary", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://www.expiya.com" }, body: JSON.stringify({ message }) });
}

describe("POST /api/platform/secretary", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns only the server-authorized Cars destination", async () => {
    const response = await POST(request("Ailem için bir otomobil arıyorum"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ kind: "ROUTE", departmentId: "CARS", destination: "/cars?entry=secretary" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("does not route an inactive department", async () => {
    const response = await POST(request("Çamaşır makinesi almak istiyorum"));
    expect(await response.json()).toMatchObject({ kind: "UNSUPPORTED", departmentId: "APPLIANCES" });
  });

  it("honors origin and rate-limit rejections", async () => {
    mocks.verifySameOrigin.mockReturnValueOnce(new Response(null, { status: 403 }));
    expect((await POST(request("araba"))).status).toBe(403);
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
  });
});
