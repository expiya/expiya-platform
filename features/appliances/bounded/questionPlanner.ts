import type { AppliancesLedgerEvent, AppliancesRuntimeOutcome } from "../contracts";
import type { BoundedProductType } from "./authority.server";
import { selectHighestMaterialQuestion } from "@/features/xpy/questionGuidance";

export interface BoundedQuestionPlanInput {
  readonly type: BoundedProductType;
  readonly activeEvents: readonly AppliancesLedgerEvent[];
  readonly candidateCount: number;
  readonly unknownHardEvidence: readonly string[];
  readonly askedQuestionKeys: readonly string[];
}

const has = (events: readonly AppliancesLedgerEvent[], concept: string) => events.some(event => event.conceptId === concept);
const value = (events: readonly AppliancesLedgerEvent[], concept: string) => events.find(event => event.conceptId === concept)?.normalizedValue;

export function planBoundedQuestion(input: BoundedQuestionPlanInput): Extract<AppliancesRuntimeOutcome, { kind: "ASK" | "CLARIFY" }> | undefined {
  if (input.type === "SPLIT_AIR_CONDITIONER" && !has(input.activeEvents, "PROFESSIONAL_SITE_VERIFICATION")) return {
    kind: "CLARIFY",
    questionKey: "appliances.split-ac.site-verification",
    message: "Seçilen iç ve dış ünite çifti için oda ısı yükü, elektrik devresi ve topraklama, soğutucu akışkan, bakır borulama, drenaj ve montaj koşullarını yetkili servis veya nitelikli iklimlendirme uzmanı yerinde doğruladı mı? Doğrulanmadıysa güvenli bir öneri oluşturamam.",
  };
  if ((input.type === "ELECTRIC_STORAGE_WATER_HEATER" || input.type === "INSTANTANEOUS_ELECTRIC_WATER_HEATER") && !has(input.activeEvents, "PROFESSIONAL_SITE_VERIFICATION")) return {
    kind: "CLARIFY",
    questionKey: input.type === "ELECTRIC_STORAGE_WATER_HEATER" ? "appliances.storage-water-heater.site-verification" : "appliances.instant-water-heater.site-verification",
    message: "Seçilen ürün için elektrik devresi, kablo, koruma, topraklama, ıslak alan, montaj yüzeyi, su bağlantısı ve basınç koşullarını yetkili servis veya nitelikli uzman yerinde doğruladı mı? Doğrulanmadıysa güvenli bir öneri oluşturamam.",
  };
  if (input.unknownHardEvidence.length) return { kind: "CLARIFY", questionKey: "UNRESOLVED_HARD_UNCERTAINTY", message: "Zorunlu şart için doğrulanmış ürün bilgisi eksik; bu şartla güvenilir bir seçim yapılamaz." };
  if (input.candidateCount === 0) return { kind: "CLARIFY", questionKey: "NO_RECOMMENDATION_ELIGIBLE_CANDIDATE", message: "Doğrulanmış zorunlu koşulları karşılayan aday kalmadı." };
  const candidates: { key: string; message: string; relevant: boolean; materialDecisionValue: number }[] = input.type === "DISHWASHER" ? [
    { key: "appliances.dishwasher.capacity", message: "Kalabalık sofralar için kaç kişilik kapasiteyi alt sınır kabul etmeliyim?", relevant: ((value(input.activeEvents, "CAPACITY") as { numericConstraint?: boolean; declined?: boolean } | undefined)?.numericConstraint === false) && !((value(input.activeEvents, "CAPACITY") as { declined?: boolean } | undefined)?.declined), materialDecisionValue: 100 },
    { key: "appliances.dishwasher.fit", message: "Yerleşeceği boşlukta kesin bir genişlik sınırı var mı? Varsa ölçüyü cm olarak yazabilirsin.", relevant: !has(input.activeEvents, "FIT"), materialDecisionValue: 90 },
    { key: "appliances.dishwasher.material", message: "Günlük kullanımda hangisi vazgeçilmez: otomatik kapı açma mı, ayrı çatal-bıçak çekmecesi mi?", relevant: !["AUTO_OPEN_DRY", "CUTLERY_TRAY", "ECO_RESOURCE"].some(concept => has(input.activeEvents, concept)) && input.candidateCount > 1, materialDecisionValue: 70 },
  ] : input.type === "VACUUM" ? [
    { key: "appliances.vacuum.radius", message: "Priz değiştirmeden ulaşman gereken en az çalışma yarıçapı kaç metre?", relevant: ((value(input.activeEvents, "RADIUS") as { numericConstraint?: boolean; declined?: boolean } | undefined)?.numericConstraint === false) && !((value(input.activeEvents, "RADIUS") as { declined?: boolean } | undefined)?.declined), materialDecisionValue: 100 },
    { key: "appliances.vacuum.material", message: "Evcil hayvan başlığı mı, HEPA filtre mi senin için vazgeçilmez?", relevant: !has(input.activeEvents, "PET_HEAD") && input.candidateCount > 1, materialDecisionValue: 80 },
  ] : input.type === "ROBOT_VACUUM" ? [
    { key: "appliances.robot.height", message: "Mobilya altındaki en düşük açıklık kaç cm?", relevant: ((value(input.activeEvents, "ROBOT_HEIGHT") as { numericConstraint?: boolean; declined?: boolean } | undefined)?.numericConstraint === false) && !((value(input.activeEvents, "ROBOT_HEIGHT") as { declined?: boolean } | undefined)?.declined), materialDecisionValue: 100 },
    { key: "appliances.robot.fit", message: "Robot için kesin bir genişlik sınırı var mı? Varsa ölçüyü cm olarak yazabilirsin.", relevant: !has(input.activeEvents, "FIT"), materialDecisionValue: 90 },
    { key: "appliances.robot.material", message: "Otomatik toz boşaltma mı, halıda paspas kaldırma mı vazgeçilmez?", relevant: !["MOP_LIFT", "AUTO_EMPTY", "CONNECTIVITY_PRIVACY"].some(concept => has(input.activeEvents, concept)) && input.candidateCount > 1, materialDecisionValue: 70 },
  ] : input.type === "FREEZER" ? [{key:"appliances.freezer.material",message:"Dikey çekmeceli form mu, sandık tipi form mu istiyorsun?",relevant:!has(input.activeEvents,"DEFROST"),materialDecisionValue:80}]
    : input.type === "BUILT_IN_OVEN" ? [{key:"appliances.oven.material",message:"Günlük kullanımda temizlik kolaylığı mı, pişirme modu çeşitliliği mi daha önemli?",relevant:!has(input.activeEvents,"COOKING_MODES"),materialDecisionValue:80}]
      : input.type === "FREESTANDING_COOKER" ? [{key:"appliances.cooker.material",message:"Gazlı ocak ve elektrikli fırın birleşimi mevcut tesisatına uygun mu?",relevant:!has(input.activeEvents,"FUEL_CONFIGURATION"),materialDecisionValue:100}]
        : input.type === "HOB" ? [{key:"appliances.hob.material",message:"İndüksiyon teknolojisi ve uyumlu kap kullanımı senin için uygun mu?",relevant:!has(input.activeEvents,"TECHNOLOGY"),materialDecisionValue:100}]
          : input.type === "RANGE_HOOD" ? [{key:"appliances.hood.material",message:"Kurulum bacalı mı, resirkülasyonlu mu olacak?",relevant:!has(input.activeEvents,"AIR_MODE"),materialDecisionValue:100}]
            : input.type === "COUNTERTOP_MICROWAVE_OVEN" ? [{key:"appliances.countertop-microwave.material",message:"Tezgâh üzerinde üreticinin istediği havalandırma boşluklarını sağlayabiliyor musun?",relevant:!has(input.activeEvents,"RF_SAFE_USE"),materialDecisionValue:100}]
              : input.type === "BUILT_IN_MICROWAVE_OVEN" ? [{key:"appliances.built-in-microwave.material",message:"Dolap nişi ve elektrik bağlantısı seçilen ürünün kurulum talimatına göre doğrulandı mı?",relevant:!has(input.activeEvents,"INSTALLATION_ENVELOPE"),materialDecisionValue:100}] 
                : input.type === "AIR_PURIFIER" ? [
                  {key:"appliances.air-purifier.room-area",message:"Hava temizleyiciyi kullanacağın oda yaklaşık kaç m²? Bu bilgi bağlam olarak korunur; tek başına oda uygunluğu veya sağlık sonucu vaat etmez.",relevant:!has(input.activeEvents,"PM_CADR"),materialDecisionValue:100},
                  {key:"appliances.air-purifier.material",message:"Filtre değişimine erişebilmen ve düzenli bakım yapman senin için uygun mu?",relevant:has(input.activeEvents,"PM_CADR")&&!has(input.activeEvents,"FILTER_MAINTENANCE"),materialDecisionValue:90},
                ]
                  : input.type === "FULLY_AUTOMATIC_ESPRESSO_MACHINE" ? [{key:"appliances.fully-automatic-espresso.material",message:"Dahili öğütücü, demleme grubu ve süt sisteminin kılavuzdaki günlük bakımını üstlenebilir misin?",relevant:!has(input.activeEvents,"BEAN_TO_CUP_MAINTENANCE"),materialDecisionValue:100}]
                    : input.type === "MANUAL_ESPRESSO_MACHINE" ? [{key:"appliances.manual-espresso.material",message:"Öğütücüyü ayrı değerlendireceğimiz manuel portafiltre ve buhar çubuğu düzeni senin için uygun mu?",relevant:!has(input.activeEvents,"MANUAL_BREWING_WORKFLOW"),materialDecisionValue:100}]
                      : input.type === "FILTER_COFFEE_MACHINE" ? [{key:"appliances.filter-coffee.material",message:"Demleme miktarı ile cam veya termal karaf düzeninden hangisi senin için vazgeçilmez?",relevant:!has(input.activeEvents,"BATCH_AND_CARAFE"),materialDecisionValue:100}]
                        : input.type === "TURKISH_COFFEE_MACHINE" ? [{key:"appliances.turkish-coffee.material",message:"Tek seferde fincan sayısı ile taşma yönetiminden hangisi senin için vazgeçilmez?",relevant:!has(input.activeEvents,"CUP_AND_OVERFLOW"),materialDecisionValue:100}]
                          : input.type === "AIR_FRYER" ? [{key:"appliances.air-fryer.material",message:"Tek sepet mi, ayrı kontrol edilen çift sepet mi istiyorsun?",relevant:!has(input.activeEvents,"BASKET_AND_CAVITY"),materialDecisionValue:100}]
                            : input.type === "BLENDER" ? [{key:"appliances.blender.material",message:"Cam sürahi mi, kişisel şişe aksesuarı mı senin için önemli?",relevant:!has(input.activeEvents,"JUG_AND_BLADE"),materialDecisionValue:100}]
                              : input.type === "FOOD_PROCESSOR" ? [{key:"appliances.food-processor.material",message:"Dilimleme, rendeleme ve yoğurma aksesuarlarından hangileri vazgeçilmez?",relevant:!has(input.activeEvents,"BOWL_AND_ACCESSORY_BUNDLE"),materialDecisionValue:100}]
                                : [];
  const next = selectHighestMaterialQuestion(candidates.map(candidate => ({ question: candidate, answerable: candidate.relevant && !input.askedQuestionKeys.includes(candidate.key), materialDecisionValue: candidate.materialDecisionValue, stableKey: candidate.key })));
  if (next) return { kind: "ASK", questionKey: next.key, message: next.message };
  return undefined;
}
