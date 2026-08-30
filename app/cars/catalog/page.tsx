import Image from "next/image";
import Link from "next/link";
import { CatalogVariantOpenButton } from "@/components/cars/CatalogVariantOpenButton";
import { getCatalogBrowserPage, parseCatalogBrowserQuery } from "@/features/catalog-browser/catalog.server";

export const dynamic = "force-dynamic";

const selectClass = "min-h-11 rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const pageHref = (raw: Record<string, string | string[] | undefined>, page: number) => { const params = new URLSearchParams(); for (const [key, value] of Object.entries(raw)) { const item = Array.isArray(value) ? value[0] : value; if (item && key !== "page") params.set(key, item); } params.set("page", String(page)); return `/cars/catalog?${params.toString()}`; };

export default async function CatalogPage({ searchParams }: { readonly searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams; const query = parseCatalogBrowserQuery(raw); const result = await getCatalogBrowserPage(query);
  return <main className="min-h-screen bg-white text-stone-950">
    <header className="border-b border-stone-200 bg-white"><div className="mx-auto flex max-w-[96rem] items-center justify-between px-5 py-5 sm:px-8"><Link href="/" className="text-lg font-bold tracking-tight">EXPIYA <span className="font-light text-emerald-700">CARS</span></Link><Link href="/?resume=conversation#sohbet" className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50">Karar motoruyla sohbet et</Link></div></header>
    <section className="border-b border-stone-200 bg-[#f7f8f5]"><div className="mx-auto max-w-[96rem] px-5 py-10 sm:px-8"><p className="text-xs font-semibold uppercase tracking-[.24em] text-emerald-700">Türkiye sıfır araç kataloğu</p><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Araçları kendin araştır.</h1><p className="mt-4 max-w-3xl leading-7 text-stone-600">Aktif katalogdaki {result.initialCount} satıştaki varyantı temel özelliklerine göre filtrele, sırala ve seçtiğin exact varyantı ayrıntılı incele.</p></div></section>
    <div className="mx-auto max-w-[96rem] px-5 py-8 sm:px-8">
      <form method="get" className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8" aria-label="Araç kataloğu filtreleri">
        <label className="sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-stone-600">Marka, model veya varyant ara</span><input name="q" defaultValue={query.q} placeholder="Örn. Sportage" className={`${selectClass} w-full`} /></label>
        <label><span className="mb-1 block text-xs font-semibold text-stone-600">Marka</span><select name="brand" defaultValue={query.brand} className={`${selectClass} w-full`}><option value="">Tümü</option>{result.facets.brands.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span className="mb-1 block text-xs font-semibold text-stone-600">Sınıf</span><select name="class" defaultValue={query.useClass} className={`${selectClass} w-full`}><option value="">Tümü</option>{result.facets.useClasses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label><span className="mb-1 block text-xs font-semibold text-stone-600">Gövde</span><select name="body" defaultValue={query.bodyStyle} className={`${selectClass} w-full`}><option value="">Tümü</option>{result.facets.bodyStyles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label><span className="mb-1 block text-xs font-semibold text-stone-600">Yakıt</span><select name="fuel" defaultValue={query.fuelType} className={`${selectClass} w-full`}><option value="">Tümü</option>{result.facets.fuelTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label><span className="mb-1 block text-xs font-semibold text-stone-600">Sırala</span><select name="sort" defaultValue={query.sort} className={`${selectClass} w-full`}><option value="BRAND_ASC">Marka / model</option><option value="PRICE_ASC">Fiyat: düşükten yükseğe</option><option value="PRICE_DESC">Fiyat: yüksekten düşüğe</option><option value="YEAR_DESC">Model yılı</option><option value="SEATS_DESC">Koltuk sayısı</option></select></label>
        <div className="flex items-end gap-2"><button className="min-h-11 flex-1 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">Filtrele</button><Link href="/cars/catalog" className="flex min-h-11 items-center rounded-xl border border-stone-300 px-3 text-sm font-semibold">Temizle</Link></div>
        <label><span className="mb-1 block text-xs font-semibold text-stone-600">En düşük fiyat</span><input inputMode="numeric" name="minPrice" defaultValue={query.minPriceTry} placeholder="TL" className={`${selectClass} w-full`} /></label>
        <label><span className="mb-1 block text-xs font-semibold text-stone-600">En yüksek fiyat</span><input inputMode="numeric" name="maxPrice" defaultValue={query.maxPriceTry} placeholder="TL" className={`${selectClass} w-full`} /></label>
      </form>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-stone-600"><strong className="text-stone-950">{result.total}</strong> varyant bulundu · Katalog {result.release}</p><p className="text-xs text-stone-500">Tahmini fiyatlar gösterilmez; yalnız filtre ve sıralamadaki göreli konumda kullanılabilir.</p></div>
      <div className="mt-5 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[5rem_1.4fr_1fr_.8fr_.8fr_1fr_1fr_8rem] gap-4 border-b border-stone-200 bg-stone-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500 lg:grid"><span>Görsel</span><span>Marka / model</span><span>Sınıf / gövde</span><span>Yakıt</span><span>Koltuk</span><span>Şanzıman</span><span>Fiyat</span><span /></div>
        <div className="divide-y divide-stone-200">{result.rows.map((row) => <article key={row.id} className="grid gap-4 p-4 lg:grid-cols-[5rem_1.4fr_1fr_.8fr_.8fr_1fr_1fr_8rem] lg:items-center lg:px-5">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-stone-100 lg:aspect-square"><Image src={row.image} alt={`${row.brand} ${row.model}`} fill sizes="(max-width: 1024px) 35vw, 80px" className="object-cover" /></div>
          <div><p className="font-semibold">{row.brand} {row.model}</p><p className="mt-1 text-sm leading-5 text-stone-500">{row.trim}</p><p className="mt-1 text-xs text-stone-400">{row.modelYear} model</p></div>
          <dl className="grid grid-cols-2 gap-3 text-sm lg:block"><div><dt className="text-xs text-stone-500 lg:hidden">Sınıf / gövde</dt><dd>{row.useClass} · {row.bodyStyle}</dd></div><div className="lg:hidden"><dt className="text-xs text-stone-500">Yakıt</dt><dd>{row.fuelType}</dd></div></dl>
          <p className="hidden text-sm lg:block">{row.fuelType}</p><p className="text-sm"><span className="text-stone-500 lg:hidden">Koltuk: </span>{row.seats ?? "—"}</p><p className="break-words text-sm"><span className="text-stone-500 lg:hidden">Şanzıman: </span>{row.transmission}</p>
          <div><p className="font-semibold">{row.priceDisplay}</p>{row.priceStatus === "EXPIRED" ? <p className="mt-1 text-xs text-amber-700">Güncel olmayabilir</p> : row.priceStatus === "INTERNAL_ONLY" ? <p className="mt-1 text-xs text-stone-500">Tutar gösterilmez</p> : null}</div>
          <CatalogVariantOpenButton exactVariantId={row.id} />
        </article>)}</div>
      </div>
      {!result.rows.length ? <p className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-6 text-center text-stone-600">Bu filtrelerle eşleşen satıştaki varyant bulunamadı.</p> : null}
      <nav aria-label="Katalog sayfaları" className="mt-6 flex items-center justify-center gap-3"><Link aria-disabled={result.page === 1} href={pageHref(raw, Math.max(1, result.page - 1))} className={`rounded-full border px-4 py-2 text-sm font-semibold ${result.page === 1 ? "pointer-events-none opacity-40" : "hover:bg-stone-50"}`}>← Önceki</Link><span className="text-sm text-stone-600">{result.page} / {result.pageCount}</span><Link aria-disabled={result.page === result.pageCount} href={pageHref(raw, Math.min(result.pageCount, result.page + 1))} className={`rounded-full border px-4 py-2 text-sm font-semibold ${result.page === result.pageCount ? "pointer-events-none opacity-40" : "hover:bg-stone-50"}`}>Sonraki →</Link></nav>
    </div>
  </main>;
}
