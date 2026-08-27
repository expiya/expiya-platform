export type SalesAdvisorHistoryItem = { readonly role: "user" | "assistant"; readonly text: string };
type ExpiringHistory = { readonly items: SalesAdvisorHistoryItem[]; readonly expiresAt: number };
const histories = new Map<string, ExpiringHistory>();
const MAX_HISTORIES = 5_000;
export const salesAdvisorHistoryKey = (conversationId: string, offerId: string, exactVariantId: string) => `${conversationId}:${offerId}:${exactVariantId}`;
export function getSalesAdvisorHistory(key: string, now = Date.now()) { const entry = histories.get(key); if (!entry) return []; if (entry.expiresAt <= now) { histories.delete(key); return []; } return entry.items; }
export function appendSalesAdvisorHistory(key: string, items: readonly SalesAdvisorHistoryItem[], expiresAt: string, now = Date.now()) {
  const expiry = Date.parse(expiresAt); if (!Number.isFinite(expiry) || expiry <= now) { histories.delete(key); return; }
  const bounded = [...getSalesAdvisorHistory(key, now), ...items.map((item) => ({ ...item, text: item.text.normalize("NFKC").slice(0, 800) }))].slice(-12);
  while (bounded.reduce((sum, item) => sum + item.text.length, 0) > 6_000) bounded.shift();
  histories.set(key, { items: bounded, expiresAt: expiry }); while (histories.size > MAX_HISTORIES) histories.delete(histories.keys().next().value!);
}
export function resetSalesAdvisorHistoryForTests() { histories.clear(); }
