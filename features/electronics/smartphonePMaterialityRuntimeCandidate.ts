import type { ElectronicsCategoryPolicyArtifact } from "./categoryPolicy";
import type { ElectronicsRuntimeCatalog } from "./runtimeAuthority.server";

export const SMARTPHONE_P_MATERIALITY_FEATURE_FLAG = "SMARTPHONE_P_MATERIALITY_V1";
export const SMARTPHONE_P_MATERIALITY_PACKAGE_DIGEST = "sha256:e67788378c14e0638ce9aec4224ca0f97864d3ac6528b0a9712bf8141b7c61d7";
const EXPECTED_POLICY_DIGEST = "sha256:0f4db5148d6a6971b7a9341b2c0c56c298753dd2ab592b75d09fbdd372b7c20a";
const EXPECTED_CATALOG_RELEASE_DIGEST = "sha256:ca3bafe8f2f78234cbbb8c155d5e60d9877f95da4e8fdb866eccada63ef95163";

type PolicyRow = ElectronicsCategoryPolicyArtifact["payload"]["categories"][number];
type Question = PolicyRow["questionPlan"][number];

const replacements: Readonly<Record<string, Pick<Question, "questionKey" | "targetConcept" | "priority" | "textTr" | "choicesTr">>> = Object.freeze({
  CELLULAR_BANDS: { questionKey: "electronics.smartphone.cellular_bands", targetConcept: "CELLULAR_BANDS", priority: 1, textTr: "Telefonu Türkiye’de 5G ile kullanabilmek sizin için zorunlu mu?", choicesTr: ["Evet, gerekli", "Hayır, zorunlu değil", "Henüz emin değilim"] },
  CAMERA: { questionKey: "electronics.smartphone.camera", targetConcept: "CAMERA", priority: 2, textTr: "Uzaktaki kişileri veya sahneleri dijital kırpma yerine telefoto kamerayla yakınlaştırmanız gerekiyor mu?", choicesTr: ["Evet, gerekli", "Hayır, zorunlu değil", "Henüz emin değilim"] },
  BATTERY: { questionKey: "electronics.smartphone.battery", targetConcept: "BATTERY", priority: 3, textTr: "Gün içinde kısa bir şarj molasında toparlamak için en az 80 W kablolu şarj gerekli mi?", choicesTr: ["Evet, gerekli", "Hayır, zorunlu değil", "Henüz emin değilim"] },
});

export function smartphonePMaterialityCandidateStatus(input: { policy: ElectronicsCategoryPolicyArtifact; catalog: ElectronicsRuntimeCatalog; requested?: boolean }) {
  const requested = input.requested ?? process.env[SMARTPHONE_P_MATERIALITY_FEATURE_FLAG] === "true";
  if (!requested) return { status: "DISABLED" as const, packageDigest: SMARTPHONE_P_MATERIALITY_PACKAGE_DIGEST };
  const smartphoneCount = input.catalog.products.filter((product) => product.categoryId === "SMARTPHONE").length;
  if (input.policy.policyDigest !== EXPECTED_POLICY_DIGEST || input.catalog.releaseDigest !== EXPECTED_CATALOG_RELEASE_DIGEST || input.catalog.products.length !== 121 || smartphoneCount !== 34) return { status: "FAILED_CLOSED" as const, reason: "AUTHORITY_OR_MEMBERSHIP_BINDING_MISMATCH", packageDigest: SMARTPHONE_P_MATERIALITY_PACKAGE_DIGEST };
  return { status: "ENABLED_CANDIDATE" as const, packageDigest: SMARTPHONE_P_MATERIALITY_PACKAGE_DIGEST };
}

export function smartphonePMaterialityQuestions(policy: PolicyRow): readonly Question[] {
  return policy.questionPlan.flatMap((question) => {
    if (question.targetConcept === "OS_SUPPORT") return [];
    const replacement = replacements[question.targetConcept];
    return replacement ? [{ ...question, ...replacement }] : [];
  }).sort((a, b) => a.priority - b.priority);
}

export const smartphonePMaterialityRequiredConcepts = Object.freeze(["CELLULAR_BANDS", "CAMERA", "BATTERY"] as const);
