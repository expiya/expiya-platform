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
  it("is source-activated, supports the explicit false rollback and fails closed on binding mismatch", () => {
    vi.stubEnv("SMARTPHONE_P_MATERIALITY_V1", undefined);
    expect(smartphonePMaterialityCandidateStatus({ policy, catalog }).status).toBe("ENABLED_CANDIDATE");
    vi.stubEnv("SMARTPHONE_P_MATERIALITY_V1", "false");
    expect(smartphonePMaterialityCandidateStatus({ policy, catalog }).status).toBe("DISABLED");
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
  it("keeps UNKNOWN neutral and supports correction plus clear without inventing a winner", async () => {
    vi.stubEnv("SMARTPHONE_P_MATERIALITY_V1", "true");
    const store = new MemoryElectronicsConversationStore();
    const authority = { policy, catalog };
    const conversationId = "smartphone-p-correction-clear";
    await bootstrapElectronicsConversation({ store, authority, conversationId, categoryId: "SMARTPHONE", messageId: "start" });
    const unknown = await runElectronicsTurn({ store, authority, conversationId, messageId: "unknown", expectedRevision: 1, message: "Henüz emin değilim" });
    expect(unknown.status === "OK" && unknown.outcome).toMatchObject({ kind: "ASK", questionKey: "electronics.smartphone.camera" });
    if (unknown.status !== "OK") return;
    expect(unknown.state.ledger.at(-1)).toMatchObject({ conceptId: "CELLULAR_BANDS", normalizedValue: "UNKNOWN", status: "ACCEPTED_EXPLICIT" });
    const corrected = await runElectronicsTurn({ store, authority, conversationId, messageId: "correct", expectedRevision: 2, message: "İlk tercihimi düzelt: evet, gerekli" });
    expect(corrected.status).toBe("OK");
    if (corrected.status !== "OK") return;
    expect(corrected.state.ledger.map((row) => row.status)).toEqual(expect.arrayContaining(["SUPERSEDED", "ACCEPTED_EXPLICIT"]));
    const cleared = await runElectronicsTurn({ store, authority, conversationId, messageId: "clear", expectedRevision: 3, message: "İlk tercihimi unut" });
    expect(cleared.status).toBe("OK");
    if (cleared.status !== "OK") return;
    expect(cleared.state.ledger.some((row) => row.status === "CLEARED")).toBe(true);
    expect(cleared.outcome).toMatchObject({ kind: "ASK", questionKey: "electronics.smartphone.cellular_bands" });
  });
  it("keeps source-activated P authority on later turns when no environment override exists", async () => {
    vi.stubEnv("SMARTPHONE_P_MATERIALITY_V1", undefined);
    const store = new MemoryElectronicsConversationStore();
    const authority = { policy, catalog };
    const conversationId = "smartphone-p-source-activated-turns";
    await bootstrapElectronicsConversation({ store, authority, conversationId, categoryId: "SMARTPHONE", messageId: "start" });
    const next = await runElectronicsTurn({ store, authority, conversationId, messageId: "unknown", expectedRevision: 1, message: "Henüz emin değilim" });
    expect(next.status === "OK" && next.outcome).toMatchObject({
      kind: "ASK",
      questionKey: "electronics.smartphone.camera",
      message: "Uzaktaki kişileri veya sahneleri dijital kırpma yerine telefoto kamerayla yakınlaştırmanız gerekiyor mu?",
      choices: [
        { label: "Evet, gerekli" },
        { label: "Hayır, zorunlu değil" },
        { label: "Henüz emin değilim" },
      ],
    });
  });
});
