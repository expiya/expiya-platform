import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  enforceRateLimit: vi.fn(),
  verifyRequestOrigin: vi.fn(),
}));

vi.mock("@/lib/openai", () => ({
  getOpenAIClient: () => ({ audio: { transcriptions: { create: mocks.create } } }),
}));
vi.mock("@/lib/security/requestSecurity", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  verifyRequestOrigin: mocks.verifyRequestOrigin,
}));

import { POST } from "./route";

function requestWithAudio(type = "audio/webm") {
  const body = new FormData();
  const bytes = new Uint8Array(800);
  bytes.set([0x1a, 0x45, 0xdf, 0xa3]);
  body.append("audio", new File([bytes], "ilk-mesaj.webm", { type }));
  return new Request("http://localhost/api/cars/voice-transcription", { method: "POST", body });
}

describe("first-message Turkish voice transcription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.create.mockResolvedValue({ text: "Şehir içinde kullanacağım küçük bir elektrikli araç arıyorum." });
  });

  it("forces Turkish transcription and returns only normalized text", async () => {
    const response = await POST(requestWithAudio());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: "Şehir içinde kullanacağım küçük bir elektrikli araç arıyorum." });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      language: "tr",
      model: "gpt-4o-mini-transcribe",
      response_format: "json",
    }), expect.objectContaining({ timeout: 30_000 }));
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects unsupported uploads before calling the provider", async () => {
    const response = await POST(requestWithAudio("text/plain"));
    expect(response.status).toBe(415);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("honors same-origin and rate-limit rejections", async () => {
    mocks.verifyRequestOrigin.mockReturnValueOnce(new Response(null, { status: 403 }));
    expect((await POST(requestWithAudio())).status).toBe(403);
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
  });
});
