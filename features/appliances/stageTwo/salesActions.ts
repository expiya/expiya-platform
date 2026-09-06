import type { AppliancesProductType } from "../contracts";
import type { CurrentProductCommerce, ExactOfferObservation } from "../commerce/types";
import type { AppliancesSalesAction, AppliancesSalesActionKind } from "./contracts";

const unavailable = {
  WATCH_PRICE: ["Fiyatı takip et", "Fiyat alarmı için kullanıcı hesabı ve bildirim sağlayıcısı henüz bağlı değil."],
  INQUIRE_AUTHORIZED_AVAILABILITY: ["Yetkili satıcıya sor", "Yetkili satıcı veya üretici talep kanalı henüz onaylanmadı; hiçbir iletişim talebi gönderilmez."],
  SAVE_DECISION: ["Kararı kaydet", "Hesaba bağlı kalıcı kayıt henüz açık değil; kaydedildi izlenimi verilmez."],
} as const;

function findCurrentOffer(input: { readonly exactProductId: string; readonly productType: AppliancesProductType; readonly commerce?: CurrentProductCommerce }, now: Date): ExactOfferObservation | undefined { return input.commerce?.offers.find(item => item.exactProductId === input.exactProductId && item.categoryId === input.productType && Date.parse(item.expiresAt) > now.getTime()); }

export function buildAppliancesSalesActions(input: { readonly exactProductId: string; readonly productType: AppliancesProductType; readonly commerce?: CurrentProductCommerce; readonly now?: Date }): readonly AppliancesSalesAction[] {
  const now = input.now ?? new Date();
  const offer = findCurrentOffer(input, now);
  return [
    offer ? { kind: "VIEW_EXACT_OFFER", label: `${offer.merchant} teklifini gör`, availability: "AVAILABLE", explanation: "Yeni sekmede bu ürün için doğrulanmış ilan açılır; Expiya sipariş veya ödeme başlatmaz.", merchant: offer.merchant, observedAt: offer.observedAt } : { kind: "VIEW_EXACT_OFFER", label: "Güncel teklifi gör", availability: "UNAVAILABLE", explanation: "Bu ürün için güncel ve doğrulanmış teklif yok." },
    ...Object.entries(unavailable).map(([kind, [label, explanation]]) => ({ kind: kind as AppliancesSalesActionKind, label, availability: "UNAVAILABLE" as const, explanation })),
    { kind: "SHARE_DECISION", label: "Kararı paylaş", availability: "AVAILABLE", explanation: "Yalnız bu süreli, imzalı karar bağlantısı paylaşılır; kişisel sohbet metni paylaşılmaz." },
    { kind: "REQUEST_COMPARISON_REPORT", label: "Karşılaştırma erişimi", availability: "AVAILABLE", explanation: "Ayrı erişim gerektiren raporun sınırları gösterilir; bu adım ödeme almaz ve erişim tanımlamaz." },
  ];
}

export type SalesActionExecution =
  | { readonly status: "READY"; readonly kind: "VIEW_EXACT_OFFER"; readonly url: string }
  | { readonly status: "READY"; readonly kind: "SHARE_DECISION"; readonly sharePath: string }
  | { readonly status: "READY"; readonly kind: "REQUEST_COMPARISON_REPORT"; readonly flow: "COMPARISON_REPORT_OFFER" }
  | { readonly status: "UNAVAILABLE"; readonly message: string };

export class BoundedSalesActionIdempotencyLedger<T> {
  private readonly entries = new Map<string, { readonly value: T; readonly expiresAt: number }>();
  constructor(private readonly ttlMs = 15 * 60_000, private readonly maximumEntries = 1_000, private readonly now: () => number = Date.now) {}
  get(key: string): T | undefined { const entry = this.entries.get(key); if (!entry) return undefined; if (entry.expiresAt <= this.now()) { this.entries.delete(key); return undefined; } return entry.value; }
  set(key: string, value: T): void { if (this.entries.size >= this.maximumEntries) this.entries.delete(this.entries.keys().next().value as string); this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs }); }
}

export function executeBoundedAppliancesSalesAction(input: { readonly action: AppliancesSalesActionKind; readonly handoff: string; readonly exactProductId: string; readonly productType: AppliancesProductType; readonly revision: number; readonly verified: { readonly exactProductId: string; readonly productType: AppliancesProductType; readonly revision: number; readonly commerce?: CurrentProductCommerce } }): SalesActionExecution {
  if (input.exactProductId !== input.verified.exactProductId || input.productType !== input.verified.productType || input.revision !== input.verified.revision) return { status: "UNAVAILABLE", message: "Karar kimliği güncel imzalı bağlantıyla eşleşmiyor; hiçbir işlem yapılmadı." };
  const available = buildAppliancesSalesActions(input.verified).find(item => item.kind === input.action);
  if (!available || available.availability !== "AVAILABLE") return { status: "UNAVAILABLE", message: available?.explanation ?? "Bu işlem kullanılamıyor." };
  if (input.action === "VIEW_EXACT_OFFER") {
    const offer = findCurrentOffer(input.verified, new Date());
    return offer ? { status: "READY", kind: input.action, url: offer.canonicalListingUrl } : { status: "UNAVAILABLE", message: "Güncel teklif artık kullanılamıyor." };
  }
  if (input.action === "SHARE_DECISION") return { status: "READY", kind: input.action, sharePath: `/appliances/stage/2?handoff=${encodeURIComponent(input.handoff)}` };
  if (input.action === "REQUEST_COMPARISON_REPORT") return { status: "READY", kind: input.action, flow: "COMPARISON_REPORT_OFFER" };
  return { status: "UNAVAILABLE", message: available.explanation };
}
