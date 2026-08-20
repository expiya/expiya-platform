import { CarsConversation } from "@/components/cars/CarsConversation";
import {
  CARS_CONVERSATION_AVAILABILITY,
  isPublicCarsConversationEnabled,
} from "@/features/decision/conversation/carsConversationAvailability";

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | string[] }>;
}) {
  if (!isPublicCarsConversationEnabled()) {
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
  const queryValue = (await searchParams).query;
  const query = Array.isArray(queryValue) ? queryValue[0] ?? "" : queryValue ?? "";
  return <CarsConversation initialQuery={query} />;
}
