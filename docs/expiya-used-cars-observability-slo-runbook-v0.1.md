# Expiya İkinci El — Observability, telemetry ve SLO runbook v0.1

## Ayrı telemetry alanı

İkinci el telemetry namespace'i sıfır araç ürün analitiğinden ayrıdır. B2C organik, B2C sponsorlu, partner operasyonu, platform moderasyonu ve güvenlik ayrı stream/sink kullanır. Event'ler schema version, event ID, trace ID, servis, environment ve düşük-cardinality attribute taşır. Gerçek export ayrıca yetkilendirilmeden yapılmaz.

Organik stream kampanya, paket, ücret veya sponsor alanı taşıyamaz. Sponsorlu event açık campaign attribution taşır. Ticari stream'in organik ranking servisine consumer bağlantısı yoktur. Analytics yalnız ölçer; karar skorunu değiştirmez.

## Privacy ve redaction

VIN, plaka, ad, telefon, e-posta, adres, vergi numarası, token/secret, belge ve ham konuşma telemetry attribute'u olamaz. Serbest stringler uzunluk sınırı ve değer-pattern redaction'dan geçer. Tenant/listing/user ID metric label'ı yapılamaz; yüksek cardinality ve cross-tenant çıkarım engellenir.

URL'ler query/fragment ve dinamik kimliklerden arındırılarak route template olarak kaydedilir. Log, trace ve error payload aynı redaction kütüphanesini kullanır. Redaction hatası fail-closed drop üretir; ham payload fallback olarak yazılmaz.

## SLO ve alarm

- Public read availability: 30 günde %99,9.
- Partner mutation success: 30 günde %99,5.
- Güvenli lead handoff: %100, sıfır tolerans ve ilk ihlalde page.
- Stok güncelliği: 7 günde en az %95.
- Moderasyon SLA: 7 günde en az %95.
- Tenant izolasyonu: %100, sıfır tolerans ve ilk ihlalde SEV1 page.

Availability ve operasyon SLO'larında minimum trafik eşiği olmadan sonuç çıkarılmaz. Burn-rate alert kısa ve uzun pencereyle doğrulanır. Güvenlik SLO'su error budget tüketmez; tek ihlal incident açar.

## Dashboard ve erişim

Public sağlık, partner operasyonu, taxonomy/import, moderasyon/fraud, commercial separation ve security panoları ayrıdır. Dealer paneli yalnız kendi tenant'ının k-anonim/agregat iş ölçümlerini görebilir; platform telemetry veya başka tenant karşılaştırması göremez. Raw logs least-privilege, MFA, süreli erişim ve audit gerektirir.

## Production öncesi kapılar

Provider/DPA ve veri konumu, redaction canary, dashboard review, alert routing tatbikatı, SIEM entegrasyonu, hukuk retention onayı ve load baseline tamamlanmalıdır. Synthetic event ile pager testi yapılır; gerçek PII kullanılmaz. Runbook linkleri ve on-call sahipleri alarm tanımına bağlanır.

## Açık durum

Telemetry provider, canary, dashboard, alert route, SIEM, retention ve load baseline dış kapıları açıktır. `realTelemetryExportAuthorized` ve `productionAlertingAuthorized` sabit `false` kalır. Bu paket gerçek telemetry göndermez veya pager tetiklemez.

Staging sink, local redaction canary ve alert-route bootstrap ayrıntıları `expiya-used-cars-staging-observability-bootstrap-v0.1.md` içinde sürümlenmiştir.
