import { draftMembershipOffers, type DraftPlanCapability } from "@/features/used-cars/memberships/draftOffers";
import { PartnerDemoNav } from "./PartnerDemoNav";

const capabilityLabels: Readonly<Record<DraftPlanCapability, string>> = {
  DETAILED_LISTING_SHARING: "Detaylı ilan bilgisi paylaşımı",
  SELLER_PROFILE_VISIBLE: "Doğrulanmış satıcı bilgilerini gösterme",
  CONSENTED_LEAD_DETAILS: "İzin veren kullanıcıların iletişim bilgileri",
  LIVE_CHAT: "Kullanıcıyla anlık görüşme",
  VIDEO_DEMO: "Canlı görüntülü araç demosu",
  WEEKLY_MARKET_ANALYSIS: "Expiya Cars haftalık talep analizi",
  SPONSORED_PLACEMENTS: "Ayrı ve etiketli sponsorlu yerleşimler",
  AI_ASSISTED_RESPONSES: "Kontrollü yapay zekâ yanıt asistanı",
};

const formatTry = (minor: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(minor / 100);

export function MembershipDemo() {
  return <main className="min-h-[calc(100vh-73px)] bg-[#f3f3ef]"><PartnerDemoNav active="/ikinciel/partner-demo/uyelik"/><div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-sm font-black uppercase tracking-widest text-emerald-700">Taslak paketler · v0.1</p><h1 className="mt-2 text-4xl font-black tracking-tight">İhtiyacınız kadar kapasite</h1><p className="mt-3 max-w-3xl text-stone-600">Dört paket için önerilen lansman fiyatlarıdır. Yıllık ödemede %20 indirim uygulanır; fiyat ve içerikler pilot öğrenimleriyle değiştirilecektir.</p></div><div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">Taslak · Satın alma kapalı</div></div>
    <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{draftMembershipOffers.map(plan => <article key={plan.code} className={`flex flex-col rounded-3xl border bg-white p-6 ${plan.code === "STANDARD" ? "border-emerald-700 ring-4 ring-emerald-100" : "border-stone-200"}`}><div className="flex items-center justify-between gap-2"><span className="text-xs font-black uppercase tracking-widest text-stone-500">{plan.code}</span>{plan.code === "STANDARD" && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900">Önerilen</span>}</div><h2 className="mt-4 text-2xl font-black">{plan.name}</h2><p className="mt-2 min-h-12 text-sm text-stone-600">{plan.audience}</p><div className="mt-6"><p className="text-3xl font-black">{formatTry(plan.monthlyPriceMinor)}<span className="text-sm font-medium text-stone-500"> / ay</span></p><p className="mt-2 text-sm font-bold text-emerald-800">{formatTry(plan.yearlyPriceMinor)} / yıl</p><p className="mt-1 text-xs text-stone-500">Aylık karşılığı {formatTry(plan.yearlyPriceMinor / 12)} · %20 avantaj</p></div><ul className="mt-6 flex-1 space-y-3 text-sm"><li className="font-black">✓ {plan.activeListingLimit} aktif ilan</li>{plan.capabilities.map(capability => <li key={capability}>✓ {capabilityLabels[capability]}</li>)}</ul><button type="button" disabled className="mt-7 w-full cursor-not-allowed rounded-xl border border-stone-300 bg-stone-100 px-4 py-3 font-black text-stone-500">Kredi kartıyla seç · Yakında</button></article>)}</div>
    <div className="mt-7 grid gap-4 lg:grid-cols-3"><div className="rounded-3xl bg-white p-6 ring-1 ring-stone-200"><p className="text-xs font-black uppercase tracking-widest text-emerald-700">KVKK sınırı</p><h2 className="mt-2 text-xl font-black">Lead paylaşımı izinlidir</h2><p className="mt-3 text-sm leading-6 text-stone-600">Standart ve üzeri paketlerde kullanıcı bilgileri yalnız açık amaç, aydınlatma ve geçerli iletişim izni kapsamında satıcıya aktarılır.</p></div><div className="rounded-3xl bg-emerald-950 p-6 text-white"><p className="text-xs font-black uppercase tracking-widest text-emerald-300">Organik sonuç sözleşmesi</p><h2 className="mt-2 text-xl font-black">Ücret sıralama satın almaz</h2><p className="mt-3 text-sm leading-6 text-emerald-100">Plan, fiyat ve ödeme bilgileri organik eşleştirme girdisi değildir. Gold sponsorluğu ayrı akışta ve “Sponsorlu” etiketiyle gösterilir.</p></div><div className="rounded-3xl bg-stone-950 p-6 text-white"><p className="text-xs font-black uppercase tracking-widest text-amber-300">Ödeme sınırı</p><h2 className="mt-2 text-xl font-black">Kart tahsilatı kapalı</h2><p className="mt-3 text-sm leading-6 text-stone-300">Tutarlar KDV hariç taslak öneridir. PSP, 3D Secure, sözleşme ve faturalama onaylanmadan gerçek checkout veya abonelik oluşturulmaz.</p></div></div>
  </div></main>;
}
