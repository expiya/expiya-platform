import Link from "next/link";

const items = [
  ["Genel bakış", "/ikinciel/partner-demo"],
  ["Firma onboarding", "/ikinciel/partner-demo/onboarding"],
  ["Yeni stok", "/ikinciel/partner-demo/stok/yeni"],
  ["Taxonomy talebi", "/ikinciel/partner-demo/taxonomy-talebi"],
  ["Klasik araç", "/ikinciel/partner-demo/klasik-arac"],
  ["Talepler", "/ikinciel/partner-demo/talepler"],
  ["Toplu aktarım", "/ikinciel/partner-demo/import"],
  ["Üyelik", "/ikinciel/partner-demo/uyelik"],
  ["Analitik", "/ikinciel/partner-demo/analitik"],
  ["Audit", "/ikinciel/partner-demo/audit"],
  ["Erişim", "/ikinciel/partner-demo/erisim"],
  ["Medya", "/ikinciel/partner-demo/medya"],
  ["Hazırlık", "/ikinciel/partner-demo/hazirlik"],
  ["Moderasyon", "/ikinciel/partner-demo/moderasyon"],
] as const;

export function PartnerDemoNav({ active }: { readonly active: string }) {
  return <nav className="flex flex-wrap gap-2 border-b border-stone-200 bg-white px-5 py-3 lg:px-8" aria-label="Partner demo navigasyonu">
    {items.map(([label, href]) => <Link key={href} href={href} className={`rounded-full px-4 py-2 text-sm font-bold ${active === href ? "bg-emerald-950 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}>{label}</Link>)}
  </nav>;
}
