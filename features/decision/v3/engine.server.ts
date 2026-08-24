import { createHash } from "node:crypto";
import { applyCatalogEntitySignals, applyPreferenceMessage, applySemanticContextSignals, activeDecisionPreferences, latestActiveLedgerEvent } from "./ledger";
import { evaluateV3Catalog, rankV3Candidates, resolveV3CatalogEntities, v35EquipmentSelectionWarning } from "./catalogAdapter.server";
import { createV31Offer, revealV31Offer } from "./offerGovernance.server";
import { interpretV31Message } from "./semanticProvider.server";
import { contextualQuestion, conversationalAcknowledgement, dailyUsageContext, isTurkishPublicCopy } from "./turkishRealization";
import { questionIsResolved, usageQuestionOrder, usageQuestionText } from "./usageQuestionMatrix";
import { productScopeReply } from "./productScope";
import type { CatalogVariantSnapshot } from "../v2/catalog/types";
import type { PurchaseIntentState, V3ConversationState, V3PublicResponse } from "./types";

export function createV3ConversationState(conversationId: string): V3ConversationState {
  return { version: "3.8", conversationId, revision: 0, processedMessages: {}, purchaseIntent: "NOT_EXPRESSED", intentObservationTurns: 0, ledger: [], askedQuestionKeys: [], ended: false };
}
const fingerprint = (text: string) => createHash("sha256").update(text).digest("hex");
const active = (state: V3ConversationState, concept: string) => activeDecisionPreferences(state.ledger).some((item) => item.concept === concept);

function nextIntent(prior: PurchaseIntentState, route: string, turn: number, priorQuestion: string | undefined, message: string, semanticAssessment: "NOT_EXPRESSED" | "POSSIBLE" | "EXPLICIT"): PurchaseIntentState {
  if (prior === "ENDED_WITHOUT_INTENT") return prior;
  if (route === "PURCHASE_INTENT_DISCOVERY" || route === "RECOMMENDATION_OR_OFFER") return prior === "ACTIVE_DISCOVERY" || prior === "READY_FOR_DECISION" ? prior : prior === "EXPLICIT" && priorQuestion ? "ACTIVE_DISCOVERY" : "EXPLICIT";
  if (semanticAssessment === "EXPLICIT" && ["NOT_EXPRESSED", "POSSIBLE"].includes(prior)) return "EXPLICIT";
  if (semanticAssessment === "POSSIBLE" && prior === "NOT_EXPRESSED") return "POSSIBLE";
  if (priorQuestion === "purchaseInterest" && /(?:evet|olabilir|değerlendir|düşünüyorum|bakabilirim|ilgileniyorum|açığım)/iu.test(message)) return "EXPLICIT";
  if (route === "CLOSING_OR_TERMINATION") return prior === "NOT_EXPRESSED" || prior === "POSSIBLE" ? "ENDED_WITHOUT_INTENT" : prior;
  if (["VEHICLE_PREFERENCE_UPDATE", "QUESTION_ANSWER", "CORRECTION_OR_RELAXATION"].includes(route) && ["EXPLICIT", "ACTIVE_DISCOVERY"].includes(prior)) return "ACTIVE_DISCOVERY";
  if (prior === "NOT_EXPRESSED" && turn >= 3) return "POSSIBLE";
  return prior;
}

function directReply(route: string, text: string, observationTurns: number): string | undefined {
  const normalized = text.toLocaleLowerCase("tr-TR");
  if (route === "SAFETY_BOUNDARY") return "Buna yardımcı olamam. Acil bir tehlike varsa 112'yi ara veya yanında güvendiğin birine hemen haber ver.";
  if (route === "AUTOMOTIVE_INFORMATION") {
    if (/elektrikli/iu.test(text) && /pahalı|fiyat|maliyet/iu.test(text)) return "Elektrikli araçların satın alma fiyatı benzer boyut ve donanımdaki benzinli araçlardan çoğu zaman daha yüksek olabiliyor. Buna karşılık enerji ve düzenli bakım giderleri kullanımına göre daha düşük kalabilir; toplam avantaj yıllık yoluna, şarj imkânına ve iki aracın gerçek fiyatına bağlıdır.";
    if (/dizel/iu.test(text) && /doğa|çevre|kirlet|emisyon|zarar/iu.test(text)) return "Tek bir ölçüte göre ‘dizel her zaman daha fazla kirletir’ demek doğru olmaz. Dizel motorlar verimlilikleri sayesinde benzer bir benzinli araca göre kilometre başına daha az karbondioksit salabilir; buna karşılık azot oksit ve ince partikül emisyonları özellikle şehir havası açısından daha sorunlu olabilir. Yeni nesil emisyon sistemleri bu farkı azaltır, ancak aracın yaşı, bakımı ve kullanım biçimi sonucu ciddi ölçüde değiştirir. Elektrikli araçlarda egzoz emisyonu yoktur; toplam çevresel etki ise elektriğin üretim biçimi ve batarya yaşam döngüsüyle birlikte değerlendirilir.";
    if (/hibrit|hibrid/iu.test(text) && /tasarruf|az yak|tüketim|ekonomik/iu.test(text)) return "Evet, özellikle şehir içindeki dur-kalk kullanımında hibrit araçlar yakıt tasarrufu sağlayabilir. Düşük hızlarda elektrik motorundan yararlanmaları ve frenleme sırasında enerjiyi geri kazanmaları tüketimi azaltır. Uzun ve sabit hızlı otoyol kullanımında bu avantaj genellikle küçülür; gerçek tasarruf aracın hibrit türüne, ağırlığına, sürüş biçimine ve karşılaştırdığın benzinli modele bağlıdır. Şarj edilebilir hibritlerde ise düşük tüketim için aracı düzenli şarj edebilmek belirleyicidir.";
    if (/elektrikli/iu.test(text) && /yan(?:gın|ıyor)|alev|güvenli/iu.test(text)) return "Elektrikli araçların batarya yangınları çok dikkat çekse de yalnız haber sayısına bakarak benzinli araçlardan daha sık yandıklarını söylemek doğru olmaz. Asıl fark, bir batarya yangınının söndürülmesinin daha uzun sürebilmesi ve yeniden alevlenme riski taşımasıdır. Satın alırken modelin güncel güvenlik değerlendirmesine, batarya garantisine ve üreticinin geri çağırma kayıtlarına bakmak daha sağlıklı olur.";
    if (/ekspertiz|raporunda.*dikkat/u.test(normalized)) return "Ekspertizde şasi ve taşıyıcı parçaları, değişen-boyalı panelleri, airbag durumunu, motor-şanzıman kaçaklarını, fren ve süspansiyonu, elektronik arızaları ve kilometre tutarlılığını birlikte kontrol ettir. Raporu satıcının yönlendirdiği yer yerine bağımsız ve kurumsal bir noktadan almak, bakım kayıtlarıyla hasar geçmişini ayrıca doğrulamak daha güvenlidir. Bu genel bilgiyi verebilirim; araç seçiminde ise yalnızca satıştaki sıfır araç kataloğuyla çalışıyorum.";
    if (/bagaj/iu.test(text) && /(?:en geniş|en büyük)/iu.test(text)) return "En geniş bagajlı araç tek bir modelle cevaplanamaz; karşılaştırma gövde sınıfına ve koltukların kullanım durumuna göre değişir. Kaç kişilik kullanım ve hangi gövde yapısı gerektiğini söylersen aktif sıfır araç kataloğunda bagajı güçlü seçenekleri karşılaştırabilirim.";
    if (/ötv|engelli/iu.test(text)) return "ÖTV muafiyeti limiti ve uygunluk koşulları mevzuatla değişebildiği için güncel tutarı burada kesinleştirmem doğru olmaz. Güncel sınırı Gelir İdaresi veya yetkili satıcıdan doğruladıktan sonra, o üst sınıra uyan sıfır araçları katalogda birlikte değerlendirebiliriz.";
    if (/piyasa/iu.test(text) && /(?:fiyat|düşer|yüksel)/iu.test(text)) return "Araç fiyatlarının yönünü kesin tahmin etmek mümkün değil; kur, vergi, kredi koşulları, stok ve kampanyalar birlikte etkiliyor. Alımı yakın zamanda düşünüyorsan tahmin kovalamak yerine net bütçene uyan sıfır araçları ve toplam kullanım maliyetini karşılaştırmak daha sağlıklı olur.";
    if (/suv/iu.test(text) && /hatchback/iu.test(text) && /yak/iu.test(text)) return "Çoğu benzer motorlu karşılaştırmada SUV, daha ağır ve hava direnci daha yüksek olduğu için hatchbackten fazla yakar. Farkın büyüklüğü aracın ölçüsü, motoru, hibrit sistemi, sürüş hızı ve şehir içi kullanım oranına bağlıdır; aynı sınıf ve güçteki modelleri karşılaştırmak gerekir.";
    if (/batarya(?:sının)?\s+ömr/iu.test(text)) return "Elektrikli araç bataryası bir anda ömrünü tamamlamak yerine kapasitesini yıllar içinde yavaşça kaybeder. Gerçek dayanım iklim, hızlı şarj sıklığı, kullanım ve batarya yönetimine bağlıdır; seçimde kilometre tahmini yerine üreticinin batarya garantisini ve garanti sonundaki kapasite eşiğini karşılaştırmak daha güvenlidir.";
    if (/değer kaybet|değer kayb/iu.test(text)) return "Değer kaybını marka adına tek başına bağlamamak gerekir. Talebi güçlü gövde tipi, yaygın servis ağı, makul işletme maliyeti, güvenilirlik algısı, güvenlik donanımı ve piyasada kabul gören motor-şanzıman seçimi birlikte etkiler; yine de gelecekteki ikinci el değerinin garantisi yoktur.";
    if (/benzinli/iu.test(text) && /dizel/iu.test(text)) return "Az kilometre ve kısa şehir içi kullanımda benzinli genellikle daha sade ve mantıklı; düzenli uzun yol ve yüksek kilometrede dizelin tüketim avantajı öne çıkabilir. Kararı yıllık kilometre, rota, bakım maliyeti ve iki aracın satın alma fiyatı farkıyla birlikte vermek gerekir.";
    if (/şanzıman tür|otomatik vites/iu.test(text) && /fark/iu.test(text)) return "Tork konvertörlü otomatikler akıcı kullanımıyla, çift kavramalılar hızlı geçişleriyle, CVT'ler sarsıntısız ve verimli karakteriyle öne çıkar; robotize tek kavramalılar ise daha ekonomik olabilir ama geçişleri daha belirgindir. Dayanıklılık yalnız türden değil, ilgili şanzımanın tasarımı ve bakımından da etkilenir.";
    if (/kasko|sigorta/iu.test(text) && /maliyet|fark/iu.test(text)) return "Evet, kasko maliyeti araçlar arasında belirgin değişebilir. Araç değeri, parça ve onarım maliyeti, güvenlik sistemleri, sürücünün hasar geçmişi, şehir ve poliçe kapsamı fiyatı etkiler; kesin kıyas için aynı sürücü bilgileri ve aynı teminatlarla teklif almak gerekir.";
    if (/en çok satan/iu.test(text)) return "'En çok satan' sonuç ülkeye ve döneme göre değişir; canlı satış verisini doğrulamadan tek bir model söylemem doğru olmaz. Türkiye için hangi yıl veya ayı kastettiğini belirtirsen güncel ve resmî satış verisiyle kontrol etmek gerekir.";
    if (/10\.?000\s*km/iu.test(text) && /yakıt/iu.test(text)) return "Yılda 10 bin kilometrede tek başına dizelin tüketim avantajı, daha yüksek satın alma ve bakım farkını her zaman karşılamayabilir. Kısa şehir içi rotalarda benzinli veya hibrit; düzenli şarj imkânı varsa elektrikli de mantıklı olabilir. En doğru kıyas rota dağılımı ve enerji fiyatlarıyla toplam yıllık maliyet üzerinden yapılır.";
    if (/alman/iu.test(text) && /japon/iu.test(text)) return "Ülke adına göre 'daha sorunsuz' hükmü vermek yanıltıcı olur; aynı markanın modelleri ve motor-şanzımanları arasında bile ciddi fark vardır. Güvenilirlik geçmişi, garanti, servis yaygınlığı, parça maliyeti ve seçilen varyantın bilinen sorunları model bazında karşılaştırılmalı.";
    if (/(?:ikinci\s*el|2\.?\s*el)/u.test(normalized) && /km|kilometre/u.test(normalized)) return "İkinci elde tek bir güvenli kilometre sınırı yoktur; düzenli bakılmış uzun yol aracı, ihmal edilmiş düşük kilometreli araçtan daha sağlıklı olabilir. Yaş-kilometre uyumu, bakım kayıtları, kullanım türü ve bağımsız ekspertiz birlikte değerlendirilmelidir. Araç seçimi tarafında ise yalnızca satıştaki sıfır araç kataloğuyla çalışıyorum.";
    if (/önden çekiş|arkadan itiş|fwd|rwd/iu.test(text)) return "Önden çekişte motor gücü ön tekerleklere gider; günlük kullanımda pratik ve öngörülebilirdir. Arkadan itişte güç arka tekerleklere gider; direksiyon hissi ve denge karakteri farklı olabilir. Bunu bir satın alma tercihi olarak kaydetmiyorum.";
    return "Bu soruya şu anda yeterince güvenilir ve somut bir yanıt veremiyorum. İstersen konuyu biraz daha daralt; örneğin hangi yakıt türlerini veya hangi kullanım koşulunu karşılaştırdığını söyle.";
  }
  if (route === "SOCIAL_CONVERSATION") {
    if (/(?:ne işe yar|yardımcı oluyor|oto galeri|kimsiniz|nesiniz)/iu.test(text)) return "Ben Expiya Cars araç seçim danışmanıyım. Satıştaki sıfır araçları ihtiyacına ve bütçene göre tarafsız biçimde karşılaştırmana yardımcı olurum; satış veya kapora işlemi yapmam.";
    if (/orada kimse/iu.test(text)) return "Evet, buradayım. Size nasıl yardımcı olabilirim?";
    if (/(?:müsait|vaktiniz|danışabileceğim|bağlandım|nasılsın)/iu.test(text)) return "Merhaba! Nasıl yardımcı olabilirim?";
    if (/günaydın/u.test(normalized)) return "Günaydın! Nasıl yardımcı olabilirim?";
    if (/iyi akşamlar/u.test(normalized)) return "İyi akşamlar! Nasıl yardımcı olabilirim?";
    if (/piyasa.*takip/u.test(normalized)) return "Araç piyasasıyla ilgili genel sorularını konuşabiliriz; araç seçimi yapacaksan aktif sıfır araç kataloğundan ilerleriz.";
    return observationTurns >= 4 ? "Memnun oldum. Bir araç seçmeyi düşünüyorsan sana yardımcı olabilirim; düşünmüyorsan burada bırakabiliriz." : "Merhaba! Nasıl yardımcı olabilirim?";
  }
  if (route === "OFF_TOPIC_REQUEST") return observationTurns >= 4 ? "Bu konuda net bir değerlendirme yapmak için yeterli bilgim yok. Araç seçmek istersen memnuniyetle yardımcı olurum." : /telefon numarası|sesli konuş/iu.test(text) ? "Telefon numarası paylaşamıyorum; buradan yazarak yardımcı olabilirim. Bir araç seçmek istersen ihtiyacını anlatman yeterli." : /ehliyet sınav/iu.test(text) ? "Resmî soru havuzuna erişemiyorum; güncel içerik için MEB kaynaklarını kontrol etmelisin. Araç seçmeye geçtiğinde de buradayım." : /sınav/iu.test(text) ? "Umarım sınav güzel geçer; şimdiden başarılar. Sonrasında araç seçmek istersen buradayım." : /en sevdiğin renk/iu.test(text) ? "Benim kişisel bir favori rengim yok; ama araç seçiminde rengin görünürlük, bakım ve ikinci el etkisini konuşabiliriz." : /hangi takım/iu.test(text) ? "Takım tutmuyorum; araç seçimi tarafında ise senin takımındayım." : /yapay zeka|arkada biri/iu.test(text) ? "Evet, ben bir yapay zekâyım; arkada gerçek zamanlı yazan biri yok. Araç seçimini birlikte ilerletebiliriz." : /şiir/iu.test(text) ? "Şiir yazabilirim; ama direksiyon başında en iyi kafiyem ihtiyaç, bütçe ve doğru araç olur. Araç seçmek istersen başlayalım." : /hayatın anlamı/iu.test(text) ? "Büyük soru. Benim uzmanlık alanım daha dar: doğru aracı doğru ihtiyaçla buluşturmak. İstersen oradan başlayalım." : /maç/iu.test(text) ? "Maçı izleyemem ama belli ki konuşulacak bir akşammış." : /telefon|iphone|samsung/iu.test(text) ? "Telefon seçimi kullanımına ve bütçene bağlı; burada otomobil seçimi konusunda daha güçlü yardımcı olabilirim." : /fıkra/iu.test(text) ? "Kısa bir tane: Araba neden bilgisayara gitmiş? Çünkü motorunda bir sürü ‘bug’ varmış. Araç seçimine dönmek istersen buradayım." : /hava|sıcak|soğuk/iu.test(text) ? "Umarım günün rahat geçer. Araç seçimine dönmek istersen buradayım." : "Bu konuda uzman değilim; araç seçimiyle ilgili bir şey sorarsan memnuniyetle yardımcı olurum.";
  if (route === "CLOSING_OR_TERMINATION") return "Anlaştık, görüşmek üzere.";
}

function automotiveConcernReply(text: string): string | undefined {
  if (/elektrikli/iu.test(text) && /şarj/iu.test(text) && /(?:düşündür|endişe|çekin|kaygı|sorun|merak)/iu.test(text)) return "Elektrikli araçta şarj rahatlığı günlük yaptığın mesafeye ve evde ya da işte düzenli şarj imkânına bağlı. Sabit bir şarj noktan varsa günlük kullanım genellikle kolaylaşır; yalnızca halka açık istasyonlara bağlı kalacaksan rota ve bekleme süresi daha önemli olur.";
  if (/elektrikli/iu.test(text) && /yan(?:gın|ıyor)|alev|güvenli|patla/iu.test(text)) return "Elektrikli araçların batarya yangınları çok dikkat çekse de yalnız haber sayısına bakarak benzinli araçlardan daha sık yandıklarını söylemek doğru olmaz. Asıl fark, bir batarya yangınının söndürülmesinin daha uzun sürebilmesi ve yeniden alevlenme riski taşımasıdır. Satın alırken modelin güncel güvenlik değerlendirmesine, batarya garantisine ve üreticinin geri çağırma kayıtlarına bakmak daha sağlıklı olur.";
}

const preferenceLabel = (preference: ReturnType<typeof activeDecisionPreferences>[number]) => {
  if (preference.concept === "equipmentFeature") { const labels: Readonly<Record<string, string>> = { REAR_VIEW_CAMERA: "geri görüş kamerası", SURROUND_VIEW_CAMERA_360: "360 derece kamera", PARKING_SENSORS: "park sensörleri", AUTOMATIC_PARK_ASSIST: "otomatik park asistanı", ADAPTIVE_CRUISE_CONTROL: "adaptif hız sabitleme", BLIND_SPOT_MONITOR: "kör nokta uyarısı", ISOFIX_REAR_OUTER: "ISOFIX", KEYLESS_START: "anahtarsız çalıştırma" }; return labels[String(preference.normalizedValue)] ?? "istenen donanım"; }
  if (preference.concept === "budgetMax") return `${Number(preference.normalizedValue).toLocaleString("tr-TR")} TL bütçe üst sınırı`;
  if (preference.concept === "transmission") return preference.normalizedValue === "MANUAL" ? "manuel vites" : "otomatik vites";
  if (preference.concept === "fuelType") return `${String(preference.normalizedValue).toLocaleLowerCase("tr-TR")} yakıt tercihi`;
  if (preference.concept === "modelPreference") return `${(Array.isArray(preference.normalizedValue) ? preference.normalizedValue : [preference.normalizedValue]).join(" veya ")} model tercihi`;
  if (preference.concept === "brandPreference") return `${(Array.isArray(preference.normalizedValue) ? preference.normalizedValue : [preference.normalizedValue]).join(" veya ")} marka tercihi`;
  return preference.concept;
};

async function noMatchReply(ledger: V3ConversationState["ledger"]): Promise<string> {
  const hard = activeDecisionPreferences(ledger).filter((item) => item.decisionUse === "HARD_FILTER");
  const restoring: ReturnType<typeof activeDecisionPreferences>[number][] = [];
  for (const preference of hard) {
    try {
      const relaxed = await evaluateV3Catalog(ledger.filter((item) => item.concept !== preference.concept));
      if (relaxed.variants.length > 0) restoring.push(preference);
    } catch { /* bounded explanation fallback */ }
  }
  if (!restoring.length) return "Bu koşulların tümünü karşılayan satıştaki bir varyant bulamadım. İstersen hangi tercihin esneyebileceğini birlikte belirleyelim.";
  const labels = restoring.slice(0, 2).map(preferenceLabel).join(" veya ");
  return `Bu koşulların tümünü karşılayan satıştaki bir varyant bulamadım. Aday havuzunu sıfıra indiren koşul ${labels}; bunlardan biri esneyebilir mi?`;
}

function questionCanReduceCandidates(key: string, variants: readonly CatalogVariantSnapshot[] | undefined): boolean {
  if (!variants || variants.length < 2) return variants === undefined;
  if (key === "primaryUsage") return new Set(variants.flatMap((item) => item.decisionFacts.vehicleUseClass?.value ? [item.decisionFacts.vehicleUseClass.value] : [])).size > 1;
  if (key === "bodyStyle") return new Set(variants.map((item) => item.decisionFacts.bodyStyle.value)).size > 1;
  if (key === "fuelType") return new Set(variants.map((item) => item.decisionFacts.powertrain.fuelType.value)).size > 1;
  if (key === "budget" || key === "exactBudget") return new Set(variants.flatMap((item) => item.activeNewPrice ? [item.activeNewPrice.amountTry] : [])).size > 1;
  if (key.endsWith("Equipment")) return variants.length > 1;
  return true;
}

function selectQuestion(state: V3ConversationState, variants?: readonly CatalogVariantSnapshot[]): { key: string; text: string } | undefined {
  if (state.pendingConfirmation) return { key: `confirm:${state.pendingConfirmation.concept}`, text: state.pendingConfirmation.question };
  const keys = new Set(state.askedQuestionKeys);
  const exactModelSelected = active(state, "modelPreference");
  if (exactModelSelected) {
    const selectedModels = latestActiveLedgerEvent(state.ledger, "modelPreference")?.normalizedValue;
    if (Array.isArray(selectedModels) && selectedModels.length > 1 && (variants?.length ?? 0) > 1 && !keys.has("modelTradeoff")) return { key: "modelTradeoff", text: "Bu modeller arasında karar verirken daha erişilebilir bütçe ve kolay kullanım mı, yoksa daha geniş yaşam alanı ve yüksek konfor mu ağır bassın?" };
    const budgetKnown = latestActiveLedgerEvent(state.ledger, "budgetMax") || latestActiveLedgerEvent(state.ledger, "budgetTarget") || latestActiveLedgerEvent(state.ledger, "budgetNotImportant") || latestActiveLedgerEvent(state.ledger, "budgetUnspecified");
    if (!budgetKnown && !keys.has("budget") && questionCanReduceCandidates("budget", variants)) return { key: "budget", text: "Bu modelin uygun varyantını seçebilmem için satın alma bütçenin üst sınırı nedir?" };
    return undefined;
  }
  const body = latestActiveLedgerEvent(state.ledger, "bodyStyle")?.normalizedValue;
  const usage = latestActiveLedgerEvent(state.ledger, "primaryUsage")?.normalizedValue;
  if (!active(state, "primaryUsage") && body === "COUPE" && !keys.has("coupePracticality")) return { key: "coupePracticality", text: "Coupe seçimin net; günlük kullanımda arka koltuk ve bagaj alanından ne kadar ödün verebilirsin?" };
  if (!active(state, "primaryUsage") && !keys.has("primaryUsage") && questionCanReduceCandidates("primaryUsage", variants)) return { key: "primaryUsage", text: "Aracı en çok hangi günlük ihtiyaç için kullanacaksın?" };
  if (usage === "MIXED_ROAD" && !active(state, "bodyStyle") && !keys.has("mixedRoadBody")) return { key: "mixedRoadBody", text: "Arazi ve 4x4 kullanımı net; kapalı bagajlı bir SUV mu, yoksa açık kasalı bir pick-up mı sana daha uygun?" };
  const bodyResolved = active(state, "bodyStyle") || Boolean(latestActiveLedgerEvent(state.ledger, "bodyNotImportant"));
  const usageResolvedForPlanning = active(state, "primaryUsage") || !questionCanReduceCandidates("primaryUsage", variants);
  for (const key of usageQuestionOrder(typeof usage === "string" ? usage : undefined)) {
    if (questionIsResolved(state, key)) continue;
    if (key === "budget" && (!usageResolvedForPlanning || !bodyResolved)) continue;
    if (!questionCanReduceCandidates(key, variants)) continue;
    return { key, text: usageQuestionText(key) };
  }
  if (usage === "COMMERCIAL" && !active(state, "bodyStyle") && !keys.has("commercialConfiguration")) return { key: "commercialConfiguration", text: "Ticari kullanım net; ağırlıkla yük mü taşıyacaksın, yoksa yolcu ve yükü birlikte mi?" };
  if (latestActiveLedgerEvent(state.ledger, "budgetTarget") && !latestActiveLedgerEvent(state.ledger, "budgetMax") && !keys.has("exactBudget") && questionCanReduceCandidates("exactBudget", variants)) return { key: "exactBudget", text: "Son elemede kullanmam için aşmak istemediğin kesin bütçe üst sınırı nedir?" };
  if (latestActiveLedgerEvent(state.ledger, "budgetNotImportant") && !latestActiveLedgerEvent(state.ledger, "brandModelPreference") && !state.finalBrandModelQuestionAsked) return { key: "brandModel", text: "Marka veya model olarak özellikle yakın hissettiğin bir seçenek var mı?" };
}

export async function runV3Turn(input: { readonly conversationId: string; readonly messageId: string; readonly message: string; readonly expectedRevision: number; readonly state?: V3ConversationState; readonly signal?: AbortSignal }): Promise<V3PublicResponse> {
  const prior = input.state ?? createV3ConversationState(input.conversationId);
  if (prior.conversationId !== input.conversationId || prior.version !== "3.8") throw new TypeError("V3_STATE_BINDING_INVALID");
  const hash = fingerprint(input.message);
  if (prior.processedMessages[input.messageId]) {
    if (prior.processedMessages[input.messageId] !== hash) throw new TypeError("V3_MESSAGE_PAYLOAD_CONFLICT");
    return { kind: "V3_CONVERSATION", message: "Bu mesaj daha önce işlendi; konuşma durumu değişmedi.", state: prior };
  }
  if (prior.revision !== input.expectedRevision) throw new TypeError("V3_REVISION_CONFLICT");
  const semantic = await interpretV31Message({ message: input.message, hasPurchaseIntent: !["NOT_EXPRESSED", "POSSIBLE", "ENDED_WITHOUT_INTENT"].includes(prior.purchaseIntent), hasOpenQuestion: Boolean(prior.lastQuestionKey), signal: input.signal });
  let catalogEntities: Awaited<ReturnType<typeof resolveV3CatalogEntities>> = { brands: [], models: [] };
  try { catalogEntities = await resolveV3CatalogEntities(input.message); } catch { /* bounded catalog entity fallback */ }
  const entityBackedPurchase = (catalogEntities.brands.length > 0 || catalogEntities.models.length > 0) && /(?:satın|alacağ|alacağız|alabileceğ|alımı|almak|almayı|arıyor|arıyorum|bakıyor|bakıyorum|yazıyorum|teklif|kapat|kapora|niyet|planlıyor|kafaya koy|hazırım|var mı)/iu.test(input.message);
  const router = entityBackedPurchase && ["SOCIAL_CONVERSATION", "OFF_TOPIC_REQUEST", "VEHICLE_PREFERENCE_UPDATE", "QUESTION_ANSWER", "AUTOMOTIVE_INFORMATION"].includes(semantic.router.route)
    ? { ...semantic.router, route: "PURCHASE_INTENT_DISCOVERY" as const, confidence: 0.98, decisionMutationAllowed: true, catalogEvaluationRequired: true, directAnswerRequired: false, purchaseIntentEvidence: [{ start: 0, end: input.message.length, text: input.message }], conversationReason: "Catalog entity with explicit purchase language", clarificationRequirement: null }
    : semantic.router;
  const scopeReply = productScopeReply(input.message);
  const observationTurns = prior.intentObservationTurns + (["SOCIAL_CONVERSATION", "OFF_TOPIC_REQUEST"].includes(router.route) ? 1 : 0);
  const purchaseIntent = nextIntent(prior.purchaseIntent, router.route, observationTurns, prior.lastQuestionKey, input.message, semantic.purchaseIntentAssessment);
  const acceptedBrandRelaxation = prior.pendingAction === "RELAX_BRAND_FOR_POWERTRAIN" && /(?:evet|olur|tamam|esnet|başka marka|marka fark etmez|seçelim)/iu.test(input.message);
  let ledger = prior.ledger; let pendingConfirmation = prior.pendingConfirmation;
  if (router.decisionMutationAllowed && scopeReply?.kind !== "USED_VEHICLE_SELECTION") ({ ledger, pending: pendingConfirmation } = applyPreferenceMessage(prior, input.messageId, input.message));
  if (router.decisionMutationAllowed && scopeReply?.kind !== "USED_VEHICLE_SELECTION") {
    ledger = applyCatalogEntitySignals(prior, ledger, input.messageId, input.message, catalogEntities);
  }
  ledger = applySemanticContextSignals(prior, ledger, input.messageId, semantic.contextSignals);
  const base: V3ConversationState = { ...prior, revision: prior.revision + 1, processedMessages: { ...prior.processedMessages, [input.messageId]: hash }, purchaseIntent, intentObservationTurns: observationTurns, ledger, pendingConfirmation, ended: purchaseIntent === "ENDED_WITHOUT_INTENT", lastRoute: router.route, pendingAction: acceptedBrandRelaxation ? undefined : prior.pendingAction, finalBrandModelQuestionAsked: prior.finalBrandModelQuestionAsked || prior.lastQuestionKey === "brandModel" };
  const recommendationRequested = router.route === "RECOMMENDATION_OR_OFFER" || /(?:tek araç|alternatif|öner(?:i|ini|inizi)?|seç(?:elim|ebilirsin| lütfen)?|göster|paylaş)/iu.test(input.message);
  let catalog: Awaited<ReturnType<typeof evaluateV3Catalog>> | undefined;
  if (["EXPLICIT", "ACTIVE_DISCOVERY", "READY_FOR_DECISION"].includes(purchaseIntent) || router.catalogEvaluationRequired || recommendationRequested || prior.pendingAction === "RELAX_BRAND_FOR_POWERTRAIN") try { catalog = await evaluateV3Catalog(ledger); } catch { catalog = undefined; }
  const concernDirect = automotiveConcernReply(input.message);
  const fallbackDirect = directReply(semantic.messageActs.includes("AUTOMOTIVE_QUESTION") ? "AUTOMOTIVE_INFORMATION" : router.route, input.message, observationTurns) ?? concernDirect;
  const modelDirect = semantic.directResponse && isTurkishPublicCopy(semantic.directResponse) ? semantic.directResponse : undefined;
  const modelDirectIsRefusal = /(?:yeterince güvenilir|yönlendirme yapamam|yardımcı olamam|bilgi veremem)/iu.test(modelDirect ?? "");
  const direct = router.route === "SOCIAL_CONVERSATION" ? fallbackDirect ?? modelDirect : modelDirect && !(modelDirectIsRefusal && fallbackDirect) ? modelDirect : fallbackDirect;
  if (scopeReply) {
    const followUp = ["EXPLICIT", "ACTIVE_DISCOVERY"].includes(purchaseIntent) ? selectQuestion(base, catalog?.variants) : undefined;
    return { kind: "V3_CONVERSATION", message: followUp ? `${scopeReply.message} ${contextualQuestion(base, followUp.key, followUp.text)}` : scopeReply.message, state: { ...base, ...(followUp ? { askedQuestionKeys: [...new Set([...base.askedQuestionKeys, followUp.key])], lastQuestionKey: followUp.key } : { lastQuestionKey: undefined }) } };
  }
  const gratitudeAfterAutomotiveInfo = prior.lastRoute === "AUTOMOTIVE_INFORMATION" && /(?:teşekkür|sağ ol|bilgi için)/iu.test(input.message);
  if (gratitudeAfterAutomotiveInfo) return { kind: "V3_CONVERSATION", message: "Rica ederim. Elektrikli araç fikri sende yalnızca merak mı uyandırıyor, yoksa kendi günlük kullanımın için değerlendirmeye açık mısın?", state: { ...base, askedQuestionKeys: [...new Set([...base.askedQuestionKeys, "purchaseInterest"])], lastQuestionKey: "purchaseInterest" } };
  if (prior.lastQuestionKey === "purchaseInterest" && /(?:sadece|yalnızca) merak|merak ettim|şimdilik düşünmüyorum/iu.test(input.message)) return { kind: "V3_CONVERSATION", message: "Elbette, merakını gidermek de yeterli. İleride kendi kullanımın için değerlendirmek istersen kaldığımız yerden devam ederiz.", state: { ...base, lastQuestionKey: undefined } };
  if (prior.pendingConfirmation?.concept === "valueEconomy" && /(?:bilmiyorum|sence|sen söyle|sen seç)/iu.test(input.message)) {
    const followUp = selectQuestion(base);
    const advice = "Satış ekibi müşteri ziyaretlerinde düzenli kilometre yapacağı için toplam kullanım giderini biraz daha öne koymak mantıklı. Satın alma fiyatını da bütçe sınırı olarak koruyalım.";
    return { kind: "V3_CONVERSATION", message: followUp ? `${advice} ${followUp.text}` : advice, state: { ...base, ...(followUp ? { askedQuestionKeys: [...new Set([...base.askedQuestionKeys, followUp.key])], lastQuestionKey: followUp.key } : { lastQuestionKey: undefined }) } };
  }
  if (direct) {
    const followUp = (router.route === "AUTOMOTIVE_INFORMATION" || semantic.messageActs.includes("AUTOMOTIVE_QUESTION") || Boolean(concernDirect)) && ["EXPLICIT", "ACTIVE_DISCOVERY"].includes(purchaseIntent) ? selectQuestion(base, catalog?.variants) : undefined;
    if (followUp) return { kind: "V3_CONVERSATION", message: `${direct} Seçimini netleştirmeye devam edelim: ${contextualQuestion(base, followUp.key, followUp.text)}`, state: { ...base, askedQuestionKeys: [...new Set([...base.askedQuestionKeys, followUp.key])], lastQuestionKey: followUp.key } };
    if (router.route === "AUTOMOTIVE_INFORMATION" && purchaseIntent === "NOT_EXPRESSED" && !base.askedQuestionKeys.includes("purchaseInterest")) {
      return { kind: "V3_CONVERSATION", message: `${direct} Bunu yalnızca bilgi için mi soruyorsun, yoksa kendi kullanımın için bir araç seçmeyi de düşünüyor musun?`, state: { ...base, askedQuestionKeys: [...base.askedQuestionKeys, "purchaseInterest"], lastQuestionKey: "purchaseInterest" } };
    }
    return { kind: "V3_CONVERSATION", message: direct, state: { ...base, lastQuestionKey: undefined } };
  }
  const offerConsent = Boolean(prior.pendingOffer) && /(?:göster|paylaş|evet|onaylıyorum|hazırım)/iu.test(input.message);
  if (offerConsent && prior.pendingOffer) {
    const current = await evaluateV3Catalog(ledger); const ranked = rankV3Candidates(current.variants, ledger);
    const bound = ranked.filter((variant) => prior.pendingOffer!.candidateIds.includes(variant.id));
    if (bound.length !== prior.pendingOffer.candidateIds.length) throw new TypeError("V31_OFFER_DECISION_CHANGED");
    revealV31Offer({ conversationId: prior.conversationId, token: prior.pendingOffer.token, candidateIds: prior.pendingOffer.candidateIds });
    return { kind: "V3_CONVERSATION", message: bound.length === 1 ? "Karar motorunun seçtiği aracı paylaşıyorum." : "Karar motorunun seçtiği üç aracı paylaşıyorum.", state: { ...base, purchaseIntent: "READY_FOR_DECISION", pendingOffer: undefined, lastQuestionKey: undefined }, recommendations: bound.map((variant) => ({ id: variant.id, title: `${variant.brand} ${variant.model} ${variant.trim}`, ...(v35EquipmentSelectionWarning(variant, ledger) ? { warning: v35EquipmentSelectionWarning(variant, ledger) } : {}) })) };
  }
  const valueFallbackRequested = prior.lastQuestionKey === "brandModel" && /(?:bilmiyorum|fark etmez|sen seç|yok|istemiyorum|alternatif|öner|göster|seç)/iu.test(input.message);
  if (!catalog && valueFallbackRequested) try { catalog = await evaluateV3Catalog(ledger); } catch { catalog = undefined; }
  const budgetKnown = latestActiveLedgerEvent(ledger, "budgetMax") || latestActiveLedgerEvent(ledger, "budgetTarget") || latestActiveLedgerEvent(ledger, "budgetNotImportant") || latestActiveLedgerEvent(ledger, "budgetUnspecified");
  const bodyResolved = active(base, "bodyStyle") || Boolean(latestActiveLedgerEvent(ledger, "bodyNotImportant"));
  const brandPreference = latestActiveLedgerEvent(ledger, "brandPreference"); const fuelPreference = latestActiveLedgerEvent(ledger, "fuelType");
  if (!acceptedBrandRelaxation && catalog?.variants.length === 0 && brandPreference && fuelPreference && (recommendationRequested || prior.pendingAction === "RELAX_BRAND_FOR_POWERTRAIN")) {
    const fuelLabel = fuelPreference.normalizedValue === "BEV" ? "tam elektrikli" : String(fuelPreference.normalizedValue).toLocaleLowerCase("tr");
    return { kind: "V3_CONVERSATION", message: `${brandPreference.normalizedValue} tercihini ve ${fuelLabel} isteğini net aldım. Aktif katalogda bu ikisini birlikte karşılayan satıştaki bir varyant bulunmuyor. ${fuelLabel.charAt(0).toLocaleUpperCase("tr") + fuelLabel.slice(1)} tercihini koruyup markayı esnetelim mi?`, state: { ...base, pendingAction: "RELAX_BRAND_FOR_POWERTRAIN", askedQuestionKeys: [...new Set([...base.askedQuestionKeys, "catalogBrandRelaxation"])], lastQuestionKey: "catalogBrandRelaxation" } };
  }
  if (recommendationRequested && !budgetKnown && base.askedQuestionKeys.includes("budget") && !base.askedQuestionKeys.includes("exactBudget")) {
    const text = "Seçenekleri gerçekten bütçene uygun tutabilmem için aşmak istemediğin yaklaşık bir üst sınır var mı? Yoksa bütçeyi şimdilik serbest bırakabiliriz.";
    return { kind: "V3_CONVERSATION", message: text, state: { ...base, askedQuestionKeys: [...new Set([...base.askedQuestionKeys, "exactBudget"])], lastQuestionKey: "exactBudget" } };
  }
  const exactModelSelected = active(base, "modelPreference");
  if (recommendationRequested && ((!exactModelSelected && (!active(base, "primaryUsage") || !bodyResolved || !budgetKnown)) || (exactModelSelected && !budgetKnown))) {
    const readinessQuestion = selectQuestion(base, catalog?.variants);
    if (readinessQuestion) return { kind: "V3_CONVERSATION", message: `Doğru tek aracı seçebilmem için bir noktayı netleştirelim. ${contextualQuestion(base, readinessQuestion.key, readinessQuestion.text)}`, state: { ...base, askedQuestionKeys: [...new Set([...base.askedQuestionKeys, readinessQuestion.key])], lastQuestionKey: readinessQuestion.key } };
  }
  if (recommendationRequested && !valueFallbackRequested && (catalog?.variants.length ?? 0) > 3 && !active(base, "equipmentFeature") && !base.askedQuestionKeys.includes("decisionDifferentiator")) {
    const text = "Seçimi yalnız fiyata bırakmayalım: günlük kullanımda vazgeçmek istemeyeceğin tek bir özellik hangisi; örneğin geri görüş kamerası, park sensörleri veya uzun yolda mesafeyi koruyan hız sabitleme?";
    return { kind: "V3_CONVERSATION", message: text, state: { ...base, askedQuestionKeys: [...new Set([...base.askedQuestionKeys, "decisionDifferentiator"])], lastQuestionKey: "decisionDifferentiator" } };
  }
  if ((recommendationRequested || valueFallbackRequested) && catalog?.variants.length) {
    const limit: 1 | 3 = valueFallbackRequested || /alternatif/iu.test(input.message) ? 3 : 1; const ranked = rankV3Candidates(catalog.variants, ledger).slice(0, limit);
    const decisionFingerprint = createHash("sha256").update(JSON.stringify(activeDecisionPreferences(ledger).map(({ concept, normalizedValue, decisionUse }) => ({ concept, normalizedValue, decisionUse })))).digest("hex");
    const governed = createV31Offer({ conversationId: prior.conversationId, variants: ranked, catalogReleaseVersion: catalog.catalogReleaseVersion, catalogFingerprint: catalog.catalogFingerprint, decisionFingerprint, limit });
    const usageLead = dailyUsageContext(base);
    return { kind: "V3_CONVERSATION", message: limit === 1 ? `${usageLead} tek seçimi hazırladım. Göstermemi ister misin?` : valueFallbackRequested ? `${usageLead}, marka veya model yönlendirmesi olmadan değer dengesi en güçlü üç seçimi hazırladım. Göstermemi ister misin?` : `${usageLead} üç seçimi hazırladım. Göstermemi ister misin?`, state: { ...base, pendingOffer: { offerId: governed.offer.offerId, token: governed.token, candidateIds: ranked.map((item) => item.id), limit }, lastQuestionKey: "offerConsent" }, offerAwaitingConsent: true };
  }
  const question = ["EXPLICIT", "ACTIVE_DISCOVERY"].includes(purchaseIntent) ? selectQuestion(base, catalog?.variants) : undefined;
  const normalizedMessage = input.message.toLocaleLowerCase("tr");
  const boundedPurchaseAcknowledgement = /moralim.*bozuk/iu.test(input.message) ? "Moral bozukluğunu anladım; bari araç seçimini keyifli ve mantıklı bir karara çevirelim."
    : /hanımla kavga|baskı yapıyor/iu.test(input.message) ? "Evdeki otomobil gündemi iyice ciddileşmiş; seçimi sakin ve doğru ölçütlerle toparlayalım."
    : /fıkra gibi bir piyasa/iu.test(input.message) ? "Piyasa kısmı gerçekten fıkra gibi; finali doğru araçla bağlayalım."
    : /chatbotlar.*yardımcı olamıyor/iu.test(input.message) ? "Bu kez şansını boşa çıkarmayalım; verdiğin koşullarla doğrudan ilerleyelim."
    : /otobüs|toplu taşıma/iu.test(input.message) ? "Toplu taşıma sabrını tüketmiş; seni gerçekten rahatlatacak seçeneği bulalım."
    : /arkadaşım dürtükledi/iu.test(input.message) ? "Arkadaş dürtmesiyle başlayan konu ciddi bir alıma dönmüş; acele etmeden doğru aracı bulalım."
    : /(?:hangi araçlar|araçlarınız neler)/iu.test(input.message)
    ? "Binek, SUV, elektrikli, hibrit ve ticari kullanıma uygun farklı seçeneklerimiz var; sana uygun olan gruptan başlayalım."
    : /ehliyet/u.test(normalizedMessage) && /ilk arac[ıi]m[ıi]/u.test(normalizedMessage) ? "Tebrik ederim; ehliyetini alıp ilk aracını araştırmaya başlamak gerçekten heyecanlı bir adım." : "Harika, ihtiyacını birlikte netleştirelim.";
  const prefix = router.route === "PURCHASE_INTENT_DISCOVERY" ? semantic.acknowledgement && isTurkishPublicCopy(semantic.acknowledgement) ? semantic.acknowledgement : boundedPurchaseAcknowledgement : router.route === "CORRECTION_OR_RELAXATION" ? "Tamam, önceki tercihi güncelledim; seçeneklerin yeniden genişlemesi normal." : conversationalAcknowledgement(base);
  if (!question) return { kind: "V3_CONVERSATION", message: catalog?.variants.length === 0 ? await noMatchReply(ledger) : `${prefix} İstersen şimdi sana en uygun aracı seçebilirim.`, state: { ...base, pendingAction: "RECOMMENDATION_DISCOVERY", lastQuestionKey: "recommendationStart" } };
  return { kind: "V3_CONVERSATION", message: `${prefix} ${contextualQuestion(base, question.key, question.text)}`, state: { ...base, askedQuestionKeys: [...new Set([...base.askedQuestionKeys, question.key])], lastQuestionKey: question.key, ...(question.key === "brandModel" ? { finalBrandModelQuestionAsked: true } : {}) } };
}
