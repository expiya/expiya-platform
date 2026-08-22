import { loadActiveVehiclePersonaSafeTraits, } from "@/features/vehicle-data/vehiclePersonaSafeTraits.server";
import { createHash } from "node:crypto";
import { selectOwnerApprovedSafePersonaSignals } from "@/features/vehicle-data/vehiclePersonaSafeTraits";
import { decideConversationAction } from "../action/decide";
import { ACTION_POLICY_V1 } from "../action/policy";
import { generateMaterialQuestionCandidates } from "../action/questionGeneration";
import { createLatestUncoveredPreferenceRelaxation } from "../action/preferenceRelaxation";
import { createAffordabilityConflictRecovery } from "../action/affordabilityConflict";
import { createTechnicalHardConflictRecovery } from "../action/technicalConflict";
import { createConversationLocalSemanticRecoveryQuestion } from "../action/semanticRecovery";
import { assessRecommendationReadiness } from "../action/readiness";
import { evaluateAffordabilityCandidatePool } from "../affordability/evaluate";
import { AFFORDABILITY_POLICY_V1, PRICE_AUTHORITY_POLICY_V1 } from "../affordability/policy";
import { projectRelativePriceSegmentsCached } from "../affordability/priceSegmentation";
import { createProductionCatalogReleaseRepository } from "../catalog/fileSystemRepository.server";
import { loadActiveCatalogSnapshot, loadPinnedCatalogSnapshot } from "../catalog/snapshot";
import { classifyCandidateDecisionAvailability } from "../conflict/availability";
import type { DirectAnswerObligation } from "../domain/decisionTurnResult";
import { projectActiveConstraints } from "../filter/constraintProjection";
import { evaluateTechnicalCandidatePool } from "../filter/pipeline";
import { projectActiveRejections } from "../filter/rejectionProjection";
import { V2_DECISION_FIELD_REGISTRY_V1 } from "../filter/registry";
import { CARS_MEMORY_FINGERPRINT_POLICY_V1 } from "../fingerprint/policy";
import { interpretDeterministicCatalogComparison, interpretDeterministicCatalogOverview, interpretDeterministicCatalogSuperlative, interpretDeterministicControlledVehicleRequest, interpretDeterministicMaterialQuestionAnswer, interpretDeterministicModelLookup, interpretDeterministicModelSuitability, interpretUserMessage, isDeterministicCrossFieldQuestionAnswer, isDeterministicMaterialQuestionAnswer } from "../interpretation/service";
import type { NaturalRealizationModel } from "../realization/types";
import type { StructuredInterpretationModel } from "../interpretation/types";
import { createDailyLifeLayerSnapshot, createPersonaLayerSnapshot } from "../layers/adapter";
import { loadProductionDecisionLayers } from "../layers/productionAdapter.server";
import { reduceConversationMemoryV2, replayConversationMemoryV2 } from "../memory/reducer";
import { authorizePersistedCards, createPersistedGovernedOffer } from "../offer/authorize";
import { offerIdentityFingerprint } from "../offer/recOfferAuditFoundation.server";
import type { GovernedOfferStore, OfferSigner } from "../offer/types";
import type { PersistedOfferTransitionIntent } from "../orchestrator/types";
import { rankSelectableCandidates } from "../ranking/evaluate";
import { createExplicitFunctionalPreferenceSignals } from "../ranking/constraintSignals";
import { selectBudgetNearestShortlist, selectLeadingDecisionCohortIds } from "../ranking/finalCandidateSelection";
import { selectRankedCandidateShortlist } from "../ranking/shortlist";
import { realizeDecisionResponse } from "../realization/service";
import { REALIZATION_SAFETY_POLICY_V1, TURKISH_TONE_POLICY } from "../realization/policy";
import { USAGE_CARGO_POLICIES_V1 } from "../usage/policy";
import { projectUsageCargoNeedFromConstraints } from "../usage/memoryProjection";
import { evaluateUsageCargoSuitability } from "../usage/evaluate";
import { createConversationEventsFromInterpretation } from "../orchestrator/eventFactory";
import type { V2TurnStages } from "../orchestrator/types";
import { projectAuthorizedPublicCards } from "../presentation/projectAuthorizedCard.server";
import { classifyDeterministicOfferResponse, createDeterministicOfferResponsePlan } from "../offer/offerResponse";
import type { HumanContextKind } from "../domain/humanContext";
import { detectHumanContext } from "../interpretation/humanContextPolicy";
import { createPreferenceAcknowledgement } from "../realization/preferenceAcknowledgement";

const normalizedAct = (acts: readonly string[]) => acts.includes("CLOSING") ? "CLOSING" as const : acts.includes("ABUSE") ? "ABUSE" as const : acts.includes("OFFER_ACCEPTANCE") ? "CONSENT" as const : acts.includes("OFFER_DECLINE") ? "DECLINE" as const : acts.includes("CORRECTION") ? "CORRECTION" as const : acts.includes("CANDIDATE_REJECTION") ? "REJECTION" as const : acts.includes("TECHNICAL_EXPLANATION_REQUEST") ? "TECHNICAL_EXPLANATION_REQUEST" as const : acts.includes("DONT_KNOW") ? "UNKNOWN_TECHNICAL_CONCEPT" as const : acts.includes("RECOMMENDATION_REQUEST") ? "RECOMMENDATION_REQUEST" as const : acts.includes("OFF_TOPIC") ? "OFF_TOPIC" as const : acts.some((act) => act === "GREETING" || act === "SOCIAL_MESSAGE") ? "SOCIAL" as const : "INFORMATION" as const;
const directAnswer = (messageId: string, requests: readonly { kind: DirectAnswerObligation["kind"] }[]): DirectAnswerObligation | null => requests[0] ? { kind: requests[0].kind, sourceMessageId: messageId, authorizedExplanationFactIds: ["direct-answer"], authorizedCandidateIds: [], placement: "BEFORE_MATERIAL_QUESTION" } : null;
const TECHNICAL_GUIDANCE: Readonly<Record<string, string>> = Object.freeze({
  transmission: "Şanzıman, aracın gücü tekerleklere nasıl aktardığını anlatır. Şehir içinde rahatlık istiyorsan otomatik; vites değiştirmeyi kendin yönetmek istiyorsan manuel seçebilirsin. Çift kavrama, e-DCT veya tek oran gibi alt türleri bilmen gerekmiyor; önce otomatik–manuel tercihinden ilerleyebiliriz.",
  fuelType: "Yakıt tercihini teknik adlarla bilmen gerekmiyor. Benzin kısa ve karma kullanımda tanıdık bir seçenek; dizel düzenli uzun yol yapanlara daha yakın olabilir; hibrit şehir içindeki dur-kalkta elektrik desteği kullanır; elektrikli ise şarj erişimi ister.",
  bodyStyle: "Katalogda hatchback, sedan, SUV/crossover, coupe, station wagon, MPV, pickup, panel van ve yolcu vanı gibi farklı araç türleri bulunuyor. Hatchback şehir içinde kompakt; sedan ayrı bagajlı; SUV/crossover daha yüksek yapılı; MPV ve yolcu vanı yolcu taşımaya; pickup ve panel van ise yük veya zorlu kullanıma daha yakındır. Ne aradığını bilmiyorsan sorun değil; kullanım amacından başlayıp sana uygun türü birlikte bulabiliriz. 🚗",
  drivenWheels: "FWD gücü ön tekerleklere, RWD arka tekerleklere, AWD ise ön ve arka tekerleklere aktarır. Günlük asfalt kullanımında önden çekiş çoğu kişi için yeterlidir; çamur, kar ve bozuk zeminde dört çeker daha fazla tutunma sağlayabilir.",
  budget: "Kesin bir bütçe bilmiyorsan sorun değil. İstersen rahat ödeyebileceğin aralığı söyle; bütçe önemli değilse onu da karar filtresinin dışında bırakabiliriz.",
  powerKw: "kW, elektrikli aracın motor gücünü anlatır; benzinli araçlardaki beygir gücünün başka bir ölçüsüdür. Kabaca 100–150 kW günlük şehir ve otoyol kullanımı için canlı, 150–250 kW belirgin biçimde güçlü, 250 kW üzeri ise yüksek performanslı sayılabilir. Araç ağırlığı ve çekiş düzeni de hissi değiştirdiği için yalnız kW değerine bakarak seçim yapmayız.",
  combinedLitresPer100Km: "L/100 km, aracın 100 kilometrede yaklaşık kaç litre yakıt tükettiğini anlatır. Kabaca 5 litrenin altı düşük, 5–7 litre orta, 7 litrenin üzeri daha yüksek tüketim gibi düşünülebilir; şehir trafiği, hava ve sürüş tarzı gerçek sonucu değiştirir.",
  luggageLitres: "Bagaj litresi tek başına gözünde canlanmayabilir. Yaklaşık 300 litre günlük alışveriş ve birkaç kabin boy çanta, 400–500 litre iki büyük bavul ve ek çantalar, daha geniş hacimler ise aile tatili yükü için daha rahattır; bagajın şekli de en az litre kadar önemlidir.",
  electricRangeKm: "Elektrikli menzil, tek şarjla ölçülen yaklaşık mesafedir. Günlük şehir kullanımında 250–350 km çoğu rutin için yeterli olabilir; sık uzun yolda daha yüksek menzil ve hızlı şarj erişimi daha önemlidir. Hava, hız ve klima gerçek menzili değiştirir.",
  maxDcChargePower: "DC şarj gücü, uygun hızlı şarj istasyonunda aracın enerjiyi ne kadar hızlı alabildiğini gösterir. Yüksek kW genellikle daha kısa mola demektir; fakat gerçek süre batarya sıcaklığına, doluluk aralığına ve istasyona göre değişir. Uzun yol beklentini 'kahve molası kadar' diye anlatman sayı vermenden daha yararlıdır.",
});
function inferredGuidanceField(userMessage: string): string | undefined {
  if (/\b(?:fwd|awd|rwd)\b|önden çekiş|arkadan itiş|dört çeker|çekiş düzen/iu.test(userMessage)) return "drivenWheels";
  if (/\bkw\b|motor gücü|beygir/iu.test(userMessage)) return "powerKw";
  if (/l\/100|litre.*100|yakıt tüketim|ne kadar yak/iu.test(userMessage)) return "combinedLitresPer100Km";
  if (/bagaj|bavul|valiz/iu.test(userMessage)) return "luggageLitres";
  if (/dc|hızlı şarj|şarj.*(?:süre|bekle|mola|ne kadar)|batarya.*(?:doldur|dolum|ne kadar)/iu.test(userMessage)) return "maxDcChargePower";
  if (/menzil|tek şarj/iu.test(userMessage)) return "electricRangeKm";
  if (/elektrik(?:li)?|hibrit|benzinli|dizel|yakıt|motor tür/iu.test(userMessage)) return "fuelType";
  return undefined;
}
function socialResponse(userMessage: string, kind: "GREETING" | "GENERAL" | HumanContextKind | undefined): string {
  if (/(?:hiçbir şey|hiç bir şey|beni)\s+anlamıyorsun|anlamadın|yardımcı olmuyorsun|cevap vermiyorsun/iu.test(userMessage)) return "Haklısın; soruna doğrudan cevap vermedim. Kaldığımız karar adımını koruyarak daha açık ilerleyeyim.";
  if (/nasılsın diye sormadım/iu.test(userMessage)) return "Haklısın; nasılsın diye sormadın. Önceki cevabım hatalıydı.";
  if (/sana güvenmiyorum/iu.test(userMessage)) return "Bunu söylemende haklısın; net olmayan cevaplar güven vermedi. Söylediğin ihtiyetten devam edeceğim.";
  if (/hangi tercih\??/iu.test(userMessage)) return "Henüz netleşmiş bir araç tercihin yok; önceki cevabım bu yüzden anlamsızdı.";
  if (/takıldın|döngüye girdin|aynı soruyu soruyorsun/iu.test(userMessage)) return "Haklısın, aynı soruyu tekrarladım. Kusura bakma. Seçimini yeniden yazmana gerek kalmadan kaldığımız adımdan devam etmeliydim.";
  if (/(?:harika|süper|çok güzel).*(?:beğendim|olmuş)|(?:bu aracı|bunu).*(?:çok )?beğendim/iu.test(userMessage)) return "Bunu duymak güzel! 😊 İstersen bu aracın ayrıntılı analizine geçebilir veya başka bir seçenekle karşılaştırabiliriz.";
  const humanContext = detectHumanContext(userMessage);
  if (humanContext && humanContext.kind === kind) return humanContext.safeAcknowledgement;
  if (/nasılsın|nasıl gidiyor/iu.test(userMessage)) return "İyiyim, teşekkür ederim. 😊 Sen nasılsın? Hazır olduğunda araç ihtiyacından devam edebiliriz.";
  if (/^(?:günaydın)[.! ]*$/iu.test(userMessage)) return "Günaydın! ☀️ Hoş geldin; araç seçimini birlikte netleştirebiliriz.";
  if (/^(?:iyi akşamlar|iyi geceler)[.! ]*$/iu.test(userMessage)) return "İyi akşamlar! 🌙 Hoş geldin; araç seçimini birlikte netleştirebiliriz.";
  if (/^(?:merhaba|selam|selamlar|iyi günler)[.! ]*$/iu.test(userMessage)) return "Merhaba! Hoş geldin. 😊 Araç seçimini birlikte adım adım netleştirebiliriz.";
  if (/teşekkür|sağ ol|sağol/iu.test(userMessage)) return "Rica ederim. 😊 Hazır olduğunda araç ihtiyacından devam edebiliriz.";
  return "Seni dinliyorum. 😊 Araç ihtiyacından devam edebiliriz.";
}
const formatTry = (amount: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(amount);
function modelFamilyPriceText(family: { readonly canonicalBrand: string; readonly canonicalModel: string; readonly variantIds: readonly string[] } | undefined, catalog: import("../catalog/types").CatalogSnapshot): string | undefined {
  if (!family) return undefined;
  const verified = family.variantIds.flatMap((variantId) => {
    const price = catalog.variantById.get(variantId)?.activeNewPrice;
    return price?.realizationSafe && price.consumerVisibility === "PUBLIC" && price.priceType === "LIST" ? [price.amountTry] : [];
  }).sort((left, right) => left - right);
  if (verified.length === 0) return `${family.canonicalBrand} ${family.canonicalModel} için aktif katalogda kullanıcıya gösterilebilecek doğrulanmış güncel bir liste fiyatı bulunmuyor. Güncel fiyatı yetkili satıcıdan doğrulaman gerekir.`;
  const minimum = verified[0]!; const maximum = verified.at(-1)!;
  return minimum === maximum
    ? `${family.canonicalBrand} ${family.canonicalModel} için aktif katalogdaki doğrulanmış liste fiyatı ${formatTry(minimum)} TL. Güncel satış fiyatını yetkili satıcıdan doğrulamanı öneririm.`
    : `${family.canonicalBrand} ${family.canonicalModel} için aktif katalogdaki doğrulanmış liste fiyatları donanıma göre ${formatTry(minimum)}–${formatTry(maximum)} TL aralığında. Güncel satış fiyatını yetkili satıcıdan doğrulamanı öneririm.`;
}
function clarificationForAmbiguity(userMessage: string, ambiguities: readonly { readonly sourceSpan: string }[]): string | undefined {
  const sourceSpan = ambiguities.map((item) => item.sourceSpan.trim()).find((item) => item.length > 0);
  if (!sourceSpan) return undefined;
  const safeSpan = sourceSpan.length <= 120 ? sourceSpan : `${sourceSpan.slice(0, 117)}…`;
  const appearsInMessage = userMessage.toLocaleLowerCase("tr-TR").includes(sourceSpan.toLocaleLowerCase("tr-TR"));
  if (/\b(?:ikisi|ikisini|ikisi de|her ikisi|hepsi|hepsi de)\b/iu.test(sourceSpan)) return "İki seçeneği de açık tutmak istediğini anlıyorum. Hangi seçenekleri kastettiğini adlarıyla yazar mısın?";
  if (/^\s*\d+(?:[.,]\d+)?\s*m\s*$/iu.test(sourceSpan)) return `Bütçeyi “${safeSpan}” diye yazdın; “m” ile milyon TL’yi mi kastettin? Tutarı örneğin “2 milyon 500 bin TL” şeklinde yazar mısın?`;
  if (/vazgeçtim|fikrimi değiştirdim/iu.test(sourceSpan)) return "Tercihini değiştirmek istediğini anladım. Önceki tercihten neyi kaldırıp yerine neyi istediğini tek cümlede açıkça yazar mısın?";
  return appearsInMessage
    ? `“${safeSpan}” derken neyi kastettiğinden emin olamadım. Biraz daha açık anlatır mısın?`
    : "Yazdığın ifadenin bir bölümünden emin olamadım. Neyi kastettiğini biraz daha açık anlatır mısın?";
}
function guidanceField(memory: import("../domain/conversationMemory").ConversationMemory, interpretation: import("../interpretation/types").AuthoritativeSemanticPlan, userMessage: string): string | undefined { return interpretation.result.technicalGuidanceRequest?.fieldId ?? inferredGuidanceField(userMessage) ?? [...memory.materialQuestionHistory].reverse().find((item) => item.answerStatus === "OPEN")?.field; }
function technicalGuidance(field: string | undefined, userMessage: string): string | undefined {
  if (/(?:şarj|batarya).*(?:ne kadar|süre|uzun|doldur|dolum|hızlı)|(?:ne kadar).*(?:şarj|batarya)/iu.test(userMessage)) return "Tek bir şarj süresi yoktur. Normal ev prizinde dolum çoğunlukla gece boyunca sürer; uygun bir ev tipi şarj cihazı birkaç saatte tamamlayabilir. DC hızlı şarjda birçok araç bataryanın orta bölümünü yaklaşık 20–40 dakikalık bir molada doldurabilir. Gerçek süre aracın bataryasına, kabul gücüne, başlangıç doluluğuna ve hava sıcaklığına göre değişir.";
  if (/ikinci el|değer kaybet|değerini koru/iu.test(userMessage)) return "Hiç değer kaybetmeyecek bir araç garanti edilemez. İkinci el değerini marka-model talebi, satış hacmi, servis ağı, bakım geçmişi, kilometre, hasar durumu ve yeni araç fiyatları birlikte etkiler. Bu isteği değerini koruma önceliği olarak tutabilirim; güncel ikinci el piyasa verisi olmadan kesin değer koruma iddiası kurmam.";
  if (/elektrik(?:li)?/iu.test(userMessage) && /(?:nasıl\s+şarj|şarj\s+ol|tam olarak nasıl)/iu.test(userMessage)) return "Elektrikli araçlar çoğunlukla ev veya iş yerindeki AC şarjla, yolculukta ise DC hızlı şarj istasyonuyla şarj edilir. AC şarj daha yavaştır ve gece boyunca kullanım için uygundur; DC hızlı şarj kısa molada daha çok enerji sağlar. Gerçek süre batarya kapasitesine, aracın kabul ettiği güce, istasyona, sıcaklığa ve doluluk oranına göre değişir.";
  if (/elektrik(?:li)?/iu.test(userMessage) && /(?:arkadaş|öner|menzil|uzun süre.*bekle|ne düşün)/iu.test(userMessage) && !/(?:köy|kırsal|arazi|bozuk yol|pick[ -]?up|pikap)/iu.test(userMessage)) return "Elektrikli araçlarda düşük menzil ve uzun şarj süresi her kullanım için aynı ölçüde doğru değildir. Günlük mesafe evde şarjla karşılanıyorsa kullanım rahat olabilir; sık uzun yolda ise gerçek otoyol menzili, hızlı şarj gücü ve rota üzerindeki istasyonlar kritik hâle gelir. Kararı kulaktan dolma tek bir yargıyla değil, günlük kilometre ve şarj erişimiyle vermek gerekir.";
  if (/elektrik(?:li)?/iu.test(userMessage) && /(?:almak|kullanmak).*(?:mantıklı mı)|(?:mantıklı mı).*(?:elektrik|araç)|ne düşünüyorsun/iu.test(userMessage)) return "Elektrikli araç almak tek başına doğru veya yanlış değildir. Günlük mesafen düzenliyse ve evde, işte ya da sık kullandığın rotada güvenilir şarj erişimin varsa şehir içi kullanımda sessiz, akıcı ve düşük yerel emisyonlu bir seçenek olabilir. Düzenli uzun yol, uzak bölgeler, ağır yük veya şarjsız park koşullarında ise gerçek menzil, hızlı şarj ağı ve bekleme süresi daha kritik olur. Kararı netleştirmek için günlük kilometreni, uzun yol sıklığını ve nerede şarj edebileceğini birlikte değerlendirmeliyiz.";
  if (field === "fuelType" && /elektrik(?:li)?/iu.test(userMessage) && /(?:köy|kırsal|arazi|bozuk yol|pick[ -]?up|pikap)/iu.test(userMessage)) return "Arazi veya kırsal kullanımda elektrikli araç mantıklı olabilir: düşük hızda güçlü ve kontrollü tork önemli bir avantajdır. Ancak uygunluk yalnız motor türüne bağlı değildir; yerden yükseklik, lastikler, çekiş sistemi ve batarya altı koruması da doğrulanmalıdır. Soğuk hava, dik zemin, çamur, ağır yük ve çekme menzili düşürebilir; uzak bölgelerde şarj ve kurtarma erişimi ayrıca önemlidir. Bu koşulları bilmeden elektrikliyi koşulsuz önermem, fakat doğru araç ve şarj planıyla seçeneği elemem de.";
  if (field === "fuelType" && /hafif hibrit|mild hibrit|tam hibrit/iu.test(userMessage)) return "Hafif hibritte elektrik motoru benzinli motora destek olur ama aracı genellikle tek başına yürütmez. Tam hibrit ise özellikle düşük hızda ve kısa mesafede yalnız elektrikle ilerleyebilir; şehir içindeki dur-kalkta farkı daha belirgin hissedilir. İkisi de prize takılmadan kullanılır.";
  return TECHNICAL_GUIDANCE[field ?? ""];
}
const offerIdentity = (conversationId: string, messageId: string) => createHash("sha256").update(`${conversationId}:${messageId}`).digest("hex").slice(0, 32);
export function createProductionV2TurnStages(input: { readonly repositoryRoot?: string; readonly interpreter: StructuredInterpretationModel; readonly realizer: NaturalRealizationModel; readonly signer?: OfferSigner; readonly offerStore?: GovernedOfferStore; readonly shadow?: boolean; readonly smokeObserver?: (value: Readonly<Record<string, unknown>>) => void }): V2TurnStages {
  const repositoryRoot = input.repositoryRoot ?? process.cwd(); const catalogRepository = createProductionCatalogReleaseRepository(repositoryRoot);
  const decisionLayersByCatalog = new Map<string, ReturnType<typeof loadProductionDecisionLayers>>();
  const safePersonaByCatalog = new Map<string, ReturnType<typeof loadActiveVehiclePersonaSafeTraits>>();
  return {
    loadCatalog: ({ memory, now }) => memory ? loadPinnedCatalogSnapshot({ repository: catalogRepository, releaseVersion: memory.catalogAuthority.releaseVersion, catalogFingerprint: memory.catalogAuthority.catalogFingerprint, activatedAt: memory.catalogAuthority.activatedAt, now }) : loadActiveCatalogSnapshot({ repository: catalogRepository, now }),
    interpretOfferResponse: async (turn, previous) => { const response = classifyDeterministicOfferResponse(turn.userMessage); if (!response || !turn.offerToken || !previous || !input.signer || !input.offerStore) return null; const verified = input.signer.verify(turn.offerToken); if (verified.status !== "VALID" || verified.conversationId !== turn.conversationId || verified.catalogFingerprint !== previous.catalogAuthority.catalogFingerprint || verified.decisionFingerprint !== previous.decisionFingerprint) return null; const persisted = await input.offerStore.get(verified.offerId); if (!persisted || persisted.conversationId !== turn.conversationId || !["CREATED", "CONSENTED"].includes(persisted.lifecycleState) || persisted.catalogFingerprint !== previous.catalogAuthority.catalogFingerprint || persisted.decisionFingerprint !== previous.decisionFingerprint || Date.parse(persisted.expiresAt) < Date.parse(turn.requestTime)) return null; input.smokeObserver?.({ phase: "OFFER_RESPONSE", interpretationSource: "DETERMINISTIC_OFFER_RESPONSE", providerCalled: false, offerResponse: response, offerVerification: "VALID" }); return createDeterministicOfferResponsePlan(turn.messageId, response); },
    interpret: (turn, previous, catalog) => {
      const activeFieldIds = previous?.events.filter((event): event is Extract<typeof event, { eventType: "CONSTRAINT" }> => event.eventType === "CONSTRAINT" && event.status === "ACTIVE").map((event) => event.field);
      const openMaterialQuestionField = [...(previous?.materialQuestionHistory ?? [])].reverse().find((item) => item.answerStatus === "OPEN")?.field;
      const normalizedIdentityText = turn.userMessage.normalize("NFKC").toLocaleLowerCase("tr-TR");
      const comparedBrands = catalog.brandIndex.values().filter((brand) => {
        const aliases = [brand.canonicalBrand, brand.canonicalBrand.split("-")[0]!].filter((alias, index, all) => alias.length >= 3 && all.indexOf(alias) === index);
        return aliases.some((alias) => new RegExp(`(?:^|[^\\p{L}])${alias.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}(?=$|[^\\p{L}])`, "iu").test(turn.userMessage));
      });
      const catalogComparison = comparedBrands.length >= 2 && /(?:ve|veya|veye|ya da|hangisi|karşılaştır)/iu.test(normalizedIdentityText);
      if (catalogComparison) return Promise.resolve(interpretDeterministicCatalogComparison({ messageId: turn.messageId, userText: turn.userMessage, fieldRegistry: V2_DECISION_FIELD_REGISTRY_V1, activeFieldIds, brandNames: comparedBrands.map((brand) => brand.canonicalBrand) }));
      const suitabilityFamily = catalog.familyIndex.values().filter((family) => {
        const brandAlias = family.canonicalBrand.split("-")[0]!;
        const modelAliases = [family.canonicalModel, family.canonicalModel.split(/\s+/u)[0]!].filter((alias, index, aliases) => alias.length >= 3 && aliases.indexOf(alias) === index);
        return [family.canonicalBrand, brandAlias].some((brand) => normalizedIdentityText.includes(brand.toLocaleLowerCase("tr-TR")))
          && modelAliases.some((model) => normalizedIdentityText.includes(model.toLocaleLowerCase("tr-TR")));
      }).sort((left, right) => right.canonicalModel.length - left.canonicalModel.length)[0];
      if (suitabilityFamily && /(?:sence|bana|benim için).*(?:uygun mu|mantıklı mı|önerir misin)|(?:uygun mu|mantıklı mı).*(?:sence|bana|benim için)/iu.test(turn.userMessage)) return Promise.resolve(interpretDeterministicModelSuitability({ messageId: turn.messageId, userText: turn.userMessage, fieldRegistry: V2_DECISION_FIELD_REGISTRY_V1, activeFieldIds, brand: suitabilityFamily.canonicalBrand, model: suitabilityFamily.canonicalModel }));
      if (suitabilityFamily && /(?:katalogda|sizde|burada|expiya(?:da|'da)?)?[\s\S]*(?:var mı|mevcut mu|bulunuyor mu)/iu.test(turn.userMessage)) return Promise.resolve(interpretDeterministicModelLookup({ messageId: turn.messageId, userText: turn.userMessage, fieldRegistry: V2_DECISION_FIELD_REGISTRY_V1, activeFieldIds, brand: suitabilityFamily.canonicalBrand, model: suitabilityFamily.canonicalModel }));
      const suitabilityRequested = /(?:sence|bana|benim için).*(?:uygun mu|mantıklı mı|önerir misin)|(?:uygun mu|mantıklı mı).*(?:sence|bana|benim için)/iu.test(turn.userMessage);
      if (suitabilityRequested && comparedBrands.length === 1) {
        const brand = comparedBrands[0]!.canonicalBrand;
        const brandAliases = [brand, brand.split("-")[0]!].sort((left, right) => right.length - left.length);
        const modelText = brandAliases.flatMap((alias) => {
          const match = turn.userMessage.match(new RegExp(`${alias.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\s+([\\p{L}\\p{N}'’.+-]+)`, "iu"));
          return match?.[1] ? [match[1]] : [];
        })[0];
        if (modelText) return Promise.resolve(interpretDeterministicModelSuitability({ messageId: turn.messageId, userText: turn.userMessage, fieldRegistry: V2_DECISION_FIELD_REGISTRY_V1, activeFieldIds, brand, model: modelText }));
      }
      const catalogSuperlativeQuery = /(?:en fazla|en yüksek)\s+koltuk(?: kapasitesi)?(?:ne sahip)?[\s\S]*(?:hangisi|hangi araç|hangi model)|(?:en yüksek|en fazla)\s+(?:tonaj|yük(?: taşıma)? kapasitesi)[\s\S]*(?:hangi|hangisi)|(?:hangi|hangisi)[\s\S]*(?:en yüksek|en fazla)\s+(?:tonaj|yük(?: taşıma)? kapasitesi)/iu.test(turn.userMessage);
      if (catalogSuperlativeQuery) return Promise.resolve(interpretDeterministicCatalogSuperlative({ messageId: turn.messageId, userText: turn.userMessage, fieldRegistry: V2_DECISION_FIELD_REGISTRY_V1, activeFieldIds }));
      if (/^(?:(?:sizde|burada|katalogda|expiya(?:da|'da)?)\s+)?(?:ne|hangi)\s+tür\s+(?:araç|araba|otomobil)(?:lar)?\s+(?:var|bulunuyor)|^(?:araç|araba|otomobil)\s+(?:türleri|çeşitleri)(?:\s+neler)?/iu.test(turn.userMessage.trim())) return Promise.resolve(interpretDeterministicCatalogOverview({ messageId: turn.messageId, userText: turn.userMessage, fieldRegistry: V2_DECISION_FIELD_REGISTRY_V1, activeFieldIds }));
      if (openMaterialQuestionField && (turn.typedOptionId || turn.typedOptionIds?.length || isDeterministicMaterialQuestionAnswer(turn.userMessage, openMaterialQuestionField) || isDeterministicCrossFieldQuestionAnswer(turn.userMessage))) return Promise.resolve(interpretDeterministicMaterialQuestionAnswer({ messageId: turn.messageId, userText: turn.userMessage, fieldRegistry: V2_DECISION_FIELD_REGISTRY_V1, activeFieldIds, openMaterialQuestionField, revealedCandidateReferences: previous?.revealedCandidateIds }));
      const controlledVehicleRequest = interpretDeterministicControlledVehicleRequest({ messageId: turn.messageId, userText: turn.userMessage, fieldRegistry: V2_DECISION_FIELD_REGISTRY_V1, activeFieldIds });
      if (controlledVehicleRequest) return Promise.resolve(controlledVehicleRequest);
      return interpretUserMessage({ model: input.interpreter, messageId: turn.messageId, userText: turn.userMessage, fieldRegistry: V2_DECISION_FIELD_REGISTRY_V1, activeFieldIds, openMaterialQuestionField, revealedCandidateReferences: previous?.revealedCandidateIds });
    },
    createEvents: createConversationEventsFromInterpretation,
    reduceMemory: ({ previous, events, catalog }) => previous ? reduceConversationMemoryV2({ conversationId: previous.conversationId, previousMemory: previous, appendedEvents: events, catalogAuthority: catalog.authority, fingerprintPolicy: CARS_MEMORY_FINGERPRINT_POLICY_V1 }) : replayConversationMemoryV2({ conversationId: events[0]?.conversationId ?? "unknown", events, catalogAuthority: catalog.authority, fingerprintPolicy: CARS_MEMORY_FINGERPRINT_POLICY_V1 }),
    evaluate: async ({ turn, memory, catalog, interpretation, now }) => {
      if (memory.catalogAuthority.catalogFingerprint !== catalog.authority.catalogFingerprint) throw new Error("COMPOSITION_CATALOG_FINGERPRINT_MISMATCH");
      const constraints = projectActiveConstraints(memory.events.filter((event) => event.eventType === "CONSTRAINT")); const rejections = projectActiveRejections(memory.events.filter((event) => event.eventType === "CANDIDATE_REJECTION"));
      const currentModelReferences = memory.modelReferences.filter((reference) => reference.sourceMessageId === turn.messageId);
      const currentComparisonReferences = currentModelReferences.filter((reference) => reference.decisionEffect === "COMPARISON_SCOPE");
      const latestComparisonTurn = Math.max(-1, ...memory.modelReferences.filter((reference) => reference.decisionEffect === "COMPARISON_SCOPE").map((reference) => reference.sourceTurn));
      const latestPreferenceTurn = Math.max(-1, ...memory.modelReferences.filter((reference) => reference.decisionEffect === "PREFERENCE").map((reference) => reference.sourceTurn));
      const comparisonReferences = latestComparisonTurn >= latestPreferenceTurn
        ? memory.modelReferences.filter((reference) => reference.decisionEffect === "COMPARISON_SCOPE" && reference.sourceTurn === latestComparisonTurn)
        : [];
      const comparisonFamilyIds = [...new Set(comparisonReferences.flatMap((reference) => reference.resolvedFamilyIds))];
      const comparisonScope = comparisonReferences.length > 0;
      const latestModelPreference = [...memory.modelReferences].reverse().find((event) => event.decisionEffect === "PREFERENCE");
      const preferenceFamilyIds = latestModelPreference && ["EXACT_MODEL_FAMILY", "BRAND_ONLY"].includes(latestModelPreference.resolution) ? latestModelPreference.resolvedFamilyIds : [];
      const preferenceScope = !comparisonScope && preferenceFamilyIds.length > 0;
      const scopedFamilyIds = comparisonScope ? comparisonFamilyIds : preferenceScope ? preferenceFamilyIds : [];
      const scopedVariantIds = new Set(scopedFamilyIds.flatMap((familyId) => catalog.familyIndex.get(familyId)?.variantIds ?? []));
      const decisionCatalog = scopedFamilyIds.length ? { ...catalog, variants: Object.freeze(catalog.variants.filter((variant) => scopedVariantIds.has(variant.id))) } : catalog;
      const usageNeed = projectUsageCargoNeedFromConstraints(memory.events.filter((event): event is Extract<typeof event, { eventType: "CONSTRAINT" }> => event.eventType === "CONSTRAINT"));
      const technical = evaluateTechnicalCandidatePool({ snapshot: decisionCatalog, decisionFingerprint: memory.decisionFingerprint, activeConstraints: constraints, activeRejections: rejections, usageNeed, fieldRegistry: V2_DECISION_FIELD_REGISTRY_V1, usagePolicies: USAGE_CARGO_POLICIES_V1 });
      const affordability = evaluateAffordabilityCandidatePool({ snapshot: catalog, technicalPool: technical, budget: memory.budget, evaluationTime: now.toISOString(), priceAuthorityPolicy: PRICE_AUTHORITY_POLICY_V1, affordabilityPolicy: AFFORDABILITY_POLICY_V1 });
      const layerCacheKey = `${catalog.authority.releaseVersion}:${catalog.authority.catalogFingerprint}`;
      const productionDailyPromise = decisionLayersByCatalog.get(layerCacheKey) ?? loadProductionDecisionLayers(catalog, repositoryRoot);
      decisionLayersByCatalog.set(layerCacheKey, productionDailyPromise);
      const productionDaily = await productionDailyPromise; const dailyLife = productionDaily.dailyLife.status === "READY" ? createDailyLifeLayerSnapshot({ catalogReleaseVersion: catalog.authority.releaseVersion, catalogFingerprint: catalog.authority.catalogFingerprint, layerVersion: productionDaily.dailyLife.releaseVersion, signals: [] }) : undefined;
      const safePersonaPromise = safePersonaByCatalog.get(layerCacheKey) ?? loadActiveVehiclePersonaSafeTraits({ repositoryRoot, catalogRelease: catalog.authority.releaseVersion.startsWith("v") ? catalog.authority.releaseVersion : `v${catalog.authority.releaseVersion}`, catalogFingerprint: catalog.authority.catalogFingerprint, catalogVariantIds: catalog.variants.map((variant) => variant.id), catalogFamilies: catalog.familyIndex.values().map((family) => ({ familyId: family.familyId, variantIds: family.variantIds })) });
      safePersonaByCatalog.set(layerCacheKey, safePersonaPromise);
      const safePersona = await safePersonaPromise;
      const persona = safePersona.status === "READY" ? createPersonaLayerSnapshot({ catalogReleaseVersion: catalog.authority.releaseVersion, catalogFingerprint: catalog.authority.catalogFingerprint, layerVersion: safePersona.release.releaseVersion, signals: selectOwnerApprovedSafePersonaSignals(safePersona.release).signals }) : undefined;
      const functionalPreferenceSignals = createExplicitFunctionalPreferenceSignals({ snapshot: catalog, constraints: constraints.activeNonHardConstraints });
      const requestedPriceSegment = constraints.activeNonHardConstraints.find((constraint) => constraint.fieldId === "relativePriceSegment")?.normalizedValue;
      const priceSegmentSignals = typeof requestedPriceSegment === "string" ? projectRelativePriceSegmentsCached({ snapshot: catalog, evaluationTime: now.toISOString(), priceAuthorityPolicy: PRICE_AUTHORITY_POLICY_V1 }).projections.filter((projection) => projection.comparableCohortPriceSegment === requestedPriceSegment).map((projection) => ({ exactVariantId: projection.exactVariantId, score: 1, reasonCode: `RELATIVE_PRICE_SEGMENT_${requestedPriceSegment}`, explanationFactId: `relative-price-segment:${projection.exactVariantId}` })) : [];
      const technicallyEligibleIds = new Set(technical.eligibleCandidateIds);
      const hasPreferredBudgetGate = Boolean(memory.budget.preferredBudget && !memory.budget.maximumHardCeiling && !memory.budget.budgetExcluded);
      const preferredBudgetAmount = hasPreferredBudgetGate ? memory.budget.preferredBudget!.amount : undefined;
      const preferredBudgetOfferIds = new Set(preferredBudgetAmount === undefined ? [] : affordability.candidates.filter((candidate) => {
        const decisionAmount = candidate.priceAuthority.publicExactAmountTry ?? (candidate.priceAuthority.decisionUse === "INTERNAL_APPROXIMATE_AFFORDABILITY" ? catalog.variantById.get(candidate.exactVariantId)?.activeNewPrice?.amountTry : undefined);
        return decisionAmount !== undefined && decisionAmount <= preferredBudgetAmount;
      }).map((candidate) => candidate.exactVariantId));
      const selectableTechnicalIds = affordability.selectableCandidateIds.filter((candidateId) => {
        if (!technicallyEligibleIds.has(candidateId)) return false;
        const candidate = affordability.candidates.find((item) => item.exactVariantId === candidateId);
        if (candidate?.finalDisposition === "CONDITIONALLY_ELIGIBLE_ESTIMATED_OVER_BUDGET") return false;
        return !hasPreferredBudgetGate || preferredBudgetOfferIds.has(candidateId);
      });
      const preferredBudgetGap = hasPreferredBudgetGate && selectableTechnicalIds.length === 0 && technical.eligibleCandidateIds.length > 0;
      const rankableAffordability = { ...affordability, selectableCandidateIds: selectableTechnicalIds };
      const usageEvaluations = usageNeed.usageScenario?.decisionEffect === "MEDIUM_RANK"
        ? catalog.variants.map((variant) => evaluateUsageCargoSuitability(variant, usageNeed, USAGE_CARGO_POLICIES_V1))
        : undefined;
      const ranking = rankSelectableCandidates({ snapshot: catalog, technicalPool: technical, affordabilityPool: rankableAffordability, persona: memory.persona, usageEvaluations, confirmedFunctionalSignals: functionalPreferenceSignals, softPreferenceSignals: priceSegmentSignals, dailyLifeLayer: dailyLife, personaLayer: persona });
      const exactModelPreferenceScope = latestModelPreference?.resolution === "EXACT_MODEL_FAMILY";
      const decisionCohortIds = selectLeadingDecisionCohortIds(ranking);
      const budgetTargetAmount = !memory.budget.budgetExcluded ? memory.budget.maximumHardCeiling?.amount ?? memory.budget.preferredBudget?.amount : undefined;
      const budgetShortlistApplicable = budgetTargetAmount !== undefined && !comparisonScope && !exactModelPreferenceScope;
      const budgetShortlist = budgetShortlistApplicable ? selectBudgetNearestShortlist({ ranking, affordability: rankableAffordability, snapshot: catalog, targetAmountTry: budgetTargetAmount, maximumCandidates: 3 }) : undefined;
      const shortlist = budgetShortlistApplicable ? budgetShortlist! : selectRankedCandidateShortlist({ ranking, maximumCandidates: 3, familyDiversity: !comparisonScope, singleRequested: exactModelPreferenceScope });
      const classifiedAvailability = classifyCandidateDecisionAvailability({ technicalPool: technical, affordabilityPool: { ...affordability, selectableCandidateIds: selectableTechnicalIds }, ranking });
      const availability = budgetShortlistApplicable && shortlist.candidateIds.length === 0 && technical.eligibleCandidateIds.length > 0 ? "PRICE_UNRESOLVED" : classifiedAvailability;
      const rawGeneratedQuestions = generateMaterialQuestionCandidates({ snapshot: catalog, candidateIds: decisionCohortIds, memory, constraints, comparisonScope, personaLayer: persona });
      const hasOpenMaterialQuestion = memory.materialQuestionHistory.some((item) => item.answerStatus === "OPEN");
      const budgetResolved = memory.budget.budgetExcluded || !memory.budget.budgetUnknown;
      const terminalGovernedShortlist = budgetResolved && shortlist.candidateIds.length > 0 && shortlist.candidateIds.length <= 3
        && (budgetShortlistApplicable || exactModelPreferenceScope || decisionCohortIds.length <= 3);
      const generatedQuestions = terminalGovernedShortlist && !comparisonScope && !hasOpenMaterialQuestion
        ? Object.freeze({ ...rawGeneratedQuestions, unansweredDecisionFields: Object.freeze([]), questionCandidates: Object.freeze([]) })
        : rawGeneratedQuestions;
      const preferenceRelaxationQuestion = createLatestUncoveredPreferenceRelaxation({ snapshot: catalog, candidateIds: ranking.rankedCandidateIds, memory, constraints });
      const affordabilityConflictQuestion = createAffordabilityConflictRecovery({ snapshot: catalog, memory, constraints, technical, affordability, selectableCandidateIds: selectableTechnicalIds });
      const technicalConflictQuestion = createTechnicalHardConflictRecovery({ memory, constraints, technical });
      const semanticRecoveryQuestion = createConversationLocalSemanticRecoveryQuestion({
        userText: turn.userMessage,
        memory,
        snapshot: catalog,
        candidateIds: ranking.rankedCandidateIds,
        bodyStyleAlreadyInterpreted: interpretation.acceptedConstraintMutations.some((mutation) => mutation.fieldId === "bodyStyle"),
        priceMeaningClarificationEligible: generatedQuestions.stageCompletion.filter((stage) => ["USAGE_CONTEXT", "VEHICLE_ARCHITECTURE", "FUNCTIONAL_NEEDS", "ENERGY_FIT", "TECHNICAL_PREFERENCES"].includes(stage.stage)).every((stage) => stage.status !== "INCOMPLETE"),
      });
      const questions = technicalConflictQuestion
        ? Object.freeze({ ...generatedQuestions, unansweredDecisionFields: Object.freeze([...new Set([...generatedQuestions.unansweredDecisionFields, technicalConflictQuestion.question.field])]), questionCandidates: Object.freeze([technicalConflictQuestion]) })
        : affordabilityConflictQuestion
        ? Object.freeze({ ...generatedQuestions, unansweredDecisionFields: Object.freeze([...new Set([...generatedQuestions.unansweredDecisionFields, affordabilityConflictQuestion.question.field])]), questionCandidates: Object.freeze([affordabilityConflictQuestion]) })
        : preferenceRelaxationQuestion
        ? Object.freeze({ ...generatedQuestions, unansweredDecisionFields: Object.freeze([...new Set([...generatedQuestions.unansweredDecisionFields, preferenceRelaxationQuestion.question.field])]), questionCandidates: Object.freeze([preferenceRelaxationQuestion]) })
        : semanticRecoveryQuestion
        ? Object.freeze({
            ...generatedQuestions,
            unansweredDecisionFields: Object.freeze([...new Set([...generatedQuestions.unansweredDecisionFields, semanticRecoveryQuestion.question.field])]),
            questionCandidates: Object.freeze([semanticRecoveryQuestion, ...generatedQuestions.questionCandidates]),
          })
        : generatedQuestions;
      const recommendationReadiness = assessRecommendationReadiness({ memory, candidateAvailability: availability, candidateCount: terminalGovernedShortlist ? shortlist.candidateIds.length : decisionCohortIds.length, comparisonScope, unansweredDecisionFields: questions.unansweredDecisionFields, questionCandidates: questions.questionCandidates });
      const obligation = directAnswer(interpretation.result.messageId, interpretation.result.directAnswerRequests);
      const abusiveCorrection = interpretation.result.acts.includes("ABUSE") && interpretation.acceptedConstraintMutations.some((mutation) => mutation.operation === "CORRECT" || mutation.operation === "CLEAR");
      const act = normalizedAct(interpretation.result.acts);
      const contextualPriceQuestion = /(?:fiyat[ıi]?\s*(?:ne kadar|nedir)?|kaç para|ne kadara)/iu.test(turn.userMessage);
      const detectedHumanContext = detectHumanContext(turn.userMessage);
      let action = decideConversationAction({ memory, directAnswerObligation: obligation, candidateAvailability: availability, recommendationReadiness, ranking, rankedShortlist: shortlist, conflictAnalysis: null, unansweredDecisionFields: questions.unansweredDecisionFields, questionCandidates: questions.questionCandidates, normalizedUserAct: act, policy: ACTION_POLICY_V1, catalogSnapshotAvailable: true, explicitTrimComparisonRequested: comparisonScope, systemCorrectionRequired: abusiveCorrection, approximateBudgetCaveatFactIds: affordability.budgetIncreaseGuidance.some((item) => item.authority === "APPROXIMATE_INTERNAL_ESTIMATE") ? ["approximate-budget"] : [] });
      if (technicalConflictQuestion) action = { ...action, nextState: "TRADEOFF", nextAction: { type: "ASK_MATERIAL_QUESTION" }, materialQuestion: technicalConflictQuestion.question, shortlistIntent: null, policyTrace: { ...action.policyTrace, matchedRule: "TECHNICAL_HARD_CONFLICT_REQUIRES_RELAXATION" } };
      let ambiguityClarification = contextualPriceQuestion || detectedHumanContext ? undefined : clarificationForAmbiguity(turn.userMessage, interpretation.result.ambiguities);
      if (ambiguityClarification && act !== "ABUSE") action = { ...action, nextState: "UNDERSTANDING_NEEDS", nextAction: { type: "ANSWER_DIRECTLY" }, directAnswerObligation: { kind: "OTHER_SUPPORTED", sourceMessageId: turn.messageId, authorizedExplanationFactIds: ["direct-answer"], authorizedCandidateIds: [], placement: "BEFORE_MATERIAL_QUESTION" }, materialQuestion: null, shortlistIntent: null, explanationFactIds: [...new Set([...action.explanationFactIds, "direct-answer"])], policyTrace: { ...action.policyTrace, matchedRule: "AMBIGUOUS_INTERPRETATION_REQUIRES_CONFIRMATION", directAnswerPlacement: "BEFORE_MATERIAL_QUESTION" } };
      const supportiveConversationPause = /(?:kaza|trafik).{0,60}(?:kork|endiş|kayg)|(?:kork|endiş|kayg).{0,60}(?:kaza|trafik)|ehliyet(?:i|imi)? yeni aldım|araç kullan(?:mak|ma).{0,50}(?:güvenmiyorum|çekiniyorum|korkuyorum)|kendime güvenmiyorum/iu.test(turn.userMessage);
      if (supportiveConversationPause) action = { ...action, nextState: "UNDERSTANDING_NEEDS", nextAction: { type: "ANSWER_DIRECTLY" }, directAnswerObligation: { kind: "OTHER_SUPPORTED", sourceMessageId: turn.messageId, authorizedExplanationFactIds: ["direct-answer"], authorizedCandidateIds: [], placement: "BEFORE_MATERIAL_QUESTION" }, materialQuestion: null, shortlistIntent: null, explanationFactIds: [...new Set([...action.explanationFactIds, "direct-answer"])], policyTrace: { ...action.policyTrace, matchedRule: "SUPPORTIVE_KNOWLEDGE_REQUIRES_CONTINUATION_CONFIRMATION", directAnswerPlacement: "BEFORE_MATERIAL_QUESTION" } };
      const functionalScoreByCandidate = new Map<string, number>();
      for (const signal of functionalPreferenceSignals) functionalScoreByCandidate.set(signal.exactVariantId, (functionalScoreByCandidate.get(signal.exactVariantId) ?? 0) + signal.score);
      const strongestCatalogFunctionalScore = Math.max(0, ...functionalScoreByCandidate.values());
      const strongestRemainingFunctionalScore = Math.max(0, ...ranking.candidates.map((candidate) => candidate.rankVector.find((tier) => tier.tier === "CONFIRMED_FUNCTIONAL_FIT")?.score ?? 0));
      const rejectedAllFullPreferenceMatches = act === "REJECTION" && strongestCatalogFunctionalScore > 0 && strongestRemainingFunctionalScore < strongestCatalogFunctionalScore;
      if (rejectedAllFullPreferenceMatches) action = { ...action, nextState: "FILTERING", nextAction: { type: "ANSWER_DIRECTLY" }, shortlistIntent: null, materialQuestion: null };
      const latestLookup = [...currentModelReferences].reverse().find((event) => event.decisionEffect === "LOOKUP_ONLY");
      const lookupFamily = latestLookup?.resolvedFamilyIds[0] ? catalog.familyIndex.get(latestLookup.resolvedFamilyIds[0]) : undefined;
      const lookupText = latestLookup?.resolution === "NOT_FOUND" ? `${latestLookup.rawText} aktif sıfır araç kataloğunda bulunmuyor.` : latestLookup?.resolution === "POSSIBLE_TYPO" ? `${latestLookup.rawText} katalog kimliğiyle kesin eşleşmedi. ${latestLookup.suggestedCanonicalNames?.length === 1 ? `${latestLookup.suggestedCanonicalNames[0]} modelini mi kastettin?` : `Şunlardan birini mi kastettin: ${latestLookup.suggestedCanonicalNames?.join(", ")}?`}` : latestLookup?.resolution === "AMBIGUOUS" ? `${latestLookup.rawText} birden fazla katalog modeliyle eşleşiyor; marka bilgisini netleştirmek gerekiyor.` : lookupFamily ? `${lookupFamily.canonicalBrand} ${lookupFamily.canonicalModel} aktif sıfır araç kataloğunda bulunuyor.` : undefined;
      const modelSuitabilityText = obligation?.kind === "MODEL_SUITABILITY"
        ? lookupFamily
          ? `${lookupFamily.canonicalBrand} ${lookupFamily.canonicalModel} aktif sıfır araç kataloğunda bulunuyor. Sana uygun olup olmadığını yalnız model adına bakarak söylemem; kullanım amacın, yol koşulların, yolcu ve yük ihtiyacın ile bütçene göre birlikte değerlendirelim.`
          : latestLookup?.resolution === "NOT_FOUND"
            ? `${latestLookup.rawText} aktif sıfır araç kataloğunda bulunmuyor. Katalog kanıtı olmadan sana uygun olduğu veya olmadığı sonucunu vermem; istersen kullanımını netleştirip katalogdaki doğrulanmış alternatifleri değerlendirebiliriz.`
            : undefined
        : undefined;
      const maximumSeatQuery = /(?:en fazla|en yüksek)\s+koltuk(?: kapasitesi)?(?:ne sahip)?[\s\S]*(?:hangisi|hangi araç|hangi model)/iu.test(turn.userMessage);
      const maximumPayloadQuery = /(?:en yüksek|en fazla)\s+(?:tonaj|yük(?: taşıma)? kapasitesi)[\s\S]*(?:hangi|hangisi)|(?:hangi|hangisi)[\s\S]*(?:en yüksek|en fazla)\s+(?:tonaj|yük(?: taşıma)? kapasitesi)/iu.test(turn.userMessage);
      const maximumSeats = maximumSeatQuery ? Math.max(0, ...decisionCatalog.variants.map((variant) => variant.decisionFacts.dimensions.seats?.value ?? 0)) : 0;
      const maximumSeatFamilies = maximumSeats > 0 ? [...new Map(decisionCatalog.variants.filter((variant) => variant.decisionFacts.dimensions.seats?.value === maximumSeats).map((variant) => [`${variant.brand}\u0000${variant.model}`, `${variant.brand} ${variant.model}`] as const)).values()] : [];
      const maximumPayloadKg = maximumPayloadQuery ? Math.max(0, ...decisionCatalog.variants.map((variant) => variant.decisionFacts.dimensions.payloadKg?.value ?? 0)) : 0;
      const maximumPayloadVariants = maximumPayloadKg > 0 ? decisionCatalog.variants.filter((variant) => variant.decisionFacts.dimensions.payloadKg?.value === maximumPayloadKg) : [];
      const catalogSuperlativeText = maximumSeatQuery
        ? maximumSeats > 0 ? `Aktif sıfır araç kataloğunda doğrulanmış en yüksek koltuk kapasitesi ${maximumSeats}. Bu kapasiteye sahip model ${maximumSeatFamilies.join(", ")}.` : "Aktif katalogdaki araçların koltuk kapasitesi bu karşılaştırmayı yapacak düzeyde doğrulanmamış."
        : maximumPayloadQuery
          ? maximumPayloadKg > 0 ? `Aktif sıfır araç kataloğunda doğrulanmış en yüksek taşıma kapasitesi ${maximumPayloadKg.toLocaleString("tr-TR")} kg (${(maximumPayloadKg / 1000).toLocaleString("tr-TR")} ton). Bu değer ${maximumPayloadVariants.map((variant) => `${variant.brand} ${variant.model} ${variant.trim}`).join(", ")} varyantında bulunuyor. Bu payload değeridir; çekme kapasitesi veya toplam araç ağırlığı değildir. Şasi kabinde üstyapı sonrası kullanılabilir yük ayrıca doğrulanmalıdır.` : "Aktif katalogdaki araçların taşıma kapasitesi bu karşılaştırmayı yapacak düzeyde doğrulanmamış."
          : undefined;
      const priorResolvedReference = [...memory.modelReferences].reverse().find((reference) => ["EXACT_MODEL_FAMILY", "EXACT_VARIANT"].includes(reference.resolution));
      const priceFamilyId = latestLookup?.resolvedFamilyIds[0] ?? priorResolvedReference?.resolvedFamilyIds[0];
      const priceText = contextualPriceQuestion ? modelFamilyPriceText(priceFamilyId ? catalog.familyIndex.get(priceFamilyId) : undefined, catalog) : undefined;
      if (priceText) ambiguityClarification = priceText;
      if (priceText) action = { ...action, nextState: "DIRECT_MODEL_LOOKUP", nextAction: { type: "ANSWER_DIRECTLY" }, directAnswerObligation: { kind: "OTHER_SUPPORTED", sourceMessageId: turn.messageId, authorizedExplanationFactIds: ["direct-answer"], authorizedCandidateIds: [], placement: "BEFORE_MATERIAL_QUESTION" }, materialQuestion: null, shortlistIntent: null, explanationFactIds: [...new Set([...action.explanationFactIds, "direct-answer"])], policyTrace: { ...action.policyTrace, matchedRule: "CONTEXTUAL_MODEL_PRICE_ANSWER", directAnswerPlacement: "BEFORE_MATERIAL_QUESTION" } };
      const preferredFamily = latestModelPreference?.resolvedFamilyIds[0] ? catalog.familyIndex.get(latestModelPreference.resolvedFamilyIds[0]) : undefined;
      const modelPreferenceText = latestModelPreference?.resolution === "EXACT_MODEL_FAMILY" && preferredFamily
        ? `${preferredFamily.canonicalBrand} ${preferredFamily.canonicalModel} isteğini başlangıç noktası olarak tutuyorum; kullanımına uyup uymadığını birlikte kontrol edelim.`
        : undefined;
      const comparisonText = currentComparisonReferences.length > 0 ? `${currentComparisonReferences.map((reference) => {
        const family = reference.resolvedFamilyIds[0] ? catalog.familyIndex.get(reference.resolvedFamilyIds[0]) : undefined;
        if (reference.resolution === "NOT_FOUND") return `${reference.rawText} aktif katalogda bulunmuyor.`;
        if (reference.resolution === "AMBIGUOUS") return `${reference.rawText} için marka bilgisi netleşmeli.`;
        if (reference.resolution === "BRAND_ONLY") return `${reference.normalizedBrand ?? reference.rawText} markası aktif katalogda ${reference.resolvedFamilyIds.length} model ailesiyle bulunuyor.`;
        return family ? `${family.canonicalBrand} ${family.canonicalModel} aktif katalogda bulunuyor.` : `${reference.rawText} katalog kapsamında çözülemedi.`;
      }).join(" ")} Marka adına bakarak birini doğrudan üstün saymıyorum; kullanım amacın, bütçen ve konfor, sportiflik veya teknoloji önceliğine göre karşılaştıralım.` : undefined;
      const technicalField = guidanceField(memory, interpretation, turn.userMessage); const technicalText = technicalGuidance(technicalField, turn.userMessage);
      const corrected = interpretation.acceptedConstraintMutations.at(-1); const correctionText = corrected ? `Tamam; ${corrected.fieldId === "bodyStyle" ? "gövde" : corrected.fieldId === "transmission" ? "şanzıman" : corrected.fieldId === "fuelType" ? "yakıt" : "araç"} tercihini düzelttim.` : "Tamam, düzeltmeni dikkate aldım.";
      const socialText = socialResponse(turn.userMessage, interpretation.result.socialSignal?.kind);
      const currentSocialContextEvent = memory.events.find((event): event is Extract<typeof event, { eventType: "SOCIAL_INTERACTION" }> => event.eventType === "SOCIAL_INTERACTION" && event.sourceMessageId === turn.messageId);
      const currentHumanContext = currentSocialContextEvent?.humanContext;
      const humanContextAlreadyAcknowledged = currentHumanContext ? memory.events.some((event) => event.eventType === "SOCIAL_INTERACTION" && event.humanContext === currentHumanContext && event.sourceMessageId !== turn.messageId) : false;
      const contextualSocialAcknowledgement = Boolean(currentHumanContext && !humanContextAlreadyAcknowledged);
      const neutralChoiceAcknowledgement = /\b(?:fark etmez|önemli değil|bilmiyorum|emin değilim|atla)\b/iu.test(turn.userMessage.trim()) ? "Bu başlığı açık bırakalım; seni gereksiz yere tek seçeneğe sıkıştırmayacağım." : undefined;
      const decisionAcknowledgement = createPreferenceAcknowledgement({ constraints: interpretation.acceptedConstraintMutations, budgets: interpretation.acceptedBudgetMutations }) ?? neutralChoiceAcknowledgement;
      const greetingAcknowledgement = interpretation.result.socialSignal?.kind === "GREETING" ? socialText : undefined;
      const preferenceAcknowledgement = greetingAcknowledgement && decisionAcknowledgement ? `${greetingAcknowledgement}\n\n${decisionAcknowledgement}` : decisionAcknowledgement;
      const technicalAnswerRequested = obligation?.kind === "TECHNICAL_EXPLANATION" || act === "TECHNICAL_EXPLANATION_REQUEST" || act === "UNKNOWN_TECHNICAL_CONCEPT";
      const negativeFeedbackAcknowledgement = interpretation.result.acts.includes("NEGATIVE_FEEDBACK") ? socialText : undefined;
      const orderedTechnicalText = greetingAcknowledgement && technicalText ? `${greetingAcknowledgement}\n\n${technicalText}` : technicalText;
      const descriptiveAvailability = /(?:var mı|mevcut mu)[?\s]*$/iu.test(turn.userMessage) && interpretation.acceptedConstraintMutations.some((mutation) => ["bodyStyle", "fuelType", "transmission", "drivenWheels"].includes(mutation.fieldId));
      if (descriptiveAvailability) {
        ambiguityClarification = technical.eligibleCandidateIds.length > 0
          ? `Bu özelliklerin tümünü karşılayan ${technical.eligibleCandidateIds.length} seçenek aktif sıfır araç kataloğunda bulunuyor.`
          : "Bu özelliklerin tümünü aynı anda karşılayan bir seçenek aktif sıfır araç kataloğunda bulunmuyor.";
        action = { ...action, nextState: "DIRECT_MODEL_LOOKUP", nextAction: { type: "ANSWER_DIRECTLY" }, directAnswerObligation: { kind: "OTHER_SUPPORTED", sourceMessageId: turn.messageId, authorizedExplanationFactIds: ["direct-answer"], authorizedCandidateIds: [], placement: "BEFORE_MATERIAL_QUESTION" }, materialQuestion: null, shortlistIntent: null, explanationFactIds: [...new Set([...action.explanationFactIds, "direct-answer"])] };
      }
      const pluralRevealedRejection = act === "REJECTION" && /(?:bunları|bu araçları|bu modelleri|hepsini|üçünü|ikisini)/iu.test(turn.userMessage);
      const safeFactText = ambiguityClarification ?? comparisonText ?? catalogSuperlativeText ?? modelSuitabilityText ?? modelPreferenceText ?? negativeFeedbackAcknowledgement ?? (act === "REJECTION" ? rejectedAllFullPreferenceMatches ? "Bu seçenekleri yeniden önermeyeceğim. Aynı gövde ve yakıt tercihlerini birlikte karşılayan, daha önce göstermediğim başka bir seçenek kalmadı; gövde veya yakıt tercihinden hangisinin esneyebileceğini söyleyebilirsin." : pluralRevealedRejection ? "Bu seçenekleri yeniden önermeyeceğim; kalan araçlarla devam ediyorum." : "Bu modeli yeniden önermeyeceğim; kalan araçlarla devam ediyorum." : act === "CORRECTION" ? correctionText : undefined) ?? (contextualSocialAcknowledgement ? socialText : undefined) ?? (technicalAnswerRequested ? orderedTechnicalText ?? "Teknik terimi bilmen gerekmiyor; günlük kullanım beklentine göre ilerleyebiliriz." : lookupText) ?? preferenceAcknowledgement ?? (act === "SOCIAL" ? socialText : act === "ABUSE" ? abusiveCorrection ? `Hakaret etmeden devam edelim; düzeltmeni uyguladım. ${correctionText}` : action.nextAction.type === "END_POLITELY" ? "Hakaret içeren üslup sürdüğü için bu görüşmeyi burada bitiriyorum." : "Hakaret etmeden devam edelim; araç seçimi konusunda yardımcı olmaya hazırım." : act === "OFF_TOPIC" ? action.nextAction.type === "END_POLITELY" ? "Araç seçimi dışındaki talepler sürdüğü için bu görüşmeyi burada bitiriyorum." : "Bu görüşme araç seçimine odaklanıyor; kısa bir sapmadan sonra araç ihtiyacına dönebiliriz." : preferredBudgetGap ? "Bu kullanım ve araç tercihlerini belirttiğin bütçe seviyesinde karşılayan bir seçenek bulamadım. İstersen bütçeyi ne kadar artırabileceğini konuşabilir veya araç tercihlerinden birini esnetebiliriz." : availability === "HARD_CONFLICT" ? "Bu şartların tümünü aynı anda karşılayan bir araç bulamadım. Hangi tercihin esneyebileceğini birlikte seçebiliriz." : availability === "PRICE_UNRESOLVED" ? "Teknik olarak eşleşen seçenekler var; ancak fiyatları doğrulanmadığı için bütçe uyumlarını kesinleştiremiyorum. Bütçe tavanını kaldırabilir veya koşullardan birini esnetebilirsin." : availability === "TECHNICALLY_NOT_EVALUABLE" ? "Bazı teknik şartlar mevcut verilerle kesin değerlendirilemiyor; doğrulayabildiğim koşulları koruyarak devam edebilirim." : descriptiveAvailability ? "Elektrikli ve arazi kullanımına uygun seçenekleri doğru gövde tipini belirleyerek kontrol edebiliriz." : obligation?.kind === "RECOMMENDATION_REQUEST" && recommendationReadiness === "READY_FOR_OFFER" ? "İhtiyaçlarına uyan seçenekler hazır. Görmek ister misin?" : obligation?.kind === "RECOMMENDATION_REQUEST" ? "İhtiyacını birlikte daraltalım." : action.materialQuestion ? "Kararı etkileyen bir noktayı netleştirelim." : "Söylediğin bilgi karar üzerinde bir değişiklik oluşturmadı; neyi kastettiğini netleştirebiliriz.");
      const factKind = contextualSocialAcknowledgement || act === "SOCIAL" ? "SOCIAL_CONTEXT" as const : technicalText || obligation?.kind === "TECHNICAL_EXPLANATION" ? "TECHNICAL_GUIDANCE" as const : comparisonText || lookupText || modelPreferenceText ? "CATALOG" as const : "LIMITATION" as const;
      if (modelPreferenceText && !action.directAnswerObligation) action = { ...action, directAnswerObligation: { kind: "OTHER_SUPPORTED", sourceMessageId: turn.messageId, authorizedExplanationFactIds: ["direct-answer"], authorizedCandidateIds: [], placement: "BEFORE_MATERIAL_QUESTION" } };
      if (act === "SOCIAL" && !action.directAnswerObligation) action = { ...action, directAnswerObligation: { kind: "OTHER_SUPPORTED", sourceMessageId: turn.messageId, authorizedExplanationFactIds: ["direct-answer"], authorizedCandidateIds: [], placement: "BEFORE_MATERIAL_QUESTION" }, explanationFactIds: [...new Set([...action.explanationFactIds, "direct-answer"])] };
      if (preferenceAcknowledgement && !action.directAnswerObligation) action = { ...action, directAnswerObligation: { kind: "OTHER_SUPPORTED", sourceMessageId: turn.messageId, authorizedExplanationFactIds: ["direct-answer"], authorizedCandidateIds: [], placement: "BEFORE_MATERIAL_QUESTION" }, explanationFactIds: [...new Set([...action.explanationFactIds, "direct-answer"])] };
      if (negativeFeedbackAcknowledgement && !action.directAnswerObligation) action = { ...action, directAnswerObligation: { kind: "OTHER_SUPPORTED", sourceMessageId: turn.messageId, authorizedExplanationFactIds: ["direct-answer"], authorizedCandidateIds: [], placement: "BEFORE_MATERIAL_QUESTION" }, explanationFactIds: [...new Set([...action.explanationFactIds, "direct-answer"])] };
      if ((["CORRECTION", "REJECTION"].includes(act) || abusiveCorrection) && !action.explanationFactIds.includes("direct-answer")) action = { ...action, explanationFactIds: [...action.explanationFactIds, "direct-answer"] };
      if (act === "REJECTION" && !action.directAnswerObligation) action = { ...action, directAnswerObligation: { kind: "OTHER_SUPPORTED", sourceMessageId: turn.messageId, authorizedExplanationFactIds: ["direct-answer"], authorizedCandidateIds: [], placement: "BEFORE_MATERIAL_QUESTION" } };
      const facts = [{ id: "direct-answer", kind: factKind, safeText: safeFactText, ...(/20–40/iu.test(safeFactText) ? { authorizedNumericTokens: ["20", "40"] } : {}) }];
      const offerStoreRevision = memory.events.filter((event) => event.eventType === "OFFER_LIFECYCLE").length;
      let offerTransition: PersistedOfferTransitionIntent | undefined; if (!input.shadow && input.signer && input.offerStore && turn.offerToken && interpretation.result.acts.includes("OFFER_ACCEPTANCE")) { const verified = input.signer.verify(turn.offerToken); if (verified.status === "VALID" && verified.conversationId === memory.conversationId) { if (input.offerStore.persistsCreationWithConversationCommit) { const persisted = await input.offerStore.get(verified.offerId); const audit = turn.recommendationOfferAuditIntent; if (persisted && audit && audit.offerId === verified.offerId && audit.conversationId === memory.conversationId && persisted.lifecycleState === "CREATED" && persisted.catalogFingerprint === memory.catalogAuthority.catalogFingerprint && persisted.decisionFingerprint === memory.decisionFingerprint) { offerTransition = { ...audit, offerId: verified.offerId, conversationId: memory.conversationId, to: "REVEALED" as const, offerIdentityFingerprint: offerIdentityFingerprint(persisted) }; action = { ...action, nextState: "REVEALED", nextAction: { type: "REVEAL_AUTHORIZED_CARDS" }, shortlistIntent: null, materialQuestion: null }; } } else { const persisted = await input.offerStore.get(verified.offerId); const acceptedAt = turn.recommendationOfferAuditIntent?.acceptedAt ?? now.toISOString(); const revealedAt = turn.recommendationOfferAuditIntent?.revealedAt ?? new Date(Date.parse(acceptedAt) + 1).toISOString(); const consented = await input.offerStore.transition({ offerId: verified.offerId, conversationId: memory.conversationId, to: "CONSENTED", at: acceptedAt, expectedConversationRevision: offerStoreRevision, idempotencyKey: `${turn.idempotencyKey}:consent` }); if (consented.status === "OK" && persisted) { await input.offerStore.transition({ offerId: verified.offerId, conversationId: memory.conversationId, to: "REVEALED", at: revealedAt, expectedConversationRevision: consented.revision, idempotencyKey: `${turn.idempotencyKey}:reveal` }); offerTransition = { kind: "ACCEPT_RECOMMENDATION_TERMS_AND_REVEAL", offerId: verified.offerId, conversationId: memory.conversationId, to: "REVEALED" as const, recommendationTermsVersion: "REC-2026.08-v1.1", acceptedAt, revealedAt, acceptanceSequence: 1, revealSequence: 2, idempotencyKey: `${turn.idempotencyKey}:rec-audit`, offerIdentityFingerprint: offerIdentityFingerprint(persisted) }; action = { ...action, nextState: "REVEALED", nextAction: { type: "REVEAL_AUTHORIZED_CARDS" }, shortlistIntent: null, materialQuestion: null }; } } } }
      if (!offerTransition && input.signer && input.offerStore && !input.offerStore.persistsCreationWithConversationCommit && turn.offerToken && action.nextAction.type === "REVEAL_AUTHORIZED_CARDS") { const verified = input.signer.verify(turn.offerToken); if (verified.status === "VALID" && verified.conversationId === memory.conversationId) { const current = await input.offerStore.get(verified.offerId); if (current?.lifecycleState === "CREATED") { const acceptedAt = now.toISOString(); const revealedAt = new Date(now.getTime() + 1).toISOString(); const consented = await input.offerStore.transition({ offerId: verified.offerId, conversationId: memory.conversationId, to: "CONSENTED", at: acceptedAt, expectedConversationRevision: offerStoreRevision, idempotencyKey: `${turn.idempotencyKey}:consent` }); if (consented.status === "OK") { await input.offerStore.transition({ offerId: verified.offerId, conversationId: memory.conversationId, to: "REVEALED", at: revealedAt, expectedConversationRevision: consented.revision, idempotencyKey: `${turn.idempotencyKey}:reveal` }); offerTransition = { kind: "ACCEPT_RECOMMENDATION_TERMS_AND_REVEAL", offerId: verified.offerId, conversationId: memory.conversationId, to: "REVEALED" as const, recommendationTermsVersion: "REC-2026.08-v1.1", acceptedAt, revealedAt, acceptanceSequence: 1, revealSequence: 2, idempotencyKey: `${turn.idempotencyKey}:rec-audit`, offerIdentityFingerprint: offerIdentityFingerprint(current) }; } } } }
      if (!input.shadow && input.signer && input.offerStore && turn.offerToken && interpretation.result.acts.includes("OFFER_DECLINE")) { const verified = input.signer.verify(turn.offerToken); if (verified.status === "VALID" && verified.conversationId === memory.conversationId) { if (input.offerStore.persistsCreationWithConversationCommit) offerTransition = { offerId: verified.offerId, conversationId: memory.conversationId, to: "REVOKED" as const, at: now.toISOString() }; else await input.offerStore.transition({ offerId: verified.offerId, conversationId: memory.conversationId, to: "REVOKED", at: now.toISOString(), expectedConversationRevision: offerStoreRevision, idempotencyKey: `${turn.idempotencyKey}:decline` }); action = { ...action, nextState: "UNDERSTANDING_NEEDS", nextAction: { type: "ANSWER_DIRECTLY" }, shortlistIntent: null, materialQuestion: null }; } }
      if (offerTransition?.to === "REVEALED" && input.offerStore?.persistsCreationWithConversationCommit) offerTransition = { ...offerTransition, postCommitAuthorizationRequired: true };
      let offer; let offerToken; if (!input.shadow && input.signer && action.shortlistIntent) { const lastMessage = memory.events.at(-1)?.sourceMessageId ?? "turn"; const identity = offerIdentity(memory.conversationId, lastMessage); offer = createPersistedGovernedOffer({ shortlist: action.shortlistIntent, ranking, affordability, snapshot: catalog, conversationId: memory.conversationId, offerId: `offer_${identity}`, nonce: `nonce_${identity}`, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 10 * 60_000).toISOString(), rejectedCandidateIds: rejections.rejections.flatMap((item) => item.candidateId ? [item.candidateId] : []), explicitTrimComparisonRequested: false, explicitPriceUnresolvedConsent: false, budgetNearestVerifiedPriceSelection: budgetShortlistApplicable }); if (input.offerStore && !input.offerStore.persistsCreationWithConversationCommit) { const created = await input.offerStore.create(offer, offerStoreRevision, `${memory.conversationId}:${turn.idempotencyKey}:offer`); if (created.status !== "OK") throw new Error(`OFFER_STORE_${created.status}`); } offerToken = input.signer.sign(offer); }
      const presentingShortlist = action.nextAction.type === "REQUEST_REVEAL_CONSENT" || action.nextAction.type === "REVEAL_AUTHORIZED_CARDS";
      const candidateSummary = { count: technical.eligibleCandidateIds.length, basis: budgetShortlistApplicable && presentingShortlist ? "BUDGET_NEAREST_SHORTLIST" as const : "ACTIVE_DECISION_COHORT" as const, label: budgetShortlistApplicable && presentingShortlist ? `${technical.eligibleCandidateIds.length} seçenek teknik değerlendirmede; doğrulanmış veya kontrollü tahmini fiyatı bütçene en yakın ${shortlist.candidateIds.length} seçenek hazırlandı.` : `${technical.eligibleCandidateIds.length} seçenek değerlendirmede.` };
      input.smokeObserver?.({ phase: "DECISION", traceSchemaVersion: 1, messageId: turn.messageId, interpretedActs: interpretation.result.acts, semanticCompleteness: "COMPLETE", acceptedMutationCounts: { constraints: interpretation.acceptedConstraintMutations.length, budgets: interpretation.acceptedBudgetMutations.length, personas: interpretation.acceptedPersonaMutations.length, modelReferences: interpretation.result.modelReferences.length }, activeConstraints: [...constraints.activeHardConstraints.map((constraint) => ({ fieldId: constraint.fieldId, decisionEffect: "HARD_FILTER", normalizedValue: { operator: constraint.operator, value: constraint.value } })), ...constraints.activeNonHardConstraints.map((constraint) => ({ fieldId: constraint.fieldId, decisionEffect: constraint.decisionEffect, normalizedValue: constraint.normalizedValue }))], action: action.nextAction.type, recommendationReadiness, unansweredDecisionFields: questions.unansweredDecisionFields, generatedQuestionKeys: questions.questionCandidates.map((candidate) => candidate.question.stableSemanticKey), generatedQuestionStages: questions.questionCandidates.map((candidate) => ({ stableSemanticKey: candidate.question.stableSemanticKey, stage: candidate.stage, eligible: candidate.eligible, blockedUntilStagesComplete: candidate.blockedUntilStagesComplete })), questionStageCompletion: questions.stageCompletion, selectedQuestionKey: action.materialQuestion?.stableSemanticKey ?? null, selectedQuestionStage: questions.questionCandidates.find((candidate) => candidate.question.stableSemanticKey === action.materialQuestion?.stableSemanticKey)?.stage ?? null, materialQuestionCount: action.materialQuestion ? 1 : 0, directAnswerRequired: Boolean(obligation), directAnswerPlacement: obligation?.placement ?? null, lookupResolution: latestLookup?.resolution ?? null, modelScope: scopedFamilyIds, modelPreferenceScope: preferenceScope, exactModelPreferenceScope, shortlistMode: shortlist.mode, directAnswerFact: comparisonText ?? lookupText ?? null, availability, technicalBuckets: { eligible: technical.eligibleCandidateIds.length, notEvaluable: technical.notEvaluableCandidateIds.length, eliminated: technical.eliminatedCandidateIds.length }, affordabilityBuckets: { selectable: affordability.selectableCandidateIds.length, verifiedWithin: affordability.verifiedPriceEligibleCandidateIds.length, estimateWithin: affordability.internalEstimateWithinCandidateIds.length, estimateOverConditional: affordability.estimatedOverBudgetConditionalCandidateIds.length, budgetNotApplied: affordability.budgetNotAppliedEligibleCandidateIds.length, verifiedOver: affordability.verifiedOverBudgetCandidateIds.length, unresolved: affordability.priceUnresolvedCandidateIds.length, technicalUnknown: affordability.technicallyNotEvaluableCandidateIds.length, eliminated: affordability.eliminatedCandidateIds.length }, rankingCandidates: ranking.candidates.map((candidate) => { const variant = catalog.variantById.get(candidate.exactVariantId)!; return { exactVariantId: candidate.exactVariantId, modelFamilyId: candidate.modelFamilyId, brand: variant.brand, model: variant.model, bodyStyle: variant.decisionFacts.bodyStyle.value, fuelType: variant.decisionFacts.powertrain.fuelType.value, transmissionClass: /manual/iu.test(variant.decisionFacts.powertrain.transmission.value) ? "MANUAL" : "AUTOMATIC", finalOrdinal: candidate.finalOrdinal, functionalFitScore: candidate.rankVector.find((tier) => tier.tier === "CONFIRMED_FUNCTIONAL_FIT")?.score ?? 0, rankingReasonCodes: candidate.rankingReasonCodes }; }), persona: { activated: memory.persona.activated, requestedTraits: memory.persona.requestedTraits, affectedRanking: ranking.candidates.some((candidate) => candidate.personaTrace.affectedRanking) }, activeOffer: memory.currentOffer?.offerId ?? null, offerCreated: Boolean(offer), identityFreeOffer: Boolean(offer), shortlistCandidateIds: shortlist.candidateIds });
      input.smokeObserver?.({ phase: "SEMANTIC_AUTHORITY", messageId: turn.messageId, providerActs: interpretation.providerActs, authoritativeActs: interpretation.result.acts, policyTrace: interpretation.policyTrace });
      return { action, offer, offerToken, offerTransition, candidateSummary, facts };
    },
    authorizeCards: async ({ token, conversationId, catalog, memory }) => { if (!input.signer || !input.offerStore) return []; const authorization = await authorizePersistedCards({ token, signer: input.signer, store: input.offerStore, conversationId, catalogFingerprint: catalog.authority.catalogFingerprint, decisionFingerprint: memory.decisionFingerprint }); if (authorization.status !== "AUTHORIZED") return []; const verified = input.signer.verify(token); if (verified.status !== "VALID") return []; const offer = await input.offerStore.get(verified.offerId); if (!offer) return []; return projectAuthorizedPublicCards({ offer, conversationId, decisionFingerprint: memory.decisionFingerprint, snapshot: catalog }); },
    realize: async ({ action, facts }) => { const directFact = action.directAnswerObligation ? facts.find((fact) => action.directAnswerObligation?.authorizedExplanationFactIds.includes(fact.id)) : undefined; const result = await realizeDecisionResponse({ actionDecision: action, ...(directFact ? { directAnswer: { safeText: directFact.safeText, factIds: [directFact.id] } } : {}), explanationFacts: facts, materialQuestion: action.materialQuestion, mentionableCandidates: [], revealableCandidates: [], tonePolicy: TURKISH_TONE_POLICY, safetyPolicy: REALIZATION_SAFETY_POLICY_V1 }, input.realizer); input.smokeObserver?.({ phase: "REALIZATION", action: action.nextAction.type, validation: result.validation.ok ? "VALID" : result.validation.codes, source: result.source, attempts: result.attempts, firstAttemptCodes: result.firstAttemptCodes, repairAttemptCodes: result.repairAttemptCodes }); return { message: result.result.message, source: result.source }; },
  };
}
export function createCarsDecisionV2ProductionComposition(input: Parameters<typeof createProductionV2TurnStages>[0] & { readonly store: import("../orchestrator/types").V2ConversationStore }) { return Object.freeze({ store: input.store, stages: createProductionV2TurnStages(input) }); }
