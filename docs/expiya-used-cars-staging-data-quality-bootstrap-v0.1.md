# Expiya İkinci El — Staging veri kalitesi bootstrap v0.1

Altı tenant-scope, idempotent ve fail-closed iş tanımlıdır: fiyat güncelliği, stok güncelliği, duplicate adayları, taxonomy referansları, kanıt çelişkileri ve satılmış aracın public kaldırılması. Çalışma aralıkları 5–60 dakika arasındadır; bütün işler sentetik staging verisiyle ve production disabled durumunda kalır. Ham VIN/plaka loglanmaz.

Dokuz zorunlu prova; stale fiyat/stok, duplicate VIN adayı, geçersiz taxonomy, kanıt çelişkisi, yanlış doğrulanmış iddia, satıldığı halde public araç, yeni revision ile düzeltme ve iki kişili review sınırlarını kapsar. Her senaryo fail-closed publication sonucu, SHA-256 kanıtı ve kapatılmış bulgu ister.

Dashboard altı iş sinyalini tenant aggregation seviyesinde göstermeli; ham tanımlayıcı içermemeli, eşik sürümünü taşımalı, alert route testini ve iki farklı reviewer onayını kanıtlamalıdır. Bu bootstrap gerçek job kurmaz veya çalıştırmaz; production monitoring, otomatik republish ve kalite waiver yetkileri `false` kalır.
