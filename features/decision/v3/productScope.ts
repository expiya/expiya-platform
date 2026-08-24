export interface V3ProductScopeReply {
  readonly kind: "USED_VEHICLE_SELECTION" | "LIVE_STOCK" | "LIVE_CAMPAIGN" | "FINANCE" | "TRANSACTION";
  readonly message: string;
}

const usedVehicle = /(?:ikinci\s*el|2\.?\s*el|düşük\s*km|km(?:'|’)si\s*düşük|ilk sahibinden|boyasız|hatasız|servis bakımlı|temiz\s+(?:bir\s+)?(?:araç|otomobil|kombi)|ilan[\p{L}]*daki|not[ei]r|devr(?:i|ini)|ekspertiz)/u;
const selectionLanguage = /(?:almak|alacağ|alacağız|arıyorum|bakıyorum|yazıyorum|öner|bul|seç|teklif|kapora|devir|kapatacağ|satın)/u;

/** Product-capability boundaries are deterministic; the model may explain them but cannot redefine them. */
export function productScopeReply(message: string): V3ProductScopeReply | undefined {
  const text = message.toLocaleLowerCase("tr-TR");
  if (usedVehicle.test(text) && selectionLanguage.test(text)) {
    return {
      kind: "USED_VEHICLE_SELECTION",
      message: "İkinci el araç aradığını anladım. Tekil ilan, ekspertiz veya ikinci el araç seçimi yapamıyorum; karar motorum yalnızca satıştaki sıfır araç kataloğuyla çalışıyor. İstersen aynı ihtiyaca uygun sıfır araçlara bakalım ya da ikinci el alımında nelere dikkat edeceğini konuşalım.",
    };
  }
  if (/(?:stok|elinizde hazır|hemen teslim|hemen alabileceğ|(?:teslimat|teslim) (?:tarih|süre|durum)|(?:bugün|yarın|haftaya|bu hafta) teslim al)/u.test(text)) {
    return {
      kind: "LIVE_STOCK",
      message: "Canlı bayi stoğunu ve teslim tarihini göremiyorum; aktif sıfır araç kataloğundan ihtiyacına uygun modelleri seçebilirim. Kesin stok ve teslimat bilgisini seçtiğimiz araç için yetkili satıcıdan doğrulaman gerekir.",
    };
  }
  if (/(?:kampanya|indirim|güncel fırsat|en ucuz.*şu an)/u.test(text)) {
    return {
      kind: "LIVE_CAMPAIGN",
      message: "Canlı kampanya ve bayi indirimi bilgisine erişemiyorum. Aktif sıfır araç kataloğundaki fiyat ve özelliklerle uygun seçenekleri daraltabilirim; güncel kampanyayı son aşamada yetkili satıcıdan doğrulaman gerekir.",
    };
  }
  if (/(?:taşıt kredisi|araç kredisi|kredi faiz|kredi oran|taksit|ödeme sistemi)/u.test(text)) {
    return {
      kind: "FINANCE",
      message: "Canlı kredi oranı veya ödeme planı sunamıyorum; bunlar banka ve satıcıya göre değişir. Araç bütçeni aylık ödeme yerine toplam satın alma üst sınırıyla söylersen aktif sıfır araç kataloğunda uygun seçenekleri değerlendirebilirim.",
    };
  }
  if (/(?:kapora|takas|(?:resm[iî]\s+|fiyat\s+)?teklif|satış işlemi)/u.test(text)) {
    return {
      kind: "TRANSACTION",
      message: /teklif/u.test(text)
        ? "Resmî fiyat teklifi hazırlayamıyorum; ancak ihtiyacına göre aktif sıfır araç kataloğundan tarafsız bir kısa liste oluşturabilirim. Seçtiğimiz araçlar için güncel filo teklifini yetkili satıcıdan alman gerekir."
        : /takas/u.test(text)
          ? "Takas destekli sıfır araç almak istediğini anladım. Birçok bayi ikinci el araç için takas desteği sunabilir; canlı takas bedelini göremem ama alacağın sıfır aracı ihtiyacına göre tarafsız biçimde seçebiliriz."
          : "Kapora veya satış işlemi yapmıyorum. İhtiyacına göre aktif sıfır araç kataloğundan tarafsız bir kısa liste hazırlayabilirim.",
    };
  }
}
