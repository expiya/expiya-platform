import type { Metadata } from "next";
import Link from "next/link";

import { SALES_ADVISOR_DISCLOSURE, SALES_ADVISOR_DISCLOSURE_CHECKSUM } from "@/lib/legal/salesAdvisorDisclosure";

export const metadata: Metadata = {
  title: "Satış Danışmanı Bilgilendirmesi | Expiya Cars",
  description: "Expiya Cars Aşama 2 Satış Danışmanı'nın hizmet, veri, kaynak ve yönlendirme sınırları.",
};

const sections = [
  ["1. Hizmetin niteliği", SALES_ADVISOR_DISCLOSURE.serviceScope],
  ["2. Katalog ve kanıt kapsamı", SALES_ADVISOR_DISCLOSURE.catalogScope],
  ["3. Fiyat, stok ve teslimat", SALES_ADVISOR_DISCLOSURE.priceScope],
  ["4. Görsel, video ve üçüncü taraf bağlantıları", SALES_ADVISOR_DISCLOSURE.mediaScope],
  ["5. Sohbet bağlamı ve veri minimizasyonu", SALES_ADVISOR_DISCLOSURE.conversationScope],
  ["6. Yapay zekâ hizmet sağlayıcısı", SALES_ADVISOR_DISCLOSURE.aiScope],
  ["7. Aşama 3 yönlendirmeleri", SALES_ADVISOR_DISCLOSURE.phase3Scope],
  ["8. Pazarlama ve ileti izinleri", SALES_ADVISOR_DISCLOSURE.marketingScope],
] as const;

export default function SalesAdvisorDisclosurePage() {
  return <main className="min-h-screen bg-neutral-50 px-5 py-12 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50 sm:px-8">
    <article className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-10">
      <Link href="/analysis?pilot=v3.8" className="text-sm font-semibold underline underline-offset-4">← Karar görüşmesine dön</Link>
      <p className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">{SALES_ADVISOR_DISCLOSURE.version}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Satış Danışmanı Bilgilendirmesi</h1>
      <p className="mt-3 text-sm text-neutral-500">Yürürlük tarihi: 28 Ağustos 2026</p>
      <div className="mt-8 space-y-8 text-[15px] leading-7 text-neutral-700 dark:text-neutral-200">
        {sections.map(([title, copy]) => <section key={title}><h2 className="text-xl font-semibold text-neutral-950 dark:text-white">{title}</h2><p className="mt-2">{copy}</p></section>)}
        <section><h2 className="text-xl font-semibold text-neutral-950 dark:text-white">9. İlgili metinler ve başvuru</h2><p className="mt-2">Ayrıntılı kişisel veri işleme bilgileri <Link href="/gizlilik" className="font-semibold underline underline-offset-4">KVKK Aydınlatma Metni</Link>&apos;nde; araç önerisi ve katalog koşulları <Link href="/arac-oneri-kosullari" className="font-semibold underline underline-offset-4">Araç Önerisi ve Katalog Kullanım Koşulları</Link>&apos;nda yer alır. KVKK başvuruları <a href="mailto:iletisim@expiya.com" className="font-semibold underline underline-offset-4">iletisim@expiya.com</a> adresine iletilebilir.</p></section>
      </div>
      <p className="mt-10 break-all border-t border-neutral-200 pt-5 font-mono text-[10px] text-neutral-500 dark:border-neutral-800">Metin checksum: {SALES_ADVISOR_DISCLOSURE_CHECKSUM}</p>
    </article>
  </main>;
}
