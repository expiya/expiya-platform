"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useRef, useState } from "react";

export function CarsHomepageExperience({ children, startConversation = false }: { readonly children: ReactNode; readonly startConversation?: boolean }) {
  const [started, setStarted] = useState(startConversation);
  const conversationRef = useRef<HTMLDivElement>(null);

  function openConversation() {
    setStarted(true);
    window.requestAnimationFrame(() => {
      conversationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      conversationRef.current?.focus({ preventScroll: true });
    });
  }

  return <div data-cars-homepage className="min-h-screen bg-white text-stone-950">
    <section className="relative isolate min-h-[92svh] overflow-hidden border-b border-stone-200 bg-white">
      <Image src="/cars/expiya-hero-highway-mixed-fleet.png" alt="Binek, ticari, yük ve yolcu taşıma araçlarının modern bir otoyolda birlikte ilerlediği temsili sahne" fill priority sizes="100vw" className="object-cover object-[70%_bottom] sm:object-[67%_center]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#fff_0%,rgba(255,255,255,.98)_48%,rgba(255,255,255,.42)_68%,rgba(255,255,255,.12)_82%)] sm:bg-[linear-gradient(90deg,#fff_0%,rgba(255,255,255,.97)_27%,rgba(255,255,255,.72)_48%,rgba(255,255,255,.06)_78%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,#fff_0%,rgba(255,255,255,.02)_22%,transparent_46%)] sm:bg-[linear-gradient(0deg,#fff_0%,rgba(255,255,255,.05)_35%,rgba(255,255,255,.3)_100%)]" />
      <div className="absolute left-[48%] top-[38%] h-44 w-44 rounded-full bg-emerald-200/25 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-[92svh] max-w-7xl flex-col px-5 pb-10 pt-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-baseline gap-2 text-lg font-bold tracking-tight" aria-label="Expiya Cars ana sayfa">
            EXPIYA <span className="font-light text-emerald-700">CARS</span>
          </Link>
          <p className="hidden text-xs font-medium uppercase tracking-[.22em] text-stone-500 sm:block">Experience · Powered by You</p>
        </header>

        <div className="my-auto max-w-3xl py-16 sm:py-24">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[.28em] text-emerald-700">
            <span className="h-px w-10 bg-emerald-600" aria-hidden="true" />
            Otomobil seçim asistanı
          </div>
          <h1 className="mt-7 text-5xl font-semibold leading-[.94] tracking-[-.055em] sm:text-7xl lg:text-[6.5rem]">
            Sana uygun<br /><span className="text-stone-500">sıfır aracı bul.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg sm:leading-8">
            Nasıl bir araç aradığını ve beklentilerini anlat. Expiya Cars, Türkiye pazarındaki yüzlerce sıfır araç varyantını kullanımına, bütçene ve önceliklerine göre değerlendirerek kararını netleştirmene yardımcı olur.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <button type="button" onClick={openConversation} style={{ color: "#ffffff" }} className="group inline-flex min-h-14 items-center gap-3 rounded-full bg-emerald-700 px-7 text-base font-semibold shadow-[0_12px_32px_rgba(4,120,87,.2)] transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
              Sohbete başla
              <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
            </button>
            <Link href="/cars/catalog" className="inline-flex min-h-14 items-center rounded-full border border-stone-300 bg-white/90 px-6 text-base font-semibold text-stone-900 shadow-sm transition hover:border-emerald-600 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">Araç kataloğunu incele</Link>
            <Link href="/ikinciel" className="inline-flex min-h-14 items-center gap-2 rounded-full border border-amber-300 bg-amber-50/95 px-6 text-base font-semibold text-amber-950 shadow-sm transition hover:border-amber-500 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700">
              İkinci el
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[.08em] text-amber-950">Çok yakında</span>
            </Link>
            <span className="text-sm text-stone-500">Ücretsiz · Türkçe · Kendi hızında</span>
          </div>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-stone-200 bg-stone-200/80 shadow-[0_18px_55px_rgba(28,25,23,.08)] backdrop-blur-md sm:grid-cols-3">
          {[["01", "İhtiyacını anlar", "Kullanımını, bütçeni ve yeni aracından beklentilerini sohbetle netleştirir."], ["02", "Sıfır araçları karşılaştırır", "Katalogdaki varyantları teknik özellikleri, fiyat durumu ve ihtiyaç uyumuyla değerlendirir."], ["03", "Kararı netleştirir", "En uygun sıfır araca kadar inebilen, gerekçeli bir karar yolu sunar."]].map(([number, title, copy]) => <article key={number} className="bg-white/90 p-5 sm:p-6">
            <p className="text-xs font-semibold text-emerald-700">{number}</p><h2 className="mt-3 font-semibold text-stone-900">{title}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{copy}</p>
          </article>)}
        </div>
      </div>
    </section>

    <section className="border-b border-stone-200 bg-[#f7f8f5] px-5 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
        <div><p className="text-xs font-semibold uppercase tracking-[.28em] text-emerald-700">EXPIYA</p><h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950 sm:text-5xl">Experience.<br />Powered by You.</h2></div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[["01", "İhtiyaçların", "Yeni aracını seçerken önemli olabilecek ihtiyaçları farklı açılardan düşünmeni sağlar."], ["02", "Önceliklerin", "Bütçe, kullanım biçimi ve beklentilerin arasındaki dengeyi görünür kılar."], ["03", "Senin kararın", "Öneri, en popüler modele değil senin kullanımına ve önceliklerine göre şekillenir."]].map(([mark, title, copy]) => <article key={mark} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><p className="text-2xl font-semibold text-emerald-700">{mark}</p><h3 className="mt-4 font-semibold text-stone-900">{title}</h3><p className="mt-2 text-sm leading-6 text-stone-600">{copy}</p></article>)}
        </div>
      </div>
    </section>

    <div ref={conversationRef} id="sohbet" tabIndex={-1} className="scroll-mt-0 outline-none">
      {started ? children : <section className="bg-white px-5 py-16 text-center sm:py-24"><p className="text-xs font-semibold uppercase tracking-[.25em] text-emerald-700">XPY · Sıfır araç görüşmesi</p><h2 className="mx-auto mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-stone-950 sm:text-5xl">Yeni aracını birlikte seçelim.</h2><p className="mx-auto mt-5 max-w-xl text-stone-600">Sohbet sırasında bütçe odaklı ilerleyebilir veya önce yalnızca ihtiyaçlarına uygun sıfır araçları değerlendirebilirsin.</p><button type="button" onClick={openConversation} style={{ color: "#ffffff" }} className="mt-8 min-h-14 rounded-full bg-emerald-700 px-7 font-semibold shadow-[0_12px_30px_rgba(4,120,87,.18)] transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">Sohbete başla</button></section>}
    </div>

    <footer className="border-t border-stone-200 bg-white px-5 py-10 text-stone-600 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-lg font-semibold text-stone-950">EXPIYA <span className="font-light text-emerald-700">CARS</span></p><p className="mt-3 max-w-xl text-sm leading-6">Expiya Cars, SKYBIT Yazılım ve Bilgi Teknolojileri Danışmanlığı Ltd. Şti. tarafından geliştirilen yapay zekâ destekli sıfır araç karar platformudur.</p></div>
        <nav aria-label="Site bağlantıları" className="flex flex-wrap gap-5 text-sm"><Link href="/ikinciel" className="hover:text-stone-950">İkinci el · çok yakında</Link><Link href="/gizlilik" className="hover:text-stone-950">Gizlilik ve KVKK</Link><Link href="/arac-oneri-kosullari" className="hover:text-stone-950">Araç önerisi koşulları</Link><Link href="/satis-danismani-bilgilendirmesi" className="hover:text-stone-950">Satış danışmanı bilgisi</Link></nav>
      </div>
      <div className="mx-auto mt-8 flex max-w-7xl items-center justify-between border-t border-stone-200 pt-6 text-xs"><span>© 2026 SKYBIT</span><span className="font-semibold tracking-[.24em] text-stone-400">XPY</span></div>
    </footer>
  </div>;
}
