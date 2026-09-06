import { ELECTRONICS_CATEGORY_REGISTRY, type ElectronicsCategoryId } from "../architectureBaseline";
import type { ElectronicsDecisionCard, ElectronicsRuntimeOutcome } from "../runtimeContracts";
import { defineXpyStageOnePresentationAdapter, naturalConsumerConfiguration, XPY_STAGE_ONE_PRESENTATION_VERSION, type XpyStageOneSetPresentation } from "@/features/xpy/stageOnePresentation";

const conceptLabels: Readonly<Record<string, string>> = {
  OS_SUPPORT: "İşletim sistemi desteği", CELLULAR_BANDS: "Mobil şebeke uyumu", CAMERA: "Kamera kullanımı", BATTERY: "Pil kullanımı", WORKLOAD: "Kullanım yükü", PORTABILITY: "Taşınabilirlik", DISPLAY: "Ekran", UPGRADEABILITY: "Yükseltilebilirlik", ROOM: "Oda koşulları", CONTENT: "İçerik türü", PANEL: "Panel tercihi", PLATFORM_SUPPORT: "Platform desteği", FIT: "Kullanım ve uyum", NOISE_CONTROL: "Gürültü kontrolü", MICROPHONE: "Mikrofon", CODEC_COMPATIBILITY: "Ses kodlayıcı uyumu",
};
const categoryLabel = (id: ElectronicsCategoryId) => ELECTRONICS_CATEGORY_REGISTRY.find(row => row.categoryId === id)?.publicLabelTr ?? "Elektronik";
const natural = (value: string) => conceptLabels[value] ?? value.replaceAll("_", " ").toLocaleLowerCase("tr-TR").replace(/^./u, letter => letter.toLocaleUpperCase("tr-TR"));

export const ELECTRONICS_STAGE_ONE_PRESENTATION = defineXpyStageOnePresentationAdapter<ElectronicsDecisionCard>({
  adapterId: "electronics-stage1-presentation/v1", version: XPY_STAGE_ONE_PRESENTATION_VERSION,
  project(card) {
    const daily = card.dailyLifeInterpretation;
    const identityParts = card.configurationIdentity.split("|").map(part => part.trim());
    const publicModel = identityParts[1] && identityParts[1] !== card.manufacturer ? identityParts[1] : card.modelCode;
    const publicConfiguration = identityParts.filter(part => part !== card.modelCode).join("|");
    return { schemaVersion: XPY_STAGE_ONE_PRESENTATION_VERSION, exactIdentity: { id: card.exactProductId, brand: card.manufacturer, model: publicModel, configuration: naturalConsumerConfiguration(publicConfiguration, card.manufacturer, publicModel) }, media: { status: "UNAVAILABLE", alt: `${card.manufacturer} ${publicModel} ürün görseli` }, badge: `${categoryLabel(card.categoryId)} · Doğrulanmış karar sonucu`, reasons: card.rationale.map(row => row.explanationTr), matchedNeeds: card.rationale.map(row => `${natural(row.acceptedConcept)} ihtiyacınız değerlendirmeye alındı.`), supportingContext: [], technicalFacts: card.technicalEvidence.map((row, index) => ({ label: natural(row.label), value: row.value, explanation: daily[index] })), capabilities: [], limitations: daily.length > card.technicalEvidence.length ? daily.slice(card.technicalEvidence.length) : [], offers: [], commerceNotice: "Bu ürün için güncel ve doğrulanmış fiyat bulunmuyor. Fiyat, satıcı ve popülerlik kararı etkilemedi.", sources: [{ label: "Üreticinin doğrulanmış teknik ürün kayıtları" }], audit: { authorizationFingerprint: card.authorizationFingerprint, policyDigest: card.authority.policyDigest, catalogReleaseDigest: card.authority.catalogReleaseDigest, contextRevision: card.authority.contextRevision } };
  },
});

export function projectElectronicsSet(categoryId: ElectronicsCategoryId, outcome: Pick<ElectronicsRuntimeOutcome, "kind" | "candidateSummaries" | "uncertainty">): XpyStageOneSetPresentation {
  return { schemaVersion: XPY_STAGE_ONE_PRESENTATION_VERSION, kind: outcome.uncertainty?.length ? "NON_DOMINATED_SET" : "TIED_TOP_SET", departmentLabel: "Elektronik", categoryLabel: categoryLabel(categoryId), title: "Tek bir ürün doğrulanmış olarak öne çıkmıyor", explanation: "Mevcut bilgiler bir ürünü kazanan ilan etmeye yetmiyor; fiyat, katalog sırası veya gizli puanlama kullanılmadı.", candidates: (outcome.candidateSummaries ?? []).map((row, index) => ({ id: `${row.manufacturer}:${row.modelCode}:${index}`, name: `${row.manufacturer} ${row.modelCode}` })), unresolved: outcome.uncertainty?.map(natural) ?? ["Sizin için en önemli kullanım farkını belirtin; seçenekleri yalnız doğrulanmış bilgilerle yeniden değerlendirelim."] };
}
