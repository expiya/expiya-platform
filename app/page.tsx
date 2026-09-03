import type { Metadata } from "next";
import Link from "next/link";
import { UpperSecretary } from "@/components/platform/UpperSecretary";

export const metadata: Metadata = {
  title: "Expiya — Bireysel Satın Alma Platformu",
  description: "Expiya, ihtiyaçlarınızı anlayan, seçenekleri güvenilir verilerle karşılaştıran ve size gerekçeli satın alma kararları sunan bireysel satın alma platformudur.",
  alternates: { canonical: "/" },
};

const departments: readonly { readonly name: string; readonly href?: string; readonly tone: string }[] = [
  { name: "Otomobil", href: "/cars", tone: "from-black to-neutral-600" },
  { name: "Elektronik", tone: "from-neutral-950 to-neutral-500" },
  { name: "Ev aletleri", tone: "from-neutral-900 to-neutral-400" },
  { name: "Otel", tone: "from-neutral-800 to-neutral-400" },
  { name: "Kurs", tone: "from-neutral-700 to-neutral-300" },
  { name: "Konut", tone: "from-neutral-600 to-neutral-300" },
];

export default function PlatformHome() {
  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-7 text-neutral-950 sm:px-8 sm:py-9">
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-7xl flex-col sm:min-h-[calc(100vh-4.5rem)]">
        <header className="flex items-center justify-between">
          <p className="text-lg font-bold tracking-[0.2em]">EXPIYA</p>
          <p className="text-xs font-medium uppercase tracking-[.15em] text-neutral-500">Bireysel satın alma platformu</p>
        </header>
        <div className="flex flex-1 items-center py-14 sm:py-20"><UpperSecretary /></div>
        <nav aria-label="Satın alma departmanları" className="overflow-x-auto pb-5 pt-4">
          <div className="mx-auto flex w-max min-w-full items-baseline justify-center gap-x-3 sm:gap-x-4">
            {departments.map((department) => department.href ? (
              <Link key={department.name} href={department.href} className={`whitespace-nowrap bg-gradient-to-r ${department.tone} bg-clip-text text-[clamp(1.2rem,1.65vw,1.55rem)] font-black uppercase tracking-[-.04em] text-transparent transition hover:opacity-55 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-900`}>{department.name}</Link>
            ) : (
              <span key={department.name} aria-label={`${department.name}, yakında`} className={`whitespace-nowrap bg-gradient-to-r ${department.tone} bg-clip-text text-[clamp(1.2rem,1.65vw,1.55rem)] font-black uppercase tracking-[-.04em] text-transparent`}>{department.name}</span>
            ))}
          </div>
        </nav>
      </div>
    </main>
  );
}
