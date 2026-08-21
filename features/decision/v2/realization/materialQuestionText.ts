import type { MaterialQuestion } from "../domain/decisionState";

const QUESTION_PROMPTS: Readonly<Record<string, string>> = Object.freeze({
  usageScenario: "Aracı en çok hangi amaçla kullanacaksın?",
  bodyStyle: "Gövde olarak hangisi sana daha yakın?",
  seats: "Araçta kaç koltuk gerekli?",
  drivenWheels: "Çekiş tercihin var mı?",
  fuelType: "Yakıt tarafında hangisi sana daha uygun?",
  transmission: "Şanzıman tercihin nedir?",
  budget: "Aşmak istemediğin yaklaşık bütçe nedir?",
});
const RELAXATION_FUEL_LABELS: Readonly<Record<string, string>> = Object.freeze({
  GASOLINE: "benzin", DIESEL: "dizel", LPG: "LPG", MHEV: "hafif hibrit", HEV: "tam hibrit", PHEV: "şarj edilebilir hibrit", BEV: "elektrik", HYDROGEN: "hidrojen",
});

export function materialQuestionText(question: MaterialQuestion): string {
  if (question.stableSemanticKey.startsWith("affordabilityConflict.")) {
    const [, rawBudget, rawPreferences = ""] = question.stableSemanticKey.split(".");
    const values = new Map(rawPreferences.split("&").flatMap((entry) => { const [field, value] = entry.split("="); return field && value ? [[field, decodeURIComponent(value)] as const] : []; }));
    const body = values.get("bodyStyle");
    const transmission = values.get("transmission");
    const transmissionLabel = transmission === "AUTOMATIC" ? "Otomatik" : transmission === "MANUAL" ? "Manuel" : transmission;
    const preference = [transmissionLabel, body].filter(Boolean).join(" ");
    const budget = Number(rawBudget).toLocaleString("tr-TR");
    return `${preference || "Mevcut araç"} tercihini ${budget} TL bütçe içinde karşılayan bir seçenek bulamadım. Bütçe artırılabilir mi? Son şanzıman tercihin esneyebilir mi? Gövde tipi yerine yakın bir araç türü düşünülebilir mi?`;
  }
  if (question.stableSemanticKey === "refinement.bodyStyle") return "Birden fazla gövde tipi açık kaldı. Adayları üçe indirebilmek için hangisini önceliklendirelim?";
  if (question.stableSemanticKey === "refinement.fuelType") return "Birden fazla yakıt türü açık kaldı. Adayları üçe indirebilmek için hangisini önceliklendirelim?";
  if (question.stableSemanticKey === "refinement.catalogIdentity") return "Kalan seçenekler temel tercihlerinde aynı düzeyde. Fiyatı kullanmadan ilerlemek için hangi marka veya model sana daha yakın?";
  if (question.stableSemanticKey.startsWith("preferenceRelaxation.")) {
    const [, field, encodedValue] = question.stableSemanticKey.split(".");
    const rawValue = decodeURIComponent(encodedValue ?? "");
    const value = field === "fuelType"
      ? RELAXATION_FUEL_LABELS[rawValue] ?? rawValue
      : field === "transmission"
        ? rawValue === "AUTOMATIC" ? "otomatik" : rawValue === "MANUAL" ? "manuel" : rawValue
        : rawValue;
    const fieldLabel = field === "bodyStyle" ? "gövde tipi" : field === "fuelType" ? "yakıt türü" : "şanzıman türü";
    return `Seçtiğin ${value} ${fieldLabel} mevcut adaylarda bulunmuyor. Aşağıda gerçekten sonucu olan alternatifleri, kalan seçenek sayılarıyla gösteriyorum; hangisine geçelim?`;
  }
  if (question.stableSemanticKey === "semanticRecovery.fiveDoorBodyStyle") return "“Beş kapılı” derken özellikle hatchback mi kastediyorsun, yoksa beş kapılı bir SUV/crossover da olabilir mi?";
  if (question.stableSemanticKey === "semanticRecovery.economicMeaning") return "Ekonomik derken satın alma fiyatının erişilebilir olmasını mı, yoksa kullanım ve yakıt maliyetinin düşük olmasını mı kastediyorsun?";
  return QUESTION_PROMPTS[question.field] ?? "Kararı değiştirecek şu noktayı netleştirelim:";
}
