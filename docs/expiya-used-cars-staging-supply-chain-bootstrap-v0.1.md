# Expiya İkinci El — Staging supply-chain bootstrap v0.1

## CI güvenlik zinciri

Dokuz fail-closed iş lockfile doğrulama, secret scan, SAST, dependency scan, lisans incelemesi, test/build, SBOM ve provenance üretimi, artifact scan ve promotion digest doğrulamasını kapsar. İşler minimum ağ yetkisiyle çalışır; manifest hiçbir write token, CI provider veya workflow aktivasyonu içermez.

## Artifact registry sınırı

Application image, SBOM ve provenance ayrı artifact sınıflarıdır. Immutable tag, digest-only promotion, encryption ve private access zorunludur. Registry/repository referansları provider seçilene ve güvenlik incelemesi tamamlanana kadar boş kalır.

## Kanıt paketi

Staging promotion kanıtı scan özeti, SBOM, imzalı provenance, immutability testi, lisans incelemesi, reproducible build ve promotion digest eşleşmesini içerir. Tüm kanıtlar aynı artifact digest'ine bağlı, checksum'lu ve bağımsız reviewer kimlikli olmalıdır.

## Güncel durum

CI, registry ve evidence sözleşmeleri hazırdır. Gerçek workflow, runner, registry, signing/KMS key, artifact, scan veya promotion koşumu yoktur. CI configuration, registry provisioning ve artifact promotion yetkileri kapalıdır.
