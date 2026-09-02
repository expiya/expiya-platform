import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Expiya — Karar Platformu",
  description: "Otomobil, ev yaşamı, seyahat ve eğitim gibi önemli seçimlerde karar vermenize yardımcı olan Expiya platformu.",
  alternates: { canonical: "/" },
};

const upcomingDomains = ["Ev aletleri", "Oteller", "Kurslar", "Evler"] as const;

export default function PlatformHome() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] px-5 py-10 text-stone-950 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-stone-200 pb-6">
          <p className="text-xl font-bold tracking-[0.18em]">EXPIYA</p>
          <p className="mt-2 text-sm text-stone-500">Experience · Powered by You</p>
        </header>

        <section className="py-14 sm:py-20" aria-labelledby="platform-title">
          <p className="text-xs font-semibold uppercase tracking-[.28em] text-emerald-700">Karar platformu</p>
          <h1 id="platform-title" className="mt-5 max-w-3xl text-5xl font-semibold tracking-[-.05em] sm:text-7xl">
            Ne seçiyorsun?
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
            İhtiyaçlarını anlat; seçenekleri birlikte değerlendirelim ve senin için önemli olan kararı netleştirelim.
          </p>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/cars" className="group rounded-3xl border border-emerald-300 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-600 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
              <span className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-700">Kullanıma açık</span>
              <h2 className="mt-4 text-3xl font-semibold">Otomobiller</h2>
              <p className="mt-3 leading-7 text-stone-600">İhtiyaçlarına ve bütçene uygun sıfır aracı birlikte seç.</p>
              <span className="mt-8 inline-flex font-semibold text-emerald-800">Expiya Cars’a git <span className="ml-2 transition-transform group-hover:translate-x-1" aria-hidden="true">→</span></span>
            </Link>

            {upcomingDomains.map((domain) => (
              <article key={domain} className="rounded-3xl border border-stone-200 bg-white/70 p-7 text-stone-500">
                <span className="text-xs font-semibold uppercase tracking-[.2em]">Yakında</span>
                <h2 className="mt-4 text-2xl font-semibold text-stone-700">{domain}</h2>
                <p className="mt-3 text-sm leading-6">Bu karar deneyimi hazırlanıyor.</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
