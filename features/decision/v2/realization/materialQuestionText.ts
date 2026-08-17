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

export function materialQuestionText(question: MaterialQuestion): string {
  if (question.stableSemanticKey === "semanticRecovery.fiveDoorBodyStyle") return "“Beş kapılı” derken özellikle hatchback mi kastediyorsun, yoksa beş kapılı bir SUV/crossover da olabilir mi?";
  if (question.stableSemanticKey === "semanticRecovery.economicMeaning") return "Ekonomik derken satın alma fiyatının erişilebilir olmasını mı, yoksa kullanım ve yakıt maliyetinin düşük olmasını mı kastediyorsun?";
  return QUESTION_PROMPTS[question.field] ?? "Kararı değiştirecek şu noktayı netleştirelim:";
}
