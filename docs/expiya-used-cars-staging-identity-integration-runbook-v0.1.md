# Expiya İkinci El — Staging identity integration runbook v0.1

## Provider-neutral manifest

Partner, ops ve public için üç ayrı OIDC audience kullanılır. Redirect ve post-logout URI'ları exact HTTPS allowlist'tir; wildcard yoktur. Authorization Code + PKCE, state, nonce, refresh-token rotation ve en fazla 60 saniye clock skew zorunludur. Kabul edilen imza algoritmaları yalnız RS256/ES256'dır.

## Claim güven sınırı

Provider token'ındaki tenant, branch veya rol claim'i doğrudan authorization kaynağı değildir. Token yalnız kimlik ve assurance sinyali sağlar. Tenant, rol, branch, active state ve auth version server-side membership store'dan çözülür. Subject eşleşmez, membership yok/pasif veya auth version revoke edilmişse fail-closed sonuç alınır.

## MFA ve yaşam döngüsü

Partner login en az AAL2 ister. Billing, export, moderasyon ve platform admin gibi kritik işlemler phishing-resistant step-up gerektirir. Invitation acceptance auth version döndürür; recovery tüm session'ları revoke eder. Ayrı partner ve ops recovery süreçleri self-approval'a izin vermez.

## Signing-key rotation

Mevcut/yeni/eski key ID'leri ayrıdır. Kontrollü overlap penceresi, en fazla bir saat JWKS cache, forced refresh, bilinmeyen key fail-closed ve rollback testi gerekir. Overlap bitince eski anahtar kapatılmalıdır. Rotation manifesti işlemi otomatik başlatmaz.

## Staging test matrisi

- Doğru/yanlış issuer ve audience
- Süresi geçmiş, gelecekte issued ve replay token
- AAL1→AAL2 step-up
- Pasif/suspended tenant ve user
- Branch erişim negatif testi
- Invitation expiry ve self-escalation
- Privileged recovery second approval
- JWKS rotation, unknown `kid`, cache refresh ve rollback
- Public/partner/ops audience çapraz kullanım reddi

## Güncel durum

Manifest, server-side membership resolution ve key-rotation sözleşmeleri hazırdır. Provider seçilmedi, issuer/JWKS/secret yapılandırılmadı ve gerçek staging testleri çalıştırılmadı. Authentication enablement ve rotation execution yetkileri kapalıdır.
