# Expiya İkinci El — Production identity readiness v0.1

## Güvenlik alanları

Partner kullanıcıları, Expiya personeli ve makine kimlikleri ayrı principal türleridir. Bir kimlik sağlayıcının token üretmesi tek başına yetki vermez: imza doğrulamasından sonra issuer, audience, subject, süre, replay ve assurance kontrolleri uygulanır; uygulama rolü authoritative Expiya kaydından bağlanır.

Dealer principal yalnız tek tenant'a bağlıdır. Şube kapsamı doğrulanmış oturumdan gelir ve her veri erişiminde RLS transaction context ile yeniden uygulanır. Expiya moderatörü dealer tenant'ını taklit edemez; görev süreli moderasyon grant'i kullanır. Sistem yöneticisi kalıcı tenant okuma yetkisi taşımaz.

## MFA ve yaşam döngüsü

- Partner erişiminde MFA zorunludur; kritik export, ödeme, moderasyon ve yönetim işlemleri phishing-resistant step-up ister.
- Passkey/WebAuthn tercih edilir; TOTP kontrollü fallback olabilir. SMS, kritik step-up için yeterli değildir.
- Davet tenant ve normalize e-posta HMAC fingerprint'ine bağlanır, tek kullanımlık ve süreli olur.
- Rol, şube, tenant durumu, davet kabulü ve kurtarma değişiklikleri auth-version rotasyonu ile mevcut session'ları fail-closed geçersizleştirir.
- Ayrıcalıklı hesap kurtarma iki kişi kuralına tabidir; recovery sonucu bütün session'lar iptal edilir ve audit olayı üretilir.
- Servis hesapları interaktif kullanılamaz, tek tenant ve dar scope ile sınırlıdır; insan rolleri alamaz.

## Sağlayıcı değerlendirme kriterleri

OIDC/OAuth standart uyumu, WebAuthn/passkey, kurumsal MFA enforcement, token/key rotation, SCIM gereksinimi, Türkiye veri aktarımı ve alt işleyen şeffaflığı, audit export, breach bildirimi, SLA, hesap kurtarma kontrolü ve vendor exit planı değerlendirilmelidir. Seçim, hukuk/KVKK ve güvenlik onayı olmadan tamamlanmış sayılmaz.

## Production öncesi zorunlu testler

1. JWKS/signing-key rotasyonu sırasında eski ve yeni anahtar geçişi.
2. Token replay, issuer/audience confusion, expired/not-before ve subject substitution saldırıları.
3. Tenant/rol/şube değişiminde aktif session iptali.
4. MFA enrollment, kayıp cihaz, recovery code ve privileged recovery tatbikatı.
5. Davet replay, e-posta değişimi ve çapraz tenant kabul denemesi.
6. Servis hesabı secret rotasyonu, scope escalation ve interaktif login reddi.
7. Auth outage fail-closed davranışı ve break-glass audit tatbikatı.
8. Bağımsız penetration test ve incident response tatbikatı.

## Açık kapılar

Provider seçimi, sözleşme/DPA ve KVKK değerlendirmesi, gerçek signing-key rotation testi, MFA enrollment/recovery testi, firma e-posta domain doğrulama kararı, penetration test ve incident drill tamamlanmamıştır. Bu nedenle `productionAuthenticationAuthorized` sabit olarak `false` tutulur. Bu belge entegrasyon sözleşmesidir; production kimlik sağlayıcı kurulumu veya gerçek kullanıcı kaydı değildir.
