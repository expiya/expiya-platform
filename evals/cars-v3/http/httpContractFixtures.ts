export interface V3HttpContractFixture {
  readonly id: string;
  readonly description: string;
}

export const V3_HTTP_CONTRACT_FIXTURES: readonly V3HttpContractFixture[] = [
  { id: "signed-multi-turn", description: "İmzalı state token ile iki tur ilerler" },
  { id: "exact-message-replay", description: "Aynı messageId ve payload replay'inde state'i ilerletmez" },
  { id: "message-payload-conflict", description: "Aynı messageId ile farklı payload'ı 409 ile reddeder" },
  { id: "stale-revision-conflict", description: "Eski expectedRevision değerini 409 ile reddeder" },
  { id: "tampered-token-no-restore", description: "Bozulmuş state token yeni konuşmayı restore edemez" },
  { id: "cross-conversation-token-no-restore", description: "State token başka conversationId için kullanılamaz" },
  { id: "raw-state-is-ignored", description: "Request içindeki raw state güvenilir seed sayılmaz" },
  { id: "request-security-contract", description: "Content-Type ve same-origin kurallarını uygular" },
  { id: "invalid-schema-contract", description: "Geçersiz mesaj gövdesini 400 ile reddeder" },
  { id: "offer-consent-lifecycle", description: "Onay öncesi kart göstermez, onay sonrası tek kart verir" },
] as const;

export function getV3HttpContractFixture(id: string): V3HttpContractFixture {
  const fixture = V3_HTTP_CONTRACT_FIXTURES.find((item) => item.id === id);
  if (!fixture) throw new TypeError(`V3_HTTP_EVAL_UNKNOWN_FIXTURE:${id}`);
  return fixture;
}
