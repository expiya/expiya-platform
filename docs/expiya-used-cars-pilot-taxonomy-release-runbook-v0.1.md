# Expiya İkinci El — Pilot taxonomy release runbook v0.1

## Amaç ve sınır

İlk sürüm Türkiye'de yaygın kurumsal ikinci el stoklarını kontrollü bir pilotta eşleştirecek kadar araç kimliği sağlamayı hedefler. “Türkiye'deki veya dünyadaki bütün araçlar eksiksizdir” iddiası yoktur. Mevcut 549 varyantlı sıfır araç kataloğu ayrı bounded context olarak kalır; taxonomy referans çalışmasına yardımcı olsa bile hiçbir kaydı somut ikinci el stok, satıcı beyanı veya doğrulanmış geçmiş olarak kullanılamaz.

## Release sırası

1. Pilot şehir ve satıcı stok örneklemi yalnız kapsam ölçümü için anonim/agregat biçimde belirlenir.
2. Marka → model → nesil → gövde → güç aktarma → pazar varyantı → donanım kimlikleri kaynaklı fact'lerden oluşturulur.
3. Kaynağın kullanım izni, pazar uygunluğu ve review tarihi ayrı kapıdan geçer. Otomatik edinim yalnız açık lisans veya sözleşmeli/lisanslı kaynakta ayrıca onaylanabilir.
4. Stable ID, alias, dönem ve supersede grafiği doğrulanır. Stable ID yeniden kullanılmaz; düzeltme yeni sürüm ve audit olayı üretir.
5. Her public fact en az bir izinli kaynağa ve moderasyon kararına bağlıdır. Çelişki ve düşük güven public fact'i bloke eder.
6. Klasik/nadir/özel ithal araçlar genel editörden değil özel identity request kuyruğundan geçer.
7. Payload deterministik üretilir, SHA-256 checksum alınır, değişiklik özeti ve rollback paketi hazırlanır.
8. Birinci inceleme ile owner/ikinci inceleme ayrılır. Onaylanan paket staging'de eski ve yeni sürüm birlikte okunarak denenir.
9. Aktivasyon atomik release pointer değişimidir. Eski sürüm saklanır; hata halinde pointer geri alınır.

## Kabul ölçütleri

- Kaynak/lisans envanterinde belirsiz kullanım izni yok.
- Pilot kapsamındaki her leaf kimlik için provenance ve TR market gerekçesi var.
- Duplicate canonical ad, normalize alias çakışması, kopuk/cyclic supersede yok.
- Eksik identity satıcı serbest metniyle canonical kayda dönüşmüyor.
- Klasik yüksek riskli iddialar taxonomy kimliğiyle karıştırılmıyor; araç-level evidence sürecinde kalıyor.
- Önceki release ile geriye uyumluluk ve rollback tatbikatı tamam.

## Açık dış kapılar

İki public pilot katmanlı candidate, yüzde 100 provenance/review gate ve altı rollback senaryosu staging bootstrap sözleşmesi olarak hazırdır. Lisanslı kaynak sözleşmeleri, gerçek başlangıç veri seti, duplicate çözüm kurulu, klasik uzman paneli, hukuk kullanım incelemesi ve staging rollback koşumu tamamlanmadı. Bu nedenle `publicTaxonomyReleaseAuthorized` sabit `false` kalır. Bu paket veri edinimi, scraping, production yayını veya gerçek araç stok oluşturma yetkisi vermez. Ayrıntılı staging sınırı `docs/expiya-used-cars-staging-taxonomy-pilot-bootstrap-v0.1.md` içindedir.
