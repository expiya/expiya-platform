# Expiya İkinci El — Şikâyet, itiraz ve hızlı kaldırma runbook'u v0.1

Durum: Sentetik sözleşme; gerçek başvuru, bildirim ve production mutation kapalıdır.

Başvuru sahipleri ilan veren, araç sahibi, hak sahibi, tüketici ve resmî makam olarak ayrılır. İnternet kanalı `/ikinciel/destek/ilan-sikayeti` için modellenmiştir; gerçek telefon numarası henüz belirlenmediğinden `PRODUCTION_DESTEK_TELEFONU_BELİRLENECEK` blocker'ı vardır.

Durum makinesi: `RECEIVED → ACKNOWLEDGED → TRIAGED`; değerlendirme sırasında `TEMPORARILY_HIDDEN` veya `EVIDENCE_REQUESTED`; sonuçta `RESOLVED` ya da `REJECTED_WITH_REASON`; sonra `CLOSED`. Sahte, yetkisiz veya yanıltıcı ilan ihbarında derhal geçici gizleme gerekir. EİDS/İETTS invalidation otomatik fail-closed kaldırma gerektirir.

Her vaka SLA, gerekçe kodu, immutable audit chain, itiraz hakkı, yüksek etkili kararda farklı iki reviewer, başvurana sonuç bildirimi ve legal-hold bayrağı taşır. Legal hold ilanı public tutmaz; yalnız delil saklama/retention politikasını etkiler. Beş dakikalık reconciliation taslağı satıldı, stoktan çıktı, EİDS süresi doldu/geri alındı, İETTS geçersiz veya zorunlu veri stale durumlarını tarar. Job sentetiktir; gerçek provider çağrısı, e-posta/SMS/telefon ve production write yapmaz.
