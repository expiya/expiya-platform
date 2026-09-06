export type AccessibilitySurface = "B2C_MOBILE" | "B2C_DESKTOP" | "PARTNER_DESKTOP" | "OPS_DESKTOP";
export type AccessibilityMethod = "AUTOMATED" | "MANUAL_KEYBOARD" | "SCREEN_READER" | "VISUAL" | "COGNITIVE_REVIEW";
export interface AccessibilityRequirement { readonly requirementId: string; readonly title: string; readonly surfaces: readonly AccessibilitySurface[]; readonly methods: readonly AccessibilityMethod[]; readonly releaseBlocking: true }
const all: readonly AccessibilitySurface[] = ["B2C_MOBILE", "B2C_DESKTOP", "PARTNER_DESKTOP", "OPS_DESKTOP"];
export const usedCarsAccessibilityRequirements: readonly AccessibilityRequirement[] = Object.freeze([
  { requirementId: "A11Y-001", title: "Klavye ile tam görev akışı", surfaces: all, methods: ["MANUAL_KEYBOARD"], releaseBlocking: true },
  { requirementId: "A11Y-002", title: "Görünür ve sıralı odak", surfaces: all, methods: ["MANUAL_KEYBOARD", "VISUAL"], releaseBlocking: true },
  { requirementId: "A11Y-003", title: "Programatik ad, rol ve durum", surfaces: all, methods: ["AUTOMATED", "SCREEN_READER"], releaseBlocking: true },
  { requirementId: "A11Y-004", title: "Form hata özeti ve alan bağlantısı", surfaces: all, methods: ["SCREEN_READER", "MANUAL_KEYBOARD"], releaseBlocking: true },
  { requirementId: "A11Y-005", title: "Metin ve UI kontrastı", surfaces: all, methods: ["AUTOMATED", "VISUAL"], releaseBlocking: true },
  { requirementId: "A11Y-006", title: "200–400% zoom ve reflow", surfaces: all, methods: ["VISUAL"], releaseBlocking: true },
  { requirementId: "A11Y-007", title: "Reduced motion ve animasyon kontrolü", surfaces: all, methods: ["AUTOMATED", "VISUAL"], releaseBlocking: true },
  { requirementId: "A11Y-008", title: "Dokunma hedefi ve mobil yönelim", surfaces: ["B2C_MOBILE"], methods: ["VISUAL"], releaseBlocking: true },
  { requirementId: "A11Y-009", title: "Görsel alt metni ve dekoratif ayrım", surfaces: all, methods: ["AUTOMATED", "SCREEN_READER"], releaseBlocking: true },
  { requirementId: "A11Y-010", title: "Tablo ve dashboard anlam ilişkisi", surfaces: ["PARTNER_DESKTOP", "OPS_DESKTOP"], methods: ["SCREEN_READER"], releaseBlocking: true },
  { requirementId: "A11Y-011", title: "Timeout uyarısı ve uzatma", surfaces: ["PARTNER_DESKTOP", "OPS_DESKTOP"], methods: ["MANUAL_KEYBOARD", "SCREEN_READER"], releaseBlocking: true },
  { requirementId: "A11Y-012", title: "Kanıt ve güven durumu yalnız renge bağlı değil", surfaces: all, methods: ["VISUAL", "COGNITIVE_REVIEW"], releaseBlocking: true },
  { requirementId: "A11Y-013", title: "Eksik ve çelişkili bilginin sade açıklaması", surfaces: ["B2C_MOBILE", "B2C_DESKTOP"], methods: ["COGNITIVE_REVIEW", "SCREEN_READER"], releaseBlocking: true },
  { requirementId: "A11Y-014", title: "Sponsorlu etiketinin algılanabilir ayrımı", surfaces: ["B2C_MOBILE", "B2C_DESKTOP"], methods: ["VISUAL", "SCREEN_READER", "COGNITIVE_REVIEW"], releaseBlocking: true },
  { requirementId: "A11Y-015", title: "Türkçe dil ve anlaşılır CTA", surfaces: all, methods: ["AUTOMATED", "COGNITIVE_REVIEW"], releaseBlocking: true },
]);
export function validateAccessibilityRequirementRegistry(requirements: readonly AccessibilityRequirement[]) { const ids = requirements.map((item) => item.requirementId); const codes: string[] = []; if (new Set(ids).size !== ids.length) codes.push("DUPLICATE_REQUIREMENT"); if (requirements.some((item) => item.surfaces.length === 0 || item.methods.length === 0)) codes.push("COVERAGE_REQUIRED"); return Object.freeze(codes); }
