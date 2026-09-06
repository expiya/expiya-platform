# Expiya İkinci El — Disaster recovery ve iş sürekliliği runbook v0.1

Staging backup target, restore/failover tatbikatı ve deletion-suppression ayrıntıları `expiya-used-cars-staging-backup-restore-bootstrap-v0.1.md` içinde ayrıca sürümlenmiştir.

## Veri sınıfları ve hedefler

Tenant operasyon verisi, VIN/plaka gibi hassas tanımlayıcılar, medya/belgeler, taxonomy release'leri, audit zinciri ve kritik konfigurasyon ayrı backup policy taşır. Audit zinciri için RPO 5 dakika; tenant/hassas veri için 15 dakika; medya için 60 dakika; taxonomy/config için günlük hedef tasarlanmıştır. RTO sınıfa göre 2–8 saattir. Bu değerler staging tatbikatıyla doğrulanmadan SLA değildir.

Kritik backup setleri şifreli, immutable ve environment/amaç ayrımlıdır. Cross-region kopya veri yerleşimi ve hukuk onayı olmadan kapalıdır. KMS key metadata ve wrapped key kurtarma stratejisi backup verisinden ayrı test edilir; key olmadan restore başarılı sayılmaz.

## Restore sırası

1. Incident commander kapsamı, recovery point ve hedef environment'ı belirler.
2. İki kişi restore onayı verir; production doğrudan hedeflenmez, izole staging recovery alanı kullanılır.
3. Backup checksum, manifest imzası, malware ve key version doğrulanır.
4. DB/schema uyumluluğu, row count, audit chain ve object inventory reconciliation yapılır.
5. Cross-tenant RLS negatif testleri, public projection PII taraması ve restore suppression uygulanır.
6. Synthetic read/write ve dependency health testleri çalışır.
7. Named decision maker GO/NO-GO verir; restore manifestosu production cutover'ı otomatik yetkilendirmez.
8. Cutover sonrası yoğun monitoring ve kontrollü failback penceresi açılır.

## Degraded mode

DB yalnız degraded/readable ise public ve partner read, görünür freshness ile sınırlı devam edebilir; write ve publication kapanır. Identity yoksa partner erişimi, KMS yoksa identifier write/publication, moderation yoksa yeni yayın kararı, lead gateway yoksa handoff ve ödeme sağlayıcısı yoksa tahsilat kapanır. Herhangi bir bağımlılığın bütünlüğü bilinmiyorsa tüm hassas erişimler fail-closed durur. Otomatik failover yoktur.

## KVKK silme ve backup

Primary silme backup'ı fiziksel olarak anında yeniden yazmaz; kayıt `BACKUP_EXPIRY_PENDING` olur. PII taşımayan HMAC restore-suppression listesi, restore edilen silinmiş scope'un kullanıma dönmesini engeller ve yeniden silme kuyruğuna alır. Legal hold süreli, gerekçeli ve audit'li olmalıdır. Backup retention dolup destruction evidence doğrulanmadan `DESTROYED` sonucu verilmez.

## Zorunlu tatbikatlar

- Tek tenant staging point-in-time restore ve başka tenant erişim negatif testi.
- Audit chain + object storage manifest reconciliation.
- KMS key version/rewrap ve key-unavailable fail-closed senaryosu.
- DB degraded read-only ve identity/KMS/moderation outage matrisi.
- Silinmiş subject restore suppression ve backup expiry evidence.
- Failover, rollback ve failback; RPO/RTO ölçümü ve veri kaybı raporu.

## Açık kapılar

Backup sağlayıcısı, KMS recovery onayı, staging restore, tenant isolation restore testi, failover/failback, backup expiry evidence ve iş sahibi atamaları tamamlanmadı. `realBackupAuthorized`, `productionRestoreAuthorized` ve `automaticFailoverAuthorized` sabit `false` kalır. Bu paket gerçek backup, restore veya altyapı failover işlemi değildir.
