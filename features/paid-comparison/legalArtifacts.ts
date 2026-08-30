import { createHash } from "node:crypto";
import { paidComparisonLegalVersions } from "./legalVersions";

const artifact = <T extends string>(version: T, title: string, text: string) => ({
  version,
  title,
  text,
  checksum: createHash("sha256").update(text, "utf8").digest("hex"),
} as const);

export const paidComparisonProvider = {
  legalName: "SKYBIT YAZILIM VE BİLGİ TEKNOLOJİLERİ DANIŞMANLIĞI LİMİTED ŞİRKETİ",
  address: "Fenerbahçe Mah. İğrip Sk. No: 13 İç Kapı No: 1 Kadıköy / İstanbul",
  taxOffice: "Göztepe Vergi Dairesi",
  taxNumber: "7721628904",
  tradeRegistryNumber: "483626-5",
  mersisNumber: "0772162890400001",
  supportEmail: "iletisim@expiya.com",
  phone: "+90 533 407 26 51",
} as const;

const providerIdentity = `${paidComparisonProvider.legalName}; adres: ${paidComparisonProvider.address}; MERSİS: ${paidComparisonProvider.mersisNumber}; Ticaret Sicil No: ${paidComparisonProvider.tradeRegistryNumber}; ${paidComparisonProvider.taxOffice}, VKN: ${paidComparisonProvider.taxNumber}; e-posta: ${paidComparisonProvider.supportEmail}; telefon: ${paidComparisonProvider.phone}.`;

export const paidComparisonLegalArtifacts = {
  preInformation: artifact(
    paidComparisonLegalVersions.preInformation,
    "Ön bilgilendirme",
    `TASLAK — HUKUK ONAYI ZORUNLUDUR. Sağlayıcı: ${providerIdentity} Ürün, Expiya Cars karar kartındaki araç ile kullanıcının aynı sınıftan seçtiği iki sıfır araç varyantını karşılaştıran kişiselleştirilmiş dijital rapordur. Toplam bedel %20 KDV dâhil 349 TL'dir (KDV hariç 290,83 TL; KDV 58,17 TL); ayrıca teslim veya işlem ücreti alınmaz. Rapor, ödeme doğrulandıktan sonra elektronik ortamda hazırlanır, web üzerinden erişime ve PDF olarak indirmeye sunulur ve kullanıcının verdiği e-posta adresine gönderilir. Doğrulanamayan bilgiler açıkça belirtilir; rapor ekspertiz, bağlayıcı satış teklifi veya kesin al/alma talimatı değildir. Kullanıcı talep ve şikâyetlerini ${paidComparisonProvider.supportEmail} adresine iletebilir. Cayma hakkı, hemen ifa talebinin etkisi, 24 saatlik kolay iade politikası ve zorunlu tüketici hakları mesafeli satış sözleşmesinde açıklanır. Uyuşmazlıklarda yürürlükteki parasal sınırlara göre Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri nezdinde başvuru hakları saklıdır.`,
  ),
  distanceContract: artifact(
    paidComparisonLegalVersions.distanceContract,
    "Mesafeli satış sözleşmesi",
    `TASLAK — HUKUK ONAYI ZORUNLUDUR. Sağlayıcı: ${providerIdentity} Sözleşmenin konusu, %20 KDV dâhil 349 TL bedelli (KDV hariç 290,83 TL; KDV 58,17 TL) üç araç karar doğrulama raporunun elektronik ortamda hazırlanması ve teslimidir. Kullanıcı, ödeme öncesinde karşılaştırılacak üç varyantı görür. Ödeme iyzico Checkout Form üzerinden tek seferlik alınır; kart numarası, son kullanma tarihi ve CVV Expiya altyapısında saklanmaz. Ödeme doğrulandıktan sonra rapor üretimi başlar; rapor web erişimi, indirilebilir PDF ve kullanıcının bildirdiği e-posta adresiyle teslim edilir. Rapor üretilemez, teslim edilemez veya erişilebilir hâle getirilemezse kullanıcıdan yeniden ücret alınmadan düzeltme denenir; sonuç alınamazsa kullanılan ödeme aracına tam iade süreci başlatılır. Kullanıcı, raporun tesliminden itibaren 24 saat içinde ${paidComparisonProvider.supportEmail} adresine kolay iade talebi iletebilir. Bu gönüllü politika; ayıplı ifa, hiç ifa etmeme, zorunlu cayma ve diğer emredici tüketici haklarını sınırlandırmaz. Rapor, erişilebilir kaynaklara dayalı bir karar destek içeriğidir; veriler eksik, hatalı, gecikmeli veya güncelliğini yitirmiş olabilir ve satın alma öncesinde üretici, distribütör veya yetkili satıcıdan doğrulanmalıdır.`,
  ),
  immediatePerformance: artifact(
    paidComparisonLegalVersions.immediatePerformance,
    "Hizmetin hemen başlaması",
    "TASLAK — HUKUK ONAYI ZORUNLUDUR. Ödemenin doğrulanmasının ardından kişiselleştirilmiş dijital raporun hazırlanmasına cayma süresi sona ermeden başlanmasını açıkça talep ediyorum. Hizmetin açık onayımla hemen ifasına başlanmasının cayma hakkıma etkisi konusunda önceden bilgilendirildiğimi kabul ediyorum. Expiya Cars'ın sunduğu 24 saatlik kolay iade politikası ile ayıplı veya hiç ifa edilmeyen hizmetlere ilişkin emredici yasal haklarım saklıdır.",
  ),
} as const;

export const PAID_COMPARISON_LEGAL_READY = false;

export interface PaidComparisonLegalAcceptance {
  readonly preInformationVersion: typeof paidComparisonLegalArtifacts.preInformation.version;
  readonly distanceContractVersion: typeof paidComparisonLegalArtifacts.distanceContract.version;
  readonly immediatePerformanceVersion: typeof paidComparisonLegalArtifacts.immediatePerformance.version;
  readonly preInformationAccepted: true;
  readonly distanceContractAccepted: true;
  readonly immediatePerformanceAccepted: true;
  readonly acceptedAt: string;
}
