import { activeDecisionPreferences, latestActiveLedgerEvent } from "./ledger";
import { planV3VerifiedEquipmentQuestion } from "./catalogAdapter.server";
import { questionIsResolved, usageQuestionOrder, usageQuestionText } from "./usageQuestionMatrix";
import type { CatalogVariantSnapshot } from "../v2/catalog/types";
import type { V3ConversationState } from "./types";

const budgetModeOf = (state: V3ConversationState) => state.budgetMode ?? "NEEDS_ONLY";
const active = (state: V3ConversationState, concept: string) => activeDecisionPreferences(state.ledger).some((item) => item.concept === concept);

function questionCanReduceCandidates(key: string, variants: readonly CatalogVariantSnapshot[] | undefined): boolean {
  if (!variants || variants.length < 2) return variants === undefined;
  if (key === "primaryUsage") return new Set(variants.flatMap((item) => item.decisionFacts.vehicleUseClass?.value ? [item.decisionFacts.vehicleUseClass.value] : [])).size > 1;
  if (key === "bodyStyle") return new Set(variants.map((item) => item.decisionFacts.bodyStyle.value)).size > 1;
  if (key === "fuelType") return new Set(variants.map((item) => item.decisionFacts.powertrain.fuelType.value)).size > 1;
  if (key === "budget" || key === "exactBudget") return new Set(variants.flatMap((item) => item.activeNewPrice ? [item.activeNewPrice.amountTry] : [])).size > 1;
  if (key.endsWith("Equipment")) return variants.length > 1;
  return true;
}

export function selectCarsQuestion(state: V3ConversationState, variants?: readonly CatalogVariantSnapshot[]): { key: string; text: string } | undefined {
  if (state.pendingConfirmation) return { key: `confirm:${state.pendingConfirmation.concept}`, text: state.pendingConfirmation.question };
  const keys = new Set(state.askedQuestionKeys);
  const exactModelSelected = active(state, "modelPreference");
  if (exactModelSelected) {
    const selectedModels = latestActiveLedgerEvent(state.ledger, "modelPreference")?.normalizedValue;
    if (Array.isArray(selectedModels) && selectedModels.length > 1 && (variants?.length ?? 0) > 1 && !keys.has("modelTradeoff")) return { key: "modelTradeoff", text: "Bu modeller arasında karar verirken daha erişilebilir bütçe ve kolay kullanım mı, yoksa daha geniş yaşam alanı ve yüksek konfor mu ağır bassın?" };
    if (budgetModeOf(state) === "NEEDS_ONLY") return undefined;
    const budgetKnown = latestActiveLedgerEvent(state.ledger, "budgetMax") || latestActiveLedgerEvent(state.ledger, "budgetTarget") || latestActiveLedgerEvent(state.ledger, "budgetNotImportant") || latestActiveLedgerEvent(state.ledger, "budgetUnspecified");
    if (!budgetKnown && !keys.has("budget") && questionCanReduceCandidates("budget", variants)) return { key: "budget", text: "Bu modelin uygun varyantını seçebilmem için satın alma bütçenin üst sınırı nedir?" };
    return undefined;
  }
  const body = latestActiveLedgerEvent(state.ledger, "bodyStyle")?.normalizedValue;
  const usage = latestActiveLedgerEvent(state.ledger, "primaryUsage")?.normalizedValue;
  if (!active(state, "primaryUsage") && body === "COUPE" && !keys.has("coupePracticality")) return { key: "coupePracticality", text: "Coupe seçimin net; günlük kullanımda arka koltuk ve bagaj alanından ne kadar ödün verebilirsin?" };
  if (!active(state, "primaryUsage") && !keys.has("primaryUsage") && questionCanReduceCandidates("primaryUsage", variants)) return { key: "primaryUsage", text: "Aracı en çok hangi günlük ihtiyaç için kullanacaksın?" };
  if (usage === "PASSENGER_TRANSPORT" && !latestActiveLedgerEvent(state.ledger, "minimumSeats") && !keys.has("passengerCapacity")) return { key: "passengerCapacity", text: "Sürücü dahil, aynı anda toplam kaç kişilik bir araç gerekiyor?" };
  if (usage === "MIXED_ROAD" && !active(state, "bodyStyle") && !keys.has("mixedRoadBody")) return { key: "mixedRoadBody", text: "Kamp ve zaman zaman bozuk yol kullanımında kapalı bagajlı bir SUV mu, yoksa açık kasalı bir pick-up mı sana daha uygun?" };
  if (usage === "COMMERCIAL" && !questionIsResolved(state, "fuelType") && questionCanReduceCandidates("fuelType", variants)) return { key: "fuelType", text: usageQuestionText("fuelType") };
  if (usage === "COMMERCIAL" && !active(state, "bodyStyle") && !keys.has("commercialConfiguration")) return { key: "commercialConfiguration", text: "Yükleme düzenini doğru seçelim: kapalı ve geniş yük alanlı panelvan mı, açık kasalı pick-up mı, yoksa yolcu ve yükü birlikte taşıyan bir yapı mı işine daha uygun?" };
  const bodyResolved = active(state, "bodyStyle") || Boolean(latestActiveLedgerEvent(state.ledger, "bodyNotImportant"));
  const usageResolvedForPlanning = active(state, "primaryUsage") || !questionCanReduceCandidates("primaryUsage", variants);
  for (const key of usageQuestionOrder(typeof usage === "string" ? usage : undefined)) {
    if (questionIsResolved(state, key) || (key === "budget" && budgetModeOf(state) === "NEEDS_ONLY") || key.endsWith("Equipment") || (key === "budget" && (!usageResolvedForPlanning || !bodyResolved)) || !questionCanReduceCandidates(key, variants)) continue;
    return { key, text: usageQuestionText(key as Parameters<typeof usageQuestionText>[0]) };
  }
  if (budgetModeOf(state) === "BUDGET_AS_DECISION_FILTER" && latestActiveLedgerEvent(state.ledger, "budgetTarget") && !latestActiveLedgerEvent(state.ledger, "budgetMax") && !keys.has("exactBudget") && questionCanReduceCandidates("exactBudget", variants)) return { key: "exactBudget", text: "Son elemede kullanmam için aşmak istemediğin kesin bütçe üst sınırı nedir?" };
  const equipmentResolved = activeDecisionPreferences(state.ledger).some((item) => item.field === "equipmentFeature") || Boolean(latestActiveLedgerEvent(state.ledger, "equipmentNotImportant") || latestActiveLedgerEvent(state.ledger, "unmappedEquipmentRequirement"));
  if (variants && variants.length > 3 && !equipmentResolved) {
    const maxRounds = budgetModeOf(state) === "NEEDS_ONLY" ? 3 : 1;
    if (state.askedQuestionKeys.filter((key) => key.startsWith("verifiedEquipment:")).length < maxRounds) {
      const planned = planV3VerifiedEquipmentQuestion(variants, state.askedQuestionKeys, typeof usage === "string" ? usage : undefined);
      if (planned) return { key: planned.key, text: planned.text };
    }
  }
  if (latestActiveLedgerEvent(state.ledger, "budgetNotImportant") && !latestActiveLedgerEvent(state.ledger, "brandModelPreference") && !state.finalBrandModelQuestionAsked) return { key: "brandModel", text: "Marka veya model olarak özellikle yakın hissettiğin bir seçenek var mı?" };
}
