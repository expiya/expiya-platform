# Expiya İkinci El — Lead, Consent, Partner Portal ve Saklama Sınırı v0.1

Durum: `FOUNDATION / LEGAL REVIEW REQUIRED / NO REAL DELIVERY`
Tarih: `2026-09-01`

## Temel sınırlar

- Used lead sözleşmesi sıfır araç `phase3-sales-request/v1` sözleşmesini yeniden kullanmaz.
- Listing, inventory unit, recipient tenant/branch ve intent imzalı `used-lead-handoff/v1` içinden gelir; form tarafından değiştirilemez.
- Form yalnız gerekli iletişim, il/ilçe, kanal, güvenli not ve ayrı izin seçimlerini alır.
- TCKN, doğum tarihi, açık adres, koordinat, finans/sağlık verisi, ehliyet veya belge alınmaz.
- Ham konuşma satıcıya aktarılmaz. Preference özeti opsiyonel, kullanıcıya gösterilmiş ve checksum'a bağlı olmalıdır.
- Pazarlama izni temel lead aktarımından ayrıdır ve partner projection'ına aktarılmaz.

## Consent receipt

Her amaç ayrı receipt üretir. Aydınlatma `PRESENTED` olarak kaydedilir; `GRANTED` olamaz. Dealer transfer receipt'i belirli recipient tenant'a bağlıdır. Metin sürümü, SHA-256 checksum, zaman, controller sürümü ve geri alma yöntemi zorunludur. Hukuki sebep ve metinlerin nihai hali hukuk danışmanı tarafından onaylanmadan gerçek aktarım açılamaz.

## Partner portal grant

- 15 dakika önerilen kısa süre; kesin süre risk incelemesine bağlıdır.
- Tek lead, tenant, branch, actor ve `LEAD_VIEW_ONCE` aksiyonuna bağlıdır.
- MFA zorunludur.
- Tek kullanımlık tüketim DB transaction'ında atomik olmalıdır.
- E-posta/SMS içinde PII bulunmaz; yalnız opaque referans/bağlantı bulunabilir.
- Her görüntüleme öncesi consent withdrawal kontrolü yapılır.
- Revoked, consumed, expired veya recipient uyuşmazlığı fail-closed reddedilir.
- `executionAuthorized: false`; grant satış, ileti gönderimi veya başka işlem yetkisi vermez.

## Saklama ve silme

Durumlar: `ACTIVE → PURPOSE_COMPLETED → DELETION_DUE → DELETION_IN_PROGRESS → DELETED_PRIMARY → BACKUP_EXPIRY_PENDING → DESTROYED`. `ANONYMIZED` yalnız geri döndürülemez anonimlik doğrulanırsa terminal alternatiftir. `LEGAL_HOLD` belgeli kapsam ve bitiş tarihi gerektirir; süresiz varsayılamaz.

Primary silme, yedek imhası değildir. Backup expiry ayrı takip edilir. Consent geri alma gelecekteki rızaya dayalı işlemeyi durdurur; teslim edilmemiş grant'leri iptal eder. Önceki hukuka uygun işlemleri geriye dönük tersine çevirmez. Teslim edilmiş lead için recipient bildirim yükümlülüğü, tarafların veri sorumlusu/veri işleyen rolüne göre sözleşmede belirlenmelidir.

## Production kapıları

- Veri sorumlusu kimliği, hukuki sebepler ve metinlerin hukuk onayı.
- Recipient dealer rolü, sözleşmesi ve allowlist'i.
- Saklama süreleri ve periyodik imha takvimi.
- SMS/e-posta/identity sağlayıcı veri bölgesi ve alt işleyen analizi.
- Atomik grant tüketimi, idempotency ve revocation-before-view testi.
- DSAR kimlik doğrulama, 30 günlük takip ve üçüncü kişi verisi koruması.
- Backup deletion ve legal-hold runbook'u.
- 6563/İYS pazarlama onay/ret süreci.
