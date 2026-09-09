import { requireActiveCategoryPMateriality } from "./runtimeAdmission.server";
import {
  bindPendingPMaterialityQuestion,
  createPMaterialityRuntimeSlice,
  nextPMaterialityRuntimeQuestion,
  projectPMaterialityCandidates,
  recordPMaterialityRuntimeAnswer,
  type PMaterialityRuntimeSlice,
} from "./runtimeConsumer";

export async function createRootPMaterialityRuntime(departmentId: string, categoryId: string) {
  const authority = await requireActiveCategoryPMateriality(categoryId);
  const initial = createPMaterialityRuntimeSlice({ departmentId, authority });
  return advanceRootPMaterialityRuntime(initial, authority);
}

async function authorityFor(slice: PMaterialityRuntimeSlice) {
  return requireActiveCategoryPMateriality(slice.categoryId);
}

export async function advanceRootPMaterialityRuntime(slice: PMaterialityRuntimeSlice, suppliedAuthority?: Awaited<ReturnType<typeof authorityFor>>) {
  const authority = suppliedAuthority ?? await authorityFor(slice);
  const next = nextPMaterialityRuntimeQuestion(slice, authority);
  if (next.runtimeConsumption === "EXECUTABLE_MATERIAL_QUESTION" && next.selectedQuestion) {
    const state = bindPendingPMaterialityQuestion(slice, next.selectedQuestion.questionId);
    return Object.freeze({
      state,
      outcome: Object.freeze({
        kind: "ASK" as const,
        questionKey: next.selectedQuestion.questionId,
        message: next.selectedQuestion.publicTurkishQuestion,
        choices: next.selectedQuestion.answerDomain.map(answer => ({ value: answer.answerId, label: answer.labelTr })),
        artifactReadiness: state.artifactReadiness,
        runtimeConsumption: next.runtimeConsumption,
        candidatePoolUnchanged: true as const,
      }),
    });
  }
  const candidates = projectPMaterialityCandidates(slice, authority);
  return Object.freeze({
    state: bindPendingPMaterialityQuestion(slice, null),
    outcome: Object.freeze({
      kind: "CLARIFY" as const,
      questionKey: "NON_DOMINATED_SET",
      message: slice.artifactReadiness === "INFORMATION_ONLY"
        ? "Bu kategoride mevcut kanıt, ürünleri etkili ve güvenli bir soruyla ayırmaya yetmiyor. Bilinmeyenleri koruyarak doğrulanmış ürünleri birlikte gösteriyorum."
        : "Maddi sorular tamamlandı. P katmanı tek kazanan seçmez; kalan doğrulanmış ürünlerden birini açıkça seçebilir veya başka bir ihtiyacınızı yazabilirsiniz.",
      candidateSummaries: candidates,
      artifactReadiness: slice.artifactReadiness,
      runtimeConsumption: "NO_MATERIAL_QUESTION" as const,
      candidatePoolUnchanged: true as const,
      yAuthority: "UNCHANGED_NONE_GRANTED" as const,
    }),
  });
}

export async function answerRootPMaterialityRuntime(input: {
  readonly slice: PMaterialityRuntimeSlice;
  readonly eventId: string;
  readonly answerId?: string;
  readonly operation: "ANSWER" | "CORRECT" | "CLEAR" | "SUPERSEDE";
}) {
  const authority = await authorityFor(input.slice);
  const state = recordPMaterialityRuntimeAnswer({ ...input, authority });
  return advanceRootPMaterialityRuntime(state, authority);
}

export async function readRootPMaterialityRuntime(slice: PMaterialityRuntimeSlice) {
  return advanceRootPMaterialityRuntime(slice);
}
