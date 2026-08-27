# Expiya Cars Aşama 3 — Satış Talebi ve Authority Boundary

Durum: `IMPLEMENTED / IN-MEMORY PILOT / PRODUCTION BLOCKED`
Sözleşmeler: `phase3-intent/v1`, `phase3-sales-request/v1`, `consent-receipt/v1`, `dealer-transfer-envelope/v1`

## Yetki ve veri akışı

`Aşama 1 (kilitli karar) → revealed offer → Aşama 2 exact varyant → HMAC phase3-intent/v1 → Aşama 3 form → strict validation → in-memory repository → BLOCKED dealer envelope`

Aşama 3 karar vermez ve varyant/intent almaz. İmza, 30 dakikalık süre, conversation ID, decision fingerprint, offer ID, revealed candidate üyeliği, exact variant ID, catalog release, intent ve `executionAuthorized:false` sunucuda yeniden doğrulanır. Route intent'i token intent'iyle eşleşmezse kapanır. Token URL'de taşınır; PII URL'ye girmez. Form tekrarı UUID idempotency key ile aynı request kaydına döner. Phase 3 token form açılışında yeniden kullanılabilir; yürütme yetkisi vermez. Tek kullanımlık yürütme semantiği submit idempotency ve consent kaydı katmanındadır.

## Güvenlik sınırları ve tehdit modeli

| Tehdit | Kontrol | Kalan risk / production kapısı |
|---|---|---|
| Token değiştirme / başka görüşme | HMAC, timing-safe compare, offer registry ve conversation/fingerprint bağı | Signing secret rotasyonu ve çok-instance registry doğrulanmalı |
| Intent/varyant değiştirme | URL intent token ile eşleştirilir; payload strict ve bu alanları kabul etmez | E2E staging testi |
| CSRF | Same-origin kontrolü ve tek kullanımlık, 30 dk in-memory token | Dağıtık token store ve proxy host politikası |
| Spam/bot | Honeypot, hashed rate key, strict uzunluklar | WAF/bot sağlayıcısı DPIA ve çerez analizi |
| Duplicate | UUID idempotency + repository lookup | DB unique constraint yok; production adapter gerekli |
| PII log sızıntısı | Kontrollü hata kodu/redaction; public response checksum/audit içermez | Sentry ve platform body capture ayarları denetlenmeli |
| Serbest metin | 500 karakter, görünür uyarı, hassas örüntü reddi | Manuel inceleme ve daha güçlü DLP politikası |
| Yetkisiz bayi aktarımı | Adapter envelope daima `BLOCKED_LEGAL_REVIEW`; gerçek adapter yok | Bayi sözleşmesi, allowlist ve revocation gate |
| Rıza manipülasyonu | Kutular boş; aydınlatma, aktarım, kanal ve pazarlama ayrıdır | Kullanılabilirlik/hukuk incelemesi |
| XSS | React escaping, metin allowlist/uzunlukları | CSP doğrulanmalı |

IP ve user-agent consent receipt'e alınmaz. Rate-limit anahtarı için mevcut request ağ adresi yalnız süreç içi hashlenir; ham değer repository ve loga yazılmaz. Public API request ID dışında checksum, consent receipt veya outbound envelope döndürmez.

## Veri envanteri ve amaç/hukuki sebep matrisi

| Veri | Kaynak | Amaç | Taslak hukuki sebep | Alıcı | Zorunluluk |
|---|---|---|---|---|---|
| Ad, soyad, telefon | Form | Talebi kurmak/yanıtlamak | KVKK 5/2(c) değerlendirmesi; hukuk onayı | Seçilecek yurt içi bayi | Temel talep için gerekli |
| E-posta | Form | Talep kimliği ve geri dönüş iletişimi | Hukuk danışmanı onayı bekleyen sözleşmenin kurulması/ifası değerlendirmesi | Seçilen yetkili satıcı | Her talepte zorunlu; pazarlama izninden bağımsız |
| İl, ilçe | Form | Minimum hassasiyetle bayi eşleştirme | 5/2(c) değerlendirmesi | Bayi/dizin | Gerekli; koordinat yok |
| Mahalle | Form | En yakın yetkili satıcıyı daha isabetli eşleştirme | Minimizasyon ve 5/2(c) değerlendirmesi; hukuk onayı | Seçilen yetkili satıcı/dizin | Opsiyonel; açık adres ve koordinat yok |
| Kanal | Form | Ölçülü iletişim | 5/2(c) değerlendirmesi | Bayi | Telefon veya e-posta seçimi gerekli |
| Not | Form | Talep ayrıntısı | Talep üzerine; minimizasyon | Bayi allowlist | Opsiyonel |
| Exact variant, intent, offer/fingerprint/release | İmzalı handoff | Authority/audit bağı | Güvenlik için meşru menfaat değerlendirmesi | İç sistem; bayi yalnız variant/intent | Kullanıcı değiştiremez |
| Consent receipt | Kullanıcı aksiyonu + versioned metin | İspat, geri alma | Hukuki yükümlülük/meşru menfaat değerlendirmesi | Yetkili iç ekip | Gerekli kayıt |
| Pazarlama kanalı | Ayrı opt-in | Ticari ileti | 6563 onayı + KVKK şartı | Doğrulanmış hizmet sağlayıcı/İYS | Opsiyonel |

T.C. kimlik, doğum tarihi, açık adres, finans/sağlık verisi, ehliyet görseli ve koordinat alınmaz. Test sürüşü ehliyet kontrolü bayinin sonraki kontrollü sürecidir. Çocuklara yönelik bir hizmet değildir; yaş verisi ekleyerek yeni risk yaratılmaz. Çocuk kullanım ihtimali için sade metin, satış talebinin reşit/temsil yetkili kişiyle yürütülmesi ve hukukça onaylanmış yaş kapısı production öncesi karara bağlanmalıdır.

## Aktarım ve dealer adapter sınırı

Envelope; recipient dealer ID, tüzel kişi, amaç, paylaşılan alan allowlist'i, consent reference, durum, idempotency key, retry, teslim öncesi geri alma kontrolü, dead-letter ve audit receipt taşır. Pilot adapteri yoktur; envelope `UNSELECTED` ve `BLOCKED_LEGAL_REVIEW` kalır. Production adapter şu sırayı atomik sağlamalıdır: yayımlanmış bayi dizini → tüzel kişi/amaç doğrulama → rıza veya hukuk sebebi kontrolü → revocation-before-delivery → allowlist projection → idempotent delivery → PII içermeyen audit receipt. Otomatik retry hukuk ve güvenlik sınıflandırması olmadan açılmaz.

Yurt dışı aktarım tasarımda kapalıdır. Hosting/CRM/telemetri dahil fiili veri yolları çıkarılıp KVKK m.9'un güncel mekanizması (yeterlilik, uygun güvence/standart sözleşme/BŞK veya arızi hâl) hukukça belirlenmeden açılmaz; ayrı rıza tek varsayılan çözüm kabul edilmez.

### SMS OTP ve bayi portal teslimi

Telefon numarası, beş dakika geçerli altı haneli SMS OTP ile doğrulanır. Challenge telefonun normalize edilmiş hali ve `phase3-intent/v1` handoff digest'ine bağlıdır; en fazla beş deneme yapılabilir. Başarılı sonuç 30 dakika geçerli tek kullanımlık verification token üretir. Submit, tokenı aynı telefon ve handoff ile atomik tüketmeden request oluşturmaz. SMS yalnız doğrulama amacını taşır; pazarlama izni değildir. Provider endpoint ve secret yoksa adapter `SMS_PROVIDER_NOT_CONFIGURED` ile kapanır. Production için sağlayıcı tüzel kişisi, veri bölgesi, alt işleyenleri, saklama süresi, şablon onayı ve KVKK m.9 analizi zorunludur.

Bayiye kişisel veri e-posta gövdesinde veya ekinde gönderilmez. E-posta yalnız PII içermeyen talep referansı ve kısa ömürlü, tek kullanımlık portal bağlantısı taşımalıdır. Portal erişiminde bayi kullanıcısı kimlik doğrulama, dealer ID/tüzel kişi/rol yetkisi, talep-bayi bağı, erişim süresi, geri alma-before-view ve audit kontrolünden geçmelidir. Bayinin kabulü kullanıcının rızasının yerine geçmez; yetkili alıcı erişimi ve bayi yükümlülüklerinin kabulüdür. Bu pilotta portal tokenı, e-posta adapteri ve gerçek bayi erişimi uygulanmaz; envelope yalnız `SECURE_DEALER_PORTAL_LINK` kanalını sözleşme olarak taşır.

### Kullanıcı kontrollü sohbet özeti

Ham Aşama 1 veya Aşama 2 transcript'i aktarılmaz. `sales-conversation-summary/v1`, Aşama 1 handoff'undaki yalnız `USER_EXPLICIT/USER_CONFIRMED` ihtiyaç özetlerini ve Aşama 2'nin yalnız kullanıcı sorularını kullanır; asistan cevapları, URL'ler, hassas veri örüntüleri, persona/skor/fingerprint ve 240 karakteri aşan kullanıcı girdileri dışarıda bırakılır. Kullanıcı nihai özeti formda görür. Ayrı, boş `sales-conversation-summary-consent/v1` kontrolü verilirse checksum ile bağlanan metin allowlist'e eklenir; verilmezse stored request ve dealer envelope içinde özet bulunmaz. Kullanıcının opsiyonel notu ayrı alan ve ayrı allowlist girdisidir.

### Yerel deneme bayisi

Yerel denemelerde açık `CARS_PHASE3_FAKE_DEALER=true` bayrağı ve production dışı runtime birlikte sağlandığında `dealer-pilot-fake-001` etkinleşir. Görünen adı `Expiya Pilot Örnek Yetkili Satıcı`, bildirim adresi `serdar@expiya.com`, konum kapsamı `ALL_TURKEY`, varyant kapsamı `ALL_EXACT_VARIANTS` olarak sabittir. Kayıt `PILOT_FAKE` ve “gerçek tüzel kişi değildir” ibaresi taşır. Her dolu il/ilçe ve exact variant bu kayda deterministik eşlenir. Production runtime bayrağı görmezden gelir; gerçek bayi dizini yoksa `AUTHORIZED_DEALER_NOT_FOUND` ile kapanır.

`CARS_PHASE3_TEST_MODE=true` yalnız production dışı runtime'da in-memory OTP adapterini açar ve gerçek SMS yerine pilot kodunu ekranda gösterir. Talep in-memory repository'ye ve fake dealer envelope'una yazılır; `serdar@expiya.com` adresine gerçek e-posta gönderilmez. Bu mod production'a taşınmamalıdır.

## Saklama, imha ve başvuru matrisi

| Kayıt | Pilot | Production süre kararı | Süre sonunda |
|---|---|---|---|
| Tamamlanmış talep | Yalnız process-memory; restart ile yok | `[HUKUK ONAYI: amaç ve zamanaşımına bağlı süre]` | Sil/yok et; anonim istatistik ayrı |
| Yarım form/CSRF | Tarayıcı state + 30 dk token | `[HUKUK/ürün onayı]` | Otomatik sil |
| Consent/withdrawal ispatı | Process-memory | `[HUKUK ONAYI: ispat/uyuşmazlık süresi]` | PII azaltma ve güvenli imha |
| Pazarlama/ret kaydı | Gerçek kayıt yok | 6563/İYS ispat ve ret yükümlülüğüne göre hukuk onayı | Ret bastırma kaydı amaçla sınırlı tutulur |
| Güvenlik/audit | Ham PII yok | Risk ve mevzuata bağlı belgeli süre | Periyodik imha |

Rıza geri alma gelecekteki rızaya dayalı işlemeyi durdurur; geri alma öncesi işlemenin hukuka uygunluğunu geriye dönük kaldırmaz. Teslim edilmemiş envelope iptal edilir; teslim edilmişse bayi statüsü (ayrı veri sorumlusu/veri işleyen) sözleşmeye göre belirlenir ve silme/geri alma bildirimi yönlendirilir. Legal hold yalnız belgeli yasal zorunluluk, kapsam ve bitiş tarihiyle uygulanır. Audit log ham PII tablosundan ayrıdır. Başvuruda minimum kimlik doğrulama, yetki kontrolü, 30 günlük cevap takibi ve üçüncü kişi verisine erişimi önleme gerekir.

## Consent receipt

Her amaç için ayrı receipt: purpose, legal text version, SHA-256 text checksum, granted/denied, timestamp, withdrawal method, request ID, controller version, recipient category ve channel. Aydınlatma receipt'i `presented/acknowledged` ispatıdır; rıza değildir. Pazarlama ret hali de kayda girer. Metin değişikliği yeni version/checksum ve gerektiğinde yeni rıza gerektirir.

## İhlal yönetimi

PII erişim matrisi, encryption, secret rotation, backup imhası, çalışan eğitimi, tedarikçi olay bildirimi ve tabletop tatbikatı production kapısıdır. Olayda kapsam/kişiler/veri kategorileri belirlenir, delil korunur, erişim kesilir, risk değerlendirilir; KVKK Kurulunun 2019/10 kararındaki 72 saat yaklaşımı ile ilgili kişiye “en kısa sürede” bildirim prosedürü hukuk ve DPO tarafından işletilir. Loglara olay müdahalesi bahanesiyle ham form body eklenmez.

## Production readiness — bloklayan maddeler

- Veri sorumlusu tam ticaret unvanı, MERSİS, adres ve doğrulanmış KVKK/KEP başvuru kanalı.
- Talep, yarım form, consent/ret, audit ve backup için gerekçeli saklama/imha süreleri.
- Yetkili bayi dizini, her alıcının tüzel kişisi/rolü, sözleşmesi, güvenlik yükümlülüğü ve paylaşım allowlist'i.
- Bayi aktarımında açık rıza yerine/yanında uygulanacak kesin KVKK 5 ve 8 analizi.
- CRM, hosting, WAF, telemetri alt işleyenleri; veri bölgeleri ve 2024 sonrası m.9 mekanizması.
- 6563 hizmet sağlayıcı kimliği, İYS entegrasyonu, kanal bazlı onay/ret ve ispat akışı.
- Saklama repository'si, encryption/KMS, RBAC, unique idempotency, revocation ve DSAR uygulaması.
- DPIA/tehdit modeli, pentest, erişilebilirlik ve mobil E2E; ihlal runbook'u ve sorumlular.
- Hukuk danışmanının `kvkk-notice/v1`, iki rıza metni ve çocuk/ehliyet/bayi rolü onayı.

Bu belge ve arayüz hukuki görüş veya uygunluk garantisi değildir.
