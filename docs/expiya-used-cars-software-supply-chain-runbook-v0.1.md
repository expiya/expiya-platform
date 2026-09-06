# Expiya İkinci El — Yazılım tedarik zinciri runbook v0.1

## Dependency kapısı

Runtime, build ve development dependency'leri sürüm, lisans, vulnerability, transitive ilişki ve review tarihiyle envantere alınır. High/critical bulgu promotion'ı durdurur. İstisna otomatik verilemez; owner, gerekçe, telafi kontrolü ve expiry ister. Bilinmeyen lisans fail-closed değerlendirilir.

## Build attestation

Artifact; source commit, workflow, artifact/SBOM/provenance/lockfile checksum'ları, builder identity ve imza taşır. Secret scan, SAST, dependency ve artifact scan başarıyla tamamlanır. Reproducible build doğrulaması olmadan production promotion yoktur.

Deployment öncesinde deploy edilecek checksum attestation ile bire bir karşılaştırılır. Commit veya artifact uyuşmazlığı supply-chain substitution sayılır ve release durdurulur.

## Secret yönetişimi

Secret'lar repository'de tutulamaz. Her secret environment, amaç, owner, KMS referansı ve rotasyon takvimi taşır. Public, partner ve ops aynı secret'ı paylaşamaz. Süresi gelen rotasyon veya eksik ownership aktivasyonu bloke eder.

## Promotion ve olay

SBOM ve provenance release kanıtına eklenir; artifact registry immutable olmalıdır. Compromise şüphesinde promotion durur, ilgili builder/credential revoke edilir, temiz kaynak ve runner ile rebuild yapılır ve kullanıcıya etkisi incident sürecinde değerlendirilir.

## Güncel durum

Dependency, attestation ve secret sözleşmelerine ek olarak staging CI, artifact registry ve yedi parçalı evidence bootstrap manifestleri hazırdır. Gerçek CI scan, SBOM, provenance signing, immutable registry, license review, secret inventory/rotation, reproducible build ve promotion koşumu eksiktir. `SUPPLY_CHAIN` staging, pilot ve production için `NO-GO`; artifact promotion, secret activation ve dependency exception yetkileri kapalıdır. Ayrıntılı staging sınırı `docs/expiya-used-cars-staging-supply-chain-bootstrap-v0.1.md` içindedir.
