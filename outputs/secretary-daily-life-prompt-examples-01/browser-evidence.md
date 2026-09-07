# Browser evidence

Browser: Codex in-app Chromium, local Node 24.20.0 production build.

| Kontrol | Sonuç |
|---|---|
| Desktop 1280×720 | `clientWidth=1280`, `scrollWidth=1280`, composer width 896 px; yatay overflow yok. |
| Mobile 390×844 | `clientWidth=390`, `scrollWidth=390`; yatay overflow yok. |
| Mobile natural sentence | 84 karakterlik akıllı telefon örneği 104 px textarea / 126 px composer içinde 4 satırda, `overflowY=hidden` ve kırpılmadan göründü. |
| Focus pause | Placeholder focus sırasında 700 ms boyunca byte-for-byte sabit kaldı. |
| User input | `Kendi metnim` değeri bekleme sırasında değişmedi; placeholder gerçek `value` alanını overwrite etmedi. |
| Blur resume | Input temizlenip blur olduğunda placeholder aynı örnekte kaldığı yerden ilerledi. |
| Connected Root XPY | Doğal otomobil cümlesi `Sıfır otomobil` görüşmesini başlattı; bağlı durumda placeholder tam olarak boştu. |
| Reduced motion | Saf state/unit sözleşmesi ve component kaynağındaki `prefers-reduced-motion: reduce` kolu, örneği animasyonsuz tek seferde tamamlıyor. |

Placeholder passive bir textarea placeholder’ıdır; örnek buton veya tıklanabilir suggestion yüzeyi oluşturulmadı.

