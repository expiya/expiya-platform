import { CarsConversationV3 } from "@/components/cars/CarsConversationV3";
import { getV3MinimumCatalogPriceTry } from "@/features/decision/v3/catalogAdapter.server";

export default async function Home() {
  return <CarsConversationV3 minimumBudgetTry={await getV3MinimumCatalogPriceTry()} />;
}
