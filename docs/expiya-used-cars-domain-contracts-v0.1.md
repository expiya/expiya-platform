# Expiya İkinci El — Domain Contracts & Isolation Foundation v0.1

Durum: `FOUNDATION ONLY / NO PRODUCTION AUTHORITY`  
Tarih: `2026-09-01`

Bu teknik foundation, onaylanan ürün/mimari başlangıç belgesinin ilk dar uygulamasıdır. UI, route, veri tabanı migration'ı, authentication adapteri, gerçek dosya yükleme, gerçek firma/ilan/lead, ödeme ve production deployment içermez.

## Eklenen sözleşmeler

- `taxonomy`: stable canonical kimlik ve satıcı identity request'i.
- `dealer`: firma yaşam döngüsü.
- `tenancy`: MFA ve tenant/şube bağlı erişim kontrolü.
- `memberships`: üyelikten bağımsız fail-closed yayın kapıları.
- `inventory`: taxonomy kimliğinden ayrı fiziksel araç ve revision.
- `listing`: açık durum geçişleri ve public projection kapısı.
- `evidence`: alan bazlı sekiz güven durumu; satıcı beyanı doğrulama değildir.
- `moderation`: görev konusu, karar ve audit olayı.
- `risk`: ikinci ele özel preference ledger.
- `matching`: beş ayrı uyum boyutu; sponsorluk ayrı sözleşmedir.
- `lead-handoff`: ayrı `used-lead-handoff/v1`, ham görüşme yok, execution yetkisi yok.
- `analytics`: B2C/partner/ops namespace ve hassas alan engeli.
- `classicVehicle`: klasik otomobile özgü iddia ve kanıt alanları.

## Uygulanan güvenlik invariants

1. MFA yoksa tenant kaynağına erişim yoktur.
2. Başka tenant verisine hiçbir dealer rolü erişemez.
3. Şube yöneticisi yalnız bağlı şubeye erişir.
4. Üyelik veya ödeme tek başına yayın yetkisi değildir.
5. Firma kapısı kapanınca public listing projection anında false olur.
6. Satıcı beyanı veya incelenmemiş belge `EXPIYA_VERIFIED` olamaz.
7. Organik eşleşme sözleşmesinde paket/sponsor alanı bulunmaz.
8. VIN/plaka public fiziksel araç projection'ında değer taşıyamaz.
9. Used-cars implementation yeni araç Motor V3, katalog, sales-advisor, sales-request veya production vehicle aggregate'lerini import edemez.
10. Analytics attribute'larında VIN, plaka, telefon, e-posta, ad ve ham konuşma yasaktır.

## Sonraki güvenli adım

İkinci foundation diliminde aşağıdakiler eklendi:

- Araç taslağı ve preference ledger için strict Zod runtime şemaları.
- Rol, aksiyon, tenant, şube, MFA ve step-up birleşik yetkilendirme politikası.
- Sıralı ve hash-zincirli `used-cars-audit/v1` envelope'u.
- Satır bazlı hata, tenant uyuşmazlığı ve batch duplicate kontrolü yapan deterministik `used-inventory-import-dry-run/v1`.
- Dry-run sonucunda değişmez `writeAuthorized: false` güvenlik sınırı.

Üçüncü foundation diliminde public/private araç projection sözleşmesi, recursive hassas alan sızıntı kontrolü, bütün dealer rol/aksiyonlarını cross-tenant ve MFA durumlarında tarayan izolasyon matrisi ve ayrı PostgreSQL RLS tasarım belgesi eklendi.

Dördüncü foundation diliminde media/document quarantine yaşam döngüsü, public rendition için MIME/boyut/malware/EXIF/PII/identity/rights kapıları ve duplicate/fraud sinyal modeli eklendi. Sistem yüksek riskte yayını bloke eder ve insan incelemesi ister; otomatik dolandırıcılık hükmü üretmez.

Beşinci foundation diliminde lead veri minimizasyonu, consent receipt runtime şemaları, tek kullanımlık partner portal grant değerlendirmesi ve saklama/silme state machine'i eklendi. Gerçek aktarım ve kalıcı kayıt hâlâ kapalıdır.

Altıncı foundation diliminde taxonomy release/identity-request state machine'i, kaynak/lisans public kullanım kapıları ve klasik araç yüksek riskli iddia politikası eklendi. Satıcı talebi canonical identity veya aktif release oluşturamaz.

Son foundation diliminde hard/soft constraint politikası, yaş-kilometre koridoru, beş boyutlu stok eşleştirmesi, organik/sponsorlu tarafsızlık, moderasyon yürütmesi ve bütünleşik readiness kapısı eklendi. Foundation kapsamı tamamlandı; pilot data write ve production launch bilinçli olarak yetkisizdir.
