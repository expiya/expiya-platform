import type { Metadata } from "next";
import { DepartmentLanding } from "@/components/xpy/DepartmentLanding";
import { ELECTRONICS_LANDING_PACK } from "@/features/xpy/departmentLandingPacks";
import { ELECTRONICS_CATEGORY_IDS, ELECTRONICS_CATEGORY_REGISTRY, type ElectronicsCategoryId } from "@/features/electronics/architectureBaseline";
import ElectronicsConversation from "./analysis/ElectronicsConversation";
export const metadata: Metadata = { title: "Expiya Electronics - Doğru Elektronik Ürünü Birlikte Bulalım", description: "24 elektronik kategorisinde ihtiyaçlarınızı konuşarak doğrulanmış ürün seçeneklerini netleştirin.", alternates: { canonical: "/electronics" } };
export default async function ElectronicsPage({ searchParams = Promise.resolve({}) }: { readonly searchParams?: Promise<{ category?: string | string[] }> }) {
  const params = await searchParams;
  const raw = Array.isArray(params.category) ? params.category[0] : params.category;
  const categoryId = ELECTRONICS_CATEGORY_IDS.includes(raw as ElectronicsCategoryId) ? raw as ElectronicsCategoryId : "LAPTOP";
  const label = ELECTRONICS_CATEGORY_REGISTRY.find((row) => row.categoryId === categoryId)!.publicLabelTr;
  return <DepartmentLanding pack={ELECTRONICS_LANDING_PACK} compactPlatformInfo stageOne={<ElectronicsConversation categoryId={categoryId} categoryLabel={label} embedded/>}/>;
}
