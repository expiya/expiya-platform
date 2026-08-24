# Expiya Cars Persona Evidence V3.9 — Yeni Sohbet Promptu

Expiya Cars için araç persona/evidence katmanını tüm aktif katalog modellerini kapsayacak biçimde tamamla ve V3 karar motoruna güvenli soft-ranking otoritesi olarak bağla.

Repository: `/Users/serdarakgul/Projects/expiya-platform`

Başlamadan önce mevcut çalışma ağacını ve şu katmanları incele:

- aktif production catalog ve exact variant/family kimlikleri
- `data/production/personas/vehicle-personas.v1.json`
- aktif owner-approved safe-traits release’i
- persona sanitization/derivation policy’leri
- vehicle evidence tabloları ve source snapshot yapısı
- V3 catalog adapter, ledger, ranking ve response realization

Amaç:

Aktif katalogdaki her model ailesi için kaynaklı, zamana bağlı ve denetlenebilir nötr araç karakteri üret. Kullanıcının “karizmatik”, “sürüşü keyifli”, “kokpit hissi güçlü”, “zamansız”, “genç/dinamik”, “konforlu”, “pratik”, “macera odaklı” gibi ifadelerini bu katman üzerinden yalnız soft ranking amacıyla değerlendir.

Araştırma:

- Her model için üreticinin resmî Türkiye/global model sayfası, teknik dokümanı, basın kiti ve tanıtım filmini tara.
- Güvenilir otomotiv yayınlarının yazılı incelemelerini ve editoryal YouTube test sürüşlerini incele.
- Güncel olmayan model yılı, farklı ülke donanımı ve farklı nesil içeriğini exact catalog family ile karıştırma.
- Her iddia için URL, yayıncı, başlık, yayın tarihi, erişim tarihi, ülke/pazar, model yılı/nesil ve desteklenen exact span/timestamp kaydet.
- Kaynak metinlerini kopyalama; kısa kanıt özeti ve nötr trait türetimi üret.
- Kullanıcı yorumları, forumlar ve sosyal medya yalnız zayıf keşif sinyali olabilir; üretim otoritesi olamaz.

Güvenlik ve yönetişim:

- Mevcut stereotipik persona metinlerini doğrudan runtime’a bağlama.
- Cinsiyet, meslek, sınıf, etnik köken, saldırgan sürüş veya yasa dışı davranış stereotiplerini taşıma.
- Yalnız onaylı nötr vocabulary kullan: `DESIGN`, `DRIVING_ENGAGEMENT`, `COMFORT`, `PRACTICALITY`, `TECHNOLOGY`, `PRESTIGE`, `VALUE`, `ADVENTURE`, `FAMILY`, `URBAN`, `COMMERCIAL`, `SUSTAINABILITY`, `MINIMALISM`.
- Persona hiçbir zaman hard filter, teknik gerçek veya donanım varlığı otoritesi olmasın.
- Teknik/donanım iddiaları mevcut katalog/equipment evidence katmanından doğrulanmadıkça kullanıcıya kesin gerçek olarak söylenmesin.
- Trait üretimi source-backed, family/variant-bound, versioned, checksum’lı ve owner-review gerektiren release akışıyla ilerlesin.

Uygulama:

1. Aktif katalogdaki tüm family/model kapsamını çıkar ve coverage manifest üret.
2. Eksik her family için kaynak araştırması ve evidence ledger oluştur.
3. Nötr trait derivation’larını kaynaklarla ilişkilendir.
4. Çelişkili veya yetersiz kanıtta trait’i boş bırak; tahmin üretme.
5. Owner-review workbook/manifest ve makinece okunabilir release candidate üret.
6. Onaysız release’i active pointer’a geçirme.
7. Onaylı safe traits’i V3 ranking’e yalnız bounded soft score olarak bağla.
8. Candidate filtering/count, affordability ve offer governance üzerinde etkisiz olduğunu invariant testleriyle kanıtla.
9. Tasarım, sürüş keyfi, teknoloji/kokpit, konfor, pratiklik ve macera corpus’larıyla ranking testleri yaz.
10. Kaynak outage, eksik coverage, nesil uyuşmazlığı ve cross-market contamination testlerini çalıştır.
11. Tüm ilgili testleri, TypeScript, ESLint ve `git diff --check` kapılarını çalıştır.

Commit, push, deployment veya production database write yapma. Kullanıcının unrelated değişikliklerini koru. Çalışmayı eksik model coverage veya bilinen runtime hatası varken tamamlanmış sayma.
