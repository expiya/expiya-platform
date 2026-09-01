# Expiya İkinci El — Türkiye pilotu ve B2B onboarding runbook v0.1

## Kontrollü pilot tasarımı

İlk dalga ülke geneli değildir: en fazla iki şehir/bölge, 5–8 doğrulanmış firma ve toplam 250–500 uygun aktif stok hedeflenir. Şehir kararı talep büyüklüğünden önce doğrulanabilir firma havuzu, taxonomy kapsaması, moderasyon kapasitesi ve destek erişimine dayanır. Başlangıçta klasik araç yoktur.

Hedef segmentler yetkili satıcıların ikinci el birimleri, kurumsal galeriler, filo/kiralama satış birimleri ve ayrıca doğrulanmış diğer Türkiye tüzel kişileridir. Bireysel satıcı kabul edilmez. Ücretli veya erken erişim üyesi olmak yayın, organik sıralama ya da doğrulanmış araç statüsü satın almaz.

## Firma onboarding

1. Davet ve ön yeterlilik; segment, şehir, stok hacmi ve operasyon sahibi belirlenir.
2. Vergi/ticaret sicili, tüzel kişilik, yetkili kişi ve risk doğrulaması.
3. KVKK rolleri, platform/satıcı sorumlulukları, içerik lisansı, moderasyon, SLA ve fesih hükümleriyle sözleşme.
4. Pilot üyelik teklifi: 60–90 gün süreli, açık bitiş tarihli; organik sıralama avantajı yok.
5. Sandbox demo paneli, rol/MFA eğitimi, medya–kanıt–stok kalite eğitimi.
6. Sağlanan CSV şablonu veya belgelenmiş API/feed ile yalnız sentetik dry-run. Import idempotent olur; satır bazında hata ve taxonomy talebi üretir.
7. Expiya operasyon incelemesi; en az iki eğitimli kullanıcı, destek kanalı ve geri alma prosedürü.
8. Dış kapılar kapandıktan sonra ayrı yetkiyle kontrollü kohort aktivasyonu.

## Stok ve lead kalite ölçütleri

Kabul için kontrollü taxonomy, private VIN/plaka fingerprint, doğrulanmış şube, yedi günden yeni fiyat, 48 saatten yeni stok durumu, medya güvenlik kapısı, zorunlu alanlar, açık kanıt çelişkisi bulunmaması ve duplicate temizliği aranır. Stok kabulü ilan yayını değildir.

Lead kalitesi; açık iletişim rızası, ihtiyaç–stok eşleşme açıklanabilirliği, geçerli iletişim kanalı, satıcının bir iş günü içinde yanıtı ve kullanıcı şikâyetiyle ölçülür. Lead miktarı tek başına başarı değildir. Ücretli paket organik eşleşmeyi etkileyemez; sponsorlu alan ayrı ve etiketlidir.

## Durdurma ve çıkış

Tek bir cross-tenant veya kritik güvenlik olayı, doğrulanmamış bilginin doğrulanmış gösterilmesi, yüksek şikâyet oranı ya da yüksek stale-stock oranı pilotu durdurur. Firma askıya alınırsa stok fail-closed kaldırılır; lead erişimleri ve servis hesapları iptal edilir; audit ve incident süreci başlar. Pilot sonunda devam, düzeltme veya kontrollü exit kararı kayda alınır.

## Kohort ve dalga kontrolü

Kohort manifesti en fazla iki şehir, 5–8 firma, 5–16 şube ve 250–500 aktif stokla sınırlıdır. Product, Operations, Security ve Legal/Privacy olmak üzere dört farklı onay sahibi ile checksum'lı kanıt zorunludur. Klasik araç, bireysel satıcı ve ülke geneli görünürlük ilk kohortta yasaktır.

İlerleme yalnız `SANDBOX → INTERNAL_SHADOW → LIMITED_PUBLIC` sırasıyla yapılır. Her geçiş en az 14 günlük gözlem, en az 250 uygun stok, sıfır stop code, sıfır açık critical/high bulgu, yeşil veri kalitesi, moderasyon/destek SLA'sı, rollback provası ve dört ayrı onay ister. Teknik kapı yeşil olsa dahi promotion otomatik yetkilendirilmez.

Acil durdurma public ilanları ve partner write'larını kapatır, servis hesaplarını iptal eder, lead aktarımını durdurur, audit'i korur, incident açar ve sahipleri bilgilendirir. Sistem otomatik restart yapamaz; yeniden başlatma ayrı inceleme ve GO kararı gerektirir.

## Açık kapılar

Pilot şehirlerin yönetim onayı, gerçek firma sözleşmeleri, atanmış operasyon ekibi, destek SLA'sı, hukuk/KVKK onayı ve staging güvenlik koşumu tamamlanmamıştır. `pilotDataWriteAuthorized` ve `realLeadTransferAuthorized` sabit `false` kalır. Bu runbook gerçek firma kaydı, tahsilat, ilan yayını veya lead aktarımı yetkisi değildir.
