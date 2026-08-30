import { z } from "zod";

const factSchema = z.object({ value: z.union([z.string(), z.number()]).nullable(), missing: z.boolean(), confidence: z.string().nullable().optional(), sources: z.array(z.string()).optional() });
const vehicleSchema = z.object({
  exactVariantId: z.string().min(1).max(300), role: z.string(),
  identity: z.object({ brand: z.string(), model: z.string(), trim: z.string(), sources: z.array(z.string()).optional() }),
  price: z.object({ value: z.number().nullable(), missing: z.boolean(), validFrom: z.string().nullable().optional(), confidence: z.string().nullable().optional(), sources: z.array(z.string()).optional() }),
  facts: z.record(z.string(), factSchema),
});
export const paidComparisonAdvisorReportSchema = z.object({
  schemaVersion: z.string(), generatedAt: z.string(), catalogReleaseVersion: z.string(),
  needsSummary: z.array(z.object({ concept: z.string(), summary: z.string() })),
  assessment: z.object({
    conclusion: z.string(), leaders: z.array(z.string()),
    scores: z.array(z.object({ exactVariantId: z.string(), score: z.number().nullable(), evaluatedNeedCount: z.number(), totalApprovedNeedCount: z.number(), breakdown: z.array(z.object({ concept: z.string(), label: z.string(), score: z.number() })) })),
    conditions: z.array(z.object({ exactVariantId: z.string(), text: z.string() })),
  }),
  vehicles: z.array(vehicleSchema).length(3),
});
export type PaidComparisonAdvisorReport = z.infer<typeof paidComparisonAdvisorReportSchema>;
export type PaidComparisonSalesIntent = "REQUEST_QUOTE" | "REQUEST_TEST_DRIVE" | "REQUEST_DEALER_CONTACT";
export interface PaidComparisonAdvisorReply { readonly messages: readonly string[]; readonly action?: { readonly exactVariantId: string; readonly intent: PaidComparisonSalesIntent; readonly label: string }; readonly turn?: { readonly used: number; readonly limit: number; readonly remaining: number; readonly ended: boolean } }

const labels: Record<string, string> = { bodyStyle: "Gövde", modelYear: "Model yılı", fuelType: "Yakıt / enerji", powerKw: "Güç", torqueNm: "Tork", transmission: "Şanzıman", luggageLitres: "Bagaj", combinedLitresPer100Km: "Yakıt tüketimi", combinedKwhPer100Km: "Elektrik tüketimi", electricRangeKm: "Elektrikli menzil", maxDcChargeKw: "DC şarj gücü" };
const aliases: Record<string, readonly string[]> = { powerKw: ["guc", "beygir", "kw"], torqueNm: ["tork", "nm"], luggageLitres: ["bagaj", "litre"], combinedLitresPer100Km: ["yakit tuketimi", "ne kadar yakar", "tuketim"], combinedKwhPer100Km: ["elektrik tuketimi", "tuketim"], electricRangeKm: ["menzil", "tek sarj"], maxDcChargeKw: ["sarj", "hizli sarj", "dc"], price: ["fiyat", "ucuz", "pahali", "maliyet"] };
const normalize = (value: string) => value.toLocaleLowerCase("tr-TR").replace(/ğ/gu, "g").replace(/ş/gu, "s").replace(/ç/gu, "c").replace(/ı/gu, "i").replace(/ö/gu, "o").replace(/ü/gu, "u").normalize("NFKD").replace(/\p{M}+/gu, "").replace(/[^a-z0-9]+/gu, " ").trim();
const title = (vehicle: PaidComparisonAdvisorReport["vehicles"][number]) => `${vehicle.identity.brand} ${vehicle.identity.model} ${vehicle.identity.trim}`.trim();
const money = (value: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);

function mentionedVehicles(question: string, report: PaidComparisonAdvisorReport) {
  const q = normalize(question);
  return report.vehicles.filter((vehicle) => [vehicle.identity.brand, vehicle.identity.model, `${vehicle.identity.brand} ${vehicle.identity.model}`].some((needle) => q.includes(normalize(needle))));
}
function requestedMetric(question: string): string | undefined {
  const q = normalize(question);
  return Object.entries(aliases).find(([, terms]) => terms.some((term) => q.includes(term)))?.[0];
}
function salesIntent(question: string): PaidComparisonSalesIntent | undefined {
  const q = normalize(question);
  if (/(test surus|denemek|surmek)/u.test(q)) return "REQUEST_TEST_DRIVE";
  if (/(fiyat teklifi|teklif iste|fiyat al)/u.test(q)) return "REQUEST_QUOTE";
  if (/(bayi|satici|iletisim|gorusmek)/u.test(q)) return "REQUEST_DEALER_CONTACT";
}

function metricAnswer(metric: string, vehicles: readonly PaidComparisonAdvisorReport["vehicles"][number][]): readonly string[] {
  if (metric === "price") return vehicles.map((vehicle) => `${title(vehicle)}: ${vehicle.price.value === null || vehicle.price.missing ? "doğrulanmış fiyat bulunmuyor" : money(vehicle.price.value)}.`);
  return vehicles.map((vehicle) => {
    const fact = vehicle.facts[metric];
    return `${title(vehicle)} — ${labels[metric] ?? metric}: ${!fact || fact.missing || fact.value === null ? "doğrulanamadı" : fact.value}.`;
  });
}

export function answerPaidComparisonAdvisor(input: { readonly question: string; readonly report: PaidComparisonAdvisorReport }): PaidComparisonAdvisorReply {
  const question = input.question.normalize("NFKC").trim(); if (!question) throw new TypeError("PAID_ADVISOR_QUESTION_EMPTY");
  const mentioned = mentionedVehicles(question, input.report);
  const intent = salesIntent(question);
  if (intent) {
    if (mentioned.length !== 1) return { messages: ["Satış adımını hangi araç için hazırlamamı istediğini marka ve model adıyla belirtir misin? Rapordaki üç araçtan yalnız biri için güvenli geçiş oluşturabilirim."] };
    const label = intent === "REQUEST_QUOTE" ? "Fiyat teklifi adımına geç" : intent === "REQUEST_TEST_DRIVE" ? "Test sürüşü adımına geç" : "Satıcı iletişimi adımına geç";
    return { messages: [`${title(mentioned[0]!)} için ${label.toLocaleLowerCase("tr-TR")} bağlantısını hazırlayabilirim. Bu aşamada henüz talep veya randevu oluşmaz.`], action: { exactVariantId: mentioned[0]!.exactVariantId, intent, label } };
  }
  const comparisonRequested = /(?:karsilastir|kiyasla|farki|hangisi|avantaj|dezavantaj|daha iyi|tercih)/u.test(normalize(question));
  const metric = requestedMetric(question);
  if (metric) {
    const vehicles = mentioned.length ? mentioned : input.report.vehicles;
    return { messages: [...metricAnswer(metric, vehicles), "Eksik veya düşük güvenli veri, diğer araçta bu özelliğin bulunmadığı anlamına gelmez; raporda yalnız kayıtlı katalog kanıtını kullanıyorum."] };
  }
  if (comparisonRequested) {
    const vehicles = mentioned.length >= 2 ? mentioned : input.report.vehicles;
    const summaries = vehicles.map((vehicle) => {
      const score = input.report.assessment.scores.find((item) => item.exactVariantId === vehicle.exactVariantId);
      const condition = input.report.assessment.conditions.find((item) => item.exactVariantId === vehicle.exactVariantId);
      return `${title(vehicle)}: ${score?.score === null || score?.score === undefined ? "ortak doğrulanmış ihtiyaç puanı üretilemedi" : `${score.score}/100; ${score.evaluatedNeedCount}/${score.totalApprovedNeedCount} ihtiyaç ölçülebildi`}.${condition ? ` ${condition.text}` : ""}`;
    });
    return { messages: [input.report.assessment.conclusion, ...summaries, "Bu karşılaştırma genel araç kalitesi, güvenlik hükmü veya kesin satın alma talimatı değildir; yalnız rapordaki ortak doğrulanmış veriler ve onaylı ihtiyaçlar içindir."] };
  }
  if (mentioned.length === 1) {
    const vehicle = mentioned[0]!; const score = input.report.assessment.scores.find((item) => item.exactVariantId === vehicle.exactVariantId); const condition = input.report.assessment.conditions.find((item) => item.exactVariantId === vehicle.exactVariantId);
    return { messages: [`${title(vehicle)} raporda ${vehicle.role === "DECISION_CARD" ? "karar kartındaki araç" : "alternatif araç"} olarak yer alıyor.${score?.score === null || score?.score === undefined ? " Ortak doğrulanmış verilerle puan üretilemedi." : ` Onaylı ihtiyaçların ölçülebilen bölümünde puanı ${score.score}/100.`}`, ...(condition ? [condition.text] : []), "Fiyat, menzil, tüketim, güç, bagaj veya şarj gibi bir başlık sorarsan üç araç arasındaki farkı gösterebilirim."] };
  }
  return { messages: ["Sorunu rapordaki üç araçla sınırlı yanıtlayabilirim. Hangi araçları veya fiyat, menzil, tüketim, güç, bagaj ve şarj gibi hangi ölçütü karşılaştırmak istediğini biraz daha açık yazar mısın?"] };
}
