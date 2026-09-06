# Expiya İkinci El — Ürün kararı onay ve değişiklik runbook v0.1

## Onay paketi

Her ürün kararı onayı; karar kimliği, karar snapshot checksum'u, açık onaylanan değer, owner kimliği/rolü, zaman damgası, gerekiyorsa sona erme tarihi ve bağımsız reviewer kaydı taşır. Hukuk ve güvenlik owner'lı kararlar bağımsız ikinci inceleme olmadan geçerli değildir; aynı kişi iki rolü üstlenemez.

Önerilen varsayılan değerler onay sayılmaz. Eksik, süresi geçmiş, supersede edilmiş, yanlış owner rolüyle imzalanmış veya checksum'u bozuk kayıt fail-closed reddedilir.

## Kapsam ve yetki sınırı

On ürün kararının tamamlanması yalnız `PRODUCT_GOVERNANCE` kanıtını hazırlar. Staging/pilot/production promotion, gerçek veri, firma, ilan, lead, ödeme veya deployment yetkisi ayrıca launch-control ve named scope approval gerektirir. Karar kaydı bu yetkileri otomatik açamaz.

## Değişiklik kontrolü

Onaylanmış karar yerinde düzenlenmez. Değişiklik teklifi:

1. Mevcut approval ve snapshot checksum'unu referanslar.
2. Yeni değeri ve gerekçeyi açıklar.
3. B2C, partner, ops, veri, güvenlik, hukuk ve ticari etkileri işaretler.
4. Checksum'lu rollback planı taşır.
5. Etkiye göre ürün, hukuk, güvenlik ve operasyon reviewer'larını toplar.
6. Yeni onay tamamlanınca eski kaydı supersede eder; eski kayıt audit için korunur.

Teklif oluşturulması mevcut kararı otomatik supersede etmez. Rollback kanıtı olmayan değişiklik promotion'a giremez.

## Audit ve saklama

Approval, rejection, expiry ve supersede olayları immutable audit envelope ile kaydedilmelidir. Approval belgelerinde gereksiz kişisel veri tutulmaz; loglarda serbest metin ve hassas kimlikler redacted edilir. Saklama süresi hukuk/retention matrisindeki business-approval sınıfına bağlanır.

## Güncel durum

Onay ve değişiklik sözleşmeleri sentetik olarak hazırdır. Gerçek owner kimlikleri, imzalar veya approvals oluşturulmamıştır. Mevcut on karar `PROPOSED`, product-governance readiness ise `NO-GO` kalır.
