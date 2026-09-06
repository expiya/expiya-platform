# Expiya İkinci El — Staging feed sandbox bootstrap v0.1

## Kanal sınırı

CSV, XLSX, SFTP feed, pull API ve push API aynı canonical validate-only sandbox'a girer. Tenant ve taxonomy release sentetiktir; endpoint, service account ve key referansları boş; gerçek satıcı verisi ve stok write kapalıdır.

## Sertifikasyon matrisi

On altı senaryo geçerli batch, şema/taxonomy/free-text kimlik hatası, cross-tenant girişim, imza/nonce/idempotency saldırıları, MIME/malware/formula injection, duplicate VIN, partial batch, omission, explicit closure ve stale-feed davranışını kapsar. Kanıtlar VIN/plaka içermez.

## Load ve reconciliation

10 bin satırlık sentetik batch 15 dakika hedefiyle dry-run edilir. Retry aynı sonucu vermeli, aynı key/farklı payload reddedilmelidir. Create/update/unchanged/explicit closure/omitted ayrı raporlanır; omission deletion ve cross-tenant mutation sıfırdır. Redakte hata raporu ve named support owner zorunludur.

## Güncel durum

Sandbox channel, certification ve load/reconciliation gate sözleşmeleri hazırdır. Provider mapping, endpoint, credential, key rotation, gerçek load/reconciliation koşumu ve support ataması yoktur. Provider certification, real feed connection ve inventory write yetkileri kapalıdır.
