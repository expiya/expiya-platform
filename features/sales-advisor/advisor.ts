import type { Phase2HandoffPayload, PublicVariantFact, VariantContentArtifact } from "./types";
import type { SalesSemanticInterpretation } from "./semantic.server";
import type { OfficialResearchEvidence } from "./officialResearch.server";

export interface AdvisorReply {
  readonly messages: readonly string[];
  readonly action?: { readonly label: string; readonly href: string };
  readonly turn?: { readonly used: number; readonly limit: number; readonly remaining: number; readonly ended: boolean; readonly accepted?: boolean };
}

const normalize = (value: string) => value.toLocaleLowerCase("tr-TR").replace(/ğ/gu, "g").replace(/ş/gu, "s").replace(/ç/gu, "c").replace(/ı/gu, "i").replace(/ö/gu, "o").replace(/ü/gu, "u").normalize("NFKD").replace(/\p{M}+/gu, "").replace(/[^a-z0-9]+/gu, " ").trim();
const tokens = (value: string) => new Set(normalize(value).split(" ").filter((item) => item.length > 1));
const aliases: Readonly<Record<string, readonly string[]>> = {
  emptyMass: ["agirlik", "bos agirlik", "bos kutle", "kac kilo", "kg"], runningOrderMass: ["yurur vaziyette", "suruse hazir", "yurur kutle"], maximumPermissibleMass: ["azami agirlik", "yuklu agirlik", "azami kutle"],
  power: ["guc", "beygir", "hp", "bg", "kw"], torque: ["tork", "nm"], engineDisplacement: ["motor hacmi", "silindir hacmi", "kac cc", "cc"], transmission: ["sanziman", "vites", "otomatik", "manuel"], drivenWheels: ["cekis", "onde cekis", "arkadan itis", "4x4"],
  seats: ["koltuk", "koltuk sayisi", "kac kisilik", "kisi kapasitesi", "yolcu", "yolcu sayisi", "yolcu kapasitesi", "kapasite"], luggage: ["bagaj", "bagaj hacmi"], cargoVolume: ["yukleme hacmi", "azami bagaj"], payload: ["tasima kapasitesi", "yuk kapasitesi"], brakedTowing: ["romork", "cekme kapasitesi"],
  length: ["uzunluk", "boyu"], width: ["genislik", "eni"], height: ["yukseklik"], wheelbase: ["dingil mesafesi"], fuelType: ["yakit", "benzin", "dizel", "lpg", "elektrik"], consumption: ["tuketim", "ne kadar yakar", "yakit tuketimi"], electricConsumption: ["elektrik tuketimi"], range: ["elektrikli menzil"], officialCombinedRange: ["toplam menzil", "bir depo", "menzil"], dcCharge: ["dc sarj", "hizli sarj"], batteryCapacity: ["batarya", "batarya kapasitesi"], usableBattery: ["kullanilabilir batarya"],
  modularRoofBars: ["tavan bari", "tavan barlari", "portbagaj", "tavan tasiyici", "arac ustu ekipman", "tavan ustu aksesuar"], dynamicRoofLoad: ["tavan yuku", "tavan tasima kapasitesi", "tavana kac kilo", "portbagaj kapasitesi"],
  warranty: ["garanti", "garanti suresi"], maintenanceInterval: ["bakim araligi", "servis araligi", "periyodik bakim"], serviceInterval: ["servis araligi", "bakim araligi"],
};

function factScore(question: string, item: PublicVariantFact): number {
  const q = normalize(question); const qTokens = tokens(question);
  const terms = [item.key, item.label, ...(aliases[item.key] ?? [])].map(normalize);
  return Math.max(...terms.map((term) => q.includes(term) || (term.length >= 6 && q.includes(term.slice(0, -2))) ? 100 + term.length : [...tokens(term)].filter((token) => [...qTokens].some((candidate) => candidate === token || (token.length >= 6 && candidate.startsWith(token.slice(0, -2))))).length));
}

function findFact(question: string, artifact: VariantContentArtifact): PublicVariantFact | undefined {
  return artifact.facts.map((item) => ({ item, score: factScore(question, item) })).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score || a.item.key.localeCompare(b.item.key))[0]?.item;
}

function findFacts(question: string, artifact: VariantContentArtifact): readonly PublicVariantFact[] {
  return artifact.facts
    .map((item) => ({ item, score: factScore(question, item) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.key.localeCompare(b.item.key))
    .slice(0, 4)
    .map(({ item }) => item);
}

const scopeSentence = (fact: PublicVariantFact) => fact.disposition === "VERIFIED" ? "Bu değer Türkiye pazarı için exact varyanta bağlı doğrulanmış katalog kaydıdır." : `${fact.scopeNote ?? "Bu bilgi exact varyant yerine daha geniş bir kapsama aittir."} Bu nedenle Türkiye'deki aracın kesin değeri olarak sunmuyorum.`;
function factExplanation(fact: PublicVariantFact): readonly string[] {
  return [
    `${fact.label}: ${fact.value}.${fact.dailyMeaning ? ` ${fact.dailyMeaning}` : ""}`,
    ...(fact.classComparison?.text ? [`Sınıf içindeki yeri: ${fact.classComparison.text}`] : []),
    ...(fact.dailyExample ? [`Günlük kullanım karşılığı: ${fact.dailyExample}`] : []),
    scopeSentence(fact),
    ...(fact.source ? [`Kaynak: ${fact.source.label} — ${fact.source.url}`] : []),
  ];
}
function directAnswer(fact: PublicVariantFact): AdvisorReply { return { messages: factExplanation(fact) }; }

function multipleFactAnswer(facts: readonly PublicVariantFact[]): AdvisorReply {
  const messages = facts.flatMap((fact) => factExplanation(fact));
  return { messages: [...messages, "Bu değerleri birlikte değerlendirirken tek bir ölçüyü genel araç kalitesi gibi yorumlamamak gerekir."] };
}

function priorFactFromHistory(history: readonly { readonly role: "user" | "assistant"; readonly text: string }[], artifact: VariantContentArtifact): PublicVariantFact | undefined {
  const assistantText = history.filter((item) => item.role === "assistant").slice(-4).map((item) => item.text).join(" ");
  return artifact.facts.find((fact) => assistantText.includes(`${fact.label}:`) || assistantText.includes(fact.value));
}

const comparisonRequest = (value: string) => /(?:rakip|başka (?:bir )?araç|alternatif|hangisini al|karşılaştır|kıyasla|versus|\bvs\b)/iu.test(value);
const explicitlyOffTopic = (value: string) => /(?:hava durumu|yemek tarifi|siyaset|seçim sonucu|kod yaz|programlama|şiir|futbol|maç sonucu|kripto|borsa|sağlık tavsiyesi|hukuk danışmanlığı)/iu.test(value);

function paidComparisonRedirect(title: string): AdvisorReply {
  return {
    messages: [
      `Bu sohbet yalnız ${title} için ayrılmıştır; burada başka bir aracı değerlendirmem veya iki araç arasında seçim yapmam.`,
      "Bu aracı aynı sınıftan iki alternatifle teknik özellik, donanım, kullanım uygunluğu ve maliyet göstergeleri üzerinden karşılaştırmak için kişisel karşılaştırma raporunu kullanabilirsin.",
    ],
    action: { label: "2 araç seç ve karşılaştır", href: "#paid-comparison-title" },
  };
}

function withResearch(reply: AdvisorReply, evidence: readonly OfficialResearchEvidence[]): AdvisorReply {
  if (!evidence.length) return reply;
  return { ...reply, messages: [...reply.messages, ...evidence.map((item) => `Seçili araç için kayıtlı resmî kaynakta soruyla ilişkili güncel bölüm: “${item.excerpt}” Kaynak: ${item.sourceLabel} — ${item.sourceUrl}`)] };
}

function ownershipAnswer(question: string, artifact: VariantContentArtifact, evidence: readonly OfficialResearchEvidence[] = []): AdvisorReply {
  const n = normalize(question);
  if (/(finansman|kredi|faiz|taksit|pesinat)/u.test(n)) return withResearch({ messages: [
    `${artifact.title} için finansmanı peşinat, vade, aylık faiz veya kâr payı, tahsis masrafı ve toplam geri ödeme üzerinden değerlendirmek gerekir.`,
    artifact.price.status === "VERIFIED" ? `Hesaplamaya başlangıç referansı olarak ${artifact.price.display} kullanılabilir; kampanya, stok ve krediye bağlı nihai satış fiyatı yetkili satıcı teklifinde doğrulanmalıdır.` : "Doğrulanmış güncel satış fiyatı bulunmadığı için aylık ödeme veya toplam geri ödeme tutarı üretmiyorum; önce yetkili satıcıdan güncel fiyat ve finansman teklifi alınmalıdır.",
    "Teklif geldiğinde peşinat, vade ve aylık ödeme bilgilerini yazarsan toplam maliyeti kalem kalem açıklayabilirim.",
  ] }, evidence);
  if (/(kasko|sigorta|trafik sigortasi)/u.test(n)) return withResearch({ messages: [
    `${artifact.title} için kasko primi; sürücü geçmişi, il, kullanım türü, hasarsızlık, teminatlar, muafiyet ve sigorta şirketinin güncel tarifesine göre kişiye özel hesaplanır.`,
    "Sağlıklı karşılaştırmada yalnız primi değil; yetkili servis/onarıma ilişkin koşulları, orijinal parça kapsamını, ikame aracı, mini onarımı, muafiyeti ve elektrikliyse batarya teminatını birlikte kontrol et.",
    "Bu veriler olmadan kesin prim söylemek yanıltıcı olur; teklif kalemlerini paylaşırsan kapsam farklarını bu araç özelinde açıklayabilirim.",
  ] }, evidence);
  if (/(bakim|servis|garanti|yedek parca|onarim)/u.test(n)) return withResearch({ messages: [
    `${artifact.title} için periyodik bakım zamanı ve kapsamı model yılına, motora, kullanım koşullarına ve Türkiye garanti/bakım planına bağlıdır.`,
    "Bu exact varyantın yayımlanmış bakım periyodu karttaki kanıt paketinde yer almıyorsa kilometre veya süre uydurmam; güncel kullanım kılavuzu ile yetkili servis bakım planı esas alınmalıdır.",
    "Teklifte bakım paketi, garanti süresi, aşınan parçalar, yol yardımı ve ikame araç kapsamını ayrı kalemler halinde istemeni öneririm.",
  ] }, evidence);
  if (/(ikinci el|deger kaybi|piyasa|mtv|vergi)/u.test(n)) return withResearch({ messages: [
    `${artifact.title} için piyasa değerlendirmesinde güncel satış fiyatı, arz ve teslim süresi, ikinci el ilanları değil gerçekleşmiş satış eğilimi, garanti durumu, servis ağı ve kullanım maliyeti birlikte ele alınmalıdır.`,
    "MTV ve diğer güncel tutarlar tescil tarihi, motor/güç bilgisi ve yürürlükteki tarifeye bağlıdır. Tarihli resmî tarife veya teklif olmadan kesin tutar üretmem.",
    "Güncel satıcı teklifi, vergi kalemi ya da ikinci el değerleme belgesi paylaşırsan bu araç özelinde ne anlama geldiğini açıklayabilirim.",
  ] }, evidence);
  return withResearch({ messages: [
    `${artifact.title} için sahip olma maliyetini satış fiyatı, finansman toplam geri ödemesi, kasko ve trafik sigortası, vergi, enerji/yakıt, periyodik bakım, lastik ve değer kaybı birlikte oluşturur.`,
    "Kişiye ve tarihe bağlı tutarları kesinleştirmek için güncel teklif gerekir; elindeki teklif kalemlerini paylaşırsan bu araç özelinde anlaşılır bir maliyet dökümüne çevirebilirim.",
  ] }, evidence);
}

function technicalOverview(artifact: VariantContentArtifact): AdvisorReply {
  const verified = artifact.facts.filter((item) => item.disposition === "VERIFIED");
  const lines = verified.reduce<string[]>((groups, item, index) => {
    const group = Math.floor(index / 5);
    groups[group] = [...(groups[group] ? [groups[group]!] : []), `${item.label}: ${item.value}`].join(" · ");
    return groups;
  }, []);
  return { messages: [
    `${artifact.title} için mevcut doğrulanmış teknik özet:`,
    ...lines.slice(0, 4),
    artifact.equipment.length ? `Doğrulanmış donanımlar: ${artifact.equipment.slice(0, 8).map((item) => item.value).join(", ")}.` : "Bu exact varyant için yayımlanabilir doğrulanmış donanım listesi henüz bulunmuyor.",
    "Bir değerin günlük kullanımdaki anlamını sorarsan sınıf içindeki konumuyla birlikte açıklayabilirim.",
  ] };
}

export function answerSalesAdvisor(input: { question: string; artifact: VariantContentArtifact; handoff: Phase2HandoffPayload; semantic?: SalesSemanticInterpretation; history?: readonly { readonly role: "user" | "assistant"; readonly text: string }[]; researchEvidence?: readonly OfficialResearchEvidence[] }): AdvisorReply {
  const q = input.question.trim(); const n = normalize(q); if (!q) throw new TypeError("PHASE2_QUESTION_EMPTY");
  if (input.semantic?.intent === "COMPARISON" || comparisonRequest(q)) return paidComparisonRedirect(input.artifact.title);
  if (explicitlyOffTopic(q)) return { messages: [`Bu sohbet yalnız ${input.artifact.title} ve bu araca sahip olma süreciyle ilgilidir. Teknik özellik, donanım, kullanım, fiyat, finansman, kasko veya bakım hakkında yardımcı olabilirim.`] };
  if (input.semantic?.answerMode === "CLARIFY" && input.semantic.clarification) return { messages: [input.semantic.clarification] };
  const semanticFacts = input.semantic?.requestedFactKeys.map((key) => input.artifact.facts.find((item) => item.key === key)).filter((item): item is PublicVariantFact => Boolean(item)) ?? [];
  if (semanticFacts.length > 1) return multipleFactAnswer(semanticFacts);
  const semanticFact = semanticFacts[0];
  if (semanticFact) {
    const reply = directAnswer(semanticFact);
    if (semanticFact.key === "seats" && input.semantic?.answerMode === "EXPLAIN_BENEFIT") return { messages: [reply.messages[0], "Bu sayı yolcu kapasitesini doğrular; tüm yolcuların konforlu biçimde seyahat edeceğini tek başına kanıtlamaz. Arka sıra diz ve bagaj alanını test sürüşünde birlikte denemek en sağlıklısıdır.", ...reply.messages.slice(1)] };
    return reply;
  }
  const semanticEquipment = input.semantic?.requestedEquipmentKeys.map((key) => input.artifact.equipment.find((item) => item.key === key)).filter((item): item is PublicVariantFact => Boolean(item)) ?? [];
  if (semanticEquipment.length) return { messages: [...semanticEquipment.map((item) => `Evet, ${item.value} bu exact varyantın doğrulanmış donanım kaydında yer alıyor.${item.dailyMeaning ? ` ${item.dailyMeaning}` : ""}`), "Satın alma öncesinde üretim tarihi ve güncel sipariş formundaki donanımı bayiyle son kez teyit etmeni öneririm."] };
  if (/(fiyat|kac para|ucret)/u.test(n)) return { messages: [`${input.artifact.title} için fiyat durumu: ${input.artifact.price.display}.`, input.artifact.price.note, "İstersen bu exact varyant için yan etkisiz teklif geçişini hazırlayabilirim."] };
  if (/renk/u.test(n)) return { messages: [input.artifact.colors.length ? `Yayınlanabilir renk seçenekleri: ${input.artifact.colors.map((item) => item.value).join(", ")}.` : "Bu market, model yılı ve exact varyant için doğrulanmış renk kaydı henüz yok; renk seçeneği iddiasında bulunmayacağım.", ...(input.artifact.colors[0]?.scopeNote ? [input.artifact.colors[0].scopeNote] : [])] };
  if (/video/u.test(n)) return { messages: [input.artifact.video ? "Bu varyant için doğrulanmış tanıtım videosu sayfada yer alıyor." : "Bu exact varyanta bağlı resmî veya lisanslı bir video doğrulanmadığı için video göstermiyorum."] };
  if (/(bu|bunun|o|bunu) ne (?:demek|anlama geliyor)|biraz daha acikla|peki ya bu/iu.test(n)) {
    const prior = priorFactFromHistory(input.history ?? [], input.artifact);
    if (prior) return directAnswer(prior);
  }
  const matchingFacts = findFacts(q, input.artifact); if (matchingFacts.length > 1) return multipleFactAnswer(matchingFacts);
  const matching = matchingFacts[0] ?? findFact(q, input.artifact); if (matching) return directAnswer(matching);
  if (input.semantic?.intent === "OWNERSHIP_QUERY" || /(finansman|kredi|faiz|taksit|pesinat|kasko|sigorta|bakim|servis|garanti|yedek parca|onarim|sahip olma maliyeti|ikinci el|deger kaybi|piyasa|mtv|vergi)/u.test(n)) return ownershipAnswer(q, input.artifact, input.researchEvidence);
  if (/(tum teknik|teknik bilgiler|teknik ozellikler|ozelliklerini anlat|detayli anlat)/u.test(n)) return technicalOverview(input.artifact);
  const equipment = input.artifact.equipment.find((item) => { const needle = normalize(item.value); const words = [...tokens(item.value)]; return n.includes(needle) || words.filter((word) => n.includes(word)).length >= Math.min(2, words.length); });
  if (equipment) return { messages: [`Evet, ${equipment.value} bu exact varyantın doğrulanmış donanım kaydında yer alıyor.`, "Satın alma öncesinde üretim tarihi ve güncel sipariş formundaki donanımı bayiyle son kez teyit etmeni öneririm."] };
  if (/(dezavantaj|eksi|zayif|olumsuz)/u.test(n)) return { messages: ["Zayıf noktayı saklamam; ancak kanıtsız bir kusur da üretmem.", "Bagaj, tüketim, ağırlık, boyut, performans veya donanım gibi ölçütlerden birini söylersen exact veriyi ve eksik kalan tarafı açıkça değerlendirebilirim."] };
  if (/(neden|anlat|uygun|avantaj|almali)/u.test(n)) { const strengths = input.artifact.facts.filter((item) => item.disposition === "VERIFIED" && item.dailyMeaning).slice(0, 2); const need = input.handoff.approvedNeeds[0]?.summary; return { messages: [`${input.artifact.title}, ${strengths.length ? strengths.map((item) => `${item.label.toLocaleLowerCase("tr-TR")} ${item.value}`).join(" ve ") : "doğrulanmış teknik yapısı"} ile güçlü bir seçenek.`, ...strengths.slice(0, 1).map((item) => item.dailyMeaning!), ...(need ? [`Bunu karar görüşmesinde onayladığın “${need}” ihtiyacı açısından değerlendirebilirim; senin söylemediğin bir kullanım biçimi varsaymam.`] : []), "Bu aracın teknik verileri, donanımı, kullanım maliyeti veya satın alma süreciyle ilgili ayrıntıyı sorabilirsin."] }; }
  return { messages: [`Sorunu ${input.artifact.title} özelinde yanıtlayabilirim. Teknik özellik, donanım, günlük kullanım, fiyat, finansman, kasko veya bakım başlıklarından hangisini incelemek istediğini biraz daha açık yazar mısın?`, "Exact kaydı bulunmayan güncel veya kişiye özel tutarı uydurmam; bunun yerine hangi belge veya tekliften doğrulanacağını açıkça söylerim."] };
}
