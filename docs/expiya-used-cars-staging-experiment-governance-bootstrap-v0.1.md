# Expiya İkinci El — Staging experiment governance bootstrap v0.1

## Allocation sınırı

B2C onboarding, eşleşme açıklaması, listing detayı, lead CTA ve partner workflow ayrı namespace kullanır. Yalnız anonim veya hesap-stabil pseudonymous bucket anahtarları kabul edilir. Tenant, paket, ücret, sponsorlu statü, araç kimliği veya kişisel veri allocation girdisi değildir. Organik ranking mutation kapalıdır.

## Kill-switch tatbikatı

Dokuz sentetik senaryo cross-tenant, rıza, yanlış doğrulama, kesin satın alma dili, sponsorlu-organik karışması, erişilebilirlik, şikâyet, hata eşiği ve global disable durumlarını kapsar. Tetik sonrası allocation durmalı ve baseline en fazla beş dakikada geri gelmelidir.

## Audit export

Manifest, allocation özeti ve guardrail kanıtı checksum ile bağlanır. Başarısız ve durdurulmuş sonuçlar silinmez. Export ham PII veya tenant/ticari özellik içermez ve bağımsız review ister.

## Güncel durum

Allocation, kill-switch ve audit export sözleşmeleri hazırdır. Platform/provider, gerçek monitoring bağlantısı, koşum, audit storage ve bağımsız review yoktur. Real experiment, kill-switch activation, audit export, organic ranking experiment ve automatic winner rollout yetkileri kapalıdır.
