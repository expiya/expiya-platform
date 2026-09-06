import { createHash } from "node:crypto";
import type { Phase3IntentPayload } from "@/features/sales-advisor/handoff.server";
import { getSalesAdvisorHistory, salesAdvisorHistoryKey } from "@/features/sales-advisor/history.server";

export type ShareableSalesSummary = { readonly version: "sales-conversation-summary/v1"; readonly text: string; readonly mainText: string; readonly budgetText: string | null; readonly checksum: string; readonly sourceStages: readonly ("PHASE1" | "PHASE2")[] };
const sensitive = /(\b\d{11}\b|tc kimlik|sağlık|hastalık|kredi kart|iban|açık adres)/iu;
const clean = (value: string) => value.replace(/https?:\/\/\S+/giu, "").replace(/\s+/gu, " ").trim();
export function buildShareableSalesSummary(phase3: Pick<Phase3IntentPayload, "approvedNeeds" | "conversationId" | "offerId" | "selectedExactVariantId">): ShareableSalesSummary {
  const budgetItems = phase3.approvedNeeds.filter((item) => ["budgetMax", "budgetTarget"].includes(item.concept)).map((item) => clean(item.summary)).filter(Boolean);
  const phase1 = phase3.approvedNeeds.filter((item) => !["budgetMax", "budgetTarget"].includes(item.concept)).map((item) => clean(item.summary)).filter((item) => item && !sensitive.test(item)).slice(0, 6);
  const history = getSalesAdvisorHistory(salesAdvisorHistoryKey(phase3.conversationId, phase3.offerId, phase3.selectedExactVariantId));
  const phase2Questions = history.filter((item) => item.role === "user").map((item) => clean(item.text)).filter((item) => item && item.length <= 240 && !sensitive.test(item)).slice(-3);
  const sections = [...phase1, ...phase2Questions.map((item) => `Kullanıcının bayiyle görüşmek istediği konu: ${item}`)];
  const mainText = sections.join("; ").slice(0, 1_000) || "Bayiyle paylaşılabilecek ek sohbet özeti bulunmuyor.";
  const budgetText = budgetItems.length ? budgetItems.map((item) => item.replace(/:\s*(\d{4,})/u, (_match, amount: string) => `: ${new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(Number(amount))}`)).join("; ") : null;
  const text = [mainText, ...(budgetText ? [`Bütçe: ${budgetText}`] : [])].join("\n");
  return { version: "sales-conversation-summary/v1", text, mainText, budgetText, checksum: createHash("sha256").update(text).digest("hex"), sourceStages: [...(phase1.length ? ["PHASE1" as const] : []), ...(phase2Questions.length ? ["PHASE2" as const] : [])] };
}
