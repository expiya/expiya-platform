import { describe, expect, it } from "vitest";
import { XPY_STAGE_TWO_PROTOCOL_VERSION, validateXpyStageTwoEntry, type XpyStageTwoAuthorityBinding, type XpyStageTwoProjection } from "./contracts";
import { answerBoundedStageTwoQuestion } from "./advisor";

const authority: XpyStageTwoAuthorityBinding = { protocolVersion: XPY_STAGE_TWO_PROTOCOL_VERSION, handoffAuthorityVersion: "2.0.0", departmentId: "CARS", categoryId: "NEW_CAR", conversationId: "conversation", decisionRevision: 7, decisionFingerprint: "decision", exactProductId: "variant", configurationIdentity: "brand|model|trim|2026|TR", evidence: { release: "0.55.4", fingerprint: "catalog" }, issuedAt: "2026-09-06T10:00:00.000Z", expiresAt: "2026-09-06T11:00:00.000Z", replayPolicy: "REVISION_BOUND_REUSABLE_UNTIL_EXPIRY" };
const current = { departmentId: authority.departmentId, categoryId: authority.categoryId, conversationId: authority.conversationId, decisionRevision: authority.decisionRevision, decisionFingerprint: authority.decisionFingerprint, exactProductId: authority.exactProductId, configurationIdentity: authority.configurationIdentity, evidence: authority.evidence };
const projection: XpyStageTwoProjection = { schemaVersion: "xpy-stage2-projection/v1", authority, selected: { exactProductId: "variant", configurationIdentity: authority.configurationIdentity, title: "Marka Model Paket", media: { state: "UNAVAILABLE", alt: "", disclosure: "Doğrulanmış medya yok." }, facts: [{ key: "capacity", label: "Kapasite", value: "5 kişi", evidenceState: "VERIFIED", dailyMeaning: "Beş koltuk kaydıdır; konfor garantisi değildir." }], capabilities: [], limitations: ["Bilinmeyen alanlar tamamlanmaz."], price: { state: "UNAVAILABLE", display: "Bilinmiyor", note: "Güncel doğrulanmış fiyat yok." } }, comparison: { access: "LOCKED", offerPlacement: "AFTER_SELECTED_PRODUCT_BEFORE_ADVISOR", products: [], rows: [] }, boundaries: { canReopenStageOneSelection: false, canAddUnentitledProducts: false, salesActionsActive: false, stageThreeActive: false } };

describe("shared AŞAMA 2 authority boundary", () => {
  it("accepts exact current authority and fails closed on revision, evidence, expiry and tamper-equivalent mismatch", () => {
    expect(validateXpyStageTwoEntry(authority, current, new Date("2026-09-06T10:30:00.000Z")).status).toBe("AUTHORIZED");
    expect(validateXpyStageTwoEntry(authority, { ...current, decisionRevision: 8 }, new Date("2026-09-06T10:30:00.000Z"))).toEqual({ status: "FAILED_CLOSED", reason: "AUTHORITY_MISMATCH" });
    expect(validateXpyStageTwoEntry(authority, { ...current, evidence: { ...current.evidence, fingerprint: "changed" } }, new Date("2026-09-06T10:30:00.000Z"))).toEqual({ status: "FAILED_CLOSED", reason: "AUTHORITY_MISMATCH" });
    expect(validateXpyStageTwoEntry(authority, current, new Date("2026-09-06T11:00:00.000Z"))).toEqual({ status: "FAILED_CLOSED", reason: "EXPIRED" });
  });
  it("keeps Sales Advisor bounded to the selected product without entitlement", () => {
    expect(answerBoundedStageTwoQuestion(projection, "Kapasite nedir?").status).toBe("ANSWERED");
    expect(answerBoundedStageTwoQuestion(projection, "Alternatif bul ve karşılaştır").status).toBe("REFUSED");
    expect(answerBoundedStageTwoQuestion(projection, "Kararımı değiştir").status).toBe("REFUSED");
  });
});
