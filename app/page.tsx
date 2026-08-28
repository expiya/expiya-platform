import { CarsConversationV3 } from "@/components/cars/CarsConversationV3";
import { CarsHomepageExperience } from "@/components/cars/CarsHomepageExperience";
import { getV3MinimumCatalogPriceTry } from "@/features/decision/v3/catalogAdapter.server";

export default async function Home({ searchParams }: { readonly searchParams: Promise<{ resume?: string }> }) {
  const { resume } = await searchParams;
  return <CarsHomepageExperience startConversation={resume === "conversation"}><CarsConversationV3 minimumBudgetTry={await getV3MinimumCatalogPriceTry()} /></CarsHomepageExperience>;
}
