import type { Metadata } from "next";
import Link from "next/link";
import { UpperSecretary } from "@/components/platform/UpperSecretary";

export const metadata: Metadata = {
  title: "Expiya — Karar Platformu",
  description: "Otomobil, ev yaşamı, seyahat ve eğitim gibi önemli seçimlerde karar vermenize yardımcı olan Expiya platformu.",
  alternates: { canonical: "/" },
};

const departments: readonly { readonly name: string; readonly href?: string; readonly tone: string }[] = [
  { name: "Otomobiller", href: "/cars", tone: "from-emerald-200 to-teal-100" },
  { name: "Elektronik", tone: "from-teal-200 to-cyan-100" },
  { name: "Ev aletleri", tone: "from-cyan-200 to-sky-100" },
  { name: "Oteller", tone: "from-sky-200 to-indigo-100" },
  { name: "Kurslar", tone: "from-indigo-200 to-violet-100" },
  { name: "Evler", tone: "from-violet-200 to-fuchsia-100" },
];

export default function PlatformHome() {
  return (
    <main className="min-h-screen bg-[#fafaf7] px-5 py-8 text-stone-950 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <p className="text-lg font-bold tracking-[0.2em]">EXPIYA</p>
          <p className="text-xs text-stone-500">Karar platformu</p>
        </header>
        <div className="py-16 sm:py-24"><UpperSecretary /></div>
        <nav aria-label="Departmanlar" className="overflow-x-auto pb-3">
          <div className="mx-auto flex w-max min-w-full justify-center gap-2">
            {departments.map((department) => department.href ? (
              <Link key={department.name} href={department.href} className={`rounded-full bg-gradient-to-r ${department.tone} px-5 py-3 text-sm font-semibold text-stone-900 transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700`}>{department.name}</Link>
            ) : (
              <span key={department.name} aria-label={`${department.name}, yakında`} className={`rounded-full bg-gradient-to-r ${department.tone} px-5 py-3 text-sm font-semibold text-stone-600 opacity-70`}>{department.name}</span>
            ))}
          </div>
        </nav>
      </div>
    </main>
  );
}
