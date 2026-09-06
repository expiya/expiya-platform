# Expiya İkinci El — Staging observability bootstrap v0.1

## Pipeline ayrımı

Public organik, sponsorlu, partner operasyonu, trust/moderasyon ve security/SIEM için beş ayrı pipeline bulunur. Endpoint, credential, region ve retention birlikte onaylanmadan kısmi sink yapılandırması yapılamaz. Raw payload ve production event kabulü yasaktır.

## Redaction canary

Sentetik VIN, plaka, telefon, e-posta ve token değerleriyle local canary çalışır. Hassas key tamamen düşürülür; serbest string içindeki PII `[REDACTED]` olur. Canary başarısı dış provider export'u değildir. Provider bağlandıktan sonra aynı fixture, sink'te ham değerin bulunmadığını kanıtlamalıdır.

## Alarm rotaları

Tenant isolation ve unsafe lead handoff ilk olayda page; stok freshness ve moderation SLA urgent ticket; partner hata oranı ticket üretir. Her alarm primary/backup owner, repository runbook yolu, destination ref ve checksum'lu synthetic route test kanıtı ister.

Gerçek notification varsayılan kapalıdır. Sentetik pager testi için ayrıca named operasyon yetkisi gerekir; yanlış kişiye veya production kanalına bildirim gönderilmez.

## Güncel durum

Beş disabled sink, dört redaction canary ve beş alert route taslağı hazırdır. Provider endpoint/credential/region/retention, SIEM onayı, gerçek route destination, synthetic notification testleri ve load baseline eksiktir. Telemetry export ve production alerting kapalıdır.
