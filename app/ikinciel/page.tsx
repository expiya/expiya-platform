import Link from "next/link";

const principles = [
  ["İhtiyaç önce", "Model, yaş ve kilometre aralığını kullanım biçiminizden çıkarır."],
  ["Kaynak görünür", "Satıcı beyanı, belge ve bağımsız doğrulama birbirine karıştırılmaz."],
  ["Güvenli sonraki adım", "Karar yerine kontrol listesi, geçmiş kontrolü ve bağımsız ekspertiz önerir."],
] as const;

export default function UsedCarsLandingPage() {
  return <main>
    <section className="overflow-hidden border-b border-stone-200 bg-[radial-gradient(circle_at_75%_20%,#d1fae5_0,transparent_28%),linear-gradient(145deg,#fafaf9,#f0ede5)]">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-24">
        <div className="self-center">
          <div className="mb-6 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-emerald-800">Ayrı ürün · kontrollü prototip</div>
          <h1 className="max-w-3xl text-5xl font-black leading-[.98] tracking-[-.05em] sm:text-6xl lg:text-7xl">Satılık araç değil,<br/><span className="text-emerald-800">size uygun araç.</span></h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600">Bütçenizi, kullanımınızı ve risk toleransınızı anlayalım. Uygun model ailesini, yaş-kilometre koridorunu ve somut kurumsal satıcı stoklarını nedenleriyle birlikte gösterelim.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/ikinciel/tercihler" className="rounded-full bg-emerald-900 px-7 py-4 font-bold text-white shadow-lg shadow-emerald-950/15 hover:bg-emerald-800">Eşleştirmeyi başlat <span aria-hidden>→</span></Link>
            <a href="#nasil" className="rounded-full border border-stone-300 bg-white px-7 py-4 font-bold text-stone-800">Nasıl çalışır?</a>
          </div>
          <p className="mt-4 text-xs text-stone-500">Bu yüzey sentetik verili tasarım prototipidir; gerçek ilan veya satın alma yönlendirmesi değildir.</p>
        </div>
        <div className="relative min-h-[430px] rounded-[2rem] bg-emerald-950 p-6 text-white shadow-2xl shadow-emerald-950/20">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-emerald-200"><span>Örnek karar özeti</span><span className="rounded-full bg-white/10 px-3 py-1">Demo</span></div>
          <div className="mt-12 text-sm text-emerald-200">Sizin için makul başlangıç koridoru</div>
          <div className="mt-2 text-4xl font-black tracking-tight">2020+ · ≤ 90.000 km</div>
          <div className="mt-8 grid grid-cols-3 gap-2">
            {[['İhtiyaç','92'],['Risk','84'],['Kanıt','76']].map(([label,value]) => <div key={label} className="rounded-2xl bg-white/10 p-4"><div className="text-2xl font-black">%{value}</div><div className="mt-1 text-xs text-emerald-100">{label} uyumu</div></div>)}
          </div>
          <div className="mt-8 rounded-2xl bg-white p-5 text-stone-900"><div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full bg-amber-400"/><strong>Belge var, içerik doğrulanmadı</strong></div><p className="mt-2 text-sm leading-6 text-stone-600">Eksik ve belirsiz bilgiler sonuçla aynı yerde görünür.</p></div>
        </div>
      </div>
    </section>
    <section id="nasil" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
      <div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Karar mimarisi</p><h2 className="mt-3 text-4xl font-black tracking-tight">İlan kalabalığını güvenli bir kısa listeye dönüştürür.</h2></div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">{principles.map(([title,body], index) => <article key={title} className="rounded-3xl border border-stone-200 bg-white p-7"><span className="text-sm font-black text-emerald-700">0{index+1}</span><h3 className="mt-8 text-xl font-black">{title}</h3><p className="mt-3 leading-7 text-stone-600">{body}</p></article>)}</div>
    </section>
  </main>;
}
