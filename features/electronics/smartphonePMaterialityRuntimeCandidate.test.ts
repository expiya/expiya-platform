import { afterEach, describe, expect, it, vi } from "vitest";
import { loadActiveElectronicsCategoryPolicy } from "./categoryPolicyLoader.server";
import { bootstrapElectronicsConversation, runElectronicsTurn } from "./conversation.server";
import { MemoryElectronicsConversationStore } from "./persistence";
import { loadActiveElectronicsRuntimeAuthority } from "./runtimeAuthority.server";
import { smartphonePMaterialityCandidateStatus, smartphonePMaterialityQuestions } from "./smartphonePMaterialityRuntimeCandidate";

describe("Smartphone P materiality runtime candidate", () => {
  const policy = loadActiveElectronicsCategoryPolicy();
  const catalog = loadActiveElectronicsRuntimeAuthority().catalog;
  afterEach(() => vi.unstubAllEnvs());
  it("is default-off and fail-closed on binding mismatch", () => {
    expect(smartphonePMaterialityCandidateStatus({ policy, catalog, requested: false }).status).toBe("DISABLED");
    expect(smartphonePMaterialityCandidateStatus({ policy: { ...policy, policyDigest: "sha256:bad" }, catalog, requested: true }).status).toBe("FAILED_CLOSED");
  });
  it("enables only for the exact 121/34 bound authority", () => expect(smartphonePMaterialityCandidateStatus({ policy, catalog, requested: true }).status).toBe("ENABLED_CANDIDATE"));
  it("projects exactly three natural Turkish questions and excludes support", () => {
    const row = policy.payload.categories.find((category) => category.categoryId === "SMARTPHONE")!;
    const questions = smartphonePMaterialityQuestions(row);
    expect(questions.map((q) => q.targetConcept)).toEqual(["CELLULAR_BANDS", "CAMERA", "BATTERY"]);
    expect(questions.every((q) => q.textTr.endsWith("?") && !/ne kadar önemli/i.test(q.textTr))).toBe(true);
  });
  it("runs one question at a time behind the explicit flag", async () => {
    vi.stubEnv("SMARTPHONE_P_MATERIALITY_V1", "true");
    const store = new MemoryElectronicsConversationStore();
    const authority = { policy, catalog };
    const started = await bootstrapElectronicsConversation({ store, authority, conversationId: "smartphone-p-candidate", categoryId: "SMARTPHONE", messageId: "start" });
    expect(started.status).toBe("OK");
    if (started.status !== "OK") return;
    expect(started.state.pendingQuestionKey).toBe("electronics.smartphone.cellular_bands");
    const camera = await runElectronicsTurn({ store, authority, conversationId: "smartphone-p-candidate", messageId: "network", expectedRevision: 1, message: "Evet, gerekli" });
    expect(camera.status === "OK" && camera.outcome).toMatchObject({ questionKey: "electronics.smartphone.camera", message: "Uzaktaki kişileri veya sahneleri dijital kırpma yerine telefoto kamerayla yakınlaştırmanız gerekiyor mu?" });
    if (camera.status !== "OK") return;
    const battery = await runElectronicsTurn({ store, authority, conversationId: "smartphone-p-candidate", messageId: "camera", expectedRevision: 2, message: "Hayır, zorunlu değil" });
    expect(battery.status === "OK" && battery.outcome).toMatchObject({ questionKey: "electronics.smartphone.battery", message: "Gün içinde kısa bir şarj molasında toparlamak için en az 80 W kablolu şarj gerekli mi?" });
    expect(battery.status === "OK" && battery.state.askedQuestionKeys).not.toContain("electronics.smartphone.os_support");
  });
});
