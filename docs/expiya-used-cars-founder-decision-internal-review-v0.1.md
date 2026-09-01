# Expiya İkinci El — Kurucu kararları iç inceleme raporu v0.1

Tarih: 1 Eylül 2026
Bağlı kabul: `UC-RAT-2026-09-01-001`

## Sonuç

On kurucu kararının repository içi ürün/mimari, güvenlik sınırı, operasyon uygulanabilirliği ve hukuk/KVKK kontrol listesi incelemeleri tamamlandı. Mevcut mimari sözleşmelerle çelişen kritik bir iç bulgu tespit edilmedi. Dört track sonucu `INTERNAL_PASS_EXTERNAL_SIGNOFF_REQUIRED` durumundadır.

## İnceleme özeti

| Track | Kapsam | İç sonuç | Dış imza |
|---|---|---|---|
| Product/Architecture | 10 kararın tamamı; bounded context, taxonomy–stok ayrımı, matching tarafsızlığı ve release sınırı | İç kontrol geçti | Product owner kaydı gerekli |
| Security | Hesap/rıza, partner app ayrımı, lead erişimi ve sponsorlu yüzey | İç kontrol geçti; production bayrakları kapalı | Bağımsız security reviewer gerekli |
| Operations | Pilot coğrafya/stok, erken erişim, ekspertiz, klasik araç ve lead sahipliği | İç kontrol geçti; kapasite/tatbikat modelleri hazır | Named operations owner gerekli |
| Legal/KVKK | Hesap/rıza, üyelik, ekspertiz dili, lead, fiyat geçmişi ve sponsorluk | Kontrol listesi geçti; hukuk metinleri draft | Yetkili hukuk müşaviri gerekli |

## Kanıt sınırı

İnceleme; 18 güvenlik senaryosu, merkezi dış-aksiyon invariant'ı, tenant/RBAC sözleşmeleri, pilot kapasite ve kohort kapıları, incident/data-quality tatbikat matrisleri, 12 hukuk belgesi sınıfı, processing inventory, retention ve rıza sınırlarına dayanır. Repository taramasında production veya gerçek dış aksiyonu `true` yapan bir yetki kaydı bulunmamıştır.

Bu rapor hukuk görüşü, bağımsız pentest, atanmış operasyon kabulü veya production sign-off değildir. İlgili uzmanların kimliği ve kanıtı kaydedilmeden `PRODUCT_GOVERNANCE` hazır sayılmaz; staging, pilot ve production `NO-GO` kalır.
