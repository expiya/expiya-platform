# Expiya İkinci El kurumsal satıcı onboarding foundation v0.1

Durum: sentetik tasarım ve kod sözleşmesi. Gerçek firma/belge/e-posta/SMS/ödeme/veritabanı yazımı, EİDS/İETTS provider çağrısı, ilan yayını ve deployment yetkili değildir.

## 1. Bilgi mimarisi

`www.expiya.com/ikinciel` tüketici alanıdır ve yalnız “Kurumsal satıcı başvurusu” girişini sunar. Başvuru yüzeyi pre-tenant `applicationId` kapsamındadır. Onaydan sonra tenant üretilir; panel `partner.expiya.com` üzerinde ayrı uygulama, identity issuer/audience, session store, cookie adı/domain’i, encryption keys, database role/schema ve deployment hattıyla çalışır. Expiya admin incelemesi üçüncü bir workforce trust boundary’sidir. `/ikinciel/partner-demo` yalnız sentetik referanstır; auth veya production veri yolu değildir.

## 2. Başvuru yolculuğu

Uygunluk açıklaması → firma/yetkili/şube bilgileri → koşula bağlı belge listesi → private quarantine upload → KVKK aydınlatma ve sürümlü beyan receipt’leri → e-posta doğrulama → taslak tamlık kontrolü → gönderim → kimlik/belge/İETTS/sözleşme incelemeleri → gerekirse ek bilgi döngüsü → gerekçeli red veya onay → süreli aktivasyon → credential + zorunlu MFA → firma sahibi hesabı. Hesap kurulumu yayın yetkisi değildir.

## 3. Başvuru ekranları

Uygunluk ve kapsam; firma türü/ticari kimlik; adres ve iletişim; yetkili kişi; şubeler ve şube–İETTS ilişkisi; stok/tedarik modeli ve entegrasyon ihtiyacı; fatura/sözleşme kişileri; dinamik belge checklist/upload; KVKK ve beyanlar; e-posta doğrulama; gözden geçir/gönder; durum ve ek bilgi yanıtı; karar; aktivasyon. Taslak kayıtları applicant session ve application scope ile sınırlıdır.

## 4. Başvuru state machine

Kod sözleşmesi `partner-onboarding/applicationStateMachine.ts` içindedir. Kullanıcı yalnız taslak/doğrulama/gönderim/geri çekme adımlarını, reviewer yalnız tanımlı inceleme kararlarını, system yalnız expiry geçişlerini yapabilir. Red ve suspension gerekçe ister. Her accepted transition optimistic revision, idempotency key ve audit event gerektirir; foundation production mutation’ı daima `false` döndürür.

## 5. Belge requirement registry

Registry; sürüm, yürürlük tarihi, önceki sürüm, firma türü, branch scope, zorunluluk ve hukuk inceleme işaretini taşır. Gönderim anında registry sürümü ve resolved checklist snapshot’lanır; sonradan değişen registry geçmiş başvuruyu sessizce değiştirmez. V1 hukuki onay bekleyen sentetik taslaktır. Upload: private quarantine, allowlist MIME + magic byte, 15 MiB sınırı, malware ve EXIF/PII incelemesi; clean olmadan reviewer erişimi yoktur.

## 6. Admin inceleme handoff sözleşmesi

Handoff; application/revision, state, registry version, e-posta proof, completeness checksum, opaque document IDs, consent receipt IDs, review türü ve timestamp taşır. Pre-approval `tenantId=null` zorunludur. Kuyruk yazımı ve gerçek bildirim kapalıdır. Reviewer erişimi kısa süreli purpose-bound grant, least privilege, dual control gereken kararlar ve immutable audit ile açılmalıdır.

## 7. Aktivasyon bağlantısı güvenlik modeli

En az 256-bit CSPRNG token yalnız bir kez e-postaya girer; depoda SHA-256 hash, grant/application/tenant/intended-email bağı, issued/expiry/consumed/revoked tutulur. 30 dakika önerilir. Sabit-zamanlı hash karşılaştırması, tek kullanımlılık, resend’de önceki grant’lerin revoke edilmesi, başarılı tüketimde atomik consume ve tüm eski token/session’ların rotation’ı gerekir. Token log/analytics/referrer’a yazılmaz; URL fragment veya exchange-code modeli tercih edilir. İlk rol yalnız `DEALER_OWNER`; MFA tamamlanmadan session yetkili olmaz.

## 8. Partner authentication ve MFA tasarımı

Public Expiya hesabı kabul edilmez. Ayrı issuer/audience ve partner-only IdP client kullanılır. Password seçilirse Argon2id/bcrypt provider hash’i; plaintext/reversible storage yoktur. Passkey birincil, TOTP fallback; SMS tek başına güçlü MFA değildir. Login, activation, invite ve reset ayrı principal+network rate limits; enumeration-safe yanıtlar. Secure/HttpOnly/SameSite cookies host-only (`__Host-`), CSRF, 15 dk rotation, 30 dk idle, 12 saat absolute timeout, logout/revoke ve auth-version invalidation uygulanır.

## 9. Tenant ve şube izolasyonu

Tenant yalnız onay/aktivasyon transaction’ında üretilir. Her business row tenant ID taşır; şube kaynakları ayrıca branch ID taşır. API authorization + PostgreSQL RLS + tenant-aware unique/index/foreign key birlikte kullanılır. Request context client girdisinden değil verified identity’den kurulur. Owner/admin tenant-wide; diğer roller explicit branch listesiyle sınırlıdır. Object keys `tenants/{tenant}/branches/{branch}`; application belgeleri pre-tenant ayrı namespace’tedir. Cross-tenant hata fail-closed ve yüksek öncelikli incident’tir.

## 10. Satıcı rol modeli

İlk sürüm yalnız `SELLER_FULL_ACCESS` (“Tam yetkili”) rolünü tanımlar. Rol firma, şube, kullanıcı, stok, talep, analitik, üyelik ve audit işlemlerinin tamamına tenant-wide erişir. Başka satıcı rolü atanamaz; ihtiyaç doğrulanırsa ileride yeni bir sürümlü yetki matrisiyle eklenir. Basit rol modeli MFA, tenant izolasyonu, session rotation, step-up ve immutable audit kontrollerini kaldırmaz. Satıcı rolü Expiya moderation/platform yetkisi alamaz.

## 11. Satıcı paneli ekran listesi

Giriş/MFA/recovery; dashboard ve readiness kapıları; firma profili/değişiklik talepleri; şubeler; ekip/davet/roller; stok listesi; araç oluşturma ve revizyon; media/belgeler; moderasyon kuyruğu/karar; fiyat ve stok lifecycle; talepler; test sürüşü/teklif; üyelik/paket/kota; fatura/ödeme; stok ve talep analitiği; audit; güvenlik/session cihazları; entegrasyon/feed; destek.

## 12. Üyelik, ödeme ve abonelik sınırı

Billing ayrı bounded context ve PCI kapsamındadır; kart verisi Expiya uygulamasına girmez. Entitlement kota/özellik açabilir fakat organik ranking sinyaline dönüşemez. Ödeme, hesap veya abonelik tek başına publishing sağlamaz. Sponsorlu inventory ayrı candidate stream ve açık `Sponsorlu` etiketi taşır. Gerçek checkout/webhook/refund/tax invoice mutation owner onayı ve provider certification olmadan kapalıdır.

### Taslak paket ve fiyat hipotezi v0.1

| Paket | Aktif ilan | Aylık (KDV hariç) | Yıllık (%20 indirim) | Ana fark |
|---|---:|---:|---:|---|
| Basic | 10 | 990 TL | 9.504 TL | Detaylı ilan ve doğrulanmış satıcı profili |
| Standart | 25 | 2.475 TL | 23.760 TL | Basic + izinli kullanıcı iletişim bilgisi |
| Premium | 50 | 4.950 TL | 47.520 TL | Standart + canlı görüşme, video demo, haftalık analiz |
| Gold | 100 | 9.900 TL | 95.040 TL | Premium + etiketli sponsorlu yerleşim ve AI yanıt asistanı |

Fiyatlar 2026 Türkiye lansman hipotezidir; vergi/hukuk/ticari onay değildir. Pilot öncesi satıcı görüşmeleri, ilan başına edinim değeri, lead kalitesi, destek/video altyapı maliyeti ve ödeme istekliliği testiyle yeniden kalibre edilmelidir. Yıllık tutar `aylık × 12 × 0,80` olarak hesaplanır. Kart ödeme ekranı yalnız PSP tokenization + 3D Secure, imzalı/idempotent webhook, fatura ve iade akışları sertifiye edilince açılır.


## 13. İETTS/EİDS kapıları

İETTS firma/şube yetki belgesi gate’i; EİDS her listing/inventory unit için araç bazlı ilan yetkisi gate’idir. Biri diğerini karşılamaz. Yayın için ikisi de güncel, aynı tenant/branch ile uyumlu ve tüm diğer kapılar açık olmalıdır. Mevcut reserved synthetic response türleri korunur; gerçek credential/provider çağrısı ve production publication `false` kalır.

## 14. Audit ve bildirim sözleşmeleri

Başvuru oluşturma/değişim/gönderim, consent, e-posta challenge, upload/scan/access, reviewer assignment/view/decision, ek bilgi, activation issue/consume/revoke, tenant/user/role/session, billing ve publication gate olayları append-only hash-chain audit üretir. Payload PII değil subject IDs/fingerprint/reason/version içermelidir. Notification outbox event ID, template+legal version, locale, recipient fingerprint, purpose, attempt ve delivery state taşır; içerik loglanmaz. Foundation’da gerçek dispatch yoktur.

Tam yetkili satıcı kullanıcılarına her pazartesi Europe/Istanbul saatiyle 09.00'da haftalık stok özeti planlanır. Rapor aktif ilan, kalan paket kapasitesi, moderasyonda, taslak, rezerve, satılmış, yayından kaldırılmış ve güncelliğini yitirmiş aktif stok sayılarını içerir. Recipient yalnız doğrulanmış e-posta fingerprint'iyle outbox'a girer; raw adres veya araç PII'si audit'e yazılmaz. Sentetik foundation gerçek e-posta enqueue/delivery yetkisi vermez.

## 15. Tehdit modeli

Başlıca tehditler: sahte firma/temsilci, belge malware/polyglot, tenant IDOR, reviewer içeriden kötüye kullanım, token sızıntısı/replay, credential stuffing, session fixation, invite privilege escalation, webhook spoofing, suspended stock’un cache’te kalması ve ödeme ile ranking manipülasyonu. Kontroller: registry+manual review, quarantine/scanning, RLS/adversarial tests, purpose grants/dual control, hashed one-time tokens, rate limit/MFA, rotation/auth versions, signed replay-safe webhooks, fail-closed projection invalidation ve ranking independence audit.

## 16. KVKK ve retention ihtiyaçları

Veri envanteri; amaç/hukuki sebep; controller/processor rolleri; aydınlatma metni sürümü ve receipt; minimizasyon; özel nitelikli veri engeli; yurt dışı aktarım/vendor/KMS değerlendirmesi; erişim, düzeltme, silme ve itiraz süreçleri; legal hold; breach playbook gerekir. Taslak/başarısız başvuru, red, belge, audit, activation ve aktif sözleşme için ayrı retention schedule hukukça onaylanmalıdır. Süresi dolunca crypto-shred/delete job kanıtı gerekir; audit PII taşımamalıdır.

## 17. MVP / pilot / production kapsamları

MVP: bu domain sözleşmeleri, sentetik fixtures, state/registry/activation/media/review testleri, ekran prototipi; write/provider kapalı. Pilot: ayrı partner staging deployment, sandbox IdP/MFA, private object store+scanner, staging DB/RLS, internal reviewer, allowlisted sentetik/pilot veri ve e-posta sink. Production: hukuk/KVKK onayı, production IdP/KMS/storage/scanner, provider contracts, billing certification, ops staffing/SLA, pentest/DR/observability, approved migrations ve explicit go-live.

## 18. Açık blocker listesi

- Hukuk: uygun firma türleri, belge registry, sözleşme, beyanlar, KVKK metinleri ve retention süreleri.
- Ürün/operasyon: reviewer rolleri, dual-control kararları, SLA, ek bilgi ve appeal politikası.
- Güvenlik: IdP/MFA seçimi, KMS, scanner, secrets, cookie/domain ve pentest planı.
- Platform: partner/admin deployment, DB/RLS, object storage, queues/outbox, audit sink ve cache invalidation.
- Ticari: paket/kota/fiyat, PSP/fatura, sponsorlu ürün politikası ve ranking audit.
- Regülasyon/provider: İETTS/EİDS teknik erişim, credential ownership, availability/reconciliation ve hukuk yorumu.
- Repository: mevcut çalışma ağacında çözülmemiş merge çatışmaları tam build/lint güvenilirliğini engelliyor.

## 19. Uygulama ve test yol haritası

1. Foundation contract review: state machine/property tests, registry snapshots, activation replay/expiry, upload corpus, handoff schemas.
2. Ayrı app boundary: host/audience/cookie negative tests; public-partner-admin cross-session tests.
3. Staging persistence: migrations+RLS; exhaustive role/tenant/branch adversarial suite; audit/outbox idempotency.
4. Staging integrations: IdP/MFA, scanner/storage, email sink; rate-limit and recovery abuse tests.
5. Admin workflow + partner UI: accessibility, interrupted draft, extra-info, activation and suspension E2E.
6. Commercial/regulatory sandbox: billing webhook replay, ranking separation, dual İETTS/EİDS fail-closed tests.
7. Production readiness: DPIA/legal approvals, threat-model review, pentest, DR restore, incident/tabletop and explicit launch authorization.

## Foundation veri alanları

Application aggregate firma türü, ticaret unvanı, tabela adı, vergi dairesi/numarası fingerprint’i, MERSİS ve sicil, merkez adres/il/ilçe, web sitesi, kurumsal e-posta/telefon, yetkili kişi/görev/iletişim, şubeler, İETTS numarası ve ilişkili firma/şube, aktif stok tahmini, tedarik/sahiplik modeli, API/feed ihtiyacı, fatura/sözleşme kişileri, consent receipts, registry snapshot, revision ve state içerir. Raw değerlerin şifreleme, masking, access-purpose ve retention politikaları persistence başlamadan tanımlanmalıdır.
