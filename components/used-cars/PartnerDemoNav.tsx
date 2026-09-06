import Link from "next/link";

const items = [
  ["Genel bakış", "/ikinciel/partner-demo"],
  ["Yeni stok", "/ikinciel/partner-demo/stok/yeni"],
  ["Talepler", "/ikinciel/partner-demo/talepler"],
  ["Analitik", "/ikinciel/partner-demo/analitik"],
  ["Üyelik", "/ikinciel/partner-demo/uyelik"],
  ["Firma ve erişim", "/ikinciel/partner-demo/erisim"],
  ["Diğer araçlar", "/ikinciel/partner-demo/hazirlik"],
] as const;

export function PartnerDemoNav({ active }: { readonly active: string }) {
  return <nav className="sticky top-0 z-20 flex gap-1 overflow-x-auto border-b border-stone-200 bg-white/95 px-5 py-3 backdrop-blur lg:px-8" aria-label="Partner demo navigasyonu">
    {items.map(([label, href]) => <Link key={href} href={href} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold ${active === href ? "bg-emerald-950 text-white" : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"}`}>{label}</Link>)}
  </nav>;
}
