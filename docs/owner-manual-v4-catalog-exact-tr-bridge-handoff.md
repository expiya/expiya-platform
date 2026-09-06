# Katalog Görevi - Owner Manual Evidence V4.0 Exact Türkiye Köprüsü

## Amaç

`data/research/owner-manual-evidence-v4/catalog-exact-tr-bridge-handoff.json` içindeki 385 model ailesi ve 549 exact varyantı, resmî Türkiye donanım kaynaklarıyla eşleştir. Owner Manual V4 family capability kayıtlarını başlangıç adayı olarak kullan; tek başına exact otoriteye yükseltme.

Aktif katalog sürümü `v0.55.4`, fingerprint `sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9` olmalıdır. Uyuşmazlıkta fail closed davran ve veri üretme.

## Girdi

- Makine okunur iş paketi: `data/research/owner-manual-evidence-v4/catalog-exact-tr-bridge-handoff.json`
- Family assertion ve provenance: `data/research/owner-manual-evidence-v4/pilot-assertions.json`
- Discovery ve exact kimlikler: `data/research/owner-manual-evidence-v4/discovery-inventory.json`
- Kaynak erişim durumu: `data/research/owner-manual-evidence-v4/source-registry.json`
- Authority sözleşmesi: `docs/owner-manual-evidence-v4-authority-boundary.md`

## Kullanılabilecek exact Türkiye köprü kaynakları

1. Güncel resmî Türkiye equipment matrix.
2. Güncel resmî Türkiye configurator çıktısı.
3. Güncel resmî Türkiye fiyat/opsiyon listesi.
4. Kullanıcının açıkça yetkilendirdiği gerçek VIN'e ait resmî belge.
5. Model yılı, trim/paket ve Türkiye pazarı açıkça bağlı distribütör belgesi.

Her eşleme artifact URL veya izinli artifact referansı, SHA-256, physical PDF page veya section/table locator, market, model yılı, trim/paket, effective/observed tarih, polarity ve confidence taşımalıdır.

## Authority ve güvenlik kuralları

- Yabancı pazar el kitabı veya family capability tek başına `EXACT_VARIANT_VERIFIED` olamaz.
- El kitabındaki `varsa`, `modele/ülkeye/donanıma göre` anlatımı standart donanım üretmez.
- El kitabında geçmeyen özellik `NOT_AVAILABLE` veya negatif kanıt değildir.
- Family assertion tüm trimlere otomatik yayılmaz.
- Aynı exact varyant için çelişen kaynaklar ayrı tutulur; sessiz birleştirme yapılmaz.
- Güncel exact Türkiye kaynağı exact projection'da önceliklidir; düşük authority kaynak silinmez.
- VIN uydurulmaz; authentication, CAPTCHA, robots, rate limit veya erişim kontrolü aşılmaz.
- Telifli kaynak metni/görseli yayımlanmaz; sadece kısa normalize gerçek, locator, provenance ve checksum saklanır.
- Production pointer, deployment veya production database değiştirilmez.

## Öncelik

Önce `candidateFeatureCodes` dolu ve `bridgeStatus=EXACT_TR_BRIDGE_REQUIRED` aileleri işle. Kullanıcı ayırma değeri yüksek ilk alanlar: kapı açılma açıları, kayar/elektrikli kapılar, tavan rayı ve yük limiti, bagaj filesi, yük sabitleme noktaları, koltuk ısıtma, kamera sistemleri, çocuk koltuğu bağlantıları, çekme/yük limitleri ve şarj özellikleri.

Yeni tamamlanan public aileler ayrıca önceliklidir: Fiat E-Doblo Cargo, Mercedes-Benz eCitan Panelvan, Mercedes-Benz eVito Panelvan, MG MG7, Mitsubishi ASX, Mitsubishi Colt ve Mitsubishi Outlander.

## Beklenen çıktı

- Her exact varyant/feature çifti için `EXACT_VARIANT_VERIFIED`, `MODEL_YEAR_TRIM_APPLICABILITY` veya `RESEARCHED_INCONCLUSIVE` kararı.
- Exact doğrulama yoksa family capability korunmalı, exact varlık iddia edilmemeli.
- Her kararın kaynak ve locator provenance'ı.
- Exact/family/unresolved ve feature coverage raporu.
- Çelişki kaydı ve seçilen projection gerekçesi.
- Idempotent ve byte-identical deterministic regeneration.
- Catalog fingerprint mismatch testi, missing-is-not-negative testi, conditional-is-not-standard testi ve family-to-exact leakage testi.

## Kabul kapıları

- 549 exact varyantın tamamı sonuç dosyasında yer alır; doğrulanamayanlar açıkça unresolved kalır.
- Exact authority yalnız yukarıdaki Türkiye köprü kaynaklarından gelir.
- Family capability kaybolmaz ve exact varyanta sızmaz.
- Kaynak checksum ve locator alanları eksiksizdir.
- Scoped testler, TypeScript, ESLint ve `git diff --check` başarılıdır.
- Commit, push, deployment, production activation ve production write yapılmamıştır.
