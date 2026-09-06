import { StatusPill } from "@/components/used-cars/ops/OpsShell";

const facts=[["Vergi kimliği","•••••••381"],["İETTS","2 doğrulandı · 1 bekliyor"],["Ticaret sicili","Sentetik kaynak eşleşti"],["Atanan görev","APP-24091"]];

export default function DealerApplicationsPage(){return <div className="mx-auto max-w-7xl">
  <p className="ops-kicker text-sm">Kuyruk / APP-24091</p><h2 className="mt-1 text-3xl font-semibold">Firma başvurusu inceleme</h2>
  <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
    <section className="ops-panel rounded-2xl border p-6"><div className="flex justify-between"><div><h3 className="text-xl font-semibold">Marmara Mobilite A.Ş.</h3><p className="ops-muted mt-1 text-sm">Sentetik tenant adayı · İstanbul / 3 şube</p></div><StatusPill tone="amber">Belge inceleme</StatusPill></div>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">{facts.map(([key,value])=><div key={key} className="ops-panel-raised rounded-xl border p-4"><dt className="ops-muted text-xs">{key}</dt><dd className="mt-1 text-sm">{value}</dd></div>)}</dl>
      <div className="ops-divider mt-6 rounded-xl border p-4"><h4 className="font-medium">Evidence kontrol listesi</h4><ul className="mt-3 space-y-2 text-sm text-zinc-300"><li>✓ Yetkili imza belgesi · maskeli önizleme</li><li>✓ Vergi levhası · amaç: firma doğrulama</li><li>! Kadıköy şubesi İETTS sonucu bekliyor</li></ul></div>
    </section>
    <aside className="ops-panel rounded-2xl border p-6"><h3 className="font-semibold">Karar alanı</h3><p className="ops-muted mt-2 text-sm">Nihai onay ikinci reviewer gerektirir. Actor kendi önerisini onaylayamaz.</p><label className="ops-muted mt-5 block text-xs">Gerekçe kodu</label><select disabled className="ops-input mt-2 w-full rounded-lg border p-3 text-sm"><option>IETTS_BRANCH_PENDING</option></select><div className="mt-4 grid gap-2"><button disabled className="ops-button-primary rounded-lg p-3 font-semibold">Onaya öner</button><button disabled className="ops-button-secondary rounded-lg p-3">Ek belge iste</button><button disabled className="ops-button-danger rounded-lg p-3">Gerekçeli reddet</button></div></aside>
  </div>
</div>}
