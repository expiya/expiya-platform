import type { XpyDomainReentryConfig, XpyWelcomeKnowledge } from "./contracts";

const unsafe = /(?:[a-zçğıöşü]+_[a-z0-9_]+|\b(?:enum|runtime|concept|field|policy|exact)\b)/iu;

export function defineXpyWelcomeKnowledge(value: XpyWelcomeKnowledge): XpyWelcomeKnowledge {
  const visible = [value.categoryName, value.introduction, ...value.needDimensions, value.technologySummary ?? "", value.openingQuestion].join(" ");
  if (!value.categoryName.trim() || !value.introduction.trim() || !value.needDimensions.length || !value.openingQuestion.endsWith("?") || unsafe.test(visible)) throw new TypeError("XPY_WELCOME_KNOWLEDGE_INVALID");
  return Object.freeze({ ...value, needDimensions: Object.freeze([...value.needDimensions]) });
}

export function honestXpyWelcomeFallback(config: XpyDomainReentryConfig, openingQuestion: string): XpyWelcomeKnowledge {
  return defineXpyWelcomeKnowledge({ source: "HONEST_FALLBACK", categoryName: config.publicName, introduction: `${config.publicName[0]!.toLocaleUpperCase("tr-TR")}${config.publicName.slice(1)}, kullanım biçimine göre doğru özellikleri değişen bir ürün grubudur.`, needDimensions: ["nerede ve ne sıklıkta kullanılacağı", "günlük kullanımda en çok neyin kolaylık sağlaması gerektiği"], openingQuestion, contextMutation: "NONE" });
}

export function renderXpyWelcome(knowledge: XpyWelcomeKnowledge, secretaryIntent?: string): string {
  const intent = secretaryIntent?.trim() ? ` ${secretaryIntent.trim()} isteğini bu görüşmeye taşıdım.` : "";
  const dimensions = knowledge.needDimensions.join(", ");
  return `${knowledge.introduction}${intent} Seçerken ${dimensions} gibi ihtiyaçları düşünmek yararlı olur.${knowledge.technologySummary ? ` ${knowledge.technologySummary}` : ""} ${knowledge.openingQuestion}`;
}

/** Cars Domain Pack orientation. It is intentionally category-level and does not
 * claim a feature, trend, or product fact that would require candidate evidence. */
export function carsWelcomeText(secretaryIntent?: string): string {
  return renderXpyWelcome(defineXpyWelcomeKnowledge({
    source: "DOMAIN_PACK",
    categoryName: "Otomobil",
    introduction: "Otomobil seçimi, aracın günlük hayatınıza, yolculuklarınıza ve birlikte seyahat ettiğiniz kişilere uymasıyla başlar.",
    needDimensions: ["aracı en çok nerede kullanacağınız", "kaç kişi ve ne kadar eşya taşıyacağınız", "sürüş ve yakıt beklentileriniz"],
    technologySummary: "Yeni teknolojiler ancak sizin kullanımınıza somut bir kolaylık veya güvenlik katkısı sağladığında anlamlıdır.",
    openingQuestion: "Aracı günlük hayatta en çok nasıl kullanmayı düşünüyorsunuz?",
    contextMutation: "NONE",
  }), secretaryIntent);
}
