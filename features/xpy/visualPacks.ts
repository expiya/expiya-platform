import { XPY_EXPERIENCE_VERSION, defineXpyExperienceAdapter, type XpyDomainVisualPack } from "./experience";

const sharedTokens = Object.freeze({ accent: "EMERALD", density: "COMFORTABLE", contrast: "XPY_AA", motion: "REDUCED_MOTION_SAFE" } as const);
const sharedSlots = Object.freeze(["CONVERSATION", "DECISION_CARDS", "COMPARISON_REPORT", "EVALUATION", "METRICS", "EVIDENCE", "ADVISOR", "COMMERCE", "RECOVERY"] as const);
export const CARS_VISUAL_PACK = Object.freeze({ experienceVersion: XPY_EXPERIENCE_VERSION, visualPackId: "cars-visual/v2", domainPackId: "cars-stage1/v3.8", publicName: "Expiya Cars", sceneConcept: "ROAD", tokens: sharedTokens, labels: { stageOne: "Aşama 1 · XPY karar görüşmesi", stageTwo: "Aşama 2 · Araç değerlendirmesi", stageThree: "Aşama 3 · Güvenli talep", composerPlaceholder: "Mesajını yaz…" }, assets: [], slots: sharedSlots } satisfies XpyDomainVisualPack);
export const APPLIANCES_VISUAL_PACK = Object.freeze({ experienceVersion: XPY_EXPERIENCE_VERSION, visualPackId: "appliances-visual/v2", domainPackId: "appliances-stage1/v1", publicName: "Expiya Appliances", sceneConcept: "STUDIO_CYCLORAMA", tokens: sharedTokens, labels: { stageOne: "Aşama 1 · XPY karar görüşmesi", stageTwo: "Aşama 2 · Ürün değerlendirmesi", stageThree: "Aşama 3 · Güvenli talep", composerPlaceholder: "İhtiyacını anlat…" }, assets: [], slots: sharedSlots } satisfies XpyDomainVisualPack);
export const ELECTRONICS_VISUAL_PACK = Object.freeze({ experienceVersion: XPY_EXPERIENCE_VERSION, visualPackId: "electronics-visual/v1", domainPackId: "electronics-stage1/v1", publicName: "Expiya Electronics", sceneConcept: "NEUTRAL", tokens: sharedTokens, labels: { stageOne: "Aşama 1 · Karar görüşmesi", stageTwo: "Aşama 2 · Ürün değerlendirmesi", stageThree: "Aşama 3 · Güvenli talep", composerPlaceholder: "İhtiyacını anlat…" }, assets: [], slots: sharedSlots } satisfies XpyDomainVisualPack);
export const BABY_VISUAL_PACK = Object.freeze({ experienceVersion: XPY_EXPERIENCE_VERSION, visualPackId: "baby-stroller-visual/v1", domainPackId: "baby-stroller/v1", publicName: "Expiya Bebek & Çocuk", sceneConcept: "NEUTRAL", tokens: sharedTokens, labels: { stageOne: "Aşama 1 · Karar görüşmesi", stageTwo: "Aşama 2 · Ürün değerlendirmesi", stageThree: "Aşama 3 · Güvenli talep", composerPlaceholder: "İhtiyacını anlat…" }, assets: [], slots: sharedSlots } satisfies XpyDomainVisualPack);

export const CARS_EXPERIENCE = defineXpyExperienceAdapter({ experienceVersion: XPY_EXPERIENCE_VERSION, departmentId: "CARS", visualPack: CARS_VISUAL_PACK, stages: [
  { id: "STAGE_1_DECISION", label: "Aşama 1 · Karar", href: "/cars#asama-1", availability: "AVAILABLE" },
  { id: "STAGE_2_EVALUATION", label: "Aşama 2 · Değerlendir", href: "/cars#asama-1", availability: "REQUIRES_HANDOFF", unavailableReason: "Önce Aşama 1'de bir araç seçimi gerekir." },
  { id: "STAGE_3_ACTION", label: "Aşama 3 · Talep", href: "/cars#asama-1", availability: "REQUIRES_HANDOFF", unavailableReason: "Aşama 2'den güvenli talep geçişi gerekir." },
] });
export const ELECTRONICS_EXPERIENCE = defineXpyExperienceAdapter({ experienceVersion: XPY_EXPERIENCE_VERSION, departmentId: "ELECTRONICS", visualPack: ELECTRONICS_VISUAL_PACK, stages: [
  { id: "STAGE_1_DECISION", label: "Aşama 1 · Karar", href: "/electronics", availability: "AVAILABLE" },
  { id: "STAGE_2_EVALUATION", label: "Aşama 2 · Değerlendir", href: "/electronics/stage/2", availability: "REQUIRES_HANDOFF", unavailableReason: "Önce Aşama 1'de yetkili bir ürün kararı gerekir." },
  { id: "STAGE_3_ACTION", label: "Aşama 3 · Talep", href: "/electronics/stage/3", availability: "UNAVAILABLE", unavailableReason: "Satış, teklif, sipariş ve ödeme işlemleri kullanıma açık değil." },
] });
export const APPLIANCES_EXPERIENCE = defineXpyExperienceAdapter({ experienceVersion: XPY_EXPERIENCE_VERSION, departmentId: "APPLIANCES", visualPack: APPLIANCES_VISUAL_PACK, stages: [
  { id: "STAGE_1_DECISION", label: "Aşama 1 · Karar", href: "/appliances#asama-1", availability: "AVAILABLE" },
  { id: "STAGE_2_EVALUATION", label: "Aşama 2 · Değerlendir", href: "/appliances/stage/2", availability: "REQUIRES_HANDOFF", unavailableReason: "Önce Aşama 1'de bir ürün seçimi gerekir." },
  { id: "STAGE_3_ACTION", label: "Aşama 3 · Talep", href: "/appliances/stage/3", availability: "UNAVAILABLE", unavailableReason: "Satıcı teklifi ve talep gönderimi henüz hazır değil." },
] });
export const CARS_STAGE_ONE_VISUAL_PACK = CARS_VISUAL_PACK;
export const BABY_EXPERIENCE = defineXpyExperienceAdapter({ experienceVersion: XPY_EXPERIENCE_VERSION, departmentId: "BABY_AND_CHILD", visualPack: BABY_VISUAL_PACK, stages: [
  { id: "STAGE_1_DECISION", label: "Aşama 1 · Karar", href: "/baby#asama-1", availability: "AVAILABLE" },
  { id: "STAGE_2_EVALUATION", label: "Aşama 2 · Değerlendir", href: "/baby/stage/2", availability: "REQUIRES_HANDOFF", unavailableReason: "Önce Aşama 1'de yetkili bir bebek arabası kararı gerekir." },
  { id: "STAGE_3_ACTION", label: "Aşama 3 · Talep", href: "/baby/stage/3", availability: "UNAVAILABLE", unavailableReason: "Satış ve talep işlemleri açık değil." },
] });
export const APPLIANCES_STAGE_ONE_VISUAL_PACK = APPLIANCES_VISUAL_PACK;
export const ELECTRONICS_STAGE_ONE_VISUAL_PACK = ELECTRONICS_VISUAL_PACK;
export const XPY_GLOBAL_STAGE_ONE_TOKENS = sharedTokens;
