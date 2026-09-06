import { randomUUID } from "node:crypto";
import type { V3PublicResponse } from "../../../features/decision/v3/types";
import type { V3HttpContractFixture } from "./httpContractFixtures";

interface HttpObservation {
  readonly label: string;
  readonly status: number;
  readonly body: unknown;
  readonly latencyMs: number;
}

interface HttpCheck { readonly name: string; readonly pass: boolean; readonly reason: string }

const check = (name: string, pass: boolean, reason: string): HttpCheck => ({ name, pass, reason });
const isPublicResponse = (value: unknown): value is V3PublicResponse & { stateToken: string } => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<V3PublicResponse> & { stateToken?: unknown };
  return candidate.kind === "V3_CONVERSATION" && typeof candidate.message === "string" && typeof candidate.stateToken === "string" && Boolean(candidate.state);
};

export async function runV3HttpContract(fixture: V3HttpContractFixture, baseUrl: string) {
  const runId = randomUUID();
  const observations: HttpObservation[] = [];
  const conversation = (suffix: string) => `pf-http-${fixture.id}-${suffix}-${runId}`;
  const endpoint = new URL("/api/cars/conversation/v3", baseUrl).toString();
  const post = async (label: string, body: unknown, headers: Record<string, string> = {}) => {
    const started = performance.now();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", origin: new URL(baseUrl).origin, "x-forwarded-for": `promptfoo-${runId}`, ...headers },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let payload: unknown = text;
    try { payload = JSON.parse(text); } catch { /* The assertion below reports non-JSON responses. */ }
    observations.push({ label, status: response.status, body: payload, latencyMs: Math.round(performance.now() - started) });
    return { status: response.status, body: payload };
  };

  const assertions: HttpCheck[] = [];
  if (fixture.id === "signed-multi-turn") {
    const id = conversation("main");
    const first = await post("first", { conversationId: id, messageId: "m1", message: "Araç almak istiyorum", expectedRevision: 0 });
    const firstBody = isPublicResponse(first.body) ? first.body : undefined;
    const second = await post("second", { conversationId: id, messageId: "m2", message: "Elektrikli olsun", expectedRevision: 1, stateToken: firstBody?.stateToken });
    const secondBody = isPublicResponse(second.body) ? second.body : undefined;
    assertions.push(
      check("first-turn-contract", first.status === 200 && firstBody?.state.revision === 1 && firstBody.stateToken.startsWith("v37."), "İlk tur 200, revision=1 ve v37 stateToken üretmelidir."),
      check("second-turn-contract", second.status === 200 && secondBody?.state.revision === 2 && secondBody.state.conversationId === id, "İkinci tur token ile revision=2 değerine ilerlemelidir."),
    );
  } else if (fixture.id === "exact-message-replay") {
    const id = conversation("replay"); const request = { conversationId: id, messageId: "m1", message: "Araç almak istiyorum", expectedRevision: 0 };
    const first = await post("first", request); const replay = await post("replay", request);
    assertions.push(check("replay-is-byte-equivalent", first.status === 200 && replay.status === 200 && JSON.stringify(first.body) === JSON.stringify(replay.body), "Aynı messageId ve payload aynı response'u dönmelidir."));
  } else if (fixture.id === "message-payload-conflict") {
    const id = conversation("payload");
    await post("first", { conversationId: id, messageId: "m1", message: "Araç almak istiyorum", expectedRevision: 0 });
    const conflict = await post("conflict", { conversationId: id, messageId: "m1", message: "SUV istemiyorum", expectedRevision: 0 });
    assertions.push(check("payload-conflict-status", conflict.status === 409, "Aynı messageId ile farklı payload 409 dönmelidir."));
  } else if (fixture.id === "stale-revision-conflict") {
    const id = conversation("revision");
    await post("first", { conversationId: id, messageId: "m1", message: "Araç almak istiyorum", expectedRevision: 0 });
    const conflict = await post("stale", { conversationId: id, messageId: "m2", message: "Elektrikli olsun", expectedRevision: 0 });
    assertions.push(check("stale-revision-status", conflict.status === 409, "Eski expectedRevision 409 dönmelidir."));
  } else if (fixture.id === "tampered-token-no-restore" || fixture.id === "cross-conversation-token-no-restore") {
    const sourceId = conversation("source");
    const first = await post("source", { conversationId: sourceId, messageId: "m1", message: "Araç almak istiyorum", expectedRevision: 0 });
    const firstBody = isPublicResponse(first.body) ? first.body : undefined;
    const targetId = conversation("target");
    const suppliedToken = fixture.id === "tampered-token-no-restore" ? `${firstBody?.stateToken ?? "missing"}x` : firstBody?.stateToken;
    const restored = await post("restore-attempt", { conversationId: targetId, messageId: "m2", message: "Elektrikli olsun", expectedRevision: 1, stateToken: suppliedToken });
    assertions.push(check("invalid-token-does-not-restore", first.status === 200 && restored.status === 409, "Geçersiz veya başka konuşmaya bağlı token revision=1 state restore etmemelidir."));
  } else if (fixture.id === "raw-state-is-ignored") {
    const id = conversation("raw-state");
    const response = await post("raw-state", { conversationId: id, messageId: "m1", message: "Elektrikli olsun", expectedRevision: 1, state: { version: "3.7", conversationId: id, revision: 1 } });
    assertions.push(check("raw-state-not-trusted", response.status === 409, "Raw state request alanı güvenilir seed olarak kullanılmamalıdır."));
  } else if (fixture.id === "request-security-contract") {
    const id = conversation("security");
    const wrongType = await post("wrong-content-type", { conversationId: id, messageId: "m1", message: "Merhaba", expectedRevision: 0 }, { "content-type": "text/plain" });
    const wrongOrigin = await post("wrong-origin", { conversationId: id, messageId: "m2", message: "Merhaba", expectedRevision: 0 }, { origin: "https://example.invalid" });
    assertions.push(
      check("content-type-status", wrongType.status === 415, "JSON dışı Content-Type 415 dönmelidir."),
      check("same-origin-status", wrongOrigin.status === 403, "Farklı Origin 403 dönmelidir."),
    );
  } else if (fixture.id === "invalid-schema-contract") {
    const invalid = await post("invalid", { conversationId: conversation("schema"), messageId: "m1", message: "", expectedRevision: 0 });
    assertions.push(check("invalid-schema-status", invalid.status === 400, "Boş mesaj 400 dönmelidir."));
  } else if (fixture.id === "offer-consent-lifecycle") {
    const id = conversation("offer");
    const messages = ["Yeni araç almak istiyorum", "Şehir içinde günlük kullanacağım", "Parkı kolay kompakt bir yapı olsun", "Kesin bütçem 3 milyon TL", "Elektrikli olsun", "Geri görüş kamerası kesin olsun", "Tek araç öner", "Evet, göster"];
    let revision = 0; let token: string | undefined; const bodies: Array<V3PublicResponse & { stateToken: string }> = [];
    for (const [index, message] of messages.entries()) {
      const response = await post(`turn-${index + 1}`, { conversationId: id, messageId: `m${index + 1}`, message, expectedRevision: revision, ...(token ? { stateToken: token } : {}) });
      if (!isPublicResponse(response.body)) break;
      bodies.push(response.body); revision = response.body.state.revision; token = response.body.stateToken;
    }
    const final = bodies.at(-1);
    assertions.push(
      check("all-turns-succeeded", bodies.length === messages.length && observations.every((item) => item.status === 200), "Offer yolculuğunun bütün turları 200 dönmelidir."),
      check("offer-before-reveal", bodies.slice(0, -1).some((body) => body.offerAwaitingConsent === true) && bodies.slice(0, -1).every((body) => !body.recommendations?.length), "Onaydan önce offer gözlenmeli ve kart dönmemelidir."),
      check("single-card-after-consent", final?.recommendations?.length === 1, "Açık onaydan sonra tam bir recommendation dönmelidir."),
    );
  }

  return { fixture, baseUrl, observations, assertions, failed: assertions.filter((item) => !item.pass) };
}
