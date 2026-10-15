import { describe, expect, it, vi } from "vitest";

import { clearSecretaryPendingMessage, readSecretaryPendingMessage, saveSecretaryPendingMessage, SECRETARY_PENDING_MESSAGE_TTL_MS } from "./secretaryClientHandoff";

function storageFixture() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: vi.fn((key: string) => values.delete(key)) };
}

describe("Secretary same-tab handoff", () => {
  it("preserves the original message only within the bounded lifetime", () => {
    const storage = storageFixture();
    saveSecretaryPendingMessage(storage, "Aile için otomobil arıyorum", 1_000);
    expect(readSecretaryPendingMessage(storage, 1_000 + SECRETARY_PENDING_MESSAGE_TTL_MS - 1)).toBe("Aile için otomobil arıyorum");
    expect(readSecretaryPendingMessage(storage, 1_000 + SECRETARY_PENDING_MESSAGE_TTL_MS)).toBeUndefined();
  });

  it("rejects malformed state and can be cleared after successful Cars ingestion", () => {
    const storage = storageFixture();
    storage.setItem("expiya:secretary:pending-message:v1", "not-json");
    expect(readSecretaryPendingMessage(storage)).toBeUndefined();
    saveSecretaryPendingMessage(storage, "otomobil");
    clearSecretaryPendingMessage(storage);
    expect(readSecretaryPendingMessage(storage)).toBeUndefined();
  });
});
