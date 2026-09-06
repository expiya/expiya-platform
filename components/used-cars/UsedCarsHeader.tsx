import Link from "next/link";

export function UsedCarsHeader() {
  return (
    <header className="border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Link href="/ikinciel" className="flex items-center gap-3" aria-label="Expiya İkinci El ana sayfa">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-950 text-lg font-black text-white">E</span>
          <span><span className="block text-lg font-black tracking-tight text-stone-950">Expiya</span><span className="block text-[11px] font-bold uppercase tracking-[.22em] text-emerald-700">İkinci El</span></span>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-semibold">
          <Link href="/ikinciel/tercihler" className="hidden rounded-full px-4 py-2 text-stone-700 hover:bg-stone-100 sm:block">Aracımı bul</Link>
          <Link href="/ikinciel/partner-demo" className="rounded-full border border-stone-300 px-4 py-2 text-stone-800 hover:border-emerald-700">Satıcı paneli demo</Link>
        </nav>
      </div>
    </header>
  );
}
