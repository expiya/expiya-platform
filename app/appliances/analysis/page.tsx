import type { Metadata } from "next";
import AppliancesConversation from "../AppliancesConversation";
import { parseAppliancesCategoryRoute } from "@/features/appliances/categoryRegistry";
import { XpyStageState } from "@/components/xpy/XpyStageTemplates";
import { APPLIANCES_EXPERIENCE } from "@/features/xpy/visualPacks";

export const metadata: Metadata = {
  title: "Expiya Appliances · Aşama 1 Karar Görüşmesi",
  description: "Ev ürünleri için ihtiyaçlarınızı ve karar ölçütlerinizi konuşarak netleştirin.",
};

export default async function AppliancesAnalysisPage({ searchParams }: { readonly searchParams: Promise<{ category?: string | string[] }> }) {
  const value = (await searchParams).category;
  if (value !== undefined) {
    const parsed = parseAppliancesCategoryRoute(value);
    if (parsed.status === "UNSUPPORTED") return <XpyStageState adapter={APPLIANCES_EXPERIENCE} current="STAGE_1_DECISION" state="UNSUPPORTED" title="Bu ürün kategorisi desteklenmiyor" description="Ev ürünleri listesinden tanınan bir kategori seçerek devam edebilirsin." returnHref="/appliances/analysis" returnLabel="Ürün kategorilerine dön"/>;
    return <AppliancesConversation initialCategory={parsed.category.categoryId}/>;
  }
  return <AppliancesConversation/>;
}
