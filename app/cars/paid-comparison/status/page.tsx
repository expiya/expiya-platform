import Link from "next/link";
import StatusPanel from "./StatusPanel";

export const metadata = {
  title: "Ödeme durumu | Expiya Cars",
  robots: { index: false, follow: false },
};

export default async function PaidComparisonPaymentStatusPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly payment?: string }>;
}) {
  const { payment } = await searchParams;
  const succeeded = payment === "success";

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-5 py-16">
      <section className="w-full rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">Expiya Cars</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 dark:text-white">
          {succeeded ? "Ödemeniz doğrulandı" : "Ödeme tamamlanamadı"}
        </h1>
        <p className="mt-4 leading-7 text-neutral-600 dark:text-neutral-300">
          {succeeded
            ? "Üç araçlık karar doğrulama raporunuz hazırlanmak üzere sıraya alındı. Rapor hazır olduğunda bu ekrandan güvenli biçimde erişebileceksiniz."
            : "Kartınızdan tahsilat yapıldığına dair bir bildirim görüyorsanız yeniden ödeme denemeyin. İşlem güvenli biçimde kontrol edilecektir."}
        </p>
        <StatusPanel paymentSucceeded={succeeded} />
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-neutral-950 px-5 font-medium text-white dark:bg-white dark:text-neutral-950">
            Expiya Cars’a dön
          </Link>
          <Link href="/gizlilik" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-neutral-300 px-5 font-medium text-neutral-800 dark:border-neutral-700 dark:text-neutral-200">
            Gizlilik bilgileri
          </Link>
        </div>
      </section>
    </main>
  );
}
