import { EQUIPMENT_FEATURE_DEFINITIONS } from "@/features/vehicle-data/equipmentEvidencePolicy";
import { runV3Turn } from "./engine.server";
import type { V3PublicResponse } from "./types";
import { createRecommendationTermsAcceptance } from "@/lib/legal/recommendationTerms";

const equipmentLabels: ReadonlyMap<string, string> = new Map(EQUIPMENT_FEATURE_DEFINITIONS.map((item) => [item.featureCode, item.labelTr]));
const personaLabels: Readonly<Record<string, string>> = { COMFORT: "Uzun yol konforu", PRACTICALITY: "Günlük pratiklik", TECHNOLOGY: "Teknoloji", SUSTAINABILITY: "Elektrikli ve sürdürülebilir karakter", DRIVING_ENGAGEMENT: "Sürüş keyfi", FAMILY: "Aile pratikliği", DESIGN: "Tasarım karakteri" };
const technicalLabels: Readonly<Record<string, string>> = { COMPACT: "Şehir içinde daha kısa gövde", LUGGAGE: "Uzun yol için daha büyük bagaj", POWER: "Daha yüksek motor gücü", PRICE: "Daha düşük satın alma fiyatı", RANGE: "Daha yüksek elektrikli menzil" };

export function v3TestDiscriminatorAnswer(key: string | undefined): string {
  if (key?.startsWith("verifiedEquipment:")) return equipmentLabels.get(key.slice("verifiedEquipment:".length).split("|")[0]!) ?? "Bu seçeneklerden hiçbiri şart değil";
  if (key?.startsWith("personaDiscriminator:")) return personaLabels[key.slice("personaDiscriminator:".length).split("|")[0]!] ?? "Bu gruptakilerden hiçbiri belirleyici değil";
  if (key?.startsWith("technicalDiscriminator:")) return technicalLabels[key.slice("technicalDiscriminator:".length).split("|")[0]!] ?? "Bu gruptakilerden hiçbiri belirleyici değil";
  if (key === "brandModel") return "Marka veya model tercihim yok, sen seç";
  throw new TypeError(`V3_TEST_CANNOT_ADVANCE:${key ?? "NONE"}`);
}

export async function advanceV3ToOffer(output: V3PublicResponse, prefix: string): Promise<V3PublicResponse> {
  for (let index = 0; index < 12 && !output.state.pendingOffer; index += 1) {
    output = await runV3Turn({ conversationId: output.state.conversationId, messageId: `${prefix}-${index}`, message: v3TestDiscriminatorAnswer(output.state.lastQuestionKey), expectedRevision: output.state.revision, state: output.state });
  }
  if (!output.state.pendingOffer) throw new TypeError("V3_TEST_OFFER_NOT_REACHED");
  return output;
}

export async function revealV3TestOffer(output: V3PublicResponse, messageId: string): Promise<V3PublicResponse> {
  return runV3Turn({ conversationId: output.state.conversationId, messageId, message: "Evet, göster", expectedRevision: output.state.revision, state: output.state, recommendationTermsAcceptance: createRecommendationTermsAcceptance() });
}
