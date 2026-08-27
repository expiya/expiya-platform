import { CarsConversation } from "@/components/cars/CarsConversation";
import { CarsConversationV3 } from "@/components/cars/CarsConversationV3";
import {
  CARS_CONVERSATION_AVAILABILITY,
  isPublicCarsConversationEnabled,
} from "@/features/decision/conversation/carsConversationAvailability";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PILOT_SESSION_COOKIE, verifyPilotSessionToken } from "@/features/pilot/pilotSession.server";
import { getV3MinimumCatalogPriceTry } from "@/features/decision/v3/catalogAdapter.server";

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | string[]; pilot?: string | string[] }>;
}) {
  const params = await searchParams;
  const pilotValue = Array.isArray(params.pilot) ? params.pilot[0] : params.pilot;
  const queryValue = params.query;
  const query = Array.isArray(queryValue) ? queryValue[0] ?? "" : queryValue ?? "";
  if (pilotValue === "v3" || pilotValue === "v3.1" || pilotValue === "v3.2" || pilotValue === "v3.3" || pilotValue === "v3.4" || pilotValue === "v3.5" || pilotValue === "v3.6" || pilotValue === "v3.7" || pilotValue === "v3.8") return <CarsConversationV3 initialQuery={query} minimumBudgetTry={await getV3MinimumCatalogPriceTry()} />;
  const pilotRequested = pilotValue === "1";
  const pilotSession = verifyPilotSessionToken((await cookies()).get(PILOT_SESSION_COOKIE)?.value);
  if (pilotRequested && !pilotSession) redirect("/pilot");
  if (!isPublicCarsConversationEnabled(process.env, Boolean(pilotSession))) {
    return (
      <main className="min-h-screen bg-neutral-50 px-5 py-16 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
        <section className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-white p-8 shadow-sm dark:border-amber-900 dark:bg-neutral-900 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">Expiya Cars</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">{CARS_CONVERSATION_AVAILABILITY.title}</h1>
          <p className="mt-4 leading-7 text-neutral-600 dark:text-neutral-300">{CARS_CONVERSATION_AVAILABILITY.message}</p>
          <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">Mevcut katalog sayfalarını incelemeye devam edebilirsiniz. Sohbet yeniden açıldığında burada duyurulacaktır.</p>
        </section>
      </main>
    );
  }
  return <CarsConversation initialQuery={query} pilotUsername={pilotSession?.username} />;
}
