import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gizlilik ve KVKK Aydınlatma Metni | Expiya",
  description: "Expiya Cars kişisel veri işleme, saklama, aktarım ve başvuru bilgileri.",
};

const sectionClass = "mt-10 space-y-4";
const headingClass = "text-2xl font-bold tracking-tight";
const listClass = "list-disc space-y-2 pl-6 text-neutral-700 dark:text-neutral-300";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-5 py-10 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-neutral-600 underline underline-offset-4 hover:text-black dark:text-neutral-300 dark:hover:text-white">
          ← Expiya Cars&apos;a dön
        </Link>

        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
          Gizlilik ve veri kullanımı
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">KVKK Aydınlatma Metni</h1>
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">Sürüm: PRIV-2026.08-v1.1 · Son güncelleme: 28 Ağustos 2026</p>

        <section className={sectionClass}>
          <h2 className={headingClass}>1. Veri sorumlusu</h2>
          <p className="text-neutral-700 dark:text-neutral-300">
            6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) kapsamında veri sorumlusu
            <strong> SKYBIT YAZILIM VE BİLGİ TEKNOLOJİLERİ DANIŞMANLIĞI LİMİTED ŞİRKETİ</strong>&apos;dir.
            Merkezi Fenerbahçe Mah. İğrip Sk. No: 13 İç Kapı No: 1 Kadıköy / İstanbul olan şirketin MERSİS numarası 0772162890400001&apos;dir. KVKK başvuruları için <a className="font-semibold underline underline-offset-4" href="mailto:serdar@expiya.com">serdar@expiya.com</a> adresi kullanılabilir.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass}>2. İşlenen veri kategorileri</h2>
          <ul className={listClass}>
            <li>Araç ihtiyacınızı anlatırken yazdığınız mesajlar, tercihler, bütçe ve kullanım bilgileri.</li>
            <li>İncelenmesini istediğiniz ilan bağlantısı, ilandan okunan metin ve karşılaştırma için gönderilen kullanıcı bağlamı.</li>
            <li>Rastgele oluşturulan görüşme kimliği, istek zamanı, yanıt durumu ve kötüye kullanım önleme sayaçları.</li>
            <li>IP adresi ve benzeri bağlantı verileri; altyapı sağlayıcıları tarafından güvenlik ve hizmet sunumu için işlenebilir. Uygulama içi oran sınırlamada IP adresinin kısaltılmış SHA-256 özeti kullanılır.</li>
            <li>Hata teşhisi sırasında sayfa yolu, uygulama sürümü, tarayıcı/çalışma zamanı bilgileri ve hata yığını. Sentry&apos;de ham IP saklama kapalıdır; buna rağmen sağlayıcı bağlantı verisinden yaklaşık şehir ve ülke türetebilir.</li>
            <li>Aşama 2 Satış Danışmanı&apos;nda yazdığınız soru ile aynı görüşmeye ait son 12 kısa kullanıcı/danışman mesajı; conversation, offer ve exact varyant kimlikleriyle sınırlı olarak.</li>
          </ul>
          <p className="text-neutral-700 dark:text-neutral-300">
            Mesajlarınıza kimlik, iletişim, sağlık, finans veya başka hassas bilgiler yazmamanızı öneririz. Expiya Cars araç kararı için bu bilgilere ihtiyaç duymaz.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass}>3. İşleme amaçları ve hukuki sebepler</h2>
          <ul className={listClass}>
            <li>Araç seçeneklerini değerlendirmek, sorulara yanıt vermek ve ilan içeriğini talebiniz doğrultusunda analiz etmek.</li>
            <li>Hizmeti çalıştırmak, hataları gidermek, kapasiteyi yönetmek ve güvenliği sağlamak.</li>
            <li>Otomatik istek, maliyet istismarı, yetkisiz erişim ve diğer kötüye kullanım girişimlerini önlemek.</li>
            <li>Aşama 1&apos;de açılmış exact varyant hakkında kanıtla sınırlı yanıt üretmek ve takip sorusunun aynı araç görüşmesindeki anlamını korumak. Bu veriler pazarlama profili, retargeting, lead scoring, filtreleme veya sıralama amacıyla kullanılmaz.</li>
          </ul>
          <p className="text-neutral-700 dark:text-neutral-300">
            Bu işlemler, talep ettiğiniz hizmetin sunulmasıyla doğrudan ilgili olduğu ölçüde KVKK madde 5/2(c) ve hizmetin güvenli biçimde işletilmesine ilişkin meşru menfaatler kapsamında KVKK madde 5/2(f) esaslarına dayanır. Açık rıza gerektiren ayrı bir işleme faaliyeti ortaya çıkarsa ayrıca ve belirli bir onay istenir.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass}>4. Alıcılar ve yurt dışı aktarım</h2>
          <p className="text-neutral-700 dark:text-neutral-300">
            Hizmetin sunulması için veriler, görevleriyle sınırlı olarak aşağıdaki altyapı sağlayıcıları tarafından işlenebilir:
          </p>
          <ul className={listClass}>
            <li><strong>OpenAI:</strong> Yapay zekâ destekli model yanıtı veya soru anlamlandırma. Aşama 2 soru anlamlandırma aktarımı, KVKK madde 9 kapsamındaki geçerli mekanizma operasyonel olarak doğrulanıp ayrıca etkinleştirilmedikçe kapalıdır.</li>
            <li><strong>Vercel:</strong> uygulamanın barındırılması ve çalışma zamanı altyapısı.</li>
            <li><strong>Cloudflare:</strong> trafik iletimi, DDoS ve bot koruması.</li>
            <li><strong>Upstash:</strong> IP adresinden türetilmiş özet anahtarlarla dağıtık oran sınırlama sayaçları.</li>
            <li><strong>Sentry:</strong> hata izleme ve güvenlik alarmı; EU veri bölgesi kullanılmasına rağmen hizmet yurt dışı aktarım niteliği taşıyabilir.</li>
          </ul>
          <p className="text-neutral-700 dark:text-neutral-300">
            Bu sağlayıcıların altyapıları yurt dışında bulunabilir. Aktarımlar KVKK madde 9 kapsamındaki geçerli aktarım mekanizmaları ve gerekli teknik/idari tedbirler gözetilerek yürütülmelidir.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass}>5. Saklama ve silme</h2>
          <ul className={listClass}>
            <li>Standart sohbet ve karar geçmişi aynı sekmenin <code>sessionStorage</code> alanında tutulur; sekme kapandığında tarayıcı tarafından kaldırılır.</li>
            <li>Kimlik doğrulanmış pilot programında kullanıcı adı, transcript, karar anlık görüntüsü, tur sayıları ve tamamlanma zamanı test analizi amacıyla sunucuda saklanır.</li>
            <li>Standart kullanımda “Görüşmeyi sil” tarayıcıdaki veriyi kaldırır. Pilot kullanımında aynı işlem önce tamamlanmış görüşme arşivini oluşturur; kayıt başarılı olmadan yerel kopya silinmez.</li>
            <li>Oran sınırlama anahtarları mesaj içeriği taşımaz ve ilgili güvenlik penceresi dolduğunda otomatik silinir; mevcut en uzun pencere bir saattir.</li>
            <li>OpenAI Responses çağrıları <code>store=false</code> ile gönderilir ve model geliştirme amaçlı veri paylaşımı kapalıdır. OpenAI, kötüye kullanım izleme kayıtlarını kendi geçerli politikası kapsamında varsayılan olarak 30 güne kadar tutabilir.</li>
            <li>Sentry hata kayıtları için operasyonel üst sınır 90 gün kabul edilir; sağlayıcının yürürlükteki sözleşmesi veya proje planı daha kısa bir süre belirleyebilir. Silme gerektiğinde ilgili hata kaydının bağlı olduğu issue bütünüyle silinir.</li>
            <li>Uygulama ham sohbet metnini kendi güvenlik loglarına yazmaz. Altyapı sağlayıcılarının zorunlu teknik ve güvenlik kayıtları kendi sözleşme, plan ve saklama ayarlarına tabidir.</li>
            <li>Aşama 2&apos;de son 12 kısa mesaj yalnız geçici sunucu belleğinde, aynı conversation + offer + exact varyant anahtarında tutulur; imzalı Aşama 2 handoff süresi dolduğunda erişime kapanır ve temizlenir. İstek tekrarını güvenli yönetmek için soru ve yanıtın geçici idempotency kopyası en fazla bir saat tutulabilir. Bu geçmiş kalıcı profile aktarılmaz.</li>
          </ul>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass}>6. Çerezler ve tarayıcı depolaması</h2>
          <p className="text-neutral-700 dark:text-neutral-300">
            Expiya reklam veya davranışsal analiz çerezi kullanmaz. Görüşme devamlılığı için yalnızca sekme kapsamındaki tarayıcı depolaması kullanılır. Cloudflare gibi güvenlik sağlayıcıları, saldırı veya bot kontrolü sırasında zorunlu güvenlik çerezleri yerleştirebilir.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass}>7. KVKK kapsamındaki haklarınız</h2>
          <p className="text-neutral-700 dark:text-neutral-300">KVKK madde 11 kapsamında özetle:</p>
          <ul className={listClass}>
            <li>Kişisel verinizin işlenip işlenmediğini öğrenme ve işlenmişse bilgi isteme,</li>
            <li>İşleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme,</li>
            <li>Yurt içinde veya yurt dışında verinin aktarıldığı üçüncü kişileri bilme,</li>
            <li>Eksik veya yanlış işlenen verinin düzeltilmesini isteme,</li>
            <li>Şartları oluştuğunda silme veya yok etme ve bu işlemlerin aktarılan üçüncü kişilere bildirilmesini isteme,</li>
            <li>Otomatik analiz sonucuna itiraz etme ve kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme haklarına sahipsiniz.</li>
          </ul>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass}>8. Başvuru yöntemi</h2>
          <p className="text-neutral-700 dark:text-neutral-300">
            Başvurunuzu <a className="font-semibold underline underline-offset-4" href="mailto:serdar@expiya.com">serdar@expiya.com</a> adresine iletebilirsiniz. Başvurunuzda talebinizi açıkça belirtmeniz ve kimliğinizi doğrulamaya yetecek bilgileri paylaşmanız istenir; gereğinden fazla kişisel veri göndermeyin. Başvurular niteliklerine göre en kısa sürede ve en geç 30 gün içinde sonuçlandırılır. Kimlik doğrulanamayan veya başkasının verisine erişim riski doğuran taleplerde ek doğrulama istenebilir. KEP adresi ve alternatif yazılı başvuru kanalı henüz belirlenmemiştir.
          </p>
        </section>
      </article>
    </main>
  );
}
