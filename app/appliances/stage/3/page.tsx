import { XpyStagePage } from "@/components/xpy/XpyStageTemplates";
import { XpyStageThreeShell } from "@/components/xpy/XpyStageThreeShell";
import { isAppliancesCategoryId } from "@/features/appliances/categoryRegistry";
import { APPLIANCES_STAGE_THREE_PRESENTATION, createAppliancesStageThreePresentation } from "@/features/xpy/stageThree/presentationAdapters";
import { APPLIANCES_EXPERIENCE } from "@/features/xpy/visualPacks";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Expiya Appliances · Aşama 3", description: "Ev ürünleri için talep ve teklif adımının güncel durumu." };

export default async function AppliancesActionPage({ searchParams }: { readonly searchParams: Promise<{ category?: string | string[] }> }) {
  const raw = (await searchParams).category; const category = Array.isArray(raw) ? raw[0] : raw;
  const presentation = category && isAppliancesCategoryId(category) ? createAppliancesStageThreePresentation(category) : APPLIANCES_STAGE_THREE_PRESENTATION;
  const title = category && isAppliancesCategoryId(category) ? `${presentation.productNoun[0]!.toLocaleUpperCase("tr-TR")}${presentation.productNoun.slice(1)} için talep ve teklif adımı henüz açık değil` : presentation.unavailableTitle;
  return <XpyStagePage adapter={APPLIANCES_EXPERIENCE} current="STAGE_3_ACTION"><XpyStageThreeShell adapter={presentation} state="UNAVAILABLE" title={title} description={presentation.unavailableDescription} returnHref={category && isAppliancesCategoryId(category) ? `/appliances?category=${encodeURIComponent(category)}#asama-1` : "/appliances#asama-1"} returnLabel="Karar görüşmesine dön" notice="AŞAMA 2 kararın korunur. Bu ekran iletişim verisi istemez; teklif, talep, ödeme, sipariş veya teslimat kaydı oluşturmaz."/></XpyStagePage>;
}
