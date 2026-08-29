import { createHash } from "node:crypto";
import { paidComparisonLegalVersions } from "./legalVersions";

const artifact = <T extends string>(version: T, title: string, text: string) => ({
  version,
  title,
  text,
  checksum: createHash("sha256").update(text, "utf8").digest("hex"),
} as const);

export const paidComparisonLegalArtifacts = {
  preInformation: artifact(
    paidComparisonLegalVersions.preInformation,
    "Ön bilgilendirme",
    "TASLAK — HUKUK ONAYI ZORUNLUDUR. Ürün, Expiya Cars karar kartındaki araç ile kullanıcının aynı sınıftan seçtiği iki sıfır araç varyantını karşılaştıran kişiselleştirilmiş dijital rapordur. Toplam bedel KDV dâhil 349 TL'dir. Rapor, ödeme doğrulandıktan sonra elektronik ortamda hazırlanır ve web üzerinden sunulur. Doğrulanamayan bilgiler açıkça belirtilir; rapor ekspertiz, bağlayıcı satış teklifi veya kesin al/alma talimatı değildir. Sağlayıcı ve fatura bilgileri Skybit'in hukuk ve mali müşavir tarafından onaylanmış ticari bilgileriyle canlı öncesinde tamamlanmalıdır.",
  ),
  distanceContract: artifact(
    paidComparisonLegalVersions.distanceContract,
    "Mesafeli satış sözleşmesi",
    "TASLAK — HUKUK ONAYI ZORUNLUDUR. Sözleşmenin konusu, KDV dâhil 349 TL bedelli üç araç karar doğrulama raporunun elektronik ortamda hazırlanması ve teslimidir. Ödeme iyzico Checkout Form üzerinden alınır; kart bilgileri Expiya sistemine gelmez. Rapor üretilemez veya erişilemezse tam iade süreci başlatılır. Kullanıcı, rapor tesliminden itibaren 24 saat içinde kolay iade talebi iletebilir; bu politika tüketicinin emredici yasal haklarını sınırlandırmaz.",
  ),
  immediatePerformance: artifact(
    paidComparisonLegalVersions.immediatePerformance,
    "Hizmetin hemen başlaması",
    "TASLAK — HUKUK ONAYI ZORUNLUDUR. Ödemenin doğrulanmasının ardından kişiselleştirilmiş dijital raporun hazırlanmasına cayma süresi sona ermeden başlanmasını açıkça talep ediyorum. Bu talebin cayma hakkına etkisi konusunda ön bilgilendirmeyi okuduğumu kabul ediyorum. Yasal ayıp, hiç teslim edilmeme, erişilememe ve zorunlu tüketici haklarım saklıdır.",
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
