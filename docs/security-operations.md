# Expiya güvenlik operasyonları

Bu belge 13 Ağustos 2026 tarihli kod ve canlı ortam doğrulamasına dayanır. Kontroller riski azaltır; sistemin tamamen güvenli olduğunu garanti etmez.

## Zorunlu deployment değişkenleri

Vercel > Project > Settings > Environment Variables altında Production, Preview ve Development kapsamlarını bilinçli biçimde ayrı yönetin:

- `OPENAI_API_KEY`: yalnızca server-side secret. Preview için ayrı proje/anahtar kullanın.
- `UPSTASH_REDIS_REST_URL` ve `UPSTASH_REDIS_REST_TOKEN`: global, kalıcı rate limiting için aynı Redis veritabanına ait REST bilgileri.

Değişkenleri ekledikten sonra yeni production deployment başlatın. Vercel loglarında `rate_limit_backend_error` görülmediğini ve Redis'te `ratelimit:*` anahtarlarının TTL ile oluştuğunu doğrulayın. Redis arızasında kod instance belleğine düşer; Cloudflare dış sınırı bu nedenle ayrıca zorunludur.

## Cloudflare

1. Rules > Transform Rules > Modify Response Header bölümünde `Access-Control-Allow-Origin: *` ekleyen kuralı bulun ve kaldırın/devre dışı bırakın. Bu uygulama üçüncü taraf tarayıcı origin'lerine API sunmuyor.
2. Rules > Rate limiting rules altında yalnızca `POST` ve URI path `/api/cars/conversation` için IP başına 10 dakikada 20 istek; `/api/cars/listing-analysis` için 10 dakikada 5 istek sınırı oluşturun. Eşik aşımında önce 10 dakika Managed Challenge, tekrarda Block kullanın.
3. Security > Bots altında Bot Fight Mode/uygun ücretli plandaki Super Bot Fight Mode'u etkinleştirin. Doğrulanmış iyi botlara izin verin; API POST yollarında otomasyon sinyallerini challenge edin.
4. WAF Managed Rules altında Cloudflare Managed Ruleset'i etkinleştirin. API yollarında yöntem allowlist'i `POST` ve `OPTIONS` ile sınırlayın; `Content-Type` değeri `application/json` olmayan POST'ları engelleyin.
5. Security > Events ekranında API path, 429, challenge ve block olayları için haftalık inceleme yapın. Hesap planı destekliyorsa Logpush'u bir SIEM/log hedefine açın.
6. Değişiklikten sonra `curl -I https://www.expiya.com` çıktısında `access-control-allow-origin` bulunmadığını; kötü origin ile API POST'un 403 verdiğini doğrulayın.

## Vercel izleme ve alarmlar

Uygulama kişisel veriyi loglamaz; güvenlik olayları JSON olarak `type=security`, `event`, `scope`, `backend` ve süre alanlarıyla yazılır. IP ve konuşma kimliği loglanmaz, rate-limit anahtarlarında SHA-256 özeti kullanılır.

1. Project > Logs üzerinde `"type":"security"` filtresini kaydedin.
2. `rate_limit_backend_error` tek bir 5 dakikalık aralıkta görülürse Redis erişimini inceleyin.
3. `rate_limit_rejected` baz oranının 3 katına veya 5 dakikada 20 olaya çıkarsa Cloudflare Security Events ile korelasyon yapın.
4. Runtime 5xx oranı 5 dakikada %2'yi aşarsa alarm; OpenAI 429/5xx artışı varsa maliyet/anahtar olay prosedürü başlatın.
5. Log drain kullanılıyorsa token, istek gövdesi, sohbet metni, ilan içeriği ve tam IP'yi ingest etmeden önce redakte edin. Güvenlik loglarını 30 gün, agregaları 90 gün saklayıp sonra otomatik silin.

## OpenAI anahtar ve bütçe kontrolü

1. Production ve Preview için ayrı OpenAI project oluşturun; her biri için ayrı service-account anahtarı üretin.
2. Anahtarı yalnızca Vercel encrypted environment variable olarak tutun. Tarayıcıya açılan `NEXT_PUBLIC_*` isim kullanmayın.
3. Project budget için düşük bir aylık soft alert (%50, %75, %90, %100) tanımlayın. OpenAI bütçesi tek başına kesin hard cap kabul edilmemelidir; Cloudflare ve Redis sınırları maliyet kontrolünün asıl uygulama katmanıdır.
4. Usage ekranında model ve project bazında günlük maliyeti izleyin. Günlük beklenen değerin 3 katına çıkış için alarm kurun.
5. Anahtarı 90 günde bir ve şüpheli log/harcama halinde hemen döndürün: yeni anahtar ekle, redeploy et, smoke test yap, eski anahtarı iptal et.
6. Anahtar sızıntısında Cloudflare API POST'larını geçici Block yapın, anahtarı iptal edin, Vercel deployment/log erişimlerini inceleyin ve olay kaydı açın.

## Gizlilik, saklama ve silme

- Sohbet ve karar verisi artık sunucuda kalıcı saklanmaz; aynı sekmenin `sessionStorage` alanında tutulur ve sekme kapanınca tarayıcı tarafından kaldırılır. Kullanıcı arayüzündeki “Görüşmeyi sil” eylemi alanı hemen temizler.
- İstek işlenirken sohbet metni OpenAI'ye gönderilir. Gizlilik politikası veri kategorilerini, amacı, hukuki dayanağı, OpenAI/Vercel/Cloudflare alt işleyenlerini, uluslararası aktarımı ve kullanıcı haklarını açıkça belirtmelidir.
- Ham istek gövdeleri uygulama loglarına yazılmamalıdır. Sağlayıcıların kendi retention ayarları sözleşme ve ürün ayarları üzerinden ayrıca doğrulanmalıdır.
- Kullanıcı hesabı veya server-side kayıt eklenirse kayıt başına sahiplik, export ve doğrulanmış silme endpoint'i olmadan production'a alınmamalıdır. Önerilen varsayılan süre: aktif karar verisi 30 gün, güvenlik logu 30 gün, anonim agregalar 90 gün.
- Gizlilik talebi için iletişim kanalı, kimlik doğrulama yöntemi, 30 günlük cevap SLA'sı ve alt işleyenlere yayılmış silme prosedürü yayınlanmalıdır.

## CSP kararı ve deployment sonrası kanıt

Next.js 16.3 yerel dokümantasyonu nonce CSP'nin tüm sayfaları dinamik render'a çevirdiğini, statik üretim/ISR/CDN cache avantajını kaldırdığını ve PPR ile uyumsuz olduğunu belirtir. Mevcut ana sayfa canlıda `x-vercel-cache: PRERENDER` olarak doğrulandı. Bu nedenle bu değişiklikte nonce yerine Next.js deneysel SRI (`sha256`) ek savunma olarak açıldı. Production build çıktısı çoğu framework scriptinde `integrity` üretti; fakat RSC bootstrap verisinin nonce/hash taşımayan inline scriptlerle kaldığını da doğruladı. Sayfayı bozmamak için `script-src` ve `style-src` içindeki `unsafe-inline` şimdilik korunuyor. SRI, inline script riskini tek başına çözmez.

Deployment sonrasında:

1. Ana sayfa, analiz ve karar sayfasını temiz tarayıcı profiliyle açın; console'da CSP ihlali olmadığını doğrulayın.
2. HTML'deki Next framework scriptlerinin çoğunda `integrity` özniteliği bulunduğunu doğrulayın; bütün scriptlerde bulunduğu varsayımını yapmayın.
3. Script integrity yoksa veya hydration bozulursa deployment'ı geri alın; nonce tabanlı dinamik render için ayrı performans testi yapın.
4. `curl -I` ile CSP, HSTS, `nosniff`, frame, referrer, permissions ve `Cache-Control: no-store` başlıklarını her iki API'de yeniden kontrol edin.

## Düzenli tarama

- Her pull request'te `npm audit --omit=dev`, test, lint ve production build çalıştırın.
- Haftalık olarak `git grep` tabanlı secret taraması; tercihen GitHub secret scanning/push protection ve Dependabot alerts etkinleştirin.
- Aylık olarak dış bağımlılıkları ve canlı başlıkları tekrar doğrulayın. SSRF test setine IPv4/IPv6 özel, link-local, mapped IPv6, redirect ve DNS değişimi vakalarını ekleyin.
