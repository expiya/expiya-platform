import Link from "next/link";

export const metadata = {
  title: "Expiya İkinci El · Çok Yakında",
  description: "Expiya'nın kurumsal satıcı stoklarını kullanıcı ihtiyaçlarıyla eşleştirecek ikinci el araç deneyimi hazırlanıyor.",
};

export default function UsedCarsComingSoonPage() {
  return (
    <main className="min-h-screen bg-white px-5 py-6 text-stone-950 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between border-b border-stone-200 pb-5">
          <Link href="/cars" className="inline-flex items-baseline gap-2 text-lg font-bold tracking-tight" aria-label="Expiya Cars ana sayfa">
            EXPIYA <span className="font-light text-emerald-700">CARS</span>
          </Link>
          <Link href="/cars" className="inline-flex min-h-11 items-center rounded-full border border-stone-300 px-4 text-sm font-semibold hover:border-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
            Sıfır araçlara dön
          </Link>
        </header>

        <section className="relative isolate mt-8 overflow-hidden rounded-[2rem] border border-amber-200 bg-[#fffaf0] px-6 py-14 sm:px-10 sm:py-20 lg:px-16">
          <div aria-hidden="true" className="absolute -right-20 -top-28 size-80 rounded-full bg-amber-200/60 blur-3xl" />
          <div aria-hidden="true" className="absolute -bottom-24 left-1/3 size-72 rounded-full bg-emerald-100/70 blur-3xl" />
          <div className="relative max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[.24em] text-amber-800">Expiya İkinci El</p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-.04em] sm:text-6xl">İhtiyacına uygun ikinci el araç deneyimi hazırlanıyor.</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-stone-700 sm:text-lg sm:leading-8">
              Kurumsal satıcıların yönettiği araç stoklarını; kullanım ihtiyacı, bütçe ve risk tercihleriyle eşleştiren ayrı bir Expiya deneyimi üzerinde çalışıyoruz.
            </p>
            <div className="mt-8 inline-flex min-h-12 items-center rounded-full border border-amber-300 bg-white px-5 text-sm font-semibold text-amber-950 shadow-sm" role="status">
              İkinci el · çok yakında
            </div>
          </div>
        </section>

        <section className="grid gap-4 py-10 sm:grid-cols-3" aria-label="Hazırlanan ikinci el deneyiminin kapsamı">
          {[
            ["İhtiyaç eşleştirmesi", "Yalnız ilan listelemek yerine kullanımını ve risk toleransını anlamayı hedefler."],
            ["Kurumsal stoklar", "Bireysel ilanlar yerine sisteme üye kurumsal satıcıların yönettiği stoklar planlanmaktadır."],
            ["Açık veri durumu", "Satıcı beyanı, doğrulanmış bilgi ve eksik veriler birbirinden açıkça ayrılacaktır."],
          ].map(([title, description]) => (
            <article key={title} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
