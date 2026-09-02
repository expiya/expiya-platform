# Logo İşbaşı fatura entegrasyonu — güvenli devreye alma kaydı

## Mevcut durum

Kod, Logo İşbaşı'nın 1.0.9 tarihli resmî Swagger sözleşmesindeki tek hesaplı giriş ve
`POST /api/v1.0/invoices/integrationInvoices` uçlarını temel alır. Sandbox hostu kodda
tam origin olarak sabitlenmiştir. Logo'nun destek kaydı üzerinden bildirdiği canlı origin
`https://lite-mw.isbasi.com` olarak ayrıca sabitlenmiştir. Canlı host, canlı mod ve ayrıca
`ISBASI_LIVE_INVOICING_ENABLED=true` olmadan kabul edilmez.

Bu değişiklik gerçek fatura kesimini etkinleştirmez. Sağlayıcıya yazma çağrısı yapan bir
route veya zamanlanmış worker bağlanmamıştır. Bunun nedeni, ödeme formunda alınan
TCKN/VKN ve fatura adresinin mevcut veri-minimizasyonu kararı uyarınca Expiya veritabanına
yazılmaması ve iyzico callback anında bu verinin güvenilir biçimde mevcut olmamasıdır.
Bu yaşam döngüsü çözülmeden otomatik fatura kesmek eksik/yanlış müşteri bilgisi veya
mükerrer fatura riski taşır.

## Sandbox ortam değişkenleri

Gerçek değerler yalnız Vercel şifreli environment variable alanında tutulmalıdır:

- `ISBASI_ENV=sandbox`
- `ISBASI_API_BASE_URL=https://soho-isbasi-mwv2-test.logo-paas.com`
- `ISBASI_API_KEY`
- `ISBASI_USERNAME`
- `ISBASI_PASSWORD`
- `ISBASI_LIVE_INVOICING_ENABLED=false`
- `SKYBIT_INVOICE_PROCESS_READY=false`

Repo, `.env*`, log, Sentry breadcrumb/tag ve analitik eventlerine anahtar, parola,
bearer token, tenantId, TCKN/VKN, açık adres, telefon veya e-posta yazılmamalıdır.

## Sandbox doğrulama sırası

1. İşbaşı test panelinde test işletmesi ve e-Arşiv yetkisi doğrulanır.
2. Muhasebeci; ürün/hizmet kodunu, yüzde 20 KDV hesabını (290,83 TL matrah +
   58,17 TL KDV = 349,00 TL), belge türünü ve internet satışına ilişkin zorunlu alanları
   yazılı olarak onaylar.
3. Sentetik bir alıcıyla yalnız bir sandbox fatura oluşturulur; dönen invoice ID kaydedilir.
4. Aynı sipariş için tekrar deneme yapılarak uygulama seviyesindeki unique order kilidinin
   ikinci yazmayı engellediği doğrulanır. Bu kilit henüz uygulanmadığı için bu adım şu an
   `BLOCKED` durumundadır.
5. Sandbox belgesinin İşbaşı panelindeki matrah/KDV/toplam ve belge durumu kontrol edilir.
6. Hatalı token, 401/403/429/5xx, timeout ve bilinmeyen yanıt testleri yapılır; kullanıcıya
   sağlayıcı gövdesi veya PII sızmadığı doğrulanır.
7. Test belgesi test panelinde iptal/silme prosedürüne göre temizlenir.

## Canlıya geçiş için zorunlu kararlar

- Fatura için gereken TCKN/VKN ve adresin ödeme ile callback arasındaki yaşam döngüsü:
  ham değeri kalıcı saklamayan, KVKK saklama/silme süresi belirlenmiş bir tasarım.
- Sipariş başına tek fatura garantisi: veritabanında `order_id` unique outbox kaydı,
  atomik claim, sınırlı retry ve manuel inceleme durumu.
- İşbaşı'nın canlı BASE_URL ve anahtarlarının doğrulanması ve rotasyon prosedürü.
- Sandbox E2E kanıtı, muhasebe onayı ve hata/iptal/iade mutabakatı.
- `SKYBIT_INVOICE_PROCESS_READY=true` ve `ISBASI_LIVE_INVOICING_ENABLED=true`
  kapılarının ancak yukarıdaki maddeler tamamlandıktan sonra açılması.

Bu maddeler tamamlanmadan canlı ödeme readiness değerlendirmesi
`INVOICE_PROCESS_NOT_READY` üretmeye devam eder.
