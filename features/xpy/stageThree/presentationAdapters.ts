import { resolveAppliancesCategory, type AppliancesCategoryId } from "@/features/appliances/categoryRegistry";
import { defineXpyStageThreePresentationAdapter, type XpyStageThreeCapability, type XpyStageThreePresentationAdapter } from "./contracts";

const unavailableExternalCapabilities = (productNoun: "araç" | "ürün") => Object.freeze([
  { capability: "CURRENT_OFFER", state: "UNAVAILABLE", publicLabel: "Güncel teklif", explanation: `Bu ${productNoun} için doğrulanmış ve güncel bir teklif bulunmuyor.` },
  { capability: "AUTHORIZED_SELLER", state: "UNAVAILABLE", publicLabel: "Yetkili satıcı", explanation: "Onaylı satıcı veya üretici iletişim kanalı bağlı değil." },
  { capability: "PAYMENT", state: "UNAVAILABLE", publicLabel: "Ödeme", explanation: "Bu sayfadan ödeme alınamıyor." },
  { capability: "ORDER", state: "UNAVAILABLE", publicLabel: "Sipariş", explanation: "Bu sayfadan sipariş oluşturulamıyor." },
  { capability: "FULFILLMENT", state: "UNAVAILABLE", publicLabel: "Teslimat", explanation: "Stok, teslimat ve kurulum bilgileri bağlı değil." },
] as const satisfies readonly XpyStageThreeCapability[]);

export const CARS_STAGE_THREE_PRESENTATION = defineXpyStageThreePresentationAdapter({
  adapterId: "cars-stage-three-presentation/v1", departmentId: "CARS", departmentLabel: "Expiya Cars", productNoun: "araç",
  unavailableTitle: "Güvenli talep açılamadı", unavailableDescription: "Talep adımı, AŞAMA 2’de seçtiğin işlem üzerinden açılır.",
  capabilities: [{ capability: "REQUEST_CAPTURE", state: "INTERNAL_REVIEW_ONLY", publicLabel: "Talep hazırlama", explanation: "Talep incelenmek üzere hazırlanır; gerçek bayi aktarımı yapılmaz." }, ...unavailableExternalCapabilities("araç")],
});

export const APPLIANCES_STAGE_THREE_PRESENTATION = defineXpyStageThreePresentationAdapter({
  adapterId: "appliances-stage-three-presentation/v1", departmentId: "APPLIANCES", departmentLabel: "Expiya Appliances", productNoun: "ürün",
  unavailableTitle: "Talep ve teklif adımı henüz açık değil", unavailableDescription: "Ev ürünleri için satıcı, güncel teklif, stok, ödeme, sipariş ve teslimat hizmetleri henüz bağlı değil.",
  capabilities: [{ capability: "REQUEST_CAPTURE", state: "UNAVAILABLE", publicLabel: "Talep hazırlama", explanation: "İletişim bilgisi alınmaz ve talep kaydı oluşturulmaz." }, ...unavailableExternalCapabilities("ürün")],
});

export function createAppliancesStageThreePresentation(categoryId: AppliancesCategoryId): XpyStageThreePresentationAdapter {
  const category = resolveAppliancesCategory(categoryId);
  if (!category) throw new TypeError("APPLIANCES_STAGE_THREE_CATEGORY_UNSUPPORTED");
  return defineXpyStageThreePresentationAdapter({ ...APPLIANCES_STAGE_THREE_PRESENTATION, productNoun: category.publicLabelTr.toLocaleLowerCase("tr-TR") });
}
