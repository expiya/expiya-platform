import type { CarsBlockedRuntimeResult } from "@/features/decision/runtime/runCarsRuntime";
import type { CarsConversationLocale } from "./hasActionableCarsContext";

export function createCarsFollowUp(
  result: CarsBlockedRuntimeResult,
  locale: CarsConversationLocale = "en",
): string {
  const reason = result.reasons[0];

  if (locale === "tr") {
    if (result.status === "FAILED") {
      return "Analizi şu anda tamamlayamadım. Son cevabınızı birazdan yeniden gönderebilirsiniz; konuşmanız korunuyor.";
    }

    switch (reason?.stage) {
      case "CLASSIFICATION":
        return "Size uygun araçları keşfetmemi mi, yoksa belirli araçları karşılaştırmamı mı istersiniz?";
      case "TYPE_B_IDENTITY":
        return "Karşılaştırmak istediğiniz en az iki aracın marka ve modelini yazar mısınız?";
      case "MATERIALITY":
      case "LIMITED_SUPPORT":
        return "Kararınızda en önemli ölçüt nedir? Örneğin bütçe, yakıt türü, gövde tipi veya kullanım amacı olabilir.";
      case "REJECTION_RELEVANCE":
      case "CONFLICT":
        return "Bilgiler arasında bir çelişki buldum. Bundan sonra hangi son tercihinizi kullanmamı istersiniz?";
      case "DOMAIN_BINDING":
      case "DOMAIN_SUFFICIENCY":
        return "Aracın mutlaka karşılaması gereken en önemli ihtiyacınız nedir?";
      case "EVIDENCE":
        return "Araçları güvenilir biçimde değerlendirmek için bütçenizi veya düşündüğünüz kesin modelleri paylaşır mısınız?";
      default:
        return "İhtiyacınızı biraz daha ayrıntılı anlatır mısınız?";
    }
  }

  if (result.status === "FAILED") {
    return "I couldn't complete that analysis just now. Please try your last answer again in a moment.";
  }

  switch (reason?.stage) {
    case "CLASSIFICATION":
      return "Would you like me to discover suitable cars for you, or compare specific cars you already have in mind?";
    case "TYPE_B_IDENTITY":
      return "Which exact cars would you like to compare? Please include the brand and model for at least two candidates.";
    case "MATERIALITY":
      return "What matters most in your decision—for example budget, fuel type, body style, mileage, or how you will use the car?";
    case "REJECTION_RELEVANCE":
    case "CONFLICT":
      return "I found conflicting details. Which of your latest requirements should I use going forward?";
    case "DOMAIN_BINDING":
    case "DOMAIN_SUFFICIENCY":
      return "What is the most important requirement the car must satisfy? A budget or one key usage need is a good place to start.";
    case "EVIDENCE":
      return "I need one more concrete detail to evaluate the options reliably. Can you share your budget or the exact models you are considering?";
    case "LIMITED_SUPPORT":
      return "Could you add one concrete must-have or deal-breaker for your next car?";
    default:
      return "Could you tell me a little more about what you need from the car?";
  }
}
