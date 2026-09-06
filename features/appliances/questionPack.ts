import type { XpyChoiceSet, XpyChoiceSubmission } from "@/features/xpy/contracts";
import { choiceSetFor, consumerQuestionText, defineXpyQuestionPack, validateChoiceSubmission } from "@/features/xpy/questionGuidance";
import type { AppliancesLedgerEvent, AppliancesProductType, AppliancesRuntimeOutcome } from "./contracts";

const single = (questionKey: string, options: XpyChoiceSet["options"], prompt?: string): XpyChoiceSet => ({ questionKey, selectionMode: "SINGLE", source: "DOMAIN_PACK", ...(prompt ? { prompt } : {}), options });
const escape = (questionKey: string, label: string, description: string) => single(questionKey, [{ value: "gerek yok", label, description, exclusive: true }]);
const yesNo = (questionKey: string, wanted: string, ignored: string) => single(questionKey, [
  { value: "evet", label: wanted, description: "Bu ihtiyacı doğrulanmış karar bağlamında kullan." },
  { value: "hayır", label: ignored, description: "Bu başlığı seçim ölçütü yapmadan devam et.", exclusive: true },
]);

export const APPLIANCES_QUESTION_PACK = defineXpyQuestionPack({ packId: "appliances-stage1-question-pack/v1", questions: {
  "xpy.advisory.purchaseInterest": single("xpy.advisory.purchaseInterest", [
    { value: "Kendi kullanımım için ürün seçmek istiyorum", label: "Ürün seçmek istiyorum", description: "Kendi kullanımına uygun seçime geç." },
    { value: "Şimdilik yalnızca bilgi istiyorum", label: "Yalnızca bilgi", description: "Bilgiyi tercih olarak kaydetmeden burada kal.", exclusive: true },
  ], "Bunu yalnızca bilgi için mi soruyorsun, yoksa kendi kullanımın için ürün seçmeyi de düşünüyor musun?"),
  "appliances.wm.householdContext": single("appliances.wm.householdContext", [
    { value: "Tek yaşıyorum", label: "1 kişi", description: "Tek kişilik kullanım düzeni." },
    { value: "2 kişiyiz", label: "2 kişi", description: "İki kişilik kullanım düzeni." },
    { value: "4 kişiyiz", label: "3–4 kişi", description: "Üç veya dört kişilik kullanım düzeni." },
    { value: "6 kişiyiz", label: "5+ kişi", description: "Beş veya daha fazla kişilik kullanım düzeni." },
    { value: "bilmiyorum", label: "Henüz bilmiyorum", description: "Bu bilgiyi vermeden devam et.", exclusive: true },
  ]),
  "appliances.wm.installation.maxWidthMm": escape("appliances.wm.installation.maxWidthMm", "Ölçüyü bilmiyorum", "Bu ölçüyü şimdilik karar filtresi yapma."),
  "appliances.wm.installation.maxHeightMm": escape("appliances.wm.installation.maxHeightMm", "Ölçüyü bilmiyorum", "Bu ölçüyü şimdilik karar filtresi yapma."),
  "appliances.wm.installation.maxBodyDepthMm": escape("appliances.wm.installation.maxBodyDepthMm", "Ölçüyü bilmiyorum", "Bu ölçüyü şimdilik karar filtresi yapma."),
  "appliances.wm.budget.maximumTry": single("appliances.wm.budget.maximumTry", [{ value: "bilmiyorum", label: "Bilmiyorum", description: "Kesin üst sınır olmadan ihtiyaçlarla devam et.", exclusive: true }]),
  "appliances.wm.remoteControl.requirement": yesNo("appliances.wm.remoteControl.requirement", "Evet, uzaktan kontrol", "Önemli değil"),
  "appliances.wm.autoDosing.preference": yesNo("appliances.wm.autoDosing.preference", "Evet, otomatik dozaj", "Önemli değil"),
  "appliances.wm.noise.priority": yesNo("appliances.wm.noise.priority", "Evet, düşük ses önemli", "Önemli değil"),

  "appliances.dryer.installationFit": escape("appliances.dryer.installationFit", "Ölçü sınırım yok", "Kurulum ölçüsünü zorunlu filtre yapma."),
  "appliances.dryer.capacity": single("appliances.dryer.capacity", [
    { value: "8 kg", label: "8 kg", description: "Sekiz kilogramı alt sınır olarak kullan." },
    { value: "9 kg", label: "9 kg", description: "Dokuz kilogramı alt sınır olarak kullan." },
    { value: "gerek yok", label: "Henüz bilmiyorum", description: "Kapasite alt sınırı olmadan devam et.", exclusive: true },
  ]),

  "appliances.refrigerator.freezerArrangement": single("appliances.refrigerator.freezerArrangement", [
    { value: "Dondurucu altta olsun", label: "Dondurucu altta", description: "Alttan donduruculu kombi düzenini zorunlu kabul et." },
    { value: "Dondurucu üstte olsun", label: "Dondurucu üstte", description: "Üstten donduruculu düzeni zorunlu kabul et." },
    { value: "Dondurucunun yeri fark etmez", label: "Fark etmez", description: "Kapı sayısını bir düzen varsayımına dönüştürmeden devam et.", exclusive: true },
  ], "Çift kapılı derken dondurucu bölmesini nerede istiyorsun?"),
  "appliances.refrigerator.installationEnvelope": escape("appliances.refrigerator.installationEnvelope", "Ölçü sınırım yok", "Kurulum ölçüsünü zorunlu filtre yapma."),
  "appliances.refrigerator.netCapacity": escape("appliances.refrigerator.netCapacity", "Litre alt sınırım yok", "Net hacme zorunlu alt sınır uygulama."),
  "appliances.refrigerator.capacityScope": single("appliances.refrigerator.capacityScope", [
    { value: "Taze gıda net hacmi öncelikli", label: "Taze gıda bölmesi", description: "Soğutucu bölümünün net hacmini netleştir." },
    { value: "Dondurucu net hacmi öncelikli", label: "Dondurucu bölmesi", description: "Dondurucu bölümünün net hacmini netleştir." },
    { value: "Toplam net hacim öncelikli", label: "Toplam net hacim", description: "Brüt hacim yerine toplam net hacmi önceliklendir." },
    { value: "Hacim türü fark etmez", label: "Fark etmez", description: "Belirli bir hacim türünü öncelik yapma.", exclusive: true },
  ]),
  "CONFIRM:LOW_NOISE_PRIORITY": yesNo("CONFIRM:LOW_NOISE_PRIORITY", "Evet, düşük ses önemli", "Hayır, öncelik değil"),

  "appliances.dishwasher.capacity": escape("appliances.dishwasher.capacity", "Kapasite alt sınırım yok", "Kapasiteyi zorunlu filtre yapma."),
  "appliances.dishwasher.fit": escape("appliances.dishwasher.fit", "Ölçü sınırım yok", "Kurulum ölçüsünü zorunlu filtre yapma."),
  "appliances.dishwasher.material": single("appliances.dishwasher.material", [
    { value: "Otomatik kapı açma zorunlu", label: "Otomatik kapı açma", description: "Program sonunda kapı açma işlevini zorunlu tut." },
    { value: "Çatal bıçak çekmecesi zorunlu", label: "Çatal-bıçak çekmecesi", description: "Ayrı çekmeceyi zorunlu tut." },
    { value: "Bu özellikler fark etmez", label: "Fark etmez", description: "Bu işlevleri zorunlu tutmadan devam et.", exclusive: true },
  ]),
  "appliances.vacuum.radius": escape("appliances.vacuum.radius", "Yarıçap alt sınırım yok", "Çalışma yarıçapını zorunlu filtre yapma."),
  "appliances.vacuum.material": single("appliances.vacuum.material", [
    { value: "Evcil hayvan başlığı zorunlu", label: "Evcil hayvan başlığı", description: "Doğrulanmış özel başlığı zorunlu tut." },
    { value: "HEPA filtre zorunlu", label: "HEPA filtre", description: "Doğrulanmış HEPA beyanını zorunlu tut." },
    { value: "Bu özellikler fark etmez", label: "Fark etmez", description: "Bu işlevleri zorunlu tutmadan devam et.", exclusive: true },
  ]),
  "appliances.robot.height": escape("appliances.robot.height", "Yükseklik sınırım yok", "Mobilya altı yüksekliğini zorunlu filtre yapma."),
  "appliances.robot.fit": escape("appliances.robot.fit", "Ölçü sınırım yok", "Robot veya istasyon ölçüsünü zorunlu filtre yapma."),
  "appliances.robot.material": single("appliances.robot.material", [
    { value: "Otomatik toz boşaltma zorunlu", label: "Otomatik boşaltma", description: "İstasyonun hazneyi boşaltmasını zorunlu tut." },
    { value: "Halıda paspas kaldırma zorunlu", label: "Paspas kaldırma", description: "Halı algılandığında paspas kaldırmayı zorunlu tut." },
    { value: "Bu özellikler fark etmez", label: "Fark etmez", description: "Bu işlevleri zorunlu tutmadan devam et.", exclusive: true },
  ]),
  "appliances.freezer.material": escape("appliances.freezer.material", "Form fark etmez", "Formu zorunlu filtre yapma."),
  "appliances.oven.material": escape("appliances.oven.material", "Önemli değil", "Bu işlevleri zorunlu filtre yapma."),
  "appliances.cooker.material": escape("appliances.cooker.material", "Bilmiyorum, uzmanla doğrulayacağım", "Tesisat için model tavsiyesi verme."),
  "appliances.hob.material": escape("appliances.hob.material", "Bilmiyorum, uzmanla doğrulayacağım", "Kurulum uygunluğunu varsayma."),
  "appliances.hood.material": escape("appliances.hood.material", "Henüz bilmiyorum", "Hava çıkış düzenini varsayma."),
  "appliances.countertop-microwave.material": escape("appliances.countertop-microwave.material", "Henüz bilmiyorum", "Havalandırma ve RF güvenliğini varsayma."),
  "appliances.built-in-microwave.material": escape("appliances.built-in-microwave.material", "Henüz bilmiyorum", "Niş ve elektrik uygunluğunu varsayma."),
  "appliances.air-purifier.room-area": escape("appliances.air-purifier.room-area", "Ölçüyü bilmiyorum", "Oda alanını varsaymadan devam et."),
  "appliances.air-purifier.material": single("appliances.air-purifier.material", [
    { value: "evet", label: "Evet, düzenli bakım yapabilirim", description: "Filtre değişimi ve bakım düzenini seçim bağlamında kullan." },
    { value: "hayır", label: "Hayır, uygun değil", description: "Bakım yükümlülüğünü kabul etmeden devam et." },
    { value: "bilmiyorum", label: "Henüz bilmiyorum", description: "Filtre bakım uygunluğunu varsayma.", exclusive: true },
  ]),
  "appliances.fully-automatic-espresso.material": escape("appliances.fully-automatic-espresso.material", "Henüz bilmiyorum", "Bakım ve süt sistemi uygunluğunu varsayma."),
  "appliances.manual-espresso.material": escape("appliances.manual-espresso.material", "Henüz bilmiyorum", "Öğütücü ve aksesuar yapılandırmasını varsayma."),
  "appliances.filter-coffee.material": escape("appliances.filter-coffee.material", "Henüz bilmiyorum", "Karaf ve demleme miktarını varsayma."),
  "appliances.turkish-coffee.material": escape("appliances.turkish-coffee.material", "Henüz bilmiyorum", "Fincan ve taşma düzenini varsayma."),
  "appliances.air-fryer.material": escape("appliances.air-fryer.material", "Fark etmez", "Sepet düzenini zorunlu filtre yapma."),
  "appliances.blender.material": escape("appliances.blender.material", "Fark etmez", "Sürahi veya şişe düzenini zorunlu filtre yapma."),
  "appliances.food-processor.material": escape("appliances.food-processor.material", "Henüz bilmiyorum", "Aksesuar işlevlerini varsayma."),
  "appliances.storage-water-heater.site-verification": single("appliances.storage-water-heater.site-verification", [
    { value: "Yetkili servis elektrik tesisat ve montaj koşullarını doğruladı", label: "Uzman doğruladı", description: "Seçilecek model için yerinde doğrulama tamamlandı." },
    { value: "Henüz doğrulanmadı", label: "Henüz bilmiyorum", description: "Öneri oluşturmadan doğrulama beklenir.", exclusive: true },
  ]),
  "appliances.instant-water-heater.site-verification": single("appliances.instant-water-heater.site-verification", [
    { value: "Yetkili servis elektrik tesisat ve montaj koşullarını doğruladı", label: "Uzman doğruladı", description: "Seçilecek model için yerinde doğrulama tamamlandı." },
    { value: "Henüz doğrulanmadı", label: "Henüz bilmiyorum", description: "Öneri oluşturmadan doğrulama beklenir.", exclusive: true },
  ]),
  "appliances.split-ac.site-verification": single("appliances.split-ac.site-verification", [
    { value: "Yetkili iklimlendirme uzmanı exact çift için oda ısı yükü elektrik soğutucu borulama drenaj ve montaj koşullarını doğruladı", label: "Uzman doğruladı", description: "Exact iç/dış ünite çifti için yerinde doğrulama tamamlandı." },
    { value: "Henüz bilmiyorum", label: "Henüz bilmiyorum", description: "Öneri oluşturmadan doğrulanmış ünite çifti ve saha incelemesi beklenir.", exclusive: true },
  ]),
} });

const vettedPrompts: Readonly<Record<string, string>> = {
  "xpy.advisory.purchaseInterest": "Bunu yalnızca bilgi için mi soruyorsun, yoksa kendi kullanımın için ürün seçmeyi de düşünüyor musun?",
  "appliances.wm.householdContext": "Evde düzenli olarak kaç kişi yaşıyor?",
  "appliances.wm.installation.maxWidthMm": "Makine için kullanılabilir net genişlik en fazla kaç cm?", "appliances.wm.installation.maxHeightMm": "Makine için kullanılabilir net yükseklik en fazla kaç cm?", "appliances.wm.installation.maxBodyDepthMm": "Makine gövdesi için kullanılabilir net derinlik en fazla kaç cm?",
  "appliances.wm.budget.maximumTry": "Uygulanmasını istediğin kesin üst bütçe kaç TL?", "appliances.wm.remoteControl.requirement": "Uygulamadan uzaktan kontrol senin için önemli mi?", "appliances.wm.autoDosing.preference": "Otomatik deterjan dozajlama senin için önemli mi?", "appliances.wm.noise.priority": "Düşük sıkma sesi senin için önemli mi?",
  "appliances.dryer.installationFit": "Yerleşeceği boşlukta kesin bir genişlik sınırı var mı?", "appliances.dryer.capacity": "En az kaç kg kurutma kapasitesine ihtiyacın var?",
  "appliances.refrigerator.installationEnvelope": "Yerleşeceği boşlukta kesin bir genişlik sınırı var mı?", "appliances.refrigerator.netCapacity": "Taze gıda bölmesi için zorunlu bir minimum net litre ihtiyacın var mı?", "appliances.refrigerator.capacityScope": "Önceliğin taze-gıda, dondurucu veya toplam net hacimden hangisi?", "CONFIRM:LOW_NOISE_PRIORITY": "Düşük ses seviyesini seçim tercihi olarak kullanalım mı?",
  "appliances.dishwasher.capacity": "Kalabalık sofralar için kaç kişilik kapasiteyi alt sınır kabul etmeliyim?", "appliances.dishwasher.fit": "Yerleşeceği boşlukta kesin bir genişlik sınırı var mı?", "appliances.dishwasher.material": "Otomatik kapı açma mı, ayrı çatal-bıçak çekmecesi mi vazgeçilmez?",
  "appliances.vacuum.radius": "Priz değiştirmeden ulaşman gereken en az çalışma yarıçapı kaç metre?", "appliances.vacuum.material": "Evcil hayvan başlığı mı, HEPA filtre mi vazgeçilmez?",
  "appliances.robot.height": "Mobilya altındaki en düşük açıklık kaç cm?", "appliances.robot.fit": "Robot için kesin bir genişlik sınırı var mı?", "appliances.robot.material": "Otomatik toz boşaltma mı, halıda paspas kaldırma mı vazgeçilmez?",
  "appliances.freezer.material":"Dikey çekmeceli form mu, sandık tipi form mu istiyorsun?", "appliances.oven.material":"Günlük kullanımda temizlik kolaylığı mı, pişirme modu çeşitliliği mi daha önemli?", "appliances.cooker.material":"Gazlı ocak ve elektrikli fırın birleşimi mevcut tesisatına uygun mu?", "appliances.hob.material":"İndüksiyon teknolojisi ve uyumlu kap kullanımı senin için uygun mu?", "appliances.hood.material":"Kurulum bacalı mı, resirkülasyonlu mu olacak?",
  "appliances.countertop-microwave.material":"Tezgâhta ürün kılavuzundaki havalandırma boşluklarını sağlayabiliyor musun?", "appliances.built-in-microwave.material":"Dolap nişi seçilecek modelin kurulum çizimine göre doğrulandı mı?", "appliances.air-purifier.room-area":"Hava temizleyiciyi kullanacağın oda yaklaşık kaç m²?", "appliances.air-purifier.material":"Filtre değişimine erişebilmen ve düzenli bakım yapman senin için uygun mu?",
  "appliances.fully-automatic-espresso.material":"Dahili öğütücü, demleme grubu ve süt sisteminin kılavuzdaki günlük bakımını üstlenebilir misin?", "appliances.manual-espresso.material":"Öğütücüyü ayrı değerlendireceğimiz manuel portafiltre ve buhar çubuğu düzeni senin için uygun mu?", "appliances.filter-coffee.material":"Demleme miktarı ile cam veya termal karaf düzeninden hangisi senin için vazgeçilmez?", "appliances.turkish-coffee.material":"Tek seferde fincan sayısı ile taşma yönetiminden hangisi senin için vazgeçilmez?",
  "appliances.air-fryer.material":"Tek sepet mi, ayrı kontrol edilen çift sepet mi istiyorsun?", "appliances.blender.material":"Cam sürahi mi, kişisel şişe aksesuarı mı senin için önemli?", "appliances.food-processor.material":"Dilimleme, rendeleme ve yoğurma aksesuarlarından hangileri vazgeçilmez?",
  "appliances.storage-water-heater.site-verification":"Seçilecek modelin elektrik, montaj ve su tesisatı koşulları uzman tarafından yerinde doğrulandı mı?", "appliances.instant-water-heater.site-verification":"Seçilecek modelin elektrik, montaj ve su tesisatı koşulları uzman tarafından yerinde doğrulandı mı?",
  "appliances.split-ac.site-verification":"İç ve dış ünite çifti için oda yükü, elektrik, soğutucu, borulama, drenaj ve montaj koşulları uzman tarafından yerinde doğrulandı mı?",
};

export function appliancesChoices(questionKey?: string): XpyChoiceSet | undefined { const choices=choiceSetFor(APPLIANCES_QUESTION_PACK,questionKey);const prompt=questionKey?vettedPrompts[questionKey]:undefined;return choices&&prompt?{...choices,prompt}:choices; }

export function validateAppliancesChoice(type: AppliancesProductType, pendingQuestionKey: string | undefined, submission: XpyChoiceSubmission): boolean {
  if (submission.questionKey !== "xpy.advisory.purchaseInterest" && !submission.questionKey.startsWith(prefix[type]) && !submission.questionKey.startsWith("CONFIRM:")) return false;
  return validateChoiceSubmission(APPLIANCES_QUESTION_PACK, pendingQuestionKey, submission);
}

const prefix: Record<AppliancesProductType, string> = {
  WASHING_MACHINE: "appliances.wm.", DRYER: "appliances.dryer.", REFRIGERATOR: "appliances.refrigerator.",
  DISHWASHER: "appliances.dishwasher.", VACUUM: "appliances.vacuum.", ROBOT_VACUUM: "appliances.robot.",
  FREEZER:"appliances.freezer.", BUILT_IN_OVEN:"appliances.oven.", FREESTANDING_COOKER:"appliances.cooker.", HOB:"appliances.hob.", RANGE_HOOD:"appliances.hood.",
  COUNTERTOP_MICROWAVE_OVEN:"appliances.countertop-microwave.", BUILT_IN_MICROWAVE_OVEN:"appliances.built-in-microwave.", AIR_PURIFIER:"appliances.air-purifier.",
  FULLY_AUTOMATIC_ESPRESSO_MACHINE:"appliances.fully-automatic-espresso.", MANUAL_ESPRESSO_MACHINE:"appliances.manual-espresso.", FILTER_COFFEE_MACHINE:"appliances.filter-coffee.", TURKISH_COFFEE_MACHINE:"appliances.turkish-coffee.", AIR_FRYER:"appliances.air-fryer.", BLENDER:"appliances.blender.", FOOD_PROCESSOR:"appliances.food-processor.", ELECTRIC_STORAGE_WATER_HEATER:"appliances.storage-water-heater.", INSTANTANEOUS_ELECTRIC_WATER_HEATER:"appliances.instant-water-heater.", SPLIT_AIR_CONDITIONER:"appliances.split-ac.",
};

const acknowledgement: Readonly<Record<string, string>> = {
  LOAD_CONSOLIDATION: "Hane kullanımını dikkate alıyorum.", HIGH_LAUNDRY_VOLUME: "Kapasite ihtiyacını koruyorum.",
  PET_HEAD: "Evcil hayvan tüyü ihtiyacını koruyorum.", HEPA: "Filtreleme ihtiyacını koruyorum.",
  LOW_NOISE: "Düşük ses önceliğini koruyorum.", LOW_NOISE_PRIORITY: "Düşük ses önceliğini koruyorum.",
  INSTALLATION_FIT: "Kurulum koşulunu koruyorum.", INSTALLATION_ENVELOPE: "Kurulum koşulunu koruyorum.",
  DRYING_CAPACITY: "Kurutma kapasitesi ihtiyacını koruyorum.", CAPACITY: "Kapasite ihtiyacını koruyorum.",
  FREEZER_ARRANGEMENT: "Dondurucu yerleşimi tercihini koruyorum.",
};

export function presentAppliancesOutcome(type: AppliancesProductType, outcome: AppliancesRuntimeOutcome, events: readonly AppliancesLedgerEvent[] = []): AppliancesRuntimeOutcome {
  if (outcome.kind !== "ASK" && outcome.kind !== "CLARIFY") return outcome;
  const choices = appliancesChoices(outcome.questionKey);
  const prefixText = [...new Set(events.filter(event => ["ACCEPTED_EXPLICIT", "ACCEPTED_CONFIRMED", "ACCEPTED_INTERPRETED"].includes(event.status)).map(event => acknowledgement[event.conceptId]).filter(Boolean))].slice(0, 2).join(" ");
  const safeQuestion = consumerQuestionText(outcome.message, choices);
  const message = prefixText && !safeQuestion.startsWith(prefixText) ? `${prefixText} ${safeQuestion}` : safeQuestion;
  void type;
  return { ...outcome, message, ...(choices ? { choices } : {}) };
}
