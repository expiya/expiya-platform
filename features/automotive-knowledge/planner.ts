import { release } from "./content";
import { temporalAuthorityErrors } from "./policy";
import { routeAutomotiveKnowledgeIntent } from "./router";
import { knowledgeReleaseSchema, type KnowledgeIntent, type KnowledgeRecord } from "./schema";

export interface KnowledgeCitation {
  readonly title: string;
  readonly publisher: string;
  readonly url: string;
  readonly publishedAt: string;
  readonly period: string;
  readonly market: string;
  readonly locator: string;
}

export interface AutomotiveKnowledgeResponse {
  readonly kind: "AUTOMOTIVE_KNOWLEDGE";
  readonly intent: KnowledgeIntent;
  readonly message: string;
  readonly recordIds: readonly string[];
  readonly releaseId: string;
  readonly effectiveAsOf: string;
  readonly citations: readonly KnowledgeCitation[];
  readonly decisionImpact: "NONE";
}

export interface SupportiveAutomotiveKnowledgeResponse extends AutomotiveKnowledgeResponse {
  readonly kind: "AUTOMOTIVE_KNOWLEDGE";
  readonly supportMode: "CONVERSATION_SUPPORT_ONLY";
}

const topic = (text: string, records: readonly KnowledgeRecord[]) => {
  if (/dizel|hibrit|yakıt|elektrik/iu.test(text)) return records.filter((record) => record.id === "AK-ENERGY-TYPES");
  if (/gövde|suv|sedan|hatchback|crossover|station/iu.test(text)) return records.filter((record) => record.id === "AK-BODY-TYPES");
  return records;
};

function render(intent: KnowledgeIntent, selected: readonly KnowledgeRecord[]): string {
  const body = selected.map((record) => record.summaryTr).join("\n\n");
  const period = selected.find((record) => record.knowledgeClass === "CURRENT_MARKET_FACT")?.provenance[0]?.period;
  const boundary = intent === "MARKET_STATISTICS"
    ? `\n\nBu sayı popülerliği gösterir; kalite, güvenlik veya size uygunluk puanı değildir.${period ? ` Veri dönemi: ${period}.` : ""}`
    : intent === "ECONOMIC_INDICATORS"
      ? "\n\nEndeks veya ilan fiyatı değişimi tek bir aracın piyasa değerini göstermez; seri kapsamı ve metodolojisiyle birlikte okunmalıdır."
      : intent === "TAX_AND_REGULATION" || intent === "INCENTIVES"
        ? "\n\nMevzuat araç özellikleri ve kişisel koşullara göre farklı sonuç verebilir. Bu özet kişiye özel vergi veya hukuk görüşü değildir; işlem öncesinde güncel GİB metni kontrol edilmelidir."
        : intent === "INSURANCE_AND_CLAIMS"
          ? "\n\nPrim ve tazminat sonucu; araç, sürücü, il, risk basamağı, teminat, muafiyet ve şirket teklifine göre değişir. Bu bilgi poliçe teklifi veya hasar kararı değildir."
          : intent === "MAINTENANCE_AND_PARTS"
            ? "\n\nKesin bakım zamanı ve parça listesi için aracın model yılına özel üretici bakım programı esas alınmalıdır."
            : intent === "OWNERSHIP_VALUE"
              ? "\n\nBu çerçeve araçları puanlamaz veya sıralamaz; gerçek maliyet için aynı dönem ve kullanım varsayımlarıyla ayrı hesap gerekir."
              : intent === "IMPORT_AND_COMPLIANCE"
                ? "\n\nİthalat yükümlülüğü menşe, GTİP, araç kategorisi, yaş, tip onayı ve işlem tarihine göre değişir; bu özet ithalat izni veya vergi hesabı değildir."
                : intent === "FINANCING_AND_CREDIT"
                  ? "\n\nBu bilgi kredi teklifi, onay veya kişisel ödeme gücü değerlendirmesi değildir. Taksit ve toplam maliyet ancak güncel yazılı teklif; faiz/kâr payı, vergi, ücret, sigorta, vade ve peşinat birlikte görülerek hesaplanmalıdır."
                  : intent === "AUTONOMOUS_DRIVING"
                    ? "\n\nPazarlama adları otomasyon seviyesi değildir. Sürücü sorumluluğu, etkin olan özelliğin SAE seviyesi ve çalışma koşulları üzerinden anlaşılmalıdır."
                    : intent === "EV_RANGE_AND_CHARGING"
                      ? "\n\nEtiket menzili laboratuvar protokolüne dayanır; belirli yolculukta garanti edilen mesafe değildir. Aynı protokol ve model yılı kullanılmadan menzil değerleri doğrudan karşılaştırılmamalıdır."
                      : intent === "EXPERT_PERSPECTIVES"
                        ? "\n\nBunlar adı verilen kurumların tarihli değerlendirmeleridir; doğrulanmış gelecek sonucu veya Expiya önerisi değildir."
                        : intent === "SAFE_AND_ADVANCED_DRIVING"
                          ? "\n\nBu içerik ehliyet eğitiminin, araç kullanım kılavuzunun veya uygulamalı eğitmen gözetiminin yerini tutmaz. Kamuya açık yolda hız denemesi, limitte viraj, kontrollü kaydırma ya da benzeri riskli manevra talimatı verilmez; acil durum çalışmaları yalnız uygun kapalı alanda nitelikli eğitmenle yapılmalıdır."
                          : intent === "USED_VEHICLE_DUE_DILIGENCE"
                            ? "\n\nTek bir sorgu veya ekspertiz aracın geçmişini ve gelecekteki arıza riskini bütünüyle doğrulamaz. Satıcı türü, işlem tarihi ve aracın özelliklerine göre güncel resmî kurallar ayrıca kontrol edilmelidir."
                            : intent === "VEHICLE_RECALLS"
                              ? "\n\nGeri çağırma uygunluğu marka-model adıyla tahmin edilmemeli; şasi numarasıyla üretici veya yetkili servis üzerinden doğrulanmalıdır. Bu kayıt belirli bir aracın kampanyaya dahil olduğunu söylemez."
                              : intent === "EV_CHARGING_ECOSYSTEM"
                                ? "\n\nŞarj gücü aracın, bataryanın ve istasyonun birlikte izin verdiği değere bağlıdır; etiket gücü sürekli hız veya kesin süre garantisi değildir. Fiyat ve müsaitlik kullanım anında doğrulanmalıdır."
                                : intent === "TIRE_SAFETY"
                                  ? "\n\nDoğru ebat, basınç, yük ve hız sınıfı için araç üreticisinin kapı etiketi/kılavuzu esas alınır. Gözle kontrol profesyonel hasar değerlendirmesinin yerine geçmez."
                                  : intent === "CHILD_PASSENGER_SAFETY"
                                    ? "\n\nÇocuk koltuğu seçimi ve kurulumu çocuğun ölçülerine, koltuğun onaylı sınırlarına ve araç kılavuzuna bağlıdır. Bu özet Türkiye'deki güncel hukuki zorunluluğun kişiye özel tespiti değildir."
                                    : intent === "POST_CRASH_GUIDANCE"
                                      ? "\n\nYaralanma, yangın, tehlikeli madde, kamu malı hasarı veya tarafların anlaşamadığı durumlarda yalnız maddi hasarlı tutanak akışına güvenilmemeli; güvenlik ve yetkili birim yönlendirmesi öncelenmelidir. Bu özet kusur veya tazminat kararı değildir."
                                      : intent === "SAFETY_RATINGS"
                                        ? "\n\nYıldız sayısı tek başına evrensel güvenlik sıralaması değildir. Test yılı, protokol, donanım, varyant ve benzer boyut/kütle sınıfı birlikte okunmalıdır; sonuç gerçek dünyadaki her kazayı garanti etmez."
                                        : intent === "ENVIRONMENTAL_IMPACT"
                                          ? "\n\nÇevresel sonuç araç, batarya, kullanım ömrü, kilometre, enerji/elektrik karışımı ve sistem sınırına bağlıdır. Başka ülke varsayımlarındaki sayı Türkiye sonucu gibi sunulamaz."
                                          : intent === "ACCESSIBLE_MOBILITY"
                                            ? "\n\nUyarlama ihtiyacı kişiye özeldir; sağlık/rehabilitasyon değerlendirmesi, mevzuat, ruhsat/tescil, sigorta ve yetkin uygulayıcı gereklilikleri Türkiye için ayrıca doğrulanmalıdır."
                                            : intent === "INTERNATIONAL_DRIVING"
                                              ? "\n\nBelge, sigorta, ekipman, ücret ve trafik kuralları gidilecek ve transit geçilecek her ülkeye göre değişir. Seyahatten hemen önce konsolosluk, sınır/gümrük, sigortacı ve ülke otoriteleri kontrol edilmelidir."
                                              : intent === "LISTING_AND_PAYMENT_SAFETY"
                                                ? "\n\nEİDS kimlik ve pazarlama yetkisini doğrular; aracın mekanik durumu, mülkiyet engelleri veya ödemenin güvenliği için tek başına garanti değildir. Resmî güvenli ödeme akışı dışında kapora veya hesaba transfer yönlendirmesine temkinli yaklaşılmalıdır."
                : intent === "FORECAST_DISCUSSION"
      ? "\n\nBu bir senaryodur; sonuçlar varsayımlara ve belirsizliklere bağlıdır."
      : "";
  const handoff = intent === "EXPIYA_ORIENTATION"
    ? "\n\nİstersen otomotiv hakkında bir şey sorabilir ya da araç seçimine birlikte geçebiliriz."
    : "\n\nİstersen bunu kendi kullanımına göre birlikte değerlendirebiliriz.";
  return `${body}${boundary}${handoff}`;
}

export function planAutomotiveKnowledgeResponse(text: string, now = new Date()): AutomotiveKnowledgeResponse | undefined {
  const match = routeAutomotiveKnowledgeIntent(text);
  if (!match) return undefined;
  const parsed = knowledgeReleaseSchema.safeParse(release);
  if (!parsed.success) return undefined;
  const mapping = parsed.data.mappings.find((item) => item.intent === match.intent);
  if (!mapping) return undefined;
  let selected: readonly KnowledgeRecord[] = parsed.data.records.filter((record) => mapping.recordIds.includes(record.id));
  if (match.intent === "AUTOMOTIVE_EDUCATION") selected = topic(text, selected);
  if (match.intent === "INCENTIVES" && /hurda/iu.test(text)) selected = [];
  if (selected.length === 0 || selected.some((record) => temporalAuthorityErrors(record, now).length > 0)) return undefined;
  return {
    kind: "AUTOMOTIVE_KNOWLEDGE", intent: match.intent, message: render(match.intent, selected),
    recordIds: selected.map((record) => record.id), releaseId: parsed.data.releaseId,
    effectiveAsOf: parsed.data.effectiveAsOf, decisionImpact: "NONE",
    citations: selected.flatMap((record) => record.provenance.map((source) => ({
      title: source.sourceTitle, publisher: source.publisher, url: source.sourceUrl,
      publishedAt: source.publishedAt, period: source.period, market: source.market, locator: source.locator,
    }))).filter((citation, index, all) => all.findIndex((item) => item.url === citation.url) === index),
  };
}

export function planSimplifiedAutomotiveKnowledgeFollowUp(input: { readonly userText: string; readonly priorUserText?: string; readonly now?: Date }): AutomotiveKnowledgeResponse | undefined {
  if (!/(?:daha |çok )?(?:basit|sade|kısa).*(?:anlat|açıkla)|anlamadım|karmaşık/iu.test(input.userText) || !input.priorUserText) return undefined;
  const prior = planAutomotiveKnowledgeResponse(input.priorUserText, input.now);
  if (!prior) return undefined;
  const message = prior.intent === "EV_CHARGING_ECOSYSTEM" || prior.intent === "EV_RANGE_AND_CHARGING"
    ? "Kısaca: Evde elektrik olması başlangıç için yeterli olabilir. Ancak aracı güvenli biçimde şarj etmek için ev tesisatının ve topraklamanın bir elektrikçi tarafından kontrol edilmesi gerekir; uygun bir ev tipi şarj cihazı sıradan prizden daha güvenli ve hızlıdır. Köyde halka açık istasyon yoksa günlük kullanım evde şarjla yürüyebilir, fakat uzun yol öncesinde rota üzerindeki hızlı şarj noktalarını planlamalısın."
    : `Kısaca: ${prior.message.split(/\n\n/u)[0]}`;
  return Object.freeze({ ...prior, message });
}

/**
 * Provides a bounded conversational bridge for concerns that accompany an
 * explicit vehicle-selection request. The result is presentation-only: the
 * route may place it before the governed decision response, but it must never
 * be passed into the Decision Engine as preference or constraint input.
 */
export function planSupportiveAutomotiveKnowledgeResponse(text: string, now = new Date()): SupportiveAutomotiveKnowledgeResponse | undefined {
  const normalized = text.normalize("NFKC").toLocaleLowerCase("tr-TR");
  const accidentAnxiety = /(?:kaza|trafik).{0,60}(?:kork|endiş|kayg)|(?:kork|endiş|kayg).{0,60}(?:kaza|trafik)/u.test(normalized);
  const noviceDriverConcern = /ehliyet(?:i|imi)? yeni aldım|araç kullan(?:mak|ma).{0,50}(?:güvenmiyorum|çekiniyorum|korkuyorum)|kendime güvenmiyorum/u.test(normalized);
  const financingConcern = /(?:araç|araba|otomobil).{0,80}(?:param yok|bütçem yok|maddi imk[aâ]nım yok|finansman|kredi)|(?:param yok|bütçem yok|maddi imk[aâ]nım yok).{0,80}(?:araç|araba|otomobil)/u.test(normalized);
  const base = accidentAnxiety || noviceDriverConcern
    ? planAutomotiveKnowledgeResponse("Güvenli ve defansif sürüş nedir?", now)
    : financingConcern
      ? planAutomotiveKnowledgeResponse("Taşıt kredisi ve finansman nasıl değerlendirilir?", now)
      : undefined;
  if (!base) return undefined;
  const message = accidentAnxiety || noviceDriverConcern
    ? "Bu kaygı anlaşılır; yalnız değilsin. Güvenli ve defansif sürüş alışkanlıkları tehlikeyi daha erken fark etmeye ve kaza riskini azaltmaya yardımcı olabilir, ancak riski tamamen ortadan kaldırmaz. İstersen önce birkaç güvenli sürüş önerisini konuşabiliriz; istersen işe gidiş geliş ihtiyacına uygun aracı birlikte seçmeye devam edebiliriz."
    : "Maddi sınırı baştan konuşmak doğru olur. Taşıt kredisi veya başka bir finansman seçeneği değerlendirilebilir; ancak kredi onayı, faiz, peşinat ve toplam geri ödeme kişiye ve güncel yazılı teklife bağlıdır. Önce sürdürülebilir aylık yükü ve toplam maliyeti konuşabilir, ardından bu sınıra uygun araçları birlikte değerlendirebiliriz.";
  return Object.freeze({ ...base, message, supportMode: "CONVERSATION_SUPPORT_ONLY" as const });
}
