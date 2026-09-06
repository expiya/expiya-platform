import type { Metadata } from "next";
import Link from "next/link";
import { UpperSecretary } from "@/components/platform/UpperSecretary";
import { SECRETARY_SEARCH_SUGGESTIONS } from "@/features/platform/platformDiscovery";

export const metadata: Metadata = {
  title: "Expiya — Satın Alma Karar Platformu",
  description: "Otomobil, ev ürünleri, elektronik ve mobilite kararlarını ihtiyaçlarınıza göre, doğrulanmış bilgi sınırları içinde birlikte netleştirin.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return <main data-xpy-platform-landing="v2-conversation-first" data-platform-default-department="NONE" className="overflow-x-clip bg-[#f7f7f5] text-stone-950">
    <section className="min-h-dvh px-5 py-7 sm:px-8 sm:py-9">
      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-7xl flex-col sm:min-h-[calc(100dvh-4.5rem)]">
        <header className="flex items-center justify-between gap-5"><Link href="/" aria-label="Expiya ana sayfa" className="text-lg font-black tracking-[.18em] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">EXPIYA</Link><p className="text-right text-[10px] font-medium uppercase tracking-[.22em] text-stone-500 sm:text-xs">Satın alma karar platformu</p></header>
        <div className="flex flex-1 items-center py-14 sm:py-20"><UpperSecretary suggestions={SECRETARY_SEARCH_SUGGESTIONS} /></div>
      </div>
    </section>

    <footer className="border-t border-stone-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-stone-600 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12"><p><strong className="text-stone-950">EXPIYA</strong><span className="ml-2">Experience. Powered by You.</span></p><nav aria-label="Site bağlantıları" className="flex flex-wrap gap-x-5 gap-y-2"><Link href="/expiya-nedir">Expiya nedir?</Link><Link href="/gizlilik">Gizlilik ve KVKK</Link></nav></div></footer>
  </main>;
}
