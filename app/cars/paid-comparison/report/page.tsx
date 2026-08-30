export const metadata = { title: "Karar doğrulama raporun | Expiya Cars", robots: { index: false, follow: false } };

export default function PaidComparisonReportPage() {
  return <main className="min-h-screen bg-[#f7f8f5] text-stone-950"><header className="border-b border-stone-200 bg-white"><div className="mx-auto max-w-6xl px-5 py-5 text-lg font-bold tracking-tight">EXPIYA <span className="font-light text-emerald-700">CARS</span></div></header><div className="mx-auto max-w-6xl px-5 py-8">
    <div className="mb-5"><ReportNavigation /></div><header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[.28em] text-emerald-700">Kişisel karşılaştırma</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">3 araç karşılaştırma raporun</h1><p className="mt-2 text-sm text-stone-600">Rapor uygulama içinde PDF olarak gösteriliyor; telefonuna veya bilgisayarına da kaydedebilirsin.</p></div>
      <a href="/api/cars/paid-comparison/report/pdf?download=1" className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-700 px-6 font-semibold text-white shadow-[0_12px_30px_rgba(4,120,87,.18)]">PDF’yi indir</a>
    </header>
    <PdfViewer />
    <p className="mt-3 text-xs text-stone-500">PDF görüntülenemiyorsa “PDF’yi indir” düğmesini kullanabilirsin.</p>
  </div></main>;
}
import PdfViewer from "./PdfViewer";
import ReportNavigation from "./ReportNavigation";
