import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { XpyStageThreeShell } from "@/components/xpy/XpyStageThreeShell";
import AppliancesActionPage from "@/app/appliances/stage/3/page";
import { APPLIANCES_PRODUCT_TYPES } from "@/features/appliances/contracts";
import { createXpyStageThreeAuthorityBinding, validateXpyStageThreeEntry } from "./contracts";
import { APPLIANCES_STAGE_THREE_PRESENTATION, CARS_STAGE_THREE_PRESENTATION, createAppliancesStageThreePresentation } from "./presentationAdapters";

const now = new Date("2026-09-04T12:00:00.000Z");
const expected = { departmentId: "CARS", categoryId: "NEW_CAR", conversationId: "conversation-1", decisionRevision: 7, decisionFingerprint: "decision-1", exactProductId: "internal-variant-id", configurationIdentity: "Marka Model Paket 2026", evidence: { release: "catalog-v1", fingerprint: "catalog-fingerprint" }, parentStageTwoDigest: "a".repeat(64), intendedAction: "REQUEST_QUOTE" } as const;
const binding = () => createXpyStageThreeAuthorityBinding({ ...expected, issuedAt: now, expiresAt: new Date(now.getTime() + 30 * 60_000) });

describe("XPY AŞAMA 3 platform contract", () => {
  it("authorizes only a short-lived, revision-bound exact decision inherited from AŞAMA 2", () => {
    expect(validateXpyStageThreeEntry(binding(), expected, now)).toMatchObject({ status: "AUTHORIZED", binding: { purpose: "PREPARE_AUTHORIZED_POST_EVALUATION_ACTION", sourceStage: "STAGE_2_EVALUATION", externalExecutionAuthorized: false } });
  });

  it.each([
    ["department", { departmentId: "APPLIANCES" }, "CROSS_DOMAIN"], ["category", { categoryId: "DRYER" }, "CROSS_CATEGORY"], ["conversation", { conversationId: "other" }, "CROSS_CONVERSATION"],
    ["revision", { decisionRevision: 8 }, "STALE_REVISION"], ["decision", { decisionFingerprint: "other" }, "CROSS_DECISION"], ["product", { exactProductId: "other" }, "CROSS_PRODUCT"],
    ["configuration", { configurationIdentity: "other" }, "CROSS_CONFIGURATION"], ["evidence", { evidence: { release: "other", fingerprint: "catalog-fingerprint" } }, "EVIDENCE_MISMATCH"],
    ["parent handoff", { parentStageTwoDigest: "b".repeat(64) }, "PARENT_HANDOFF_MISMATCH"], ["action", { intendedAction: "REQUEST_TEST_DRIVE" }, "ACTION_MISMATCH"],
  ] as const)("fails closed on %s mismatch", (_label, change, reason) => expect(validateXpyStageThreeEntry(binding(), { ...expected, ...change }, now)).toEqual({ status: "REJECTED", reason }));

  it("rejects missing, expired and overlong authority without granting external execution", () => {
    expect(validateXpyStageThreeEntry({}, expected, now)).toEqual({ status: "REJECTED", reason: "MALFORMED" });
    expect(validateXpyStageThreeEntry(binding(), expected, new Date(now.getTime() + 30 * 60_000))).toEqual({ status: "REJECTED", reason: "EXPIRED" });
    expect(() => createXpyStageThreeAuthorityBinding({ ...expected, issuedAt: now, expiresAt: new Date(now.getTime() + 31 * 60_000) })).not.toThrow();
    expect(validateXpyStageThreeEntry(createXpyStageThreeAuthorityBinding({ ...expected, issuedAt: now, expiresAt: new Date(now.getTime() + 31 * 60_000) }), expected, now)).toEqual({ status: "REJECTED", reason: "INVALID_LIFETIME" });
  });

  it("preserves Cars request preparation while showing every absent external authority honestly", () => {
    expect(CARS_STAGE_THREE_PRESENTATION.capabilities.find(item => item.capability === "REQUEST_CAPTURE")?.state).toBe("INTERNAL_REVIEW_ONLY");
    expect(CARS_STAGE_THREE_PRESENTATION.capabilities.filter(item => item.state === "UNAVAILABLE")).toHaveLength(5);
  });

  it.each(APPLIANCES_PRODUCT_TYPES)("projects the shared unavailable shell with category language for %s", categoryId => {
    const adapter = createAppliancesStageThreePresentation(categoryId);
    expect(adapter.departmentId).toBe("APPLIANCES"); expect(adapter.productNoun).not.toBe(categoryId);
    expect(adapter.capabilities.every(item => item.state === "UNAVAILABLE")).toBe(true);
  });

  it("renders responsive public structure without raw product or enum labels", () => {
    const html = renderToStaticMarkup(<XpyStageThreeShell adapter={APPLIANCES_STAGE_THREE_PRESENTATION} state="UNAVAILABLE" title="Talep adımı kapalı" description="Dış yetki yok." returnHref="/appliances/analysis" returnLabel="Karara dön"/>);
    expect(html).toContain("data-xpy-stage-three=\"xpy-stage-three-entry/v1\"");
    expect(html).toContain("sm:grid-cols-2"); expect(html).toContain("lg:grid-cols-3");
    expect(html).not.toMatch(/internal-variant-id|REQUEST_CAPTURE|CURRENT_OFFER|APPLIANCES|NEW_CAR/u);
  });

  it("renders category-appropriate Appliances copy without treating the category query as authority", async () => {
    const html = renderToStaticMarkup(await AppliancesActionPage({ searchParams: Promise.resolve({ category: "SPLIT_AIR_CONDITIONER" }) }));
    const visibleText = html.replace(/<[^>]+>/gu, " ");
    expect(visibleText).toContain("Ev tipi split klima için talep ve teklif adımı henüz açık değil");
    expect(visibleText).toContain("Henüz kullanılamıyor");
    expect(visibleText).not.toContain("SPLIT_AIR_CONDITIONER");
  });
});
