import Link from "next/link";

const nav = [
  ["Genel bakış", "/ikinciel/partner-demo"], ["Yeni stok", "/ikinciel/partner-demo/stok/yeni"],
  ["Talepler", "/ikinciel/partner-demo/talepler"], ["Şubeler ve roller", "/ikinciel/partner-demo/erisim"],
  ["Üyelik ve faturalar", "/ikinciel/partner-demo/uyelik"], ["Analitik", "/ikinciel/partner-demo/analitik"],
  ["Audit geçmişi", "/ikinciel/partner-demo/audit"], ["Tüm demo modülleri", "/ikinciel/partner-demo/hazirlik"],
] as const;
const stock = [
  ["Demo C-HR · STK-1042", "Moderasyonda", "48.200 km", "1.575.000 ₺"],
  ["Demo Clio · STK-1038", "Yayında", "61.400 km", "1.080.000 ₺"],
  ["Demo Egea · STK-1029", "Bilgi bekliyor", "92.700 km", "995.000 ₺"],
] as const;

export function PartnerDashboardDemo() {
  return <main className="min-h-[calc(100vh-73px)] bg-[#eef0ec] p-3 sm:p-6">
    <div className="mx-auto max-w-[1500px] overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl shadow-stone-900/5">
      <div className="bg-amber-300 px-5 py-2 text-center text-xs font-black uppercase tracking-[.16em] text-amber-950">Sentetik panel demosu · gerçek firma, stok veya kullanıcı verisi içermez</div>
      <div className="grid min-h-[760px] lg:grid-cols-[260px_1fr]">
        <aside className="bg-emerald-950 p-6 text-white"><div className="text-xl font-black">partner.expiya.com</div><div className="mt-1 text-xs font-bold uppercase tracking-widest text-emerald-300">Hedef güvenlik alanı</div><div className="mt-9 rounded-2xl bg-white/10 p-4"><div className="text-xs text-emerald-200">Aktif tenant</div><div className="mt-1 font-black">Demo Marmara Mobilite</div><div className="mt-1 text-xs text-emerald-100">İstanbul Merkez</div></div><nav className="mt-7 space-y-1">{nav.map(([item,href],index) => <Link key={href} href={href} className={`block rounded-xl px-4 py-3 text-sm font-bold ${index === 0 ? "bg-white text-emerald-950" : "text-emerald-100 hover:bg-white/10"}`}>{item}</Link>)}</nav><div className="mt-10 border-t border-white/10 pt-5 text-xs leading-5 text-emerald-200">MFA · tenant izolasyonu · RBAC<br/>Bu demo authentication uygulamaz.</div></aside>
        <section className="min-w-0 p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold text-stone-500">1 Eylül 2026 · Firma yöneticisi görünümü</p><h1 className="mt-1 text-3xl font-black tracking-tight">Operasyon özeti</h1></div><Link href="/ikinciel" className="rounded-full border border-stone-300 px-4 py-2 text-sm font-bold">B2C yüzeyine dön</Link></div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Aktif stok","28","24 yayında"],["Açık talep","14","5 yeni"],["Ortalama yanıt","42 dk","Hedef: 60 dk"],["İhtiyaç eşleşmesi","%68","Son 30 gün"]].map(([label,value,note]) => <article key={label} className="rounded-2xl border border-stone-200 p-5"><p className="text-sm font-bold text-stone-500">{label}</p><p className="mt-3 text-3xl font-black">{value}</p><p className="mt-2 text-xs text-emerald-700">{note}</p></article>)}</div>
          <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_330px]">
            <div className="overflow-hidden rounded-2xl border border-stone-200"><div className="flex items-center justify-between border-b border-stone-200 px-5 py-4"><div><h2 className="font-black">Stok iş listesi</h2><p className="text-xs text-stone-500">Yayın ve moderasyon durumu</p></div><Link href="/ikinciel/partner-demo/stok/yeni" className="rounded-xl bg-emerald-900 px-4 py-2 text-sm font-black text-white">+ Araç ekle</Link></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500"><tr><th className="px-5 py-3">Araç</th><th className="px-5 py-3">Durum</th><th className="px-5 py-3">Kilometre</th><th className="px-5 py-3">Fiyat</th></tr></thead><tbody>{stock.map(([car,status,km,price]) => <tr key={car} className="border-t border-stone-100"><td className="px-5 py-4 font-bold">{car}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${status === "Yayında" ? "bg-emerald-100 text-emerald-900" : status === "Moderasyonda" ? "bg-sky-100 text-sky-900" : "bg-amber-100 text-amber-900"}`}>{status}</span></td><td className="px-5 py-4">{km}</td><td className="px-5 py-4 font-bold">{price}</td></tr>)}</tbody></table></div></div>
            <aside className="space-y-4"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="text-xs font-black uppercase tracking-wider text-amber-800">Yayın kapıları</p><h2 className="mt-2 text-xl font-black">1 adım bekliyor</h2><ul className="mt-4 space-y-3 text-sm"><li>✓ Firma doğrulaması</li><li>✓ Sözleşme</li><li>✓ Üyelik durumu</li><li className="font-bold text-amber-900">● Araç moderasyonu</li></ul></div><div className="rounded-2xl bg-stone-950 p-5 text-white"><p className="text-xs font-black uppercase tracking-wider text-stone-400">Tarafsızlık sınırı</p><p className="mt-3 text-sm leading-6 text-stone-200">Paket yükseltmek organik eşleştirme puanını değiştirmez. Sponsorlu alanlar ayrı ve etiketlidir.</p></div><div className="rounded-2xl border border-stone-200 p-5"><p className="text-xs font-black uppercase tracking-wider text-stone-500">Son audit olayı</p><p className="mt-2 font-bold">STK-1042 fiyat güncellendi</p><p className="mt-1 text-xs text-stone-500">Rol: Stok editörü · Demo kayıt</p></div></aside>
          </div>
        </section>
      </div>
    </div>
  </main>;
}
