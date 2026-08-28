import type { RouterResult, SourceSpan, V3Route } from "./types";
import { detectExplicitUsagePurpose } from "./usageSemantics";

const span = (text: string): SourceSpan => ({
  start: 0,
  end: text.length,
  text,
});
const has = (text: string, pattern: RegExp) => pattern.test(text);

export function routeConversationMessage(
  message: string,
  context: {
    readonly hasPurchaseIntent: boolean;
    readonly hasOpenQuestion: boolean;
  },
): RouterResult {
  const text = message.trim();
  const socialOpening =
    /(?:orada kimse var mı|müsait misiniz|vaktiniz var mı|danışabileceğim biri var mı|asistana bağlandım galiba|^(?:merhaba(?:lar)?|selam(?:lar)?|günaydın|iyi akşamlar|iyi çalışmalar)(?:\s+dostum)?[,! ]*(?:nasılsın(?:ız)?)?[?!. ]*$)/iu.test(
      text,
    );
  const automotiveSubject = has(
    text,
    /(?:ara[çc]|araba|otomobil|varyant|marka|model|sürüş|sürerken|kullanacağız|direksiyon|saklama göz|koltuk|kol dayama|deri|diz mesaf|gövde|tasarım|tavan|kokpit|ambiyans|spor görünüş|performans|görüş açı|otomatik|manuel|elektrikli|hibrit|hibrid|dizel|benzinli|motor|yakıt|batarya|menzil|taşıma kapasitesi|şarj|çekiş|itiş|şanzıman|suv|coupe|crossover|hatchback|sedan|mpv|kombi\s*van|panel\s*van|panelvan|minibüs|kamyonet|pick\s*up|4x4|dört çeker|bagaj|tork|kw|(?:i|İ)?kinci\s*el|2\.?\s*el|ekspertiz|raporu|kasko|trafik sigortası|taşıt kredisi|araç kredisi)/iu,
  );
  const informationQuestion = has(
    text,
    /\?|(?:^|\s)(?:mı|mi|mu|mü)(?:\s|[?.!,]|$)|(?:neden|nasıl|nedir|ne demek|farkı|doğru mu|kaç|hangi|ne kadar|en fazla|en az|maksimum|minimum|pahalı|ucuz|maliyetli|sanırım)/iu,
  );
  const offTopicProduct = has(
    text,
    /(?:telefon|iphone|samsung|tablet|bilgisayar|ev|daire|motosiklet|bisiklet)/iu,
  );
  const namedProductPurchase =
    !offTopicProduct &&
    has(
      text,
      /(?:^|\s)[\p{L}\d.-]+(?:\s+[\p{L}\d.-]+){0,3}\s+(?:modelini\s+)?(?:satın\s+)?almak\s+istiyorum[.!]?$/iu,
    );
  const shoppingSubject =
    /(?:ara[çc]\p{L}*|araba\p{L}*|otomobil\p{L}*|model|suv|coupe|crossover|hatchback|sedan|mpv|kombi\s*van|panel\s*van|panelvan|minibüs|kamyonet|pick\s*up|4x4|dört çeker)/iu;
  const shoppingAction =
    /(?:satın al|alacağ|almak|almamız|alacağız|alıyorum|alırım|alayım|alabilirim|almaya|bakıyor|bakıyorum|arıyor|arıyorum|arayış|istiyor|istiyorum|ihtiyac|lazım|gerekiyor|araştır|kapatacağ|kapatmam|seçmeye|seçmek|seçim|danışmak|yardımcı)/iu;
  const explicitUsage = detectExplicitUsagePurpose(text);
  const recommendationRequest = has(
    text,
    /(?:öner|seç|hangisini al|hangi model|en iyi|tek araç|alternatif|göster|hazırla|karar ver)/iu,
  );
  const comparisonInformationOnly =
    informationQuestion &&
    has(
      text,
      /(?:mi\s+(?:yoksa|veya)|yoksa|arasındaki fark|neye bakmak|ne kadar|nasıl çalış|doğru mu)/iu,
    ) &&
    !has(
      text,
      /(?:alacağım|alıyorum|almaya hazırım|hemen al|satın alacağ|kapora|bütçem|bütçeyle|ödemem hazır)/iu,
    );
  const holisticVehicleWish =
    automotiveSubject &&
    /(?:olsun|lazım|yaşatsın|hissettirsin|bulalım|arayış|öner|arıyorum|bakıyorum|istiyorum|ne var)/iu.test(
      text,
    );
  const purchaseEvidence =
    !comparisonInformationOnly &&
    (namedProductPurchase ||
      holisticVehicleWish ||
      (shoppingSubject.test(text) && shoppingAction.test(text)) ||
      (Boolean(explicitUsage) &&
        /(?:kullanacağ|yol yapacağ|araç|araba|otomobil|satın al|arıyorum|bakıyorum)/iu.test(text)) ||
      (Boolean(explicitUsage) &&
        automotiveSubject &&
        /(?:yeni|sıfır|al|ara|bak|ihtiyaç|lazım|kullanacak)/iu.test(text)) ||
      (automotiveSubject && recommendationRequest) ||
      (automotiveSubject &&
        /(?:bakıyorum|arıyorum|istiyorum|ihtiyac|lazım|alayım|alabilirim|almaya hazırım|ödemem hazır|nakit.{0,20}hazır|hemen al|hemen alıyorum|hemen alırım|kapatacağ|kapatmam)/iu.test(
          text,
        )) ||
      /bütçe(?:m|mi|miz)?[\s\S]{0,180}(?:hemen\s+)?(?:alıyorum|alırım|alayım|almaya hazırım)/iu.test(
        text,
      ) ||
      has(
        text,
        /(?:(?:sizde|elinizde|katalogda) (?:hangi araçlar var|ne var)|ne var (?:sizde|elinizde|katalogda)|hangi araçlarınız var|araçlarınız neler|aracımı.*değiştir|toplu taşımadan yoruldum|ayağımı yerden kesecek|ehliyet(?:imi)?.*(?:ilk )?arac(?:ımı|ımı).*araştır)/iu,
      ));
  let route: V3Route;
  let reason: string;
  let confidence = 0.94;
  if (has(text, /(?:kendime zarar|intihar|öldürmek|silah yap|bomba yap)/iu)) {
    route = "SAFETY_BOUNDARY";
    reason = "Safety-sensitive request";
  } else if (
    has(
      text,
      /^(?:hoşça kal|görüşürüz|teşekkürler,? bu kadar|kapat(?:alım)?)\.?$/iu,
    )
  ) {
    route = "CLOSING_OR_TERMINATION";
    reason = "Explicit closing";
  } else if (
    has(
      text,
      /(?:vazgeçtim|fark etmez|kaldır|bütçeyi boşver|bütçem yok|düzeltme|demedim|artık istemiyorum|de olabilir)/iu,
    )
  ) {
    route = "CORRECTION_OR_RELAXATION";
    reason = "Correction or relaxation language";
  } else if (
    recommendationRequest &&
    (context.hasPurchaseIntent || purchaseEvidence)
  ) {
    route = "RECOMMENDATION_OR_OFFER";
    reason = purchaseEvidence
      ? "Composite purchase intent and decision request"
      : "Decision or offer request";
  } else if (automotiveSubject && informationQuestion && !purchaseEvidence) {
    route = "AUTOMOTIVE_INFORMATION";
    reason = "Explicit automotive information question";
  } else if (purchaseEvidence) {
    route = "PURCHASE_INTENT_DISCOVERY";
    reason = "Purchase-intent evidence";
  } else if (
    has(
      text,
      /(?:elektrikli|hibrit|hibrid|dizel|benzinli|suv|hatchback|sedan|crossover|vito|golf|performans|uzun yol|kamp|bozuk yol|aileyiz|bütçe|ekonomik|klimalı|otomatik|manuel|kişilik)/iu,
    ) &&
    (context.hasPurchaseIntent || !has(text, /\?$/u))
  ) {
    route = "VEHICLE_PREFERENCE_UPDATE";
    reason = "Vehicle preference signal";
  } else if (
    context.hasOpenQuestion &&
    !has(text, /(?:telefon|iphone|samsung|sınav|maç|hava)/iu)
  ) {
    route = "QUESTION_ANSWER";
    reason = "Answer to one open material question";
    confidence = 0.8;
  } else if (
    socialOpening ||
    has(text, /(?:ne işe yar|yardımcı oluyor|oto galeri|kimsiniz|nesiniz)/iu)
  ) {
    route = "SOCIAL_CONVERSATION";
    reason = "Social greeting or availability check";
  } else if (
    has(text, /(?:telefon|iphone|samsung|sınav|maç|hava|okul|fıkra)/iu)
  ) {
    route = "OFF_TOPIC_REQUEST";
    reason = "Non-automotive topic";
  } else if (informationQuestion || /\?\s*$/u.test(text)) {
    route = "OFF_TOPIC_REQUEST";
    reason = "Non-automotive question";
    confidence = 0.78;
  } else {
    route = context.hasPurchaseIntent
      ? "QUESTION_ANSWER"
      : "SOCIAL_CONVERSATION";
    reason = "Conversational fallback";
    confidence = 0.58;
  }
  const purchase = purchaseEvidence ? [span(text)] : [];
  const mutation = [
    "PURCHASE_INTENT_DISCOVERY",
    "VEHICLE_PREFERENCE_UPDATE",
    "QUESTION_ANSWER",
    "CORRECTION_OR_RELAXATION",
    "RECOMMENDATION_OR_OFFER",
  ].includes(route);
  const catalog =
    [
      "VEHICLE_PREFERENCE_UPDATE",
      "CORRECTION_OR_RELAXATION",
      "RECOMMENDATION_OR_OFFER",
    ].includes(route) && context.hasPurchaseIntent;
  return {
    version: "3.8",
    route,
    confidence,
    purchaseIntentEvidence: purchase,
    decisionMutationAllowed: mutation,
    catalogEvaluationRequired: catalog,
    directAnswerRequired: [
      "OFF_TOPIC_REQUEST",
      "AUTOMOTIVE_INFORMATION",
      "SAFETY_BOUNDARY",
    ].includes(route),
    conversationReason: reason,
    sourceSpans: text ? [span(text)] : [],
    clarificationRequirement: confidence < 0.6 ? "LOW_ROUTER_CONFIDENCE" : null,
  };
}
