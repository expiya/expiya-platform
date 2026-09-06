# Expiya İkinci El — KVKK retention ve imha matrisi taslağı v0.1

Durum: Hukuk incelemesi bekleyen teknik taslak. Süreler bağlayıcı hukuk görüşü değildir.
Tarih: 1 Eylül 2026

## Değişmez ilkeler

- Amaç, hukuki sebep ve retention sınıfı kayda girişte belirlenir; sonradan varsayılanla doldurulmaz.
- Pazarlama rızası, araç özelindeki hizmet/iletişim talebinden ayrıdır.
- Tenant kapanması otomatik toplu silme değildir; her veri sınıfı kendi saklama kararını izler.
- Legal hold yalnız yetkili hukuk aktörü, gerekçe, kapsam ve bitiş tarihiyle uygulanır.
- Primary silme, arama index'i, cache, export, replica ve backup expiry ayrı adımlardır.
- Audit kaydı silinen ham PII'yi veya belge içeriğini taşımaz.

## Veri sınıfı matrisi

| Veri sınıfı | Amaç | Önerilen başlangıç tetikleyicisi | Teknik taslak süre | Süre sonunda | Legal hold | Veri sorumlusu/işleyen kararı |
|---|---|---|---|---|---|---|
| Partner firma başvurusu | Firma doğrulama | Başvuru kapanışı | 12 ay | Sil/anonimleştir | Evet | Hukuk onayı gerekli |
| Vergi/ticaret doğrulama belgesi | Kurumsal kimlik | Üyelik sonu | Süre belirlenmedi | Private belge imhası | Evet | Belge bazlı hukuk onayı |
| Partner kullanıcı hesabı | Erişim güvenliği | Hesap kapatma | 90 gün operasyonel bekleme | Kimlik alanlarını sil; audit ID'yi pseudonymous tut | Evet | Ortak rol analizi gerekli |
| Session ve MFA olayları | Güvenlik | Session sonu | 90 gün | Sil/özetle | Evet | Güvenlik amacı doğrulanmalı |
| VIN/plaka ciphertext | Stok yönetimi/fraud | Stok kapanışı | 12 ay taslak | Ciphertext sil; fingerprint için ayrı karar | Evet | Meşru menfaat testi gerekli |
| VIN/plaka HMAC fingerprint | Duplicate/fraud | Stok kapanışı | Süre belirlenmedi | Sil veya rotasyonla erişilemez kıl | Evet | DPIA/hukuk kararı zorunlu |
| Araç fotoğrafı | İlan yayını | İlan kapanışı | 90 gün | Original ve rendition imhası | Evet | Görselde üçüncü kişi kontrolü |
| Araç belgesi/ekspertiz/bakım | Kanıt ve moderasyon | İlan kapanışı | 180 gün taslak | Private belge imhası | Evet | Belge türü bazında ayrıştırılmalı |
| Lead iletişim bilgileri | Araç özelinde iletişim | Amaç tamamlandı/lead kapandı | 90 gün | Primary silme; aggregate anonim kalabilir | Evet | Satıcıya aktarım rolü netleştirilmeli |
| Lead tercih özeti | Talep bağlamı | Lead kapandı | 90 gün | Sil | Evet | Kullanıcı ayrı paylaşım seçer |
| Pazarlama izni | Ticari iletişim | Geri çekme/ilişki sonu | İspat süresi hukukça belirlenir | İzin kullanımını durdur; ispat kaydını sınırlı tut | Evet | İYS/ileti mevzuatı incelemesi |
| Consent receipt | İspat ve hak yönetimi | Receipt olayı | Süre belirlenmedi | Pseudonymous ispat veya silme | Evet | Hukuk onayı zorunlu |
| Moderasyon görevi/kararı | Platform güvenliği | Görev kapanışı | 24 ay taslak | PII redacted audit'e indirgeme | Evet | İtiraz süresiyle uyumlanmalı |
| Fraud case | Dolandırıcılığı önleme | Vaka kapanışı | Risk bazlı, belirlenmedi | Anonimleştir/sil | Evet | DPIA ve meşru menfaat testi |
| Fiyat/stok geçmişi | Operasyon/audit | Stok kapanışı | 24 ay taslak | Aggregate anonimleştir | Evet | Finansal kayıt ayrımı yapılmalı |
| Fatura ve ödeme kaydı | Mali yükümlülük | Mali dönem kapanışı | Kanuni süre hukuk/mali müşavirce belirlenir | Kanuni imha | Evet | Finansal mevzuat otoritesi |
| Güvenlik/audit olayı | Güvenlik ve hesap verebilirlik | Olay zamanı | 24 ay taslak | Pseudonymous özet/rotasyon | Evet | Ham PII yasak |
| Analytics aggregate | Ürün ve satıcı analitiği | Aggregate üretimi | Süresiz yalnız geri döndürülemezse | Tut veya yeniden anonimleştir | Hayır/istisnai | Re-identification testi gerekli |
| Import dosyası | Toplu stok aktarımı | Batch tamamlanması | 7 gün | Kaynak dosyayı sil; satır sonucu sınırlı tut | Evet | Ham VIN/plaka içerir |
| Quarantine medya | Güvenlik taraması | Upload | 24–72 saat | Başarılı türetim sonrası sil veya reddedileni imha et | Evet | Otomatik job SLA |
| Görüşme/video kaydı | Gelecek canlı oturum | Oturum sonu | Varsayılan kayıt yok | Ayrı rıza varsa özel sınıf | Evet | Gelecek faz; varsayılan kapalı |
| AI konuşma içeriği | Gelecek satış asistanı | Konuşma kapanışı | Belirlenmedi | Amaç bazlı sil/redact | Evet | Model eğitimi varsayılan yasak |

## Silme iş akışı

`ACTIVE → PURPOSE_COMPLETED → DELETION_DUE → DELETION_IN_PROGRESS → DELETED_PRIMARY → BACKUP_EXPIRY_PENDING → DESTROYED`

Alternatif son durum `ANONYMIZED`; legal hold sırasında `LEGAL_HOLD` uygulanır ve hold kalkınca önceki retention kararı yeniden hesaplanır.

## Hukuk ekibinden beklenen kararlar

1. Her satır için veri sorumlusu/veri işleyen rolü.
2. Hukuki sebep ve açık rıza gereksinimi.
3. Kesin retention süreleri ve başlangıç olayları.
4. VIN/plaka fingerprint saklamasının gereklilik-orantılılık testi.
5. Lead'in satıcıya aktarımı sonrası tarafların yükümlülükleri.
6. Ticari iletişim ve İYS operasyonu.
7. Mali kayıt, uyuşmazlık ve zamanaşımı süreleri.
8. Backup ve disaster-recovery imha kanıtı.
9. Video/AI conversational commerce için ayrı DPIA gereksinimi.

