import Link from "next/link";
import type { CatalogDirectoryDepartment } from "@/features/platform/catalogDirectory.server";

export function CatalogDirectory({ directory }: { readonly directory: readonly CatalogDirectoryDepartment[] }) {
  return <section aria-labelledby="catalog-directory-title" className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-24">
    <p className="text-xs font-bold uppercase tracking-[.3em] text-emerald-800">Aktif ürün dizini</p>
    <h2 id="catalog-directory-title" className="mt-4 text-4xl font-medium tracking-[-.045em]">Bölümden ürüne göz atın.</h2>
    <p className="mt-5 max-w-3xl leading-7 text-stone-600">Yalnızca bugün aktif olan ürünler gösterilir. Bir bölümü, ardından kategoriyi açın.</p>
    <div className="mt-10 space-y-4">{directory.map(department => <details key={department.id} className="group min-w-0 rounded-3xl border border-stone-200 bg-white open:border-emerald-800/40">
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-3xl px-5 py-4 text-xl font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 [&::-webkit-details-marker]:hidden"><span>{department.label}</span><span aria-hidden="true" className="shrink-0 text-emerald-800 transition-transform group-open:rotate-45">＋</span></summary>
      <div className="px-5 pb-5"><Link href={department.href} className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-900 underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">{department.label} bölümüne git</Link>
        <div className="mt-3 space-y-3">{department.categories.map(category => <details key={category.id} className="group/category min-w-0 rounded-2xl bg-stone-50">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 [&::-webkit-details-marker]:hidden"><span className="min-w-0 break-words">{category.label} <span className="font-normal text-stone-500">({category.variants.length})</span></span><span aria-hidden="true" className="shrink-0 text-emerald-800 transition-transform group-open/category:rotate-45">＋</span></summary>
          <div className="px-4 pb-5"><Link href={category.href} className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-900 underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">{category.label} görüşmesine git</Link>
            {category.variants.length > 0 ? <ul className="mt-3 grid min-w-0 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">{category.variants.map((product, index) => <li key={`${category.id}-${index}`} className="min-w-0 break-words border-t border-stone-200 py-3 text-sm leading-6 text-stone-700">{product.label}</li>)}</ul> : <p className="mt-3 text-sm text-stone-500">Bu kategoride görüntülenecek aktif ürün yok.</p>}
          </div>
        </details>)}</div>
      </div>
    </details>)}</div>
  </section>;
}
