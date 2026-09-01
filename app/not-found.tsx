import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5 py-16 text-stone-950">
      <section className="w-full max-w-xl rounded-[2rem] border border-stone-200 bg-white p-7 text-center shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">404 · Sayfa bulunamadı</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Aradığınız sayfaya ulaşamadık</h1>
        <p className="mx-auto mt-4 max-w-md leading-7 text-stone-600">
          Bağlantı eski, eksik veya süresi dolmuş olabilir. Ana sayfadan yeni bir araç görüşmesi başlatabilir ya da güncel kataloğu inceleyebilirsiniz.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-700 px-5 font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">
            Ana sayfaya dön
          </Link>
          <Link href="/cars/catalog" className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-5 font-semibold text-stone-800 hover:border-emerald-600 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">
            Araç kataloğunu aç
          </Link>
        </div>
      </section>
    </main>
  );
}
