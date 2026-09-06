# Expiya İkinci El — KVKK ilgili kişi hakları runbook v0.1

## Kapsam

Erişim, düzeltme, silme/yok etme, işlemeye itiraz, rıza geri çekme ve veri aktarım alıcıları hakkında bilgi talepleri ayrı hak türleri olarak izlenir. Bu teknik runbook hukuk görüşü değildir; başvuru kanalı, kanuni süre, red gerekçeleri ve veri sorumlusu rolleri yetkili hukuk ekibince onaylanmalıdır.

## Talep yaşam döngüsü

1. Talep alınır; request ID, tarih, hak türü ve PII içermeyen subject-scope HMAC kaydı oluşturulur.
2. İlgili kişi veya temsilci kimliği orantılı yöntemle doğrulanır. Kimlik belgesinin kalıcı kopyası varsayılan olarak saklanmaz.
3. Hesap/iletişim challenge'ı, temsil yetkisi ve talebin kapsadığı Expiya/satıcı alıcıları belirlenir. Genel cross-tenant arama yapılmaz.
4. Veri envanteri hesap, rıza, lead, tercih özeti, iletişim, güvenlik, fatura ve alıcı kategorilerinde scope edilir.
5. Hukuki sebep, retention, legal hold, üçüncü kişi hakları ve güvenlik istisnaları alan bazında incelenir.
6. Erişim export'u redakte, şifreli, tek kullanımlık ve kısa ömürlü hazırlanır. Secret, fraud detection iç mantığı ve ham audit verilmez.
7. Düzeltme/silme/kısıtlama exact record revision'a uygulanır; alıcı satıcılara gerekli bildirim gönderilir.
8. Silme primary, cache/index/export, recipient ve backup-expiry/suppression adımlarıyla tamamlanır.
9. Cevap ve teslim kanıtı PII-free audit ile kapanır; talep kanuni süre içinde tamamlanır veya gerekçeli yetkili karar kaydedilir.

## Güvenlik

- Talep e-postasındaki link/dosya güvenilir kimlik kanıtı sayılmaz; phishing ve temsil sahtekârlığı kontrol edilir.
- Kullanıcıdan gereksiz T.C. kimlik, ruhsat, yüz görüntüsü veya açık adres istenmez.
- Export başka kişi, satıcı çalışanı, fraud kuralı, secret veya tenant iç verisini redakte eder.
- Download token URL'de PII taşımaz, tek kullanımlık ve kısa sürelidir; MFA/step-up uygulanır.
- Düzeltme/silme idempotent, revision-scoped ve iki kişi onaylı olabilir; geniş tenant silme değildir.
- Request analytics yalnız SLA bucket ve hak türü gibi düşük-cardinality değerler taşır.

## Legal hold ve alıcı koordinasyonu

Legal hold yalnız yetkili hukuk aktörü, dar veri kapsamı, gerekçe ve bitiş tarihiyle uygulanır; bütün talebi otomatik reddetmez. Hold dışı alanlar işlenmeye devam eder. Daha önce satıcıya aktarılmış lead için satıcı veri sorumlusu/işleyen rolü ve bildirim yükümlülüğü sözleşmede tanımlanır; bildirim delivery sonucu ve SLA audit'e bağlanır.

## Zorunlu tatbikatlar

- Hesabı olmayan kullanıcının lead erişim talebi ve orantılı kimlik doğrulama.
- Yetkisiz temsilci ve cross-tenant kapsam saldırısı.
- Üçüncü kişi redaction'lı encrypted export ve token expiry.
- Lead silme: primary/cache/index/recipient/backup suppression zinciri.
- Dar legal hold ile kısmi fulfillment.
- SLA yaklaşımı, escalation ve gerekçeli karar iletişimi.

## Açık kapılar

Dört intake kanalı, secure delivery sınırı ve dokuz senaryolu sentetik tatbikat staging bootstrap sözleşmesi olarak hazırdır. Hukuk metinleri, controller/processor rolleri, gerçek başvuru kanalı, identity verification koşumu, secure export delivery, deletion/backup drill, recipient SLA ve privacy ekibi tamamlanmadı. `realRightsRequestProcessingAuthorized`, `personalDataExportAuthorized` ve `personalDataDeletionAuthorized` sabit `false` kalır. Gerçek talep, export veya silme yapılmamıştır. Ayrıntılı staging sınırı `docs/expiya-used-cars-staging-privacy-operations-bootstrap-v0.1.md` içindedir.
