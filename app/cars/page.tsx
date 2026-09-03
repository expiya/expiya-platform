import type { Metadata } from "next";

import { CarsConversationV3 } from "@/components/cars/CarsConversationV3";
import { CarsHomepageExperience } from "@/components/cars/CarsHomepageExperience";
import { getV3MinimumCatalogPriceTry } from "@/features/decision/v3/catalogAdapter.server";

export const metadata: Metadata = {
  title: "Expiya Cars - Sana Uygun Sıfır Aracı Bul",
  description: "Expiya Cars, Türkiye'deki sıfır araç seçeneklerini ihtiyaçlarınıza ve bütçenize göre değerlendirerek doğru aracı seçmenize yardımcı olur.",
  alternates: { canonical: "/cars" },
};

export default async function CarsHome({ searchParams }: { readonly searchParams: Promise<{ resume?: string; entry?: string }> }) {
  const { resume, entry } = await searchParams;
  const secretaryHandoff = entry === "secretary";
  return <CarsHomepageExperience startConversation={resume === "conversation" || secretaryHandoff}><CarsConversationV3 secretaryHandoff={secretaryHandoff} minimumBudgetTry={await getV3MinimumCatalogPriceTry()} /></CarsHomepageExperience>;
}
