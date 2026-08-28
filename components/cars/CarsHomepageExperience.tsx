"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useRef, useState } from "react";

export function CarsHomepageExperience({ children }: { readonly children: ReactNode }) {
  const [started, setStarted] = useState(false);
  const conversationRef = useRef<HTMLDivElement>(null);

  function openConversation() {
    setStarted(true);
    window.requestAnimationFrame(() => {
      conversationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      conversationRef.current?.focus({ preventScroll: true });
    });
  }

  return <div data-cars-homepage className="min-h-screen bg-[#080b0d] text-white">
    <section className="relative isolate min-h-[92svh] overflow-hidden border-b border-white/10">
      <Image src="/cars/expiya-hero-night-road.jpg" alt="" fill priority sizes="100vw" className="object-cover object-[62%_center]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,6,8,.96)_0%,rgba(3,6,8,.82)_35%,rgba(3,6,8,.28)_72%,rgba(3,6,8,.5)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,#080b0d_0%,transparent_34%,rgba(3,6,8,.18)_100%)]" />
      <div className="absolute left-[52%] top-[42%] h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-[92svh] max-w-7xl flex-col px-5 pb-10 pt-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-baseline gap-2 text-lg font-bold tracking-tight" aria-label="Expiya Cars ana sayfa">
            EXPIYA <span className="font-light text-emerald-400">CARS</span>
          </Link>
          <p className="hidden text-xs font-medium uppercase tracking-[.22em] text-white/55 sm:block">Experience · Powered by You</p>
        </header>

        <div className="my-auto max-w-3xl py-16 sm:py-24">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[.28em] text-emerald-300">
            <span className="h-px w-10 bg-emerald-400" aria-hidden="true" />
            Sıfır otomobil seçim asistanı
          </div>
          <h1 className="mt-7 text-5xl font-semibold leading-[.94] tracking-[-.055em] sm:text-7xl lg:text-[6.5rem]">
            Sana uygun<br /><span className="text-white/55">sıfır aracı bul.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
            Nasıl bir araç aradığını ve beklentilerini anlat. Expiya Cars, Türkiye pazarındaki yüzlerce sıfır araç varyantını kullanımına, bütçene ve önceliklerine göre değerlendirerek kararını netleştirmene yardımcı olur.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <button type="button" onClick={openConversation} style={{ color: "#07110d" }} className="group inline-flex min-h-14 items-center gap-3 rounded-full bg-emerald-400 px-7 text-base font-semibold shadow-[0_0_45px_rgba(52,211,153,.18)] transition hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300">
              Sohbete başla
              <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
            </button>
            <span className="text-sm text-white/50">Ücretsiz · Türkçe · Kendi hızında</span>
          </div>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md sm:grid-cols-3">
          {[["01", "İhtiyacını anlar", "Kullanımını, bütçeni ve yeni aracından beklentilerini sohbetle netleştirir."], ["02", "Sıfır araçları karşılaştırır", "Katalogdaki varyantları teknik özellikleri, fiyat durumu ve ihtiyaç uyumuyla değerlendirir."], ["03", "Kararı netleştirir", "En uygun sıfır araca kadar inebilen, gerekçeli bir karar yolu sunar."]].map(([number, title, copy]) => <article key={number} className="bg-black/35 p-5 sm:p-6">
            <p className="text-xs font-semibold text-emerald-300">{number}</p><h2 className="mt-3 font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-white/55">{copy}</p>
          </article>)}
        </div>
      </div>
    </section>

    <section className="border-b border-white/10 bg-[#0c1113] px-5 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
        <div><p className="text-xs font-semibold uppercase tracking-[.28em] text-emerald-300">EXPIYA</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Experience.<br />Powered by You.</h2></div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[["01", "İhtiyaçların", "Yeni aracını seçerken önemli olabilecek ihtiyaçları farklı açılardan düşünmeni sağlar."], ["02", "Önceliklerin", "Bütçe, kullanım biçimi ve beklentilerin arasındaki dengeyi görünür kılar."], ["03", "Senin kararın", "Öneri, en popüler modele değil senin kullanımına ve önceliklerine göre şekillenir."]].map(([mark, title, copy]) => <article key={mark} className="rounded-3xl border border-white/10 bg-white/[.035] p-5"><p className="text-2xl font-semibold text-emerald-300">{mark}</p><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-white/55">{copy}</p></article>)}
        </div>
      </div>
    </section>

    <div ref={conversationRef} id="sohbet" tabIndex={-1} className="scroll-mt-0 outline-none">
      {started ? children : <section className="px-5 py-16 text-center sm:py-24"><p className="text-xs font-semibold uppercase tracking-[.25em] text-emerald-300">XPY · Sıfır araç görüşmesi</p><h2 className="mx-auto mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">Yeni aracını birlikte seçelim.</h2><p className="mx-auto mt-5 max-w-xl text-white/55">Sohbet sırasında bütçe odaklı ilerleyebilir veya önce yalnızca ihtiyaçlarına uygun sıfır araçları değerlendirebilirsin.</p><button type="button" onClick={openConversation} style={{ color: "#07110d" }} className="mt-8 min-h-14 rounded-full border border-emerald-300 bg-emerald-400 px-7 font-semibold shadow-[0_0_32px_rgba(52,211,153,.16)] transition hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300">Sohbete başla</button></section>}
    </div>

    <footer className="border-t border-white/10 bg-black px-5 py-10 text-white/55 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-lg font-semibold text-white">EXPIYA <span className="font-light text-emerald-400">CARS</span></p><p className="mt-3 max-w-xl text-sm leading-6">Expiya Cars, SKYBIT Yazılım ve Bilgi Teknolojileri Danışmanlığı Ltd. Şti. tarafından geliştirilen yapay zekâ destekli sıfır araç karar platformudur.</p></div>
        <nav aria-label="Yasal bağlantılar" className="flex flex-wrap gap-5 text-sm"><Link href="/gizlilik" className="hover:text-white">Gizlilik ve KVKK</Link><Link href="/arac-oneri-kosullari" className="hover:text-white">Araç önerisi koşulları</Link><Link href="/satis-danismani-bilgilendirmesi" className="hover:text-white">Satış danışmanı bilgisi</Link></nav>
      </div>
      <div className="mx-auto mt-8 flex max-w-7xl items-center justify-between border-t border-white/10 pt-6 text-xs"><span>© 2026 SKYBIT</span><span className="font-semibold tracking-[.24em] text-white/35">XPY</span></div>
    </footer>
  </div>;
}
