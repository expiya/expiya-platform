import Link from "next/link";

export const metadata = { title: "Örnek karşılaştırma raporu | Expiya Cars", robots: { index: false, follow: false } };

export default function PaidComparisonSamplePage() {
  return <main className="min-h-screen bg-[#f7f8f5] px-4 py-6 text-stone-950 sm:px-6 sm:py-10">
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[.25em] text-emerald-700">Expiya Cars · XPY</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Örnek 3 araç karşılaştırma raporu</h1></div>
        <div className="flex flex-wrap gap-2"><Link href="/cars/paid-comparison" className="inline-flex min-h-11 items-center rounded-full border border-stone-300 bg-white px-5 text-sm font-semibold">Karşılaştırmaya dön</Link><a href="/api/cars/paid-comparison/sample/pdf?download=1" className="inline-flex min-h-11 items-center rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white">PDF’yi indir</a></div>
      </div>
      <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Anonim ve temsili örnek:</strong> Araç A, B ve C’nin temel teknik verileri katalogdaki bilgi yoğunluğu en yüksek üç varyanttan anonimleştirilmiştir. Eksiksiz rapor deneyimini göstermek amacıyla tamamlayıcı donanım ve maliyet alanları sentetik olarak doldurulmuştur; güncel tavsiye, fiyat veya satış teklifi değildir.</div>
      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl"><iframe title="Expiya Cars örnek karşılaştırma raporu" src="/api/cars/paid-comparison/sample/pdf" className="h-[82vh] min-h-[720px] w-full" /></div>
    </div>
  </main>;
}
