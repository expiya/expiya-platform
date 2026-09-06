import type { Metadata } from "next";
import { DepartmentLanding } from "@/components/xpy/DepartmentLanding";
import { CarsConversationV3 } from "@/components/cars/CarsConversationV3";
import { getV3MinimumCatalogPriceTry } from "@/features/decision/v3/catalogAdapter.server";
import { CARS_LANDING_PACK } from "@/features/xpy/departmentLandingPacks";

export const metadata: Metadata = {
  title: "Expiya Cars - Doğru Arabayı Birlikte Bulalım",
  description: "İhtiyaçlarınızı anlatın; doğru sıfır araç kararını birlikte netleştirelim.",
};

export default async function CarsPage({ searchParams = Promise.resolve({}) }: { readonly searchParams?: Promise<{ entry?: string | string[] }> }) {
  const params = await searchParams;
  const entry = Array.isArray(params.entry) ? params.entry[0] : params.entry;
  return <DepartmentLanding pack={CARS_LANDING_PACK} stageOne={<CarsConversationV3 minimumBudgetTry={await getV3MinimumCatalogPriceTry()} embedded secretaryEntry={entry === "secretary"}/>}/>;
}
