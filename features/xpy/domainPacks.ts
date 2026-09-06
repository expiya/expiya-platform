import { APPLIANCES_PRODUCT_TYPES } from "@/features/appliances/contracts";
import type { XpyDomainPackRegistration } from "./contracts";
import { XPY_BEHAVIORAL_CAPABILITIES, XPY_PROTOCOL_VERSION } from "./contracts";
import { XPY_RUNTIME_DIGEST, XPY_RUNTIME_VERSION } from "./runtimeContract";
import { isActiveAppliancesCategoryId, resolveAppliancesCategory, type AppliancesCategoryId } from "@/features/appliances/categoryRegistry";
import { ELECTRONICS_CATEGORY_IDS, ELECTRONICS_CATEGORY_REGISTRY } from "@/features/electronics/architectureBaseline";
import { ELECTRONICS_CATEGORY_POLICY_VERSION } from "@/features/electronics/categoryPolicy";

const common = Object.freeze({ contextualAnswers: true, questionDeferral: true, hardBrandConstraint: true, budgetDecisionFilter: true, authorizedDecisionCards: true, behavioralAcceptance: XPY_BEHAVIORAL_CAPABILITIES });

export const XPY_DOMAIN_PACKS = Object.freeze({
  CARS: Object.freeze({ protocolVersion: XPY_PROTOCOL_VERSION, runtimeVersion: XPY_RUNTIME_VERSION, runtimeDigest: XPY_RUNTIME_DIGEST, domainPackId: "cars-stage1/v3.8", departmentId: "CARS", categories: ["NEW_CAR"], capabilities: { ...common, behavioralAcceptance: XPY_BEHAVIORAL_CAPABILITIES }, authority: [], xReentry: { NEW_CAR: { publicName: "otomobil", decisionJourneyPurpose: "otomobil satın alma karar desteği", reentryPrompt: "Araç seçimine dönmek istersen ihtiyacını anlatman yeterli.", informationalTerms: ["araç", "otomobil", "yakıt", "motor", "şanzıman", "bagaj", "batarya"], governedReferences: [{ aliases: ["bumblebee"], clarification: "Bumblebee derken Transformers'taki sarı, sportif coupe/Camaro tarzı görünümü mü kastediyorsun, yoksa başka bir araç özelliğini mi? Bunu netleştirmeden belirli bir model veya varyant varsaymayacağım." }] } } }),
  APPLIANCES: Object.freeze({ protocolVersion: XPY_PROTOCOL_VERSION, runtimeVersion: XPY_RUNTIME_VERSION, runtimeDigest: XPY_RUNTIME_DIGEST, domainPackId: "appliances-stage1/v1", departmentId: "APPLIANCES", categories: APPLIANCES_PRODUCT_TYPES, capabilities: common, authority: [], xReentry: {
    WASHING_MACHINE: { publicName: "çamaşır makinesi", decisionJourneyPurpose: "çamaşır makinesi karar desteği", reentryPrompt: "Çamaşır makinesi ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["devir", "enerji sınıfı", "buhar", "dozaj"] },
    DRYER: { publicName: "kurutma makinesi", decisionJourneyPurpose: "kurutma makinesi karar desteği", reentryPrompt: "Kurutma ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["ısı pompası", "kurutma", "nem", "enerji"] },
    REFRIGERATOR: { publicName: "buzdolabı", decisionJourneyPurpose: "buzdolabı karar desteği", reentryPrompt: "Buzdolabı ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["no frost", "hacim", "tazelik", "enerji"] },
    DISHWASHER: { publicName: "bulaşık makinesi", decisionJourneyPurpose: "bulaşık makinesi karar desteği", reentryPrompt: "Bulaşık makinesi ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["kişilik", "enerji", "çekmece"] },
    VACUUM: { publicName: "süpürge", decisionJourneyPurpose: "süpürge karar desteği", reentryPrompt: "Süpürge ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["watt", "yarıçap", "filtre"] },
    ROBOT_VACUUM: { publicName: "robot süpürge", decisionJourneyPurpose: "robot süpürge karar desteği", reentryPrompt: "Robot süpürge ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["pa", "istasyon", "haritalama"] },
    FREEZER: { publicName: "derin dondurucu", decisionJourneyPurpose: "derin dondurucu karar desteği", reentryPrompt: "Dondurucu ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["no frost", "hacim", "çekmece", "enerji"] },
    BUILT_IN_OVEN: { publicName: "ankastre fırın", decisionJourneyPurpose: "ankastre fırın karar desteği", reentryPrompt: "Fırın ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["hacim", "pişirme modu", "ankastre", "temizlik"] },
    FREESTANDING_COOKER: { publicName: "solo fırınlı ocak", decisionJourneyPurpose: "solo fırınlı ocak karar desteği", reentryPrompt: "Solo fırınlı ocak ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["gaz", "elektrik", "fırın", "ocak"] },
    HOB: { publicName: "ankastre ocak", decisionJourneyPurpose: "ankastre ocak karar desteği", reentryPrompt: "Ocak ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["indüksiyon", "gaz", "elektrik", "kesim ölçüsü"] },
    RANGE_HOOD: { publicName: "davlumbaz", decisionJourneyPurpose: "davlumbaz karar desteği", reentryPrompt: "Davlumbaz ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["hava debisi", "ses", "baca", "resirkülasyon"] },
    COUNTERTOP_MICROWAVE_OVEN: { publicName: "tezgâh üstü mikrodalga", decisionJourneyPurpose: "tezgâh üstü mikrodalga karar desteği", reentryPrompt: "Tezgâh üstü mikrodalga ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["mikrodalga", "watt", "hacim", "RF"] },
    BUILT_IN_MICROWAVE_OVEN: { publicName: "ankastre mikrodalga", decisionJourneyPurpose: "ankastre mikrodalga karar desteği", reentryPrompt: "Ankastre mikrodalga ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["mikrodalga", "ankastre", "niş", "ızgara"] },
    AIR_PURIFIER: { publicName: "hava temizleyici", decisionJourneyPurpose: "hava temizleyici karar desteği", reentryPrompt: "Hava temizleyici ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["CADR", "filtre", "PM2.5", "ses"] },
    FULLY_AUTOMATIC_ESPRESSO_MACHINE: { publicName: "tam otomatik espresso makinesi", decisionJourneyPurpose: "tam otomatik espresso makinesi karar desteği", reentryPrompt: "Tam otomatik espresso makinesi ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["çekirdek", "öğütücü", "demleme grubu", "süt sistemi", "kireç"] },
    MANUAL_ESPRESSO_MACHINE: { publicName: "manuel espresso makinesi", decisionJourneyPurpose: "manuel espresso makinesi karar desteği", reentryPrompt: "Manuel espresso makinesi ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["portafiltre", "sepet", "buhar", "öğütücü", "bar"] },
    FILTER_COFFEE_MACHINE: { publicName: "filtre kahve makinesi", decisionJourneyPurpose: "filtre kahve makinesi karar desteği", reentryPrompt: "Filtre kahve makinesi ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["karaf", "filtre", "demleme", "sıcak tutma"] },
    TURKISH_COFFEE_MACHINE: { publicName: "Türk kahvesi makinesi", decisionJourneyPurpose: "Türk kahvesi makinesi karar desteği", reentryPrompt: "Türk kahvesi makinesi ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["fincan", "cezve", "taşma", "köz", "köpük"] },
    AIR_FRYER: { publicName: "airfryer", decisionJourneyPurpose: "airfryer karar desteği", reentryPrompt: "Airfryer ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["sepet", "hazne", "litre", "watt", "temizlik"] },
    BLENDER: { publicName: "blender", decisionJourneyPurpose: "blender karar desteği", reentryPrompt: "Blender ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["sürahi", "bıçak", "watt", "devir"] },
    FOOD_PROCESSOR: { publicName: "mutfak robotu", decisionJourneyPurpose: "mutfak robotu karar desteği", reentryPrompt: "Mutfak robotu ihtiyaçlarınla devam edebiliriz.", informationalTerms: ["kase", "disk", "bıçak", "aksesuar"] },
    ELECTRIC_STORAGE_WATER_HEATER: { publicName: "elektrikli termosifon", decisionJourneyPurpose: "elektrikli termosifon karar desteği", reentryPrompt: "Termosifon için güvenli saha doğrulamasıyla devam edebiliriz.", informationalTerms: ["depo", "litre", "basınç", "montaj", "topraklama"] },
    INSTANTANEOUS_ELECTRIC_WATER_HEATER: { publicName: "elektrikli şofben", decisionJourneyPurpose: "elektrikli şofben karar desteği", reentryPrompt: "Elektrikli şofben için güvenli saha doğrulamasıyla devam edebiliriz.", informationalTerms: ["debi", "watt", "basınç", "montaj", "topraklama"] },
    SPLIT_AIR_CONDITIONER: { publicName: "ev tipi split klima", decisionJourneyPurpose: "birbiriyle uyumlu iç ve dış ünite çiftiyle split klima karar desteği", reentryPrompt: "Split klima için uyumlu ünite çifti ve profesyonel saha doğrulamasıyla devam edebiliriz.", informationalTerms: ["iç ünite", "dış ünite", "BTU", "oda yükü", "borulama", "drenaj", "montaj"] },
  } }),
  ELECTRONICS: Object.freeze({ protocolVersion: XPY_PROTOCOL_VERSION, runtimeVersion: XPY_RUNTIME_VERSION, runtimeDigest: XPY_RUNTIME_DIGEST, domainPackId: "electronics-stage1/v1", departmentId: "ELECTRONICS", categories: ELECTRONICS_CATEGORY_IDS, capabilities: common, authority: [{ authorityId: "electronics-category-policy", version: ELECTRONICS_CATEGORY_POLICY_VERSION, digest: "sha256:0f4db5148d6a6971b7a9341b2c0c56c298753dd2ab592b75d09fbdd372b7c20a" }], xReentry: Object.fromEntries(ELECTRONICS_CATEGORY_REGISTRY.map(category => [category.categoryId, { publicName: category.publicLabelTr.toLocaleLowerCase("tr-TR"), decisionJourneyPurpose: `${category.publicLabelTr.toLocaleLowerCase("tr-TR")} satın alma karar desteği`, reentryPrompt: `${category.publicLabelTr} seçimine dönmek istersen ihtiyaçlarını birlikte netleştirebiliriz.`, informationalTerms: category.categoryPolicyRequired.map(term => term.toLocaleLowerCase("tr-TR")) }])) }),
} satisfies Record<string, XpyDomainPackRegistration>);

export function requireXpyDomainPack(departmentId: keyof typeof XPY_DOMAIN_PACKS): XpyDomainPackRegistration {
  return XPY_DOMAIN_PACKS[departmentId];
}

export function requireXpyReentry(departmentId: keyof typeof XPY_DOMAIN_PACKS, category: string) {
  const pack: XpyDomainPackRegistration = XPY_DOMAIN_PACKS[departmentId];
  const config = pack.xReentry[category];
  if (!config) throw new TypeError("XPY_REENTRY_CONFIG_MISSING");
  return config;
}

export type XpyDomainPackResolution = { readonly status: "ACTIVE"; readonly pack: XpyDomainPackRegistration } | { readonly status: "NOT_READY"; readonly categoryId: AppliancesCategoryId; readonly pack: null; readonly authority: readonly [] } | { readonly status: "UNSUPPORTED" };
export function resolveXpyDomainPack(departmentId: string, categoryId: string): XpyDomainPackResolution {
  if (departmentId === "ELECTRONICS") return ELECTRONICS_CATEGORY_IDS.includes(categoryId as typeof ELECTRONICS_CATEGORY_IDS[number]) ? { status: "ACTIVE", pack: requireXpyDomainPack("ELECTRONICS") } : { status: "UNSUPPORTED" };
  if (departmentId !== "APPLIANCES") return { status: "UNSUPPORTED" };
  const category = resolveAppliancesCategory(categoryId);
  if (!category) return { status: "UNSUPPORTED" };
  if (!isActiveAppliancesCategoryId(category.categoryId)) return { status: "NOT_READY", categoryId: category.categoryId, pack: null, authority: [] };
  return { status: "ACTIVE", pack: requireXpyDomainPack("APPLIANCES") };
}
