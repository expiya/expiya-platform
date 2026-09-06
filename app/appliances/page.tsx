import type { Metadata } from "next";
import { DepartmentLanding } from "@/components/xpy/DepartmentLanding";
import { APPLIANCES_LANDING_PACK } from "@/features/xpy/departmentLandingPacks";
import { parseAppliancesCategoryRoute } from "@/features/appliances/categoryRegistry";
import AppliancesConversation from "./AppliancesConversation";

export const metadata: Metadata = {
  title: "Expiya Appliances - Doğru Ev Ürününü Birlikte Bulalım",
  description: "İhtiyaçlarınızı konuşarak doğrulanmış ev ürünleri arasından gerekçeli bir karara ulaşın.",
};

export default async function AppliancesPage({ searchParams = Promise.resolve({}) }: { readonly searchParams?: Promise<{ category?: string | string[]; entry?: string | string[] }> }) {
  const params = await searchParams;
  const parsed = params.category === undefined ? undefined : parseAppliancesCategoryRoute(params.category);
  const initialCategory = parsed && parsed.status !== "UNSUPPORTED" ? parsed.category.categoryId : undefined;
  const entry = Array.isArray(params.entry) ? params.entry[0] : params.entry;
  return <DepartmentLanding pack={APPLIANCES_LANDING_PACK} compactPlatformInfo stageOne={<AppliancesConversation initialCategory={initialCategory} embedded secretaryEntry={entry === "secretary"}/>}/>;
}
