import type { Phase2HandoffPayload, PublicVariantFact, VariantContentArtifact } from "./types";
import type { SalesSemanticInterpretation } from "./semantic.server";

export interface AdvisorReply { readonly messages: readonly string[]; readonly action?: { readonly label: string; readonly href: string } }

const normalize = (value: string) => value.toLocaleLowerCase("tr-TR").replace(/ğ/gu, "g").replace(/ş/gu, "s").replace(/ç/gu, "c").replace(/ı/gu, "i").replace(/ö/gu, "o").replace(/ü/gu, "u").normalize("NFKD").replace(/\p{M}+/gu, "").replace(/[^a-z0-9]+/gu, " ").trim();
const tokens = (value: string) => new Set(normalize(value).split(" ").filter((item) => item.length > 1));
const aliases: Readonly<Record<string, readonly string[]>> = {
  emptyMass: ["agirlik", "bos agirlik", "bos kutle", "kac kilo", "kg"], runningOrderMass: ["yurur vaziyette", "suruse hazir", "yurur kutle"], maximumPermissibleMass: ["azami agirlik", "yuklu agirlik", "azami kutle"],
  power: ["guc", "beygir", "hp", "bg", "kw"], torque: ["tork", "nm"], engineDisplacement: ["motor hacmi", "silindir hacmi", "kac cc", "cc"], transmission: ["sanziman", "vites", "otomatik", "manuel"], drivenWheels: ["cekis", "onde cekis", "arkadan itis", "4x4"],
  seats: ["koltuk", "koltuk sayisi", "kac kisilik", "kisi kapasitesi", "yolcu", "yolcu sayisi", "yolcu kapasitesi", "kapasite"], luggage: ["bagaj", "bagaj hacmi"], cargoVolume: ["yukleme hacmi", "azami bagaj"], payload: ["tasima kapasitesi", "yuk kapasitesi"], brakedTowing: ["romork", "cekme kapasitesi"],
  length: ["uzunluk", "boyu"], width: ["genislik", "eni"], height: ["yukseklik"], wheelbase: ["dingil mesafesi"], fuelType: ["yakit", "benzin", "dizel", "lpg", "elektrik"], consumption: ["tuketim", "ne kadar yakar", "yakit tuketimi"], electricConsumption: ["elektrik tuketimi"], range: ["elektrikli menzil"], officialCombinedRange: ["toplam menzil", "bir depo", "menzil"], dcCharge: ["dc sarj", "hizli sarj"], batteryCapacity: ["batarya", "batarya kapasitesi"], usableBattery: ["kullanilabilir batarya"],
  modularRoofBars: ["tavan bari", "tavan barlari", "portbagaj", "tavan tasiyici", "arac ustu ekipman", "tavan ustu aksesuar"], dynamicRoofLoad: ["tavan yuku", "tavan tasima kapasitesi", "tavana kac kilo", "portbagaj kapasitesi"],
};

function factScore(question: string, item: PublicVariantFact): number {
  const q = normalize(question); const qTokens = tokens(question);
  const terms = [item.key, item.label, ...(aliases[item.key] ?? [])].map(normalize);
  return Math.max(...terms.map((term) => q.includes(term) || (term.length >= 6 && q.includes(term.slice(0, -2))) ? 100 + term.length : [...tokens(term)].filter((token) => [...qTokens].some((candidate) => candidate === token || (token.length >= 6 && candidate.startsWith(token.slice(0, -2))))).length));
}

function findFact(question: string, artifact: VariantContentArtifact): PublicVariantFact | undefined {
  return artifact.facts.map((item) => ({ item, score: factScore(question, item) })).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score || a.item.key.localeCompare(b.item.key))[0]?.item;
}

const scopeSentence = (fact: PublicVariantFact) => fact.disposition === "VERIFIED" ? "Bu değer Türkiye pazarı için exact varyanta bağlı doğrulanmış katalog kaydıdır." : `${fact.scopeNote ?? "Bu bilgi exact varyant yerine daha geniş bir kapsama aittir."} Bu nedenle Türkiye'deki aracın kesin değeri olarak sunmuyorum.`;
function directAnswer(fact: PublicVariantFact): AdvisorReply { return { messages: [`${fact.label}: ${fact.value}.${fact.dailyMeaning ? ` ${fact.dailyMeaning}` : ""}`, scopeSentence(fact), ...(fact.source ? [`Kaynak: ${fact.source.label} — ${fact.source.url}`] : [])] }; }

function mentionedComparisons(question: string, selected: VariantContentArtifact, candidates: readonly VariantContentArtifact[]): readonly VariantContentArtifact[] {
  const q = ` ${normalize(question)} `;
  return candidates.filter((candidate) => candidate.exactVariantId !== selected.exactVariantId && [`${candidate.identity.brand} ${candidate.identity.model}`, candidate.identity.model].some((name) => { const needle = normalize(name); return needle.length > 2 && q.includes(` ${needle} `); })).filter((candidate, index, all) => all.findIndex((item) => item.exactVariantId === candidate.exactVariantId) === index).slice(0, 3);
}

function compare(input: { question: string; artifact: VariantContentArtifact; candidates: readonly VariantContentArtifact[] }): AdvisorReply {
  const mentioned = mentionedComparisons(input.question, input.artifact, input.candidates);
  if (!mentioned.length) return { messages: ["Karşılaştırabilirim; seçtiğin araç ana referans olarak kalır ve Aşama 1 kararın değişmez.", "Karşılaştırmak istediğin marka ve modeli yazarsan ortak doğrulanmış verileri yan yana göstereceğim."] };
  const field = findFact(input.question, input.artifact); const keys = field ? [field.key] : ["price", "power", "seats", "luggage", "consumption"];
  const lines = [input.artifact, ...mentioned].map((vehicle) => { const values = keys.flatMap((key) => { if (key === "price") return [`fiyat ${vehicle.price.display}`]; const found = vehicle.facts.find((item) => item.key === key && item.disposition === "VERIFIED"); return found ? [`${found.label.toLocaleLowerCase("tr-TR")} ${found.value}`] : []; }); return `${vehicle.title}: ${values.length ? values.join(" · ") : "ortak exact doğrulanmış alan bulunamadı"}.`; });
  return { messages: [`${mentioned.map((item) => item.title).join(" ve ")} ile kararını değiştirmeden karşılaştırdım.`, ...lines, "Yalnız iki araçta aynı kapsamda doğrulanmış alanları yan yana gösteririm; doğrulanmayan alan için ‘yok’ demem.", "Bu tekil veriler araçların genel kalite veya güvenlik düzeyini göstermez ve Aşama 1 sıralamasını değiştirmez."] };
}

export function answerSalesAdvisor(input: { question: string; artifact: VariantContentArtifact; handoff: Phase2HandoffPayload; comparisonArtifacts?: readonly VariantContentArtifact[]; semantic?: SalesSemanticInterpretation }): AdvisorReply {
  const q = input.question.trim(); const n = normalize(q); if (!q) throw new TypeError("PHASE2_QUESTION_EMPTY");
  if (input.semantic?.answerMode === "CLARIFY" && input.semantic.clarification) return { messages: [input.semantic.clarification] };
  if (input.semantic?.intent === "COMPARISON") return compare({ question: `${q} ${input.semantic.comparisonVehicleNames.join(" ")}`, artifact: input.artifact, candidates: input.comparisonArtifacts ?? [] });
  const semanticFact = input.semantic?.requestedFactKeys.map((key) => input.artifact.facts.find((item) => item.key === key)).find((item): item is PublicVariantFact => Boolean(item));
  if (semanticFact) {
    const reply = directAnswer(semanticFact);
    if (semanticFact.key === "seats" && input.semantic?.answerMode === "EXPLAIN_BENEFIT") return { messages: [reply.messages[0], "Bu sayı yolcu kapasitesini doğrular; sekiz kişinin konforlu biçimde seyahat edeceğini tek başına kanıtlamaz. Üçüncü sıra diz ve bagaj alanını test sürüşünde birlikte denemek en sağlıklısıdır.", ...reply.messages.slice(1)] };
    return reply;
  }
  const semanticEquipment = input.semantic?.requestedEquipmentKeys.map((key) => input.artifact.equipment.find((item) => item.key === key)).find((item): item is PublicVariantFact => Boolean(item));
  if (semanticEquipment) return { messages: [`Evet, ${semanticEquipment.value} bu exact varyantın doğrulanmış donanım kaydında yer alıyor.`, "Satın alma öncesinde üretim tarihi ve güncel sipariş formundaki donanımı bayiyle son kez teyit etmeni öneririm."] };
  if (/(rakip|baska arac|alternatif|hangisini al|karsilastir|versus| vs )/u.test(` ${n} `)) return compare({ question: q, artifact: input.artifact, candidates: input.comparisonArtifacts ?? [] });
  if (/(fiyat|kac para|ucret)/u.test(n)) return { messages: [`${input.artifact.title} için fiyat durumu: ${input.artifact.price.display}.`, input.artifact.price.note, "İstersen bu exact varyant için yan etkisiz teklif geçişini hazırlayabilirim."] };
  if (/renk/u.test(n)) return { messages: [input.artifact.colors.length ? `Yayınlanabilir renk seçenekleri: ${input.artifact.colors.map((item) => item.value).join(", ")}.` : "Bu market, model yılı ve exact varyant için doğrulanmış renk kaydı henüz yok; renk seçeneği iddiasında bulunmayacağım.", ...(input.artifact.colors[0]?.scopeNote ? [input.artifact.colors[0].scopeNote] : [])] };
  if (/video/u.test(n)) return { messages: [input.artifact.video ? "Bu varyant için doğrulanmış tanıtım videosu sayfada yer alıyor." : "Bu exact varyanta bağlı resmî veya lisanslı bir video doğrulanmadığı için video göstermiyorum."] };
  const matching = findFact(q, input.artifact); if (matching) return directAnswer(matching);
  const equipment = input.artifact.equipment.find((item) => { const needle = normalize(item.value); const words = [...tokens(item.value)]; return n.includes(needle) || words.filter((word) => n.includes(word)).length >= Math.min(2, words.length); });
  if (equipment) return { messages: [`Evet, ${equipment.value} bu exact varyantın doğrulanmış donanım kaydında yer alıyor.`, "Satın alma öncesinde üretim tarihi ve güncel sipariş formundaki donanımı bayiyle son kez teyit etmeni öneririm."] };
  if (/(dezavantaj|eksi|zayif|olumsuz)/u.test(n)) return { messages: ["Zayıf noktayı saklamam; ancak kanıtsız bir kusur da üretmem.", "Bagaj, tüketim, ağırlık, boyut, performans veya donanım gibi ölçütlerden birini söylersen exact veriyi ve eksik kalan tarafı açıkça değerlendirebilirim."] };
  if (/(neden|anlat|uygun|avantaj|almali)/u.test(n)) { const strengths = input.artifact.facts.filter((item) => item.disposition === "VERIFIED" && item.dailyMeaning).slice(0, 2); const need = input.handoff.approvedNeeds[0]?.summary; return { messages: [`${input.artifact.title}, ${strengths.length ? strengths.map((item) => `${item.label.toLocaleLowerCase("tr-TR")} ${item.value}`).join(" ve ") : "doğrulanmış teknik yapısı"} ile güçlü bir seçenek.`, ...strengths.slice(0, 1).map((item) => item.dailyMeaning!), ...(need ? [`Bunu Aşama 1'de onayladığın “${need}” ihtiyacı açısından değerlendirebilirim; senin söylemediğin bir kullanım biçimi varsaymam.`] : []), "İstersen en çok önem verdiğin ölçütte bir rakiple açıkça kıyaslayalım."] }; }
  return { messages: [`${input.artifact.title} hakkında sorunu doğrudan yanıtlamak için hazırım. Ağırlık, motor, tork, tüketim, bagaj, boyut, donanım, fiyat veya belirttiğin bir rakiple karşılaştırma sorabilirsin.`, "Doğrulanmamış özelliği varmış gibi anlatmam; kapsamı daha geniş olan bilgiyi de açıkça etiketlerim."] };
}
