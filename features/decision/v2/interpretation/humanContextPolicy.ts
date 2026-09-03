import type { HumanContextKind } from "../domain/humanContext";

export interface HumanContextPolicyMatch {
  readonly kind: HumanContextKind;
  readonly safeAcknowledgement: string;
}

export function detectHumanContext(userText: string): HumanContextPolicyMatch | null {
  const text = userText.normalize("NFKC").toLocaleLowerCase("tr-TR");
  if (/ehliyet(?:i|imi)? yeni aldım/u.test(text)) return Object.freeze({ kind: "FIRST_CAR", safeAcknowledgement: "Yeni ehliyetle başlarken temkinli hissetmen doğal; acele etmeden, anlaşılır adımlarla ilerleyebiliriz." });
  if (/(?:ilk arabam|ilk aracım|ilk otomobilim|ilk arabamı|ilk aracımı|ilk otomobilimi|hayatımda ilk kez (?:araç|araba|otomobil))/u.test(text)) return Object.freeze({ kind: "FIRST_CAR", safeAcknowledgement: "Şimdiden hayırlı olsun; ilk araba heyecanını aceleye getirmeden birlikte doğru seçeneğe çevirebiliriz." });
  if (/(?:kızım|oğlum|eşim|annem|babam|partnerim|arkadaşım)\s+(?:için|kullanacak)|(?:kızıma|oğluma|eşime|anneme|babama)\s+(?:araç|araba|otomobil)/u.test(text)) return Object.freeze({ kind: "BUYING_FOR_OTHER", safeAcknowledgement: "Güzel düşünce; aracı kullanacak kişinin günlük hayatını esas alarak ilerleyebiliriz." });
  if (/(?:hayal kırıklığı|önerini beğenmedim|bu olmadı|yine olmadı|saçmaladın|berbat cevap)/u.test(text)) return Object.freeze({ kind: "DISAPPOINTMENT", safeAcknowledgement: "Haklısın; bu sonuç beklentini karşılamadı. Savunmaya geçmeden verdiğin geri bildirime göre yeniden ilerleyelim." });
  if (/(?:endişeliyim|kaygılıyım|korkuyorum|gerginim|çekiniyorum)/u.test(text)) return Object.freeze({ kind: "ANXIETY", safeAcknowledgement: "Kaygını anlıyorum; teknik ayrıntılara boğmadan, adım adım ve anlaşılır biçimde ilerleyebiliriz." });
  if (/(?:acil|hemen|bugün|çok kısa sürede)\s+(?:bir\s+)?(?:araç|araba|otomobil)|(?:araç|araba|otomobil).*(?:acil|hemen almam)/u.test(text)) return Object.freeze({ kind: "URGENCY", safeAcknowledgement: "Aciliyeti anladım; gereksiz ayrıntılara girmeden kararını etkileyen temel noktalarla ilerleyelim." });
  if (/(?:hiçbir şey bilmiyorum|hiç anlamıyorum|karar veremiyorum|kafam (?:çok )?karışık|nereden başlayacağımı bilmiyorum)/u.test(text)) return Object.freeze({ kind: "UNCERTAINTY", safeAcknowledgement: "Sorun değil; teknik terimleri bilmeni beklemeden günlük kullanımından başlayarak birlikte daraltabiliriz." });
  if (/(?:artık bekar değilim|evlendim|(?:ikinci|üçüncü|yeni bir) çocuk(?: da)? yolda|çocuk geliyor|bebeğimiz olacak|ailemiz büyüyor|hayatım değişti)/u.test(text)) return Object.freeze({ kind: "LIFE_CHANGE", safeAcknowledgement: "Gözünüz aydın 🙂 Ailenizin yeni düzenine gerçekten uyacak bir araç bulalım. Kaç kişi olduğunuz, günlük kullanımınız ve taşıyacağınız eşyalar netleştikçe doğru seçeneklere birlikte yaklaşırız." });
  if (/(?:heyecanlıyım|sabırsızlanıyorum|çok heyecan verici)/u.test(text)) return Object.freeze({ kind: "EXCITEMENT", safeAcknowledgement: "Heyecanını anlıyorum 🙂 İçine sinecek seçeneği aceleye getirmeden birlikte bulalım." });
  if (/(?:şaka bir yana|😂|😄|🤣|😁)/u.test(userText)) return Object.freeze({ kind: "HUMOR", safeAcknowledgement: "Gülümsetti 😄 Şakayı uzatmadan araç ihtiyacına devam edelim." });
  return null;
}

export function isControlledHumanContextVehicleRequest(userText: string): boolean {
  const context = detectHumanContext(userText);
  if (!context || /\?/u.test(userText)) return false;
  const text = userText.normalize("NFKC").toLocaleLowerCase("tr-TR").trim();
  return /(?:araç|araba|otomobil)(?:yı|yi|u|ü)?(?=\s|[,.!?]|$).*\b(?:almak|alacağım|arıyorum|bakıyorum|istiyorum|seçelim)\b/u.test(text)
    || /\b(?:almak|alacağım|arıyorum|bakıyorum|istiyorum|seçelim)\b.*(?:araç|araba|otomobil)(?:yı|yi|u|ü)?(?=\s|[,.!?]|$)/u.test(text);
}
