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
    <main className="min-h-screen bg-[#f7f8f5] text-stone-950"><header className="border-b border-stone-200 bg-white"><div className="mx-auto max-w-5xl px-5 py-5 text-lg font-bold tracking-tight">EXPIYA <span className="font-light text-emerald-700">CARS</span></div></header><div className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-5 py-16">
      <section className="w-full rounded-3xl border border-stone-200 bg-white p-7 shadow-[0_18px_55px_rgba(28,25,23,.08)] sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[.28em] text-emerald-700">Ödeme ve teslim</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">
          {succeeded ? "Ödemeniz doğrulandı" : "Ödeme tamamlanamadı"}
        </h1>
        <p className="mt-4 leading-7 text-stone-600">
          {succeeded
            ? "Üç araçlık karar doğrulama raporunuz hazırlanmak üzere sıraya alındı. Rapor hazır olduğunda bu ekrandan güvenli biçimde erişebileceksiniz."
            : "Kartınızdan tahsilat yapıldığına dair bir bildirim görüyorsanız yeniden ödeme denemeyin. İşlem güvenli biçimde kontrol edilecektir."}
        </p>
        <StatusPanel paymentSucceeded={succeeded} />
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/cars" className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-700 px-5 font-semibold text-white">
            Expiya Cars’a dön
          </Link>
          <Link href="/gizlilik" className="inline-flex min-h-12 items-center justify-center rounded-full border border-stone-300 px-5 font-semibold text-stone-700">
            Gizlilik bilgileri
          </Link>
        </div>
      </section></div>
    </main>
  );
}
