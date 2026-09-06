# Expiya İkinci El Ops/Admin Foundation v0.1

Durum: sentetik tasarım ve kod foundation'ı. Production authentication, provider çağrısı, e-posta/SMS, activation, ilan yayını, ödeme mutation'ı ve production DB write yetkili değildir.

Sentetik owner kararı (2026-09-02): `ops-owner-synthetic-001` / Serdar Akgül, Platform Sahibi olarak tüm modül kapsamlarını görüntüleme ve yönetme yetkisine; kullanıcı ve rol atamalarında tek yönetici sorumluluğuna sahiptir. Bu bir production hesabı değildir. Kritik işlem self-approval yasağı, ikinci göz ve step-up MFA owner için de geçerlidir.

## 1. Bilgi mimarisi ve ekran envanteri

- Komuta: operasyon dashboard, kişisel görevler, SLA/escalation, readiness, job/reconciliation.
- Firma: başvuru kuyruğu/ayrıntısı, belge ve İETTS inceleme, aktivasyon daveti, üye firma/şube, kullanıcı/rol, support access.
- Stok: moderasyon kuyruğu, ilan/revizyon ayrıntısı, EİDS, klasik araç, stale stok ve veri kalitesi.
- Yönetişim: taxonomy talep/kayıt/sürüm, kaynak-lisans, alias/supersede, ikinci göz ve rollback.
- Trust: fraud/duplicate, şikâyet, hızlı kaldırma, itiraz, güvenlik olayı ve session revoke.
- Ticari: üyelik/paket/abonelik, ödeme ve fatura salt operasyon görünümü. Kart/PAN yoktur.
- Kontrol: audit explorer, erişim/rol, break-glass, sistem sağlığı. Varsayılan görünüm maskeli ve görev kapsamlıdır.

Masaüstü ilk ekranları: `/ops-demo`, `/ops-demo/login`, `/ops-demo/firma-basvurulari`, `/ops-demo/ilan-moderasyonu`, `/ops-demo/taxonomy`. Production'da ayrı deployment'ın köküne taşınır; `/ops-demo` production route'u değildir.

## 2. Temel kullanıcı yolculukları

1. Staff `ops.expiya.com` adresini doğrudan açar; public sitede keşif linki yoktur.
2. Ayrı OIDC client/audience ile passkey veya donanım anahtarı kullanır; rol token'dan değil authoritative Expiya role store'dan çözülür.
3. Kullanıcı yalnız rol + atanmış görev + amaç + süre kesişimindeki kuyruğu görür.
4. PII/belge için amaç seçer; step-up sonrası süreli, maskesi kaldırılmış DTO alır; erişim audit'e yazılır.
5. Karar reason code ve evidence snapshot ister. Yüksek etkide farklı reviewer onayı gerekir.
6. Support access ayrı admin actor kimliği ve kalıcı banner ile açılır; tenant kullanıcısı impersonation edilmez.

## 3. Kritik wireframe'ler

```text
┌──────────── OPS / sentetik / auth kapalı ─────────────┐
│ Sol nav              │ SLA + güvenlik + görev kartları │
│ Komuta               │ [Atanmış işlerim] [İki göz]     │
│ Firma / İlan / Tax.  │ [Provider/job durumu] [Audit]    │
└──────────────────────┴──────────────────────────────────┘

Firma ayrıntısı: [maskeli profil] [belge/evidence] [İETTS]
                 [timeline]        [gerekçe] [onaya öner]

Support access:  [case] [tenant/şube] [süre] [RO/scope]
                 ===== EXPIYA ADMIN ERİŞİMİ banner =====

İlan: [revision diff] [EİDS] [fraud/duplicate] [evidence]
      [değişiklik iste] [geçici gizle] [ikinci onaya gönder]
```

## 4. RBAC matrisi

Kısaltmalar: V görüntüle, C oluştur, E düzenle, A onay, R reddet, S askıya al, H geçici gizle, K kalıcı kapat, X export, P PII, D belge, T tenant access, U kullanıcı/rol, F finans, L audit, B break-glass. `—` yok; `*` görev+gerekçe+süre; `2` ikinci onay; `RO` salt okunur. Export tüm roller için varsayılan kapalıdır ve ayrı grant gerekir.

| Rol | V | C | E | A | R | S | H | K | X | P | D | T | U | F | L | B |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Super Admin | * | — | config | 2 | — | — | — | — | — | — | — | — | 2 | — | RO | 2 |
| Operasyon yöneticisi | * | vaka | * | 2 | * | 2 | — | — | — | maskeli | * | * | atama | RO | RO | — |
| Firma doğrulama | atanmış | ek bilgi | öneri | öneri/2 | * | — | — | — | — | * | * | — | — | — | kendi vaka | — |
| İlan moderatörü | atanmış | — | karar | düşük etki | * | — | * | — | — | maskeli | atanmış | — | — | — | kendi vaka | — |
| Kıdemli moderatör | * | vaka | * | 2 | * | 2 | * | 2 | — | * | * | — | — | — | * | — |
| Taxonomy editörü | * | taslak | taslak | — | öneri | — | — | — | — | — | kaynak | — | — | — | kendi değişikliği | — |
| Taxonomy onaylayıcı | * | — | — | 2 | * | — | — | — | — | — | kaynak | — | — | — | * | — |
| Finans operasyonu | * | vaka | sınırlı | — | — | — | — | — | ayrı grant | maskeli | fatura | — | — | * | kendi vaka | — |
| Destek uzmanı | * | vaka | scope | — | — | — | — | — | — | maskeli | — | * | — | RO | kendi vaka | — |
| Trust & Safety | * | vaka | * | 2 | * | geçici | * | 2 | — | * | * | * | — | — | * | — |
| Hukuk/KVKK | vaka | vaka | vaka | scope | scope | — | — | — | ayrı grant | * | * | vaka | — | — | redacted | — |
| Audit görüntüleyici | RO | — | — | — | — | — | — | — | — | redacted | redacted | — | — | redacted | RO | — |
| Sistem yöneticisi | sağlık | config | config | — | — | — | — | — | — | — | — | — | teknik | — | teknik | — |

Bu tablo allowlist'in insan okunur özetidir; runtime source of truth `features/used-cars/ops/contracts.ts` olur. Super Admin işletme kararlarını bypass edemez.

## 5. Görev ayrılığı

| İşlem | Hazırlayan | Onaylayan | Yasak kombinasyon |
|---|---|---|---|
| Firma nihai onayı/aktivasyon | doğrulama uzmanı | operasyon yöneticisi/farklı reviewer | aynı actor; reviewer kendi tenant ilişkisi |
| Kalıcı firma kapatma | operasyon/T&S | farklı kıdemli + gerekirse hukuk | support actor tek başına |
| İlan kalıcı kaldırma/itiraz | moderatör | kıdemli moderatör | ilk karar actor'ı ikinci reviewer |
| Taxonomy release | taxonomy editörü | taxonomy onaylayıcısı | editör aktivasyonu; onaylayan taslak düzenleme |
| Ayrıcalıklı rol | Super Admin talep | farklı Super Admin + security | self grant/self approval |
| Finans düzeltmesi | finans operasyonu | finans onaylayıcı | moderasyon/sıralama etkisi |
| Break-glass | yetkili on-call | farklı approver, acilde post-review | audit/export kapatma |

## 6. İş akışları

Firma: submitted → kimlik → belge → İETTS → ek bilgi veya onay önerisi → farklı reviewer → approved → tek kullanımlık, hash'li, süreli activation grant. Ret neden kodu zorunlu; yeni evidence revision yeni inceleme üretir.

Aktivasyon: approval evidence snapshot → davet üretme talebi → ikinci kontrol → outbox'a sentetik kayıt → teslimat (şimdilik kapalı) → email fingerprint doğrulama → MFA enrollment → owner rolü → eski grant revoke. Admin şifre belirlemez ve linki görüntüleyemez.

İlan: immutable revision → assigned moderator → EİDS + taxonomy + media/fraud evidence → approve/request changes/reject/temp hide → yüksek etki ikinci göz → public projection. Tenant suspension veya EİDS/İETTS invalidation; unpublish, cache purge, notification ve reconciliation içeren idempotent fail-closed plan üretir.

Taxonomy: request → evidence/source/license review → match veya draft entity → editor sign-off → farklı approver → versioned release → ayrı activation control → supersede/rollback. Klasik araç düşük güvenle uzman kuyruğuna gider.

Şikâyet: intake → requester/evidence verification → risk triage → acilde geçici hide → bildirim/cevap hakkı → bağımsız karar. İtiraz ilk karar actor'ına atanamaz. Hızlı kaldırma geçicidir; kalıcı karar ikinci göz ve hukuki retention/hold kontrolü ister.

## 7. Support access ve break-glass

Support grant; actor, case/task, tenant/şube, reason, başlangıç-bitiş, read-only veya mutation allowlist'i bağlar. Mutation step-up MFA ve farklı approver ister. Ayrı admin identity korunur, kalıcı banner görünür, başlangıç/bitiş ve her eylem gerçek actor ile audit edilir. Toplu tenant gezinme ve export yasaktır; firma bildirimi policy sonucu üretilir.

Break-glass yalnız olay numarası, phishing-resistant step-up, farklı approver ve kısa TTL ile açılır. Scope incident ile sınırlıdır; session kaydı, immutable audit, security alert, export yasağı, otomatik kapanış ve zorunlu post-incident review vardır. Acil fail-closed koruma için ön onay mümkün değilse on-call policy açıkça tanımlanmalı; en geç 24 saat içinde iki kişi incelemelidir.

## 8. Authentication, session ve host izolasyonu

`ops.expiya.com` önerisi korunur: marka altında anlaşılır, ayrı host-only `__Host-` cookie sağlar ve partner/public origin'lerinden CSP/CSRF/cache/deployment ayrımı kurulabilir. Daha gizli bir alan adı gerçek güvenlik kazancı sağlamaz. En güçlü production modeli ayrı cloud project/account, WAF, secrets, runtime identity, DB role, build pipeline ve logs/SIEM sink'tir.

Ops OIDC issuer/client/audience (`urn:expiya:ops`) partner ve public'ten ayrıdır. Token role claim'i yetki kaynağı değildir. AAL2 zorunlu; kritik işlem passkey/WebAuthn/hardware key ile taze step-up ister. Idle 15 dk, absolute 8 saat, rotation 10 dk; authz version ve merkezi revoke her kritik istekte kontrol edilir. CSRF origin+token, strict CSP nonce, rate limit, bot sinyali, no-store, noindex, trusted-host allowlist uygulanır. IP/VPN sadece ek katmandır.

2FA yöntemi: birincil passkey/WebAuthn, yedek FIDO2 donanım güvenlik anahtarıdır. İki phishing-resistant credential enrollment'ı hedeflenir. TOTP yalnız security-reviewed recovery yoludur ve kritik işlem step-up'ında kabul edilmez. SMS ve e-posta OTP yasaktır. Recovery; helpdesk tarafından doğrudan resetlenemez, kimlik doğrulama, bekleme süresi, mevcut session revoke ve audit gerektirir.

## 9. Audit, evidence ve PII sınırları

Her event actor, tenant/branch, case/task, subject revision, reason, correlation, old/new value ref, approval chain, MFA assurance, support/break-glass grant ve policy version taşır. Payload yerine şifreli evidence object referansı ve checksum tutulur. Append-only ledger immutable/WORM sink'e replike edilir; erişim loglarından ayrı retention ve integrity verification bulunur.

PII ve belge DTO'ları varsayılan maskeli/minimumdur. Unmask amaç kodu, atanmış vaka, TTL, step-up ve audit ister. Belge object URL'leri kısa ömürlü, tek amaçlı ve download kapalıdır; malware scan/watermark uygulanır. Raw PAN/CVV hiçbir zaman alınmaz. Export kapalıdır; ayrı DLP, kapsam, onay, watermark ve expiry gerekir. Log/trace/error payload'larında redaction zorunludur.

## 10. Tehdit modeli

| Tehdit | Temel kontrol |
|---|---|
| Credential phishing/session theft | phishing-resistant MFA, rotation, device/risk signal, revoke |
| Token role forgery/wrong audience | authoritative role store, issuer/audience binding |
| BOLA/cross-tenant access | task-bound grants, server DAL/RLS, tenant context, audit |
| Invisible impersonation | separate admin actor, banner, no impersonation |
| Insider browsing/export | purpose+TTL, masking, export off, anomaly detection |
| Self approval/privilege escalation | four-eyes, incompatible roles, authz version, self-ban |
| Host/cookie confusion | separate host/deployment/audience/`__Host-` cookie/cache namespace |
| XSS/CSRF/clickjacking | nonce CSP, strict SameSite, origin/CSRF, frame-ancestors none |
| Evidence tampering | immutable revisions, checksum, append-only audit, WORM copy |
| Provider outage/stale authorization | fail closed, timestamp/TTL, reconciliation, unpublish plan |
| Mass destructive action | no bulk mutation, rate/volume guard, preview, second approval |
| Break-glass abuse | incident scope, short TTL, recording, alert, post-review |

## 11. Kapsam, readiness ve yol haritası

MVP: sentetik shell, 13 rol allowlist'i, auth adapter hard-off, assigned queues, masked DTO, support/four-eyes/audit contracts ve unit tests. Pilot: staging-only IdP, staff seed, RLS/DAL, immutable audit sink, synthetic provider adapters, passkey enrollment, security drills; gerçek tenant/PII yok. Production: ayrı deployment/account, reviewed IdP/KMS/SIEM/DLP, legal retention, vendor credentials, penetration test, DR, on-call ve explicit go-live approval.

Blocker'lar: IdP ve authoritative role store seçimi; production deployment/network sınırı; ops DB roles/RLS; immutable audit sink ve retention; passkey lifecycle/recovery; notification policy; provider sözleşmeleri; KVKK/DPIA; support/break-glass staffing; finance redaction; WAF/SIEM/DLP; two-person reviewer kapasitesi; production secrets ve go-live authority.

Teknik yol: (1) ADR + threat model sign-off, (2) ayrı ops app/deployment skeleton, (3) IdP/audience/cookie/session adapter staging, (4) policy-as-code + incompatible-role constraints, (5) server-only DAL/RLS and masked DTO, (6) audit/evidence outbox + immutable sink, (7) workflow engines/outbox/reconciliation, (8) queues/details/support banner, (9) adversarial isolation and pentest, (10) pilot evidence review, explicit production authorization and staged rollout.

## 12. Mevcut foundation ile uyum

Yeniden kullanılan kararlar: `partner-onboarding/applicationStateMachine.ts` ve `activation.ts`; `moderation/accessGrant.ts` ve `workflow.ts`; `taxonomy/governance.ts`; `dealer/iettsVerification.ts`; `listing/eidsVehicleAuthorization.ts`; `audit/envelope.ts`; tenancy/identity/session ve staging host isolation sözleşmeleri. Mevcut iki-role Expiya modeli değiştirilmedi; ops modeli ayrı namespace'te genişletildi.
