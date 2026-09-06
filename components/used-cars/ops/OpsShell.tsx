import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  ["Komuta merkezi", "/ops-demo"], ["Firma başvuruları", "/ops-demo/firma-basvurulari"],
  ["İlan moderasyonu", "/ops-demo/ilan-moderasyonu"], ["Taxonomy", "/ops-demo/taxonomy"],
  ["Kullanıcı ve roller", "/ops-demo/erisim"], ["Giriş ve 2FA", "/ops-demo/login"],
] as const;

export function OpsShell({children}:{children:ReactNode}) {
  return <div className="ops-surface min-h-screen">
    <div className="ops-divider border-b bg-zinc-950 px-6 py-2 text-center text-xs font-medium tracking-[0.16em] text-zinc-400">SENTETİK OPERASYON PROTOTİPİ · PRODUCTION AUTH KAPALI · GERÇEK AKSİYON YOK</div>
    <div className="grid min-h-[calc(100vh-33px)] lg:grid-cols-[260px_1fr]">
      <aside className="ops-sidebar border-r p-5">
        <p className="ops-kicker text-xs font-semibold uppercase tracking-[0.2em]">Expiya Ops</p>
        <h1 className="mt-2 text-xl font-semibold">İkinci El Kontrol Alanı</h1>
        <nav className="mt-8 space-y-1" aria-label="Operasyon modülleri">{nav.map(([label,href])=><Link key={href} className="block rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white" href={href}>{label}</Link>)}</nav>
        <div className="ops-panel-raised mt-10 rounded-xl border p-3 text-xs leading-5 text-zinc-300"><strong className="text-zinc-100">Actor:</strong> ops-owner-synthetic-001<br/><strong className="text-zinc-100">Ad:</strong> Serdar Akgül<br/><strong className="text-zinc-100">Rol:</strong> Platform sahibi<br/><strong className="text-zinc-100">Oturum:</strong> sentetik</div>
      </aside>
      <main className="p-5 md:p-8">{children}</main>
    </div>
  </div>;
}

export function StatusPill({children,tone="cyan"}:{children:ReactNode;tone?:"cyan"|"amber"|"rose"|"emerald"}) {
  const tones={cyan:"border border-violet-400/20 bg-violet-400/10 text-violet-200",amber:"border border-amber-400/20 bg-amber-400/10 text-amber-200",rose:"border border-red-400/20 bg-red-400/10 text-red-200",emerald:"border border-emerald-400/20 bg-emerald-400/10 text-emerald-200"};
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
