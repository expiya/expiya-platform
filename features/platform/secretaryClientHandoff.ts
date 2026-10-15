export const SECRETARY_PENDING_MESSAGE_KEY = "expiya:secretary:pending-message:v1";
export const SECRETARY_PENDING_MESSAGE_TTL_MS = 10 * 60_000;

type HandoffStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function saveSecretaryPendingMessage(storage: HandoffStorage, message: string, now = Date.now()): void {
  storage.setItem(SECRETARY_PENDING_MESSAGE_KEY, JSON.stringify({ version: 1, message, expiresAt: now + SECRETARY_PENDING_MESSAGE_TTL_MS }));
}

export function readSecretaryPendingMessage(storage: HandoffStorage, now = Date.now()): string | undefined {
  try {
    const value = JSON.parse(storage.getItem(SECRETARY_PENDING_MESSAGE_KEY) ?? "null") as { version?: unknown; message?: unknown; expiresAt?: unknown } | null;
    if (value?.version === 1 && typeof value.message === "string" && value.message.trim() && typeof value.expiresAt === "number" && value.expiresAt > now) return value.message;
  } catch { /* Invalid browser state is rejected below. */ }
  storage.removeItem(SECRETARY_PENDING_MESSAGE_KEY);
  return undefined;
}

export function clearSecretaryPendingMessage(storage: HandoffStorage): void {
  storage.removeItem(SECRETARY_PENDING_MESSAGE_KEY);
}
