import type { Metadata } from "next";
import Link from "next/link";

import { RECOMMENDATION_TERMS_VERSION } from "@/lib/legal/recommendationTerms";

export const metadata: Metadata = {
  title: "Araç Önerisi ve Katalog Kullanım Koşulları | Expiya Cars",
  description: "Expiya Cars araç önerilerinin, katalog verilerinin ve karar desteğinin kapsamı.",
};

export default function RecommendationTermsPage() {
  return (
    <main className="min-h-screen bg-white px-5 py-12 text-neutral-950 sm:px-8">
      <article className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-10">
        <Link href="/analysis" className="text-sm font-semibold underline underline-offset-4">← Görüşmeye dön</Link>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">{RECOMMENDATION_TERMS_VERSION}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Araç Önerisi ve Katalog Kullanım Koşulları</h1>

        <div className="mt-8 space-y-8 text-[15px] leading-7 text-neutral-700 dark:text-neutral-200">
          <section>
            <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">1. Taraflar ve kapsam</h2>
            <p className="mt-2">Bu koşullar, Expiya Cars hizmetini sunan <strong>SKYBIT YAZILIM VE BİLGİ TEKNOLOJİLERİ DANIŞMANLIĞI LİMİTED ŞİRKETİ</strong> (“SKYBIT”) ile araç önerisini görüntülemeyi seçen kullanıcı arasındadır.</p>
            <dl className="mt-4 grid gap-2 rounded-2xl bg-neutral-100 p-4 text-sm dark:bg-neutral-800 sm:grid-cols-[11rem_1fr]">
              <dt className="font-semibold">Merkez adresi</dt><dd>Fenerbahçe Mah. İğrip Sk. No: 13 İç Kapı No: 1 Kadıköy / İstanbul</dd>
              <dt className="font-semibold">MERSİS numarası</dt><dd>0772162890400001</dd>
              <dt className="font-semibold">Ticaret sicil numarası</dt><dd>483626-5</dd>
              <dt className="font-semibold">Ticaret sicil müdürlüğü</dt><dd>[DOLDURULACAK]</dd>
              <dt className="font-semibold">Vergi dairesi / numarası</dt><dd>Göztepe / 7721628904</dd>
              <dt className="font-semibold">E-posta</dt><dd><a className="underline underline-offset-4" href="mailto:iletisim@expiya.com">iletisim@expiya.com</a></dd>
              <dt className="font-semibold">Telefon / KEP</dt><dd>[DOLDURULACAK]</dd>
            </dl>
            <p className="mt-2">Koşullar yalnızca araç kartının görüntülenmesi, katalog bilgilerinin sunulması ve yapay zekâ destekli karar desteğinin kullanılması hakkındadır. KVKK aydınlatması, açık rıza, çerez tercihleri veya ticari elektronik ileti izni yerine geçmez.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">2. Hizmetin niteliği</h2>
            <p className="mt-2">Expiya Cars; kullanıcının kendi beyan ettiği ihtiyaç, kullanım biçimi, bütçe ve tercihleri, mevcut katalogdaki doğrulanabilir alanlarla karşılaştıran bir karar destek hizmetidir. Sistem, kullanıcı ifadelerini anlamlandırmak için yapay zekâdan; uygunluk koşulları, filtreleme ve sıralama için yazılım kuralları ve katalog kanıtlarından yararlanabilir.</p>
            <p className="mt-2">Çıktı; satış teklifi, bağlayıcı tavsiye, garanti, ekspertiz, mekanik inceleme, değerleme, sigorta veya finansal danışmanlık değildir. SKYBIT ve Expiya Cars satıcı, bayi, distribütör, üretici, ekspertiz kuruluşu, sigorta şirketi veya finans kuruluşu değildir. Nihai inceleme, satıcıyla görüşme, bağımsız ekspertiz ve satın alma kararı kullanıcıya aittir.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">3. Kaynaklar, fiyatlar ve katalog zamanı</h2>
            <p className="mt-2">Katalog; üretici, distribütör veya marka tarafından yayımlanan resmî internet sayfaları, fiyat listeleri, broşürler ve diğer kamuya açık, kaynağı kayıt altına alınabilen içeriklerden derlenebilir. Her kayıt için kaynak, erişim veya geçerlilik zamanı tutulması hedeflenir. Bununla birlikte bir bilginin kamuya açık olması, içeriğin her zaman güncel, eksiksiz veya hatasız olduğunu göstermez.</p>
            <p className="mt-2">Gösterilen fiyatlar varsa kaynağın belirli bir tarihteki liste veya kampanya bilgisidir. Vergi, tescil, teslim, opsiyon, stok, kampanya koşulu, bayi uygulaması ve sonradan gerçekleşen değişiklikler nedeniyle güncel satış fiyatından farklı olabilir. Güncel ve bağlayıcı bilgi yalnız ilgili üretici, distribütör veya yetkili satıcıdan alınabilir.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">4. Ticari bağımsızlık ve sponsorlu içerik</h2>
            <p className="mt-2">Bu sürümün yayın tarihi itibarıyla katalogda bulunmak veya öneri sonucunda görünmek için markalardan ücret alınmamakta; sonuçların sırası sponsorluk, reklam, bayi anlaşması, lead bedeli veya komisyonla etkilenmemektedir. Katalogda yer almak veya sonuçta görünmek marka onayı anlamına gelmez. SKYBIT karar motorunun genel, önceden tanımlı teknik kurallarını ve katalog yönetişimini belirler; ancak organik bir sonuca belirli marka, model, bayi, distribütör, sponsor veya başka üçüncü kişi lehine ticari ya da manuel müdahalede bulunulmaz.</p>
            <p className="mt-2">İleride ticari ilişki, sponsorluk veya lead yönlendirmesi bir sonucun sunuluşunu etkilerse bu ilişki, ilgili sonuçta “Reklam”, “Sponsorlu” veya eşdeğer açık bir ibareyle açıklanır; organik karar desteğiyle karıştırılmaz.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">5. Hata, eksiklik ve güncelleme</h2>
            <p className="mt-2">SKYBIT, mesleki özen kapsamında kaynak, tarih ve tutarlılık kontrolleri uygulamayı hedefler; ancak üçüncü kişilerce yayımlanan kaynakların doğruluğunu, katalog bilgilerinin kesintisiz güncelliğini, belirli bir aracın stok veya satış durumunu garanti etmez. Kullanıcı, satın alma kararından önce önemli özellikleri ve fiyatı yetkili satıcıdan doğrulamalıdır.</p>
            <p className="mt-2">Marka, üretici, distribütör ve yetkili bayi temsilcileri; yetkilerini gösteren bilgiyle birlikte kendilerine ilişkin katalog kaydının kaynağını, kayıt zamanını ve geçerli sürümünü <a className="font-semibold underline underline-offset-4" href="mailto:iletisim@expiya.com">iletisim@expiya.com</a> üzerinden isteyebilir; hata veya eksiklik bildirebilir.</p>
            <p className="mt-2">Başvurunun alındığı üç iş günü içinde bildirilir ve ilk inceleme üç iş günü içinde hedeflenir. Kritik olduğu doğrulanan hata için ilgili kaydın beş iş günü içinde geçici olarak kaldırılması; doğrulanmış düzeltmenin veya gerekçeli nihai cevabın yedi iş günü içinde tamamlanması hedeflenir. Bu süreler kanuni kesin süre veya sonuç garantisi değil, operasyonel hizmet hedefidir. Başvuru kayda alınır, başvuranın yetkisi ve sunduğu kaynak doğrulanır; haklı bulunan düzeltme sürümlenerek yayımlanır.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">6. Açıklanabilirlik ve kayıtlar</h2>
            <p className="mt-2">Kullanıcı, kendisine gösterilen sonucun başlıca gerekçelerini arayüzde görebilir. Mevcut teknik ve ticari sır sınırları, güvenlik önlemleri ve üçüncü kişi hakları saklı kalmak üzere; kullanılan kullanıcı tercihleri, uygulanan temel filtreler, katalog sürümü ve kaynak zamanları hakkında ayrıntılı bilgi <a className="font-semibold underline underline-offset-4" href="mailto:iletisim@expiya.com">iletisim@expiya.com</a> üzerinden talep edilebilir. Bu hak, kaynak kodun, güvenlik mekanizmalarının, model ağırlıklarının veya ticari sırların açıklanmasını kapsamaz.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">7. Marka ve üçüncü taraf hakları</h2>
            <p className="mt-2">Marka, model ve işletme adları hak sahiplerini tanımlamak ve kaynak göstermek amacıyla kullanılır. Bu kullanım tek başına lisans, ortaklık, temsil, onay veya sponsorluk ilişkisi oluşturmaz. Üçüncü taraf sayfalara bağlantılar, ilgili sayfanın içeriğinin SKYBIT tarafından benimsendiği anlamına gelmez.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">8. Satıcıya karşı hak ve işlemler</h2>
            <p className="mt-2">Expiya Cars çıktısı, bir satıcı veya üretici adına yapılmış beyan, taahhüt, garanti, rezervasyon ya da satış teklifi değildir. Kullanıcı yalnızca Expiya Cars çıktısına dayanarak üçüncü bir satıcıdan belirli fiyat, stok, donanım, teslim veya kampanya talep edemez. Bununla birlikte bu hüküm, kullanıcının satıcıya, sağlayıcıya veya diğer sorumlulara karşı kanundan, ayrı bir sözleşmeden ya da onların kendi reklam ve beyanlarından doğan haklarını ortadan kaldırmaz.</p>
            <p className="mt-2">Bu sürümün yayın tarihi itibarıyla araç önerisi akışı yalnız sıfır araç kataloğunu değerlendirir; bu akışta kullanıcıdan telefon, e-posta veya konum bilgisi istenmez, satıcılara kullanıcı verisi ya da lead aktarılmaz, pazarlama iletişimi gönderilmez ve kullanıcıdan ücret alınmaz. Kullanıcının başvuru adresine kendi isteğiyle e-posta göndermesi hâlindeki veri işleme, ilgili faaliyet aydınlatmasına tabidir.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">9. Sorumluluğun sınırı</h2>
            <p className="mt-2">Emredici mevzuatın izin verdiği ölçüde SKYBIT; kullanıcı veya üçüncü kişi kaynaklı yanlış beyanlardan, kaynağın sonradan değişmesinden, geçici hizmet kesintilerinden ve kullanıcının doğrulama yapmaksızın aldığı kararlardan doğan dolaylı zararlardan sorumlu tutulamaz. SKYBIT’in kastı veya ağır kusuru, kişisel veri güvenliği yükümlülükleri, haksız şart yasağı ve tüketicinin emredici hakları bu sınırlamanın dışındadır.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">10. Kişisel veriler ve sohbet</h2>
            <p className="mt-2">Sohbet, Expiya’nın kalıcı kullanıcı hesabı veya kalıcı konuşma veritabanına kaydedilmez; mevcut görüşme aynı tarayıcı sekmesindeki oturum depolamasında tutulur ve “Görüşmeyi sil” işlemiyle ya da tarayıcı sekmesi kapandığında bu kopya kaldırılır. Ancak mesajlar hizmetin çalışması için SKYBIT sunucularına ve yapay zekâ hizmet sağlayıcısı OpenAI’ye iletilir; sağlayıcıların güvenlik kayıtları ve yasal saklama süreleri uygulanabilir. Ayrıntılar ayrı KVKK Aydınlatma Metni ve Gizlilik Politikası’nda açıklanmalıdır: <strong>[DOLDURULACAK BAĞLANTI]</strong>.</p>
            <p className="mt-2">Kullanıcı sohbet alanına telefon, e-posta, kimlik numarası, sağlık bilgisi veya başka özel nitelikli ya da gereksiz kişisel veri yazmamalıdır.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">11. Kabul, değişiklik ve uygulanacak hukuk</h2>
            <p className="mt-2">Kullanıcı, boş ve önceden işaretlenmemiş kutuyu kendi iradesiyle işaretleyip “Koşulları kabul et ve aracı göster” düğmesine basarak bu sürümü kabul eder. Kabul edilmemesi sohbeti sürdürmeyi engellemez; yalnız araç kartı gösterilmez. Kabul zamanı ve metin sürümü aynı sekmedeki görüşme kaydına eklenir. Sunucu tarafında kalıcı ispat kaydı ayrıca devreye alınmadıkça bu kayıt tek başına değiştirilemez nitelikte bir delil değildir.</p>
            <p className="mt-2">Esaslı değişiklikler yeni sürüm olarak yayımlanır ve sonraki araç kartı gösteriminden önce yeniden kabul istenir. Türkiye Cumhuriyeti hukuku uygulanır; tüketicinin yerleşim yerindeki yetkili tüketici hakem heyeti veya tüketici mahkemesine başvurma dâhil emredici yetki kuralları saklıdır.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
