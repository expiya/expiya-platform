# Expiya İkinci El — EİDS-bağımsız iç hukuk ve KVKK hazırlık paketi v0.1

Durum: `INTERNAL_PREPARATION_COMPLETE / PRODUCTION_NO-GO`  
Tarih: 2 Eylül 2026  
Sahip: SKYBIT  
İletişim: `iletisim@expiya.com`

Bu belge hukuk bürosu görüşü veya üretim yetkisi değildir. EİDS başvurusu sonuçlanıncaya ve gerçek sağlayıcı/iş ortağı bilgileri kesinleşinceye kadar ikinci el yüzeyinde yalnız sentetik demo kullanılabilir. Belgedeki kontrollü taslak kararlar, iç ürün ve teknik hazırlığın ilerlemesini sağlar; gerçek kişisel veri işleme, ilan yayını, lead aktarımı, ticari ileti, ödeme, video veya AI sağlayıcı aktarımını açmaz.

## 1. Sabit şirket ve kanal bilgileri

- Veri sorumlusu/hizmet sağlayıcı adayı: SKYBIT YAZILIM VE BİLGİ TEKNOLOJİLERİ DANIŞMANLIĞI LİMİTED ŞİRKETİ
- MERSİS: 0772162890400001
- Ticaret sicil no: 483626-5
- Vergi dairesi/no: Göztepe / 7721628904
- Merkez: Fenerbahçe Mah. İğrip Sk. No: 13 İç Kapı No: 1 Kadıköy / İstanbul
- Genel iletişim, KVKK başvurusu, katalog düzeltme, karar açıklama ve hukuki bildirim: `iletisim@expiya.com`
- Eksik ve üretim öncesi tamamlanacak: ticaret sicil müdürlüğü, telefon, KEP, KVKK sorumlu birimi/vekili, veri ihlali sorumlusu ve yedekleri, VERBİS durum kararı.

## 2. Ayrıştırılmış kullanıcı işlemleri

| İşlem | Aydınlatma | Açık rıza / izin | Sözleşme | Mevcut karar |
|---|---|---|---|---|
| Sentetik ilanları görüntüleme | Katmanlı genel aydınlatma | Gerekmez | B2C kullanım koşulları; zorunlu checkbox yapılmaz | Hazırlanabilir |
| Zorunlu session/güvenlik kaydı | İşlem öncesi aydınlatma | Kural olarak rıza dışı sebep değerlendirilir | Kullanım koşullarından bağımsız hukuki sebep kaydı | Sağlayıcı/süre kesinleşmeden production kapalı |
| Tercih ve ihtiyaç eşleştirme | Amaç, veri ve otomatik değerlendirme açıkça anlatılır | Temel hizmet için gerçekten gerekli veri rızaya zorlanmaz | Hizmet talebi sınırı | Hesapsız, current-session minimizasyonu varsayılanı |
| İletişim bilgisinin seçili galeriye aktarılması | Alıcı galeri aktarım öncesi isimle gösterilir | Araç/galeri özelinde ayrı aktif seçim; pazarlama izni değildir | Lead hizmet talebi | Gerçek galeri ve rol kararı olmadan kapalı |
| Ticari elektronik ileti | Ayrı aydınlatma | Kanal ve gönderen bazlı ayrı ticari ileti onayı; İYS süreci ayrıca | Lead veya üyelik kabulüne bağlanmaz | MVP'de kapalı |
| Analitik çerez/SDK | Çerez adı, amaç, taraf, süre ve aktarım | Gerekli değilse kategori bazlı opt-in | Kullanım koşullarına bağlanmaz | Sağlayıcı yoksa politika envanterine eklenmez |
| Video kaydı | Oturum öncesi görünür kayıt bildirimi | Kayıt varsa ayrı seçim ve kayıt göstergesi | İletişim talebinden ayrılır | Varsayılan kayıt yok; kabiliyet kapalı |
| AI sohbetinin anlık işlenmesi | Model sağlayıcı, amaç, veri minimizasyonu ve aktarım anlatılır | Hukuki sebep/aktarım mekanizması faaliyet bazında belirlenir | Hizmet şartı ile açık rıza birleştirilmez | Sağlayıcı/bölge/DPA kesinleşmeden gerçek veri kapalı |
| Sohbetin ürün geliştirme/self-learning için saklanması | Ayrı amaç ve retention açıklanır | Temel hizmetten ayrı, özgür ve geri çekilebilir seçim tasarlanır; kesin hukuki nitelendirme dış hukuk incelemesine tabidir | Temel hizmet koşulu yapılamaz | En az 1000 gerçek conversation hedefi tek başına saklama yetkisi değildir; özellik kapalı |
| Sponsorlu görünürlük | Sponsor ve ticari ilişki açıkça etiketlenir | Kişiye özel hedefleme yoksa KVKK rızası kendiliğinden doğmaz | Galeri/sponsor sözleşmesi | Ranking etkisi owner kararıyla yasak; MVP'de kapalı |
| Ücretli rapor | KVKK + ödeme/fatura alıcıları | Gereksiz pazarlama izni alınmaz | Ön bilgilendirme, mesafeli sözleşme ve gerekiyorsa hemen ifa seçimi ayrı | Hukuk/mali müşavir/ödeme sandbox kapıları tamamlanmadan kapalı |

## 3. Kontrollü işleme envanteri kararları

Bu tablo teknik taslak için kullanılabilir. Her satır production öncesi hukuk müşaviri tarafından faaliyet ve gerçek veri akışı üzerinden doğrulanır.

| Faaliyet | Kontrollü hukuki sebep adayı | Saklama taslağı | Kritik production kapısı |
|---|---|---|---|
| Dealer onboarding | Sözleşmenin kurulması/ifası için gereklilik; mevzuat yükümlülüğü olan belgelerde kanuni yükümlülük | Retention matrisinde başvuru kapanışından 12 ay taslağı | Gerçek belge listesi, İETTS/EİDS rolü ve saklama gerekçesi |
| Hesap ve erişim güvenliği | Sözleşme ve temel hakları zedelemeyen meşru menfaat adayı | Session/MFA olayları 90 gün taslak | Sağlayıcı, log alanları, menfaat dengesi, admin erişimi |
| Stok ve ilan yönetimi | Galeri sözleşmesi; EİDS/ilan yükümlülükleri için kanuni yükümlülük adayı | Aktif ilan + kontrollü uyuşmazlık penceresi; taslak süreler matriste | EİDS sonucu, zorunlu ilan alanları, VIN/plaka minimizasyonu |
| Kullanıcı ihtiyaç eşleştirme | Kullanıcının açık talebindeki hizmetin ifası adayı | Current session varsayılanı; kalıcı profil yok | Hesap modeli, şeffaflık, otomatik karar etkisi ve DPIA |
| Lead handoff | Kullanıcının araç ve alıcı özelindeki talebi; aktarım sebebi ayrıca belgelenir | Amaç tamamlanmasından sonra 90 gün taslak | Alıcı galeri kimliği, controller/processor rolü, receipt ve silme koordinasyonu |
| Fraud/güvenlik | Temel hakları zedelemeyen meşru menfaat ve uygulanabilir kanuni yükümlülük adayları | Risk bazlı; süresiz fingerprint yasak | LIA/DPIA, itiraz ve insan incelemesi, HMAC rotasyonu |
| Fatura/ödeme | Sözleşme ve kanuni yükümlülük | Mali mevzuattaki kesin süre mali müşavirce yazılır | iyzico/fatura veri alanları, alıcılar, ham TCKN minimizasyonu |
| Analitik | Geri döndürülemez aggregate ise kişisel veri dışı; aksi halde amaca göre ayrı şart | Ham/pseudonymous olaylar için kısa süre; aggregate re-identification testi | Gerçek SDK/çerez envanteri ve yurt dışı aktarım mekanizması |
| Canlı mesaj/video | Talep edilen hizmetin ifası; kayıt için ayrı değerlendirme | Kayıt varsayılan kapalı; mesaj için amaç bazlı kısa süre | Kanal sağlayıcı, kayıt durumu, alıcı, moderation ve transfer |
| AI assistance | Talep edilen hizmetin ifası adayı; ürün geliştirme ve model eğitimi ayrı amaçtır | Anlık/oturum sınırı varsayılanı; self-learning corpus kapalı | Model sağlayıcı, bölge, DPA, KVKK m.9 mekanizması, redaction ve DPIA |

## 4. Saklama ve imha owner kararları

1. `Süresiz saklama` varsayılanı yasaktır.
2. Süre başlangıcı veri yaratma anı değil, tabloda tanımlanan amaç tamamlama olayıdır.
3. Primary, cache, index, export, replica ve backup imhası ayrı kanıt üretir.
4. Legal hold; yetkili rol, gerekçe, kapsam ve bitiş tarihi olmadan açılamaz.
5. Consent/acceptance receipt ham metni kopyalamaz; belge kimliği, sürüm, checksum, kapsam, zaman, yöntem ve geri çekme olayını tutar.
6. Kullanıcı mesajı, ham soru, video veya lead tercihi analitik event'e, reklam profiline ya da ranking sinyaline taşınamaz.
7. `conversationId`, `offerId`, `exactVariantId` gibi teknik kimlikler genel telemetry'de doğrudan yayımlanmaz; bounded audit ile ürün analitiği ayrılır.
8. Self-learning corpus ancak ayrı purpose, notice/consent modeli, geri çekme/silme etkisi, de-identification testi, erişim politikası, DPIA ve model governance kapıları tamamlandıktan sonra oluşturulabilir.

## 5. Yurt dışı aktarım kapısı

OpenAI, Vercel, Upstash, Cloudflare, analitik, e-posta, video, ödeme veya benzeri sağlayıcı için aşağıdaki kayıt tamamlanmadan gerçek kişisel veri gönderilemez:

- Sözleşme sahibi tüzel kişi ve doğru ürün/proje hesabı
- Veri sorumlusu/veri işleyen/alt işleyen rolü
- İşlenen kesin veri alanları ve yasak veri sınıfları
- Veri merkezi/bölgesi, log ve abuse-retention süresi
- Model eğitimi, zero-data-retention veya benzeri ayarların sözleşmesel/teknik kanıtı
- KVKK m.9 kapsamındaki aktarım mekanizması
- Gerekliyse doğru standart sözleşme tipi, yetkili imzalar ve Kuruma beş iş günü içindeki bildirim operasyonu
- Silme, iade, denetim, ihlal bildirimi ve alt işleyen değişikliği hükümleri
- Sağlayıcı kapanması/çıkışı ve veri taşınabilirliği planı

Tek başına sağlayıcının genel gizlilik politikası veya kullanıcının genel checkbox'ı bu kapıyı geçmez.

## 6. Çerez ve istemci depolama kapısı

- Gerçek teknik tarama sonucu olmayan cookie/SDK politika envanterine yazılmaz.
- Kesinlikle gerekli teknolojiler amaç dışı analitik veya pazarlama için kullanılamaz.
- İşlevsel, analitik ve pazarlama kategorileri ayrı tutulur; gerekli değilse varsayılan kapalıdır.
- `Tümünü kabul et`, `Tümünü reddet` ve `Tercihleri yönet` aynı görünürlükte sunulur.
- Kabul kayıtları politika sürümü/checksum, kategori seçimi ve zaman taşır; ham IP'yi zorunlu kanıt gibi süresiz saklamaz.
- localStorage, sessionStorage ve benzeri istemci depolaması da amaç, süre ve silme davranışı bakımından envantere dahildir.
- Sağlayıcı veya kategori yoksa kullanıcıya varmış gibi gösterilmez.

## 7. İçerik, ilan, reklam ve AI dili

- İlan, katalog ve AI çıktısı satıcı/üretici beyanı veya doğrulanmış kaynak düzeyini açıkça belirtir.
- Unknown, silent absence, family-level veya representative veri exact-variant gerçeğine çevrilmez.
- Fiyat; tarih, kapsam ve kaynakla gösterilir; stok, teslimat ve bayi teyidi olmadan bağlayıcı teklif gibi sunulmaz.
- Sahte kıtlık, yapay geri sayım, gerçekte olmayan talep/indirim, doğrulanmamış üstünlük veya güvenlik garantisi yasaktır.
- Sponsorlu içerik görünür biçimde etiketlenir; sponsor ilişkisi organik filtering/ranking kararına gizlice dönüşemez.
- AI kullanımı açıklanır; insanmış gibi sunulmaz. Sonuç ekspertiz, mekanik doğrulama, finansal danışmanlık veya kesin al/alma kararı değildir.
- Aşama 3 CTA'sı yalnız yönlendirme/handoff ise rezervasyon, başvuru, fiyat teklifi veya satıcı kabulü oluşmuş izlenimi vermez.

## 8. İçeride tamamlanan belge sınıfları ve kalan aktivasyon kapıları

| Belge sınıfı | İç hazırlık | Production aktivasyon kapısı |
|---|---|---|
| B2C koşullar | Kapsam ve yönetişim tanımlı | Nihai metin, checksum, gerçek hukuk onayı |
| B2C KVKK aydınlatması | Faaliyet matrisi ve ayrıştırma tanımlı | Gerçek sağlayıcı/alıcı/süre/aktarım bilgileri |
| Galeri üyelik/ilan sözleşmesi | EİDS/İETTS, lisans, doğruluk, güncelleme ve kaldırma maddeleri taslak | EİDS sonucu, gerçek iş modeli ve hukuk onayı |
| Dealer DPA/rol eki | Gereksinim tanımlı | Taraf rolleri ve veri akışı kararı |
| Lead disclosure | Araç/alıcı özelinde ayrı receipt tasarımı | Gerçek galeri ve saklama/silme koordinasyonu |
| Ticari ileti izni | Lead'den ayrı kapı | İYS operasyonu, gönderen ve kanallar |
| Video notice | Varsayılan kayıt yok | Sağlayıcı ve kayıt kararı |
| AI disclosure | Anlık hizmet ile self-learning ayrıldı | Sağlayıcı/DPA/transfer/DPIA |
| Sponsorluk koşulları | Decision-neutral sınır | Ticari model ve görünür etiket QA |
| Taxonomy lisansı | Provenance kapısı tanımlı | Kaynak başına yazılı lisans/hak analizi |
| Provider DPA | Sağlayıcı checklist'i tanımlı | İmzalı sözleşme ve aktarım mekanizması |
| Cookie notice | Kategori ve opt-in kuralı tanımlı | Canlı teknik tarama, gerçek envanter ve UI QA |

## 9. EİDS sonucu gelene kadar yapılabilecekler

- Sentetik test verisiyle acceptance receipt, deletion, data-subject request ve breach drill çalıştırmak.
- Sağlayıcı adaylarından DPA, alt işleyen, bölge, retention ve güvenlik belgelerini toplamak; gerçek veri göndermemek.
- KEP, telefon, sorumlu/yedek roller ve VERBİS değerlendirmesi için şirket kararı hazırlamak.
- Kullanıcı metinlerini gerçek veri akışlarına bağlı placeholder'larla sürümlemek; aktif/yürürlükte ilan etmemek.
- Cookie/localStorage taramasını her release'te tekrarlamak.
- Galeri sözleşmesini EİDS sonucuna göre doldurulacak kontrollü eklerle hazırlamak.

## 10. Değişmez NO-GO'lar

EİDS olumlu sonucu tek başına aşağıdakileri açmaz: gerçek ilan yayını, gerçek galeri onboarding'i, lead aktarımı, pazarlama, ödeme/fatura, konuşma saklama, self-learning corpus, video kaydı, AI sağlayıcıya kişisel veri aktarımı veya production deployment. Her kabiliyet kendi hukuk, privacy, security, sağlayıcı ve owner kapısını ayrıca geçer.

Bu hazırlık tamamlandığında dış hukuk müşavirine gönderilecek paket; gerçek EİDS sonucu, kesin sistem/veri akış diyagramı, sağlayıcı belgeleri, sürümlü kullanıcı metinleri, sözleşme redline'ları ve açık karar sorularından oluşmalıdır.
