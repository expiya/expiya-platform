# Expiya İkinci El — URL, domain ve deployment ayrıştırma runbook v0.1

## Hedef topoloji

- `expiya.com` / `www.expiya.com`: genel platform.
- `/cars`: Expiya Cars.
- `/cars/ikinciel`: Expiya İkinci El public B2C canonical alanı.
- `partner.expiya.com`: kurumsal satıcı uygulaması.
- Expiya moderasyon/operasyon yüzeyi partner tenant oturumu değildir; ayrı identity audience ve yetki düzlemidir.

Bugünkü `/ikinciel` canonical girişi migration onayına kadar çalışmaya devam eder. Taşıma anında Next.js `redirects()` ile kök ve wildcard için 308 uygulanır; query string framework tarafından korunur. Redirect filesystem route'undan önce çalıştığı için yalnız yeni route parity tamamlandıktan sonra açılır.

## Aşamalı URL migration

1. `/cars/ikinciel` altında bütün mevcut public sayfaların route parity haritası çıkarılır.
2. Canonical, sitemap, robots, OpenGraph ve internal linkler önce yeni yolu işaret edecek biçimde staging'de doğrulanır.
3. Eski ve yeni yollar için içerik, parametre, query ve analytics attribution karşılaştırılır.
4. 308 root + wildcard kuralı staging'de crawl ve redirect-loop testinden geçer.
5. Tek release ile canonical/internal links/redirect etkinleşir; `/ikinciel` kalıcı olarak korunur.
6. 404, redirect latency, crawl/index ve conversion ölçümleri izlenir.
7. Geri alma gerekiyorsa redirect config geri çekilir; veri migration'ı olmadığı için route parity korunur.

## Uygulama güvenlik sınırı

Public ve partner ayrı deployment/environment, auth audience, session/CSRF secret, KMS context, database role, cache namespace, rate-limit namespace ve analytics stream kullanır. Partner cookie `.expiya.com` domain cookie olamaz; `__Host-`, host-only, secure, HTTP-only ve strict same-site olmalıdır. Public uygulama partner session'ını okuyamaz.

CORS allowlist exact origin kullanır; wildcard veya reflected origin yoktur. CSP önce report-only ölçülür, sonra enforce edilir. Kamera/mikrofon genel partner paneline açılmaz; ilerideki canlı video route'u provider ve hukuk onayı sonrası en dar Permissions-Policy ile ayrı değerlendirilir.

Public → partner geçişinde PII, tenant, lead veya stok yetkisi URL query/path içine konmaz. Opaque, tek kullanımlık, kısa ömürlü code server-side exchange edilir; callback allowlist ve state/PKCE uygulanır.

## Deployment ve rollback kapıları

- DNS/TLS, HSTS subdomain etkisi ve sertifika yenileme doğrulandı.
- Partner deployment ayrı secrets, logs, alerts, WAF/rate limits ve access review taşıyor.
- Auth issuer/audience, redirect URI ve logout URI exact allowlist.
- CSP report-only bulguları kapandı; Sentry/analytics PII redaction doğrulandı.
- Host-header poisoning, cache poisoning ve cross-origin negative testleri geçti.
- Eski/yeni URL SEO crawl ve 308 parity kontrolü geçti.
- Synthetic tests iki hostu yanlış surface'e yönlendirmiyor.
- Redirect ve partner deployment rollback tatbikatı tamamlandı.

## Açık kapılar

Üç yüzeyli deployment boundary, dokuz host-isolation senaryosu ve altı rollback senaryosu staging bootstrap sözleşmesi olarak hazırdır. DNS/TLS, ayrı partner deployment, identity audience, CSP report-only koşumu, SEO redirect doğrulaması, gerçek synthetic host testleri ve rollback tatbikatı tamamlanmadı. `legacyRedirectActivationAuthorized`, `partnerProductionDeploymentAuthorized` ve `dnsChangeAuthorized` sabit `false` kalır. Bu paket redirect, DNS veya production deployment uygulamaz. Ayrıntılı staging sınırı `docs/expiya-used-cars-staging-deployment-isolation-bootstrap-v0.1.md` içindedir.
