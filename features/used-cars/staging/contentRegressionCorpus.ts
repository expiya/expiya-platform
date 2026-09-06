import { evaluatePublicCopy, type PublicCopyContext } from "../content/publicCopyGate";
export interface ContentRegressionCase { readonly caseId: string; readonly context: PublicCopyContext; readonly copy: string; readonly evidenceReferences: readonly string[]; readonly sponsoredLabelPresent: boolean; readonly safeNextStepPresent: boolean; readonly expectedPublishable: boolean }
export const usedCarsContentRegressionCorpus: readonly ContentRegressionCase[] = Object.freeze([
  { caseId: "COPY-REG-01", context: "AI_RESPONSE", copy: "Kesin al.", evidenceReferences: [], sponsoredLabelPresent: false, safeNextStepPresent: true, expectedPublishable: false },
  { caseId: "COPY-REG-02", context: "LISTING", copy: "Kilometre garantisi vardır.", evidenceReferences: [], sponsoredLabelPresent: false, safeNextStepPresent: true, expectedPublishable: false },
  { caseId: "COPY-REG-03", context: "CLASSIC", copy: "Matching numbers koleksiyonluk araç.", evidenceReferences: [], sponsoredLabelPresent: false, safeNextStepPresent: true, expectedPublishable: false },
  { caseId: "COPY-REG-04", context: "SPONSORED", copy: "Kurumsal vitrin", evidenceReferences: [], sponsoredLabelPresent: false, safeNextStepPresent: false, expectedPublishable: false },
  { caseId: "COPY-REG-05", context: "LISTING", copy: "Kilometre satıcı beyanıdır; bağımsız ekspertizde kontrol edin.", evidenceReferences: [], sponsoredLabelPresent: false, safeNextStepPresent: true, expectedPublishable: true },
  { caseId: "COPY-REG-06", context: "MATCH_EXPLANATION", copy: "Bu araç ihtiyaçlarınıza yakın görünüyor; geçmiş kontrolü ve bağımsız ekspertiz önerilir.", evidenceReferences: [], sponsoredLabelPresent: false, safeNextStepPresent: true, expectedPublishable: true },
]);
export function runContentRegressionCorpus(cases: readonly ContentRegressionCase[]) { const failures = cases.filter((item) => evaluatePublicCopy(item).publishable !== item.expectedPublishable).map((item) => item.caseId); return Object.freeze({ passed: failures.length === 0, failures: Object.freeze(failures), automaticPublicationAuthorized: false as const }); }
