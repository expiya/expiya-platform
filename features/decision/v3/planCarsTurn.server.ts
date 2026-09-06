import { activeDecisionPreferences, latestActiveLedgerEvent } from "./ledger";
import { evaluateV3Catalog, planV3VerifiedEquipmentQuestion, rankV3Candidates, scoreV3Candidate } from "./catalogAdapter.server";
import { contextualQuestion, conversationalAcknowledgement, dailyUsageContext, isTurkishPublicCopy } from "./turkishRealization";
import { usageQuestionText } from "./usageQuestionMatrix";
import type { CatalogVariantSnapshot } from "../v2/catalog/types";
import type { BudgetDecisionMode, V3ConversationState, V3PublicResponse } from "./types";
import { projectV3DecisionPreferences } from "./decisionInput";
import { recordAskedQuestion } from "@/features/conversation-kernel/lifecycle";
import { preservePendingQuestion } from "@/features/xpy/lifecycle";
import { detectXpyAdvisoryIntent } from "@/features/xpy/advisory";
import { selectCarsQuestion } from "./carsQuestionPolicy";
import { carsQuestionChoices } from "./carsQuestionChoices";
import { CARS_STAGE_ONE_INVITATION, CARS_STAGE_ONE_ORIENTATION } from "./carsAdvisory";
import type { CarsValidatedContext } from "./carsStages";
const active = (state: V3ConversationState, concept: string) => activeDecisionPreferences(state.ledger).some((item) => item.concept === concept);

function directReply(route: string, text: string, observationTurns: number): string | undefined {
  const normalized = text.toLocaleLowerCase("tr-TR");
  if (route === "SAFETY_BOUNDARY") return "Buna yardımcı olamam. Acil bir tehlike varsa 112'yi ara veya yanında güvendiğin birine hemen haber ver.";
  if (route === "AUTOMOTIVE_INFORMATION") {
    if (/yakıt tür(?:ü|leri).*(?:fark|öner)|(?:benzinli|dizel|hibrit|elektrikli).*(?:hangisi|nasıl seç|fark)/iu.test(text)) return "Benzinli araçlar kısa ve orta mesafede sade bir kullanım sunar; dizel düzenli yüksek kilometre ve uzun yolda tüketim avantajı sağlayabilir; hibrit özellikle şehir içi dur-kalkta verimlidir; elektrikli ise düzenli şarj imkânı varsa sessiz ve düşük kullanım giderli olabilir. Senin anlattığın yoğun şehir içi ve park ağırlıklı kullanımda hibrit güçlü bir başlangıç seçeneği; evde veya işte düzenli şarj edebiliyorsan elektrikliyi de öne alabiliriz.";
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

function supersededBodyReply(prior: V3ConversationState, next: V3ConversationState): string | undefined {
  const before = [...prior.ledger].reverse().find(item => item.concept === "bodyStyle" && item.decisionUse === "HARD_FILTER")?.normalizedValue;
  const after = [...next.ledger].reverse().find(item => item.concept === "bodyStyle" && item.decisionUse === "HARD_FILTER")?.normalizedValue;
  if (!before || !after || JSON.stringify(before) === JSON.stringify(after)) return undefined;
  const label = (value: unknown) => ({ PICKUP: "pick-up", HATCHBACK: "hatchback", SUV: "SUV", SEDAN: "sedan", COUPE: "coupe" }[String(value)] ?? String(value).toLocaleLowerCase("tr-TR"));
  return `Önceki ${label(before)} tercihini ${label(after)} olarak güncelledim; ikisini aynı anda şart saymıyorum.`;
}

function automotiveConcernReply(text: string): string | undefined {
  if (/elektrikli/iu.test(text) && /şarj/iu.test(text) && /(?:düşündür|endişe|çekin|kaygı|sorun|merak)/iu.test(text)) return "Elektrikli araçta şarj rahatlığı günlük yaptığın mesafeye ve evde ya da işte düzenli şarj imkânına bağlı. Sabit bir şarj noktan varsa günlük kullanım genellikle kolaylaşır; yalnızca halka açık istasyonlara bağlı kalacaksan rota ve bekleme süresi daha önemli olur.";
  if (/elektrikli/iu.test(text) && /yan(?:gın|ıyor)|alev|güvenli|patla/iu.test(text)) return "Elektrikli araçların batarya yangınları çok dikkat çekse de yalnız haber sayısına bakarak benzinli araçlardan daha sık yandıklarını söylemek doğru olmaz. Asıl fark, bir batarya yangınının söndürülmesinin daha uzun sürebilmesi ve yeniden alevlenme riski taşımasıdır. Satın alırken modelin güncel güvenlik değerlendirmesine, batarya garantisine ve üreticinin geri çağırma kayıtlarına bakmak daha sağlıklı olur.";
}

const preferenceLabel = (preference: ReturnType<typeof activeDecisionPreferences>[number]) => {
  if (preference.concept === "equipmentFeature") { const labels: Readonly<Record<string, string>> = { REAR_VIEW_CAMERA: "geri görüş kamerası", SURROUND_VIEW_CAMERA_360: "360 derece kamera", PARKING_SENSORS: "park sensörleri", AUTOMATIC_PARK_ASSIST: "otomatik park asistanı", ADAPTIVE_CRUISE_CONTROL: "adaptif hız sabitleme", BLIND_SPOT_MONITOR: "kör nokta uyarısı", ISOFIX_REAR_OUTER: "ISOFIX", KEYLESS_START: "anahtarsız çalıştırma" }; return labels[String(preference.normalizedValue)] ?? "istenen donanım"; }
  if (preference.concept === "budgetMax") return `${Number(preference.normalizedValue).toLocaleString("tr-TR")} TL bütçe üst sınırı`;
  if (preference.concept === "transmission") return preference.normalizedValue === "MANUAL" ? "manuel vites" : "otomatik vites";
  if (preference.concept === "fuelType") { const labels: Readonly<Record<string, string>> = { BEV: "elektrikli", HEV: "hibrit", DIESEL: "dizel", GASOLINE: "benzinli" }; const values = Array.isArray(preference.normalizedValue) ? preference.normalizedValue : [preference.normalizedValue]; return `${values.map((value) => labels[String(value)] ?? String(value)).join(" veya ")} yakıt tercihi`; }
  if (preference.concept === "primaryUsage") { const labels: Readonly<Record<string, string>> = { URBAN_DAILY: "şehir içi kullanım", FAMILY: "aile kullanımı", LONG_DISTANCE: "uzun yol kullanımı", COMMERCIAL: "ticari yük taşıma", CORPORATE_TRAVEL: "müşteri ziyaretleri", PASSENGER_TRANSPORT: "yolcu taşıma", MIXED_ROAD: "kamp ve karma yol kullanımı" }; return labels[String(preference.normalizedValue)] ?? "kullanım amacı"; }
  if (preference.concept === "bodyStyle") { const values = Array.isArray(preference.normalizedValue) ? preference.normalizedValue : [preference.normalizedValue]; return `${values.map((value) => String(value).toLocaleLowerCase("tr-TR")).join(" veya ")} gövde tercihi`; }
  if (preference.concept === "modelPreference") return `${(Array.isArray(preference.normalizedValue) ? preference.normalizedValue : [preference.normalizedValue]).join(" veya ")} model tercihi`;
  if (preference.concept === "brandPreference") return `${(Array.isArray(preference.normalizedValue) ? preference.normalizedValue : [preference.normalizedValue]).join(" veya ")} marka tercihi`;
  return preference.concept;
};

async function noMatchReply(ledger: V3ConversationState["ledger"], budgetMode: BudgetDecisionMode): Promise<{ readonly message: string; readonly concepts: readonly string[] }> {
  const hard = projectV3DecisionPreferences(ledger, budgetMode).filter((item) => item.decisionUse === "HARD_FILTER");
  const restoring: ReturnType<typeof activeDecisionPreferences>[number][] = [];
  for (const preference of hard) {
    try {
      const relaxed = await evaluateV3Catalog(ledger.filter((item) => item.concept !== preference.concept), undefined, budgetMode);
      if (relaxed.variants.length > 0) restoring.push(preference);
    } catch { /* bounded explanation fallback */ }
  }
  if (!restoring.length) return { message: "Bu koşulların tamamını birlikte karşılayan satıştaki bir araç bulamadım. Vazgeçebileceğin tercihi günlük dille yazarsan seçenekleri yeniden değerlendirebilirim.", concepts: [] };
  const labels = restoring.slice(0, 2).map(preferenceLabel).join(" veya ");
  return { message: `Bu seçimde ${labels} birlikte uygulandığında satıştaki uygun araç kalmıyor. Bunlardan hangisini esnek tutabiliriz?`, concepts: restoring.slice(0, 2).map((item) => item.concept) };
}

function hasBroadNeutralTie(variants: readonly CatalogVariantSnapshot[] | undefined, ledger: V3ConversationState["ledger"], budgetMode: BudgetDecisionMode): boolean {
  if (!variants || variants.length < 2) return false;
  const ranked = rankV3Candidates(variants, ledger, budgetMode);
  const topScore = ranked[0] ? scoreV3Candidate(ranked[0], ledger, budgetMode) : undefined;
  return topScore !== undefined && ranked.filter((variant) => Math.abs(scoreV3Candidate(variant, ledger, budgetMode) - topScore) < 1e-9).length > 1;
}

function equipmentDecisionDisclosure(catalog: Awaited<ReturnType<typeof evaluateV3Catalog>> | undefined, ledger: V3ConversationState["ledger"]): string {
  if (!catalog) return "";
  const hasUnmapped = Boolean(latestActiveLedgerEvent(ledger, "unmappedEquipmentRequirement"));
  const applied = catalog.appliedEquipment.length > 0;
  const unsupported = catalog.unsupportedEquipment.length > 0 || hasUnmapped;
  if (applied && unsupported) return " Doğrulanabilen donanım şartlarını seçimde uyguladım; henüz doğrulanamayanları kartlarda açıkça belirteceğim.";
  if (applied) return " Doğrulanabilen donanım şartlarını araç seçiminde uyguladım.";
  if (unsupported) return " Bazı donanım istekleri bu versiyonlar için henüz doğrulanamadı; bunları kesin özellik gibi kabul etmeden kartlarda açıkça belirteceğim.";
  return "";
}

async function planCarsOutcome(context: CarsValidatedContext): Promise<V3PublicResponse | Extract<import("./carsStages").CarsPPlan, { readonly kind: "DECIDE" }>> {
  const { input, prior, base, semantic, router, scopeReply, observationTurns, purchaseIntent, acceptedBrandRelaxation, ledger, budgetMode, priorBudgetMode, requestedBudgetMode, budgetEvent, recommendationRequested } = context;
  let catalog = context.catalog;
  const bodySupersession = supersededBodyReply(prior, base);
  const modeOnlyMessage = /^(?:bütçemi karar filtresi olarak kullan|bütçeyi karardan çıkar,? ihtiyaç odaklı devam)[.! ]*$/iu.test(input.message.trim());
  if (requestedBudgetMode && requestedBudgetMode !== priorBudgetMode && modeOnlyMessage) {
    const message = requestedBudgetMode === "BUDGET_AS_DECISION_FILTER"
      ? "Bütçeyi yalnız uygun araçları elemek için kullanacağım; kalan seçeneklerin sırasını ihtiyaçların belirleyecek. Aradığın aracı anlatabilirsin."
      : "Bütçeyi kararın dışına çıkardım; araçları yalnız ihtiyaç ve tercihlerine göre değerlendireceğim.";
    return { kind: "V3_CONVERSATION", message, state: { ...base, lastQuestionKey: undefined } };
  }
  const atomicBudgetControlMessage = /^bütçemi karar filtresi olarak kullan\.\s+kesin bütçe üst sınırım \d{1,3}(?:\.\d{3})* tl\.[ ]*$/iu.test(input.message.trim());
  if (requestedBudgetMode === "BUDGET_AS_DECISION_FILTER" && budgetEvent && atomicBudgetControlMessage) {
    return { kind: "V3_CONVERSATION", message: `${Number(budgetEvent.normalizedValue).toLocaleString("tr-TR")} TL kesin üst sınırını karar filtresine uyguladım. Şimdi aradığın aracı anlatabilirsin.`, state: { ...base, lastQuestionKey: undefined } };
  }
  if (budgetMode === "BUDGET_AS_DECISION_FILTER" && !budgetEvent && /bütçe.*(?:belirt|söyle|yaz)/iu.test(input.message)) {
    return { kind: "V3_CONVERSATION", message: "Bu görüşmede karar filtresine uygulanmış bir tutar görünmüyor. Bütçe alanına kesin üst sınırı girip “Üst sınırı uygula” düğmesine basabilirsin.", state: recordAskedQuestion(base, "budget") };
  }
  if (prior.pendingConfirmation?.concept === "valueEconomy" && /(?:bilmiyorum|sence|sen söyle|sen seç)/iu.test(input.message)) {
    const advice = "Satış ekibi müşteri ziyaretlerinde düzenli kilometre yapacağı için toplam kullanım giderini biraz daha öne koymak mantıklı. Satın alma fiyatını da bütçe sınırı olarak koruyalım.";
    return { kind: "V3_CONVERSATION", message: advice, state: { ...base, lastQuestionKey: undefined } };
  }
  const advisoryIntent = detectXpyAdvisoryIntent(input.message);
  if (advisoryIntent) {
    // Pure X information cannot write decision context. A genuinely mixed turn
    // may still carry explicit purchase preferences, which prepare has already
    // validated before P selects the next material question.
    const advisoryBase = advisoryIntent.activeBuying
      ? base
      : { ...base, ledger: prior.ledger, pendingConfirmation: prior.pendingConfirmation, purchaseIntent: prior.purchaseIntent };
    if (advisoryIntent.kind !== "NOVICE_GUIDANCE" && !advisoryIntent.activeBuying) {
      const specific = directReply("AUTOMOTIVE_INFORMATION", input.message, observationTurns) ?? automotiveConcernReply(input.message);
      const useful = specific && !/yeterince güvenilir ve somut bir yanıt/iu.test(specific) ? specific : CARS_STAGE_ONE_ORIENTATION.message;
      return {
        kind: "V3_CONVERSATION",
        message: `${useful} ${prior.lastQuestionKey ? "İstersen bekleyen araç seçimi sorusuyla devam edebiliriz." : CARS_STAGE_ONE_INVITATION}`,
        state: preservePendingQuestion(prior, { ...advisoryBase, lastQuestionKey: undefined }),
      };
    }
    if (advisoryIntent.kind === "NOVICE_GUIDANCE" && !advisoryIntent.activeBuying && !prior.lastQuestionKey) {
      return {
        kind: "V3_CONVERSATION",
        advisory: CARS_STAGE_ONE_ORIENTATION,
        message: CARS_STAGE_ONE_INVITATION,
        state: recordAskedQuestion(advisoryBase, "purchaseInterest"),
      };
    }
    const pendingChoices = advisoryIntent.activeBuying ? undefined : carsQuestionChoices(prior.lastQuestionKey);
    const question = pendingChoices?.prompt
      ? { key: pendingChoices.questionKey, text: pendingChoices.prompt }
      : selectCarsQuestion(advisoryBase, catalog?.variants) ?? { key: "primaryUsage", text: "Aracı en çok hangi günlük ihtiyaç için kullanacaksın?" };
    const directInformation = advisoryIntent.kind === "NOVICE_GUIDANCE"
      ? CARS_STAGE_ONE_ORIENTATION.message
      : directReply("AUTOMOTIVE_INFORMATION", input.message, observationTurns) ?? automotiveConcernReply(input.message) ?? CARS_STAGE_ONE_ORIENTATION.message;
    const specific = /yeterince güvenilir ve somut bir yanıt/iu.test(directInformation) ? CARS_STAGE_ONE_ORIENTATION.message : directInformation;
    if (!advisoryIntent.activeBuying) {
      return {
        kind: "V3_CONVERSATION",
        advisory: CARS_STAGE_ONE_ORIENTATION,
        message: contextualQuestion(advisoryBase, question.key, question.text),
        state: prior.lastQuestionKey ? { ...advisoryBase, lastQuestionKey: prior.lastQuestionKey } : recordAskedQuestion(advisoryBase, question.key),
      };
    }
    return {
      kind: "V3_CONVERSATION",
      advisory: { ...CARS_STAGE_ONE_ORIENTATION, message: specific },
      message: `${specific} ${contextualQuestion(advisoryBase, question.key, question.text)}`,
      state: recordAskedQuestion(advisoryBase, question.key),
    };
  }
  const ambiguousEquipmentAffirmation = /^(?:evet|olur|önemli|kesinlikle)[.! ]*$/iu.test(input.message.trim()) && /^(?:parkingEquipment|familyEquipment|longDistanceEquipment|workEquipment)$/u.test(prior.lastQuestionKey ?? "") && !prior.pendingConfirmation;
  if (ambiguousEquipmentAffirmation) {
    const text = usageQuestionText(prior.lastQuestionKey as "parkingEquipment" | "familyEquipment" | "longDistanceEquipment" | "workEquipment");
    return { kind: "V3_CONVERSATION", message: `Elbette; doğru varyantı eleyebilmem için birini seçelim. ${text}`, state: { ...base, lastQuestionKey: prior.lastQuestionKey } };
  }
  const concernDirect = automotiveConcernReply(input.message);
  const fallbackDirect = directReply(semantic.messageActs.includes("AUTOMOTIVE_QUESTION") ? "AUTOMOTIVE_INFORMATION" : router.route, input.message, observationTurns) ?? concernDirect;
  const modelDirect = semantic.directResponse && isTurkishPublicCopy(semantic.directResponse) ? semantic.directResponse : undefined;
  const modelDirectIsRefusal = /(?:yeterince güvenilir|yönlendirme yapamam|yardımcı olamam|bilgi veremem)/iu.test(modelDirect ?? "");
  const direct = router.route === "SOCIAL_CONVERSATION" ? fallbackDirect ?? modelDirect : modelDirect && !(modelDirectIsRefusal && fallbackDirect) ? modelDirect : fallbackDirect;
  if (scopeReply) {
    const followUp = ["EXPLICIT", "ACTIVE_DISCOVERY"].includes(purchaseIntent) ? selectCarsQuestion(base, catalog?.variants) : undefined;
    return { kind: "V3_CONVERSATION", message: followUp ? `${scopeReply.message} ${contextualQuestion(base, followUp.key, followUp.text)}` : scopeReply.message, state: followUp ? recordAskedQuestion(base, followUp.key) : { ...base, lastQuestionKey: undefined } };
  }
  const gratitudeAfterAutomotiveInfo = prior.lastRoute === "AUTOMOTIVE_INFORMATION" && /(?:teşekkür|sağ ol|bilgi için)/iu.test(input.message);
  if (gratitudeAfterAutomotiveInfo) return { kind: "V3_CONVERSATION", message: "Rica ederim. Elektrikli araç fikri sende yalnızca merak mı uyandırıyor, yoksa kendi günlük kullanımın için değerlendirmeye açık mısın?", state: recordAskedQuestion(base, "purchaseInterest") };
  if (prior.lastQuestionKey === "purchaseInterest" && /(?:sadece|yalnızca) merak|merak ettim|şimdilik düşünmüyorum/iu.test(input.message)) return { kind: "V3_CONVERSATION", message: "Elbette, merakını gidermek de yeterli. İleride kendi kullanımın için değerlendirmek istersen kaldığımız yerden devam ederiz.", state: { ...base, lastQuestionKey: undefined } };
  if (prior.pendingConfirmation?.concept === "valueEconomy" && /(?:bilmiyorum|sence|sen söyle|sen seç)/iu.test(input.message)) {
    const advice = "Satış ekibi müşteri ziyaretlerinde düzenli kilometre yapacağı için toplam kullanım giderini biraz daha öne koymak mantıklı. Satın alma fiyatını da bütçe sınırı olarak koruyalım.";
    return { kind: "V3_CONVERSATION", message: advice, state: { ...base, lastQuestionKey: undefined } };
  }
  if (direct) {
    const followUp = (router.route === "AUTOMOTIVE_INFORMATION" || semantic.messageActs.includes("AUTOMOTIVE_QUESTION") || Boolean(concernDirect)) && ["EXPLICIT", "ACTIVE_DISCOVERY"].includes(purchaseIntent) ? selectCarsQuestion(base, catalog?.variants) : undefined;
    if (followUp) return { kind: "V3_CONVERSATION", message: `${direct} Seçimini netleştirmeye devam edelim: ${contextualQuestion(base, followUp.key, followUp.text)}`, state: recordAskedQuestion(base, followUp.key) };
    if (router.route === "AUTOMOTIVE_INFORMATION" && purchaseIntent === "NOT_EXPRESSED" && !base.askedQuestionKeys.includes("purchaseInterest")) {
      return { kind: "V3_CONVERSATION", message: `${direct} Bunu yalnızca bilgi için mi soruyorsun, yoksa kendi kullanımın için bir araç seçmeyi de düşünüyor musun?`, state: recordAskedQuestion(base, "purchaseInterest") };
    }
    return { kind: "V3_CONVERSATION", message: direct, state: preservePendingQuestion(prior, { ...base, lastQuestionKey: undefined }) };
  }
  if (recommendationRequested && base.pendingConfirmation) {
    return { kind: "V3_CONVERSATION", message: `Önce bu noktayı netleştirelim: ${base.pendingConfirmation.question}`, state: { ...base, lastQuestionKey: `confirm:${base.pendingConfirmation.concept}` } };
  }
  const offerSelectionChange = /(?:alternatif|(?:üç|3)\s+(?:araç|seçenek)|tek\s+araç\s+(?:öner|seç|hazırla))/iu.test(input.message);
  const offerDeclined = Boolean(prior.pendingOffer) && /(?:şimdilik gösterme|göstermek istemiyorum|kabul etmeden sohbete devam)/iu.test(input.message);
  if (offerDeclined) return { kind: "V3_CONVERSATION", message: "Elbette, araç kartını açmadan sohbete devam edebiliriz. Değiştirmek veya netleştirmek istediğin tercihi söylemen yeterli.", state: { ...base, pendingOffer: undefined, pendingAction: "RECOMMENDATION_DISCOVERY", lastQuestionKey: undefined } };
  const offerConsent = Boolean(prior.pendingOffer) && !offerSelectionChange && /(?:göster|paylaş|evet|onaylıyorum|hazırım)/iu.test(input.message);
  if (offerConsent && prior.pendingOffer) {
    return { kind: "DECIDE", context, decision: { kind: "REVEAL_OFFER", plannedState: { ...base, purchaseIntent: "READY_FOR_DECISION", pendingOffer: undefined, lastQuestionKey: undefined } } };
  }
  const valueFallbackRequested = prior.lastQuestionKey === "brandModel" && /(?:bilmiyorum|fark etmez|sen seç|yok|istemiyorum|alternatif|öner|göster|seç)/iu.test(input.message);
  if (!catalog && valueFallbackRequested) try { catalog = await evaluateV3Catalog(ledger, undefined, budgetMode); } catch { catalog = undefined; }
  const budgetKnown = budgetMode === "NEEDS_ONLY" || latestActiveLedgerEvent(ledger, "budgetMax") || latestActiveLedgerEvent(ledger, "budgetTarget") || latestActiveLedgerEvent(ledger, "budgetNotImportant") || latestActiveLedgerEvent(ledger, "budgetUnspecified");
  const bodyResolved = active(base, "bodyStyle") || Boolean(latestActiveLedgerEvent(ledger, "bodyNotImportant"));
  const brandPreference = latestActiveLedgerEvent(ledger, "brandPreference"); const fuelPreference = latestActiveLedgerEvent(ledger, "fuelType");
  if (!acceptedBrandRelaxation && catalog?.variants.length === 0 && brandPreference && fuelPreference && (recommendationRequested || prior.pendingAction === "RELAX_BRAND_FOR_POWERTRAIN")) {
    const fuelLabel = fuelPreference.normalizedValue === "BEV" ? "tam elektrikli" : String(fuelPreference.normalizedValue).toLocaleLowerCase("tr");
    return { kind: "V3_CONVERSATION", message: `${brandPreference.normalizedValue} tercihini ve ${fuelLabel} isteğini net aldım. Aktif katalogda bu ikisini birlikte karşılayan satıştaki bir varyant bulunmuyor. ${fuelLabel.charAt(0).toLocaleUpperCase("tr") + fuelLabel.slice(1)} tercihini koruyup markayı esnetelim mi?`, state: { ...recordAskedQuestion(base, "catalogBrandRelaxation"), pendingAction: "RELAX_BRAND_FOR_POWERTRAIN" } };
  }
  if (recommendationRequested && !budgetKnown && base.askedQuestionKeys.includes("budget") && !base.askedQuestionKeys.includes("exactBudget")) {
    const text = "Seçenekleri gerçekten bütçene uygun tutabilmem için aşmak istemediğin yaklaşık bir üst sınır var mı? Yoksa bütçeyi şimdilik serbest bırakabiliriz.";
    return { kind: "V3_CONVERSATION", message: text, state: recordAskedQuestion(base, "exactBudget") };
  }
  const exactModelSelected = active(base, "modelPreference");
  if (recommendationRequested && ((!exactModelSelected && (!active(base, "primaryUsage") || !bodyResolved || !budgetKnown)) || (exactModelSelected && !budgetKnown))) {
    const readinessQuestion = selectCarsQuestion(base, catalog?.variants);
    if (readinessQuestion) return { kind: "V3_CONVERSATION", message: `Doğru tek aracı seçebilmem için bir noktayı netleştirelim. ${contextualQuestion(base, readinessQuestion.key, readinessQuestion.text)}`, state: recordAskedQuestion(base, readinessQuestion.key) };
  }
  const equipmentResolved = activeDecisionPreferences(ledger).some((item) => item.field === "equipmentFeature") || Boolean(latestActiveLedgerEvent(ledger, "equipmentNotImportant") || latestActiveLedgerEvent(ledger, "unmappedEquipmentRequirement")) || base.askedQuestionKeys.some((key) => key.endsWith("Equipment"));
  if (recommendationRequested && catalog?.variants.length && catalog.variants.length > 3 && !equipmentResolved) {
    const equipmentRounds = base.askedQuestionKeys.filter((key) => key.startsWith("verifiedEquipment:")).length;
    const maxRounds = budgetMode === "NEEDS_ONLY" ? 3 : 1;
    const planned = equipmentRounds < maxRounds ? planV3VerifiedEquipmentQuestion(catalog.variants, base.askedQuestionKeys, String(latestActiveLedgerEvent(ledger, "primaryUsage")?.normalizedValue ?? "")) : undefined;
    if (planned) return { kind: "V3_CONVERSATION", message: `Son seçimi yapmadan önce gerçekten fark yaratacak bir noktayı netleştirelim. ${planned.text}`, state: recordAskedQuestion(base, planned.key) };
  }
  if (recommendationRequested && !valueFallbackRequested && (catalog?.variants.length ?? 0) > 3 && !equipmentResolved && !base.askedQuestionKeys.includes("decisionDifferentiator")) {
    const text = "Seçimi yalnız fiyata bırakmayalım: günlük kullanımda vazgeçmek istemeyeceğin tek bir özellik hangisi; örneğin geri görüş kamerası, park sensörleri veya uzun yolda mesafeyi koruyan hız sabitleme?";
    return { kind: "V3_CONVERSATION", message: text, state: recordAskedQuestion(base, "decisionDifferentiator") };
  }
  const needsNeutralTieBreak = !active(base, "brandPreference") && !active(base, "modelPreference") && hasBroadNeutralTie(catalog?.variants, ledger, budgetMode) && !base.finalBrandModelQuestionAsked;
  if (recommendationRequested && needsNeutralTieBreak && !valueFallbackRequested) {
    return { kind: "V3_CONVERSATION", message: "İhtiyaçlarını karşılayan birkaç güçlü seçenek aynı puanda kaldı. Özellikle yakın hissettiğin bir marka veya model var mı; yoksa marka tercihin olmadığını söyleyebilirsin.", state: { ...recordAskedQuestion(base, "brandModel"), finalBrandModelQuestionAsked: true } };
  }
  if ((recommendationRequested || valueFallbackRequested) && catalog?.variants.length) {
    const tied = hasBroadNeutralTie(catalog.variants, ledger, budgetMode);
    const limit: 1 | 3 = tied ? 3 : base.preferredRecommendationLimit ?? (valueFallbackRequested || /alternatif/iu.test(input.message) ? 3 : 1);
    const usageLead = dailyUsageContext(base);
    const equipmentBoundary = equipmentDecisionDisclosure(catalog, ledger);
    const message = limit === 1 ? `${usageLead} tek seçimi hazırladım.${equipmentBoundary} Göstermemi ister misin?` : tied ? `${usageLead} tek bir kazanan çıkmadığı için birbirine bağlı en fazla üç seçimi hazırladım.${equipmentBoundary} Göstermemi ister misin?` : valueFallbackRequested ? `${usageLead}, marka veya model yönlendirmesi olmadan değer dengesi en güçlü üç seçimi hazırladım.${equipmentBoundary} Göstermemi ister misin?` : `${usageLead} üç seçimi hazırladım.${equipmentBoundary} Göstermemi ister misin?`;
    return { kind: "DECIDE", context, decision: { kind: "CREATE_OFFER", limit, message, plannedState: { ...base, lastQuestionKey: "offerConsent" } } };
  }
  const question = ["EXPLICIT", "ACTIVE_DISCOVERY"].includes(purchaseIntent) ? selectCarsQuestion(base, catalog?.variants) : undefined;
  if (!question && needsNeutralTieBreak) {
    return { kind: "V3_CONVERSATION", message: "İhtiyaçlarını karşılayan birkaç güçlü seçenek aynı puanda kaldı. Özellikle yakın hissettiğin bir marka veya model var mı; yoksa marka tercihin olmadığını söyleyebilirsin.", state: { ...recordAskedQuestion(base, "brandModel"), finalBrandModelQuestionAsked: true } };
  }
  const normalizedMessage = input.message.toLocaleLowerCase("tr");
  const boundedPurchaseAcknowledgement = /moralim.*bozuk/iu.test(input.message) ? "Moral bozukluğunu anladım; bari araç seçimini keyifli ve mantıklı bir karara çevirelim."
    : /hanımla kavga|baskı yapıyor/iu.test(input.message) ? "Evdeki otomobil gündemi iyice ciddileşmiş; seçimi sakin ve doğru ölçütlerle toparlayalım."
    : /fıkra gibi bir piyasa/iu.test(input.message) ? "Piyasa kısmı gerçekten fıkra gibi; finali doğru araçla bağlayalım."
    : /chatbotlar.*yardımcı olamıyor/iu.test(input.message) ? "Bu kez şansını boşa çıkarmayalım; verdiğin koşullarla doğrudan ilerleyelim."
    : /toplu taşıma|otobüsle (?:uğraş|git|gel)|otobüsten/iu.test(input.message) ? "Toplu taşıma sabrını tüketmiş; seni gerçekten rahatlatacak seçeneği bulalım."
    : /arkadaşım dürtükledi/iu.test(input.message) ? "Arkadaş dürtmesiyle başlayan konu ciddi bir alıma dönmüş; acele etmeden doğru aracı bulalım."
    : /(?:hangi araçlar|araçlarınız neler)/iu.test(input.message)
    ? "Binek, SUV, elektrikli, hibrit ve ticari kullanıma uygun farklı seçeneklerimiz var; sana uygun olan gruptan başlayalım."
    : /ehliyet/u.test(normalizedMessage) && /ilk arac[ıi]m[ıi]/u.test(normalizedMessage) ? "Tebrik ederim; ehliyetini alıp ilk aracını araştırmaya başlamak gerçekten heyecanlı bir adım." : "Harika, ihtiyacını birlikte netleştirelim.";
  const prefix = bodySupersession ?? (router.route === "PURCHASE_INTENT_DISCOVERY" ? semantic.acknowledgement && isTurkishPublicCopy(semantic.acknowledgement) ? semantic.acknowledgement : boundedPurchaseAcknowledgement : router.route === "CORRECTION_OR_RELAXATION" ? "Tamam, önceki tercihi güncelledim; seçeneklerin yeniden genişlemesi normal." : conversationalAcknowledgement(base));
  if (!question && catalog?.variants.length) {
    const equipmentBoundary = equipmentDecisionDisclosure(catalog, ledger);
    const tied = hasBroadNeutralTie(catalog.variants, ledger, budgetMode);
    return { kind: "DECIDE", context, decision: { kind: "CREATE_OFFER", limit: tied ? 3 : 1, message: tied ? `${dailyUsageContext(base)} tek bir kazanan çıkmadığı için birbirine bağlı en fazla üç seçimi hazırladım.${equipmentBoundary} Göstermemi ister misin?` : `${dailyUsageContext(base)} tek seçimi hazırladım.${equipmentBoundary} Göstermemi ister misin?`, plannedState: { ...base, lastQuestionKey: "offerConsent" } } };
  }
  if (!question && catalog?.variants.length === 0) {
    const noMatch = await noMatchReply(ledger, budgetMode);
    return { kind: "V3_CONVERSATION", message: `${bodySupersession ? `${bodySupersession} ` : ""}${noMatch.message}`, state: { ...base, lastQuestionKey: noMatch.concepts.length ? `constraintRelaxation:${noMatch.concepts.join("|")}` : undefined } };
  }
  if (!question) return { kind: "V3_CONVERSATION", message: `${prefix} İstersen şimdi sana en uygun aracı seçebilirim.`, state: { ...base, pendingAction: "RECOMMENDATION_DISCOVERY", lastQuestionKey: "recommendationStart" } };
  return { kind: "V3_CONVERSATION", message: `${prefix} ${contextualQuestion(base, question.key, question.text)}`, state: { ...recordAskedQuestion(base, question.key), ...(question.key === "brandModel" ? { finalBrandModelQuestionAsked: true } : {}) } };
}

export async function planCarsTurn(context: CarsValidatedContext): Promise<import("./carsStages").CarsPPlan> {
  const planned = await planCarsOutcome(context);
  if (planned.kind === "DECIDE") return Object.freeze(planned);
  return Object.freeze({ kind: "TERMINAL", mutation: Object.freeze({ state: planned.state, outcome: planned }) });
}
