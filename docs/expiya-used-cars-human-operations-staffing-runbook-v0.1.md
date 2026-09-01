# Expiya İkinci El — İnsan operasyonu ve staffing runbook v0.1

## Zorunlu roller

Pilot owner, dealer success, L1 destek, L1/L2 moderasyon, fraud analisti, security on-call, privacy owner, hukuk approver ve incident commander atanmalıdır. Her atama güncel eğitim/sertifika, vardiya, ayrı yedek kişi ve aktiflik kaydı taşır.

## Görev ayrılığı

Aynı kişi L1 ve L2 moderasyon kararı veremez. Fraud analisti veya billing operasyonu kendi vakasında hukuk approver olamaz. Pilot owner tek başına security on-call ve nihai launch kararını üstlenemez. Acil durum erişimleri zaman sınırlı, amaç bağlı ve audit zorunlu olmalıdır.

## Rehearsal matrisi

Firma onboarding, ilan moderasyonu, fraud triage, lead desteği, privacy request, güvenlik olayı, firma askıya alma, degraded mode ve pilot stop runbook'ları en az iki farklı aktörle tatbik edilir. Başarılı sayılması için tamamlanma, checksum'lu kanıt ve tüm bulguların kapanması gerekir.

## Kapasite ve SLA

Vardiya planı stok ve lead tavanına göre kapasite içerir. Kuyruk gecikmesi, L1/L2 review süresi, güvenlik escalation süresi, privacy SLA ve satıcı yanıt süresi için alert eşikleri tanımlanır. Kapasite aşıldığında yeni firma/stok alımı durur; kalite kapıları gevşetilmez.

## Güncel durum

Rol, görev ayrılığı ve dokuz runbook'luk rehearsal matrisi hazırdır. Gerçek kişiler, eğitimler, vardiyalar, yedekler, SLA, escalation directory ve tatbikat kanıtları bulunmamaktadır. `HUMAN_OPERATIONS` staging, pilot ve production için `NO-GO`; gerçek moderasyon, destek ve pilot operasyon yetkileri kapalıdır.
