import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { createV3ConversationState, runV3Turn } from "@/features/decision/v3/engine.server";
import { activeDecisionPreferences, applyPreferenceMessage, latestActiveLedgerEvent } from "@/features/decision/v3/ledger";
import { evaluateV3Catalog } from "@/features/decision/v3/catalogAdapter.server";
import { requireXpyDomainPack, requireXpyReentry } from "./domainPacks";
import { buildCategoryBehavioralAcceptanceMatrix, missingBehavioralCapabilities, XPY_BEHAVIORAL_ACCEPTANCE_MATRIX } from "./behavioralAcceptance";
import { APPLIANCES_CATEGORY_REGISTRY } from "@/features/appliances/categoryRegistry";
import { ELECTRONICS_CATEGORY_REGISTRY } from "@/features/electronics/architectureBaseline";

const priorDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => { if (priorDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = priorDisabled; });
const turn = (state: ReturnType<typeof createV3ConversationState>, id: string, message: string) => runV3Turn({ conversationId: state.conversationId, messageId: id, message, expectedRevision: state.revision, state });

describe("shared XPY behavioral acceptance declaration", () => {
  it("requires every fixture capability from the Cars Domain Pack", () => {
    expect(XPY_BEHAVIORAL_ACCEPTANCE_MATRIX).toHaveLength(16);
    expect(missingBehavioralCapabilities(requireXpyDomainPack("CARS"))).toEqual([]);
    expect(missingBehavioralCapabilities(requireXpyDomainPack("APPLIANCES"))).toEqual([]);
    expect(missingBehavioralCapabilities(requireXpyDomainPack("ELECTRONICS"))).toEqual([]);
  });

  it("materializes one stable executable row for all 16 capabilities in every active category", () => {
    const packs = [requireXpyDomainPack("APPLIANCES"), requireXpyDomainPack("ELECTRONICS")];
    const rows = buildCategoryBehavioralAcceptanceMatrix(packs);
    const activeCount = APPLIANCES_CATEGORY_REGISTRY.filter(row => row.status === "ACTIVE").length + ELECTRONICS_CATEGORY_REGISTRY.length;
    expect(activeCount).toBe(48);
    expect(rows).toHaveLength(activeCount * XPY_BEHAVIORAL_ACCEPTANCE_MATRIX.length);
    expect(new Set(rows.map(row => row.fixtureId)).size).toBe(rows.length);
    for (const pack of packs) for (const categoryId of pack.categories) {
      const categoryRows = rows.filter(row => row.departmentId === pack.departmentId && row.categoryId === categoryId);
      expect(categoryRows.map(row => row.capability)).toEqual([...XPY_BEHAVIORAL_ACCEPTANCE_MATRIX.map(row => row.capability)]);
      expect(categoryRows.filter(row => row.status === "DECLARED").map(row => row.capability)).toEqual([...pack.capabilities.behavioralAcceptance]);
      const reentry = requireXpyReentry(pack.departmentId as "APPLIANCES" | "ELECTRONICS", categoryId);
      expect(reentry.publicName).not.toMatch(/^[A-Z0-9_]+$/u);
      expect(reentry.reentryPrompt).not.toMatch(/(?:[a-z]+_[a-z0-9_]+|\b(?:runtime|exact|field|policy)\b)/iu);
      expect(reentry.informationalTerms.length).toBeGreaterThan(0);
    }
    expect(rows.filter(row => row.status === "DECLARED")).toHaveLength(activeCount * 16);
    expect(rows.filter(row => row.status === "GAP")).toHaveLength(0);
  });

  it("publishes a machine-readable PASS verdict with adapter evidence for every row", () => {
    const report = JSON.parse(readFileSync("data/governance/xpy/WU-XPY-ALL-DOMAIN-BEHAVIORAL-ACCEPTANCE-01-matrix.json", "utf8")) as { verdict: string; rows: { fixtureId: string; adapterId: string; expectedEffect: string; observedEffect: string; verdict: string }[] };
    expect(report.verdict).toBe("PASS");
    expect(report.rows).toHaveLength(768);
    expect(new Set(report.rows.map(row => row.fixtureId)).size).toBe(768);
    expect(report.rows.every(row => row.adapterId && row.expectedEffect && row.observedEffect && row.verdict === "PASS")).toBe(true);
  });
});

describe("Cars complete behavioral matrix regressions", () => {
  it("honestly clarifies Bumblebee without writing a model or exact variant", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await turn(createV3ConversationState("bumblebee"), "1", "Bumblebee aracından almak istiyorum.");
    expect(output.message).toMatch(/Camaro tarzı.*kastediyorsun|başka bir araç özelliğini/iu);
    expect(output.message).toMatch(/belirli bir model veya varyant varsaymayacağım/iu);
    expect(output.state.ledger).toEqual([]);
    expect(output.recommendations).toBeUndefined();
  });

  it("does not turn mixed-road use into a false 4x4 assertion", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const state = { ...createV3ConversationState("mixed-road"), purchaseIntent: "ACTIVE_DISCOVERY" as const };
    const output = await turn(state, "1", "Kamp için ve zaman zaman bozuk yolda kullanacağım.");
    expect(latestActiveLedgerEvent(output.state.ledger, "primaryUsage")).toMatchObject({ normalizedValue: "MIXED_ROAD" });
    expect(output.message).not.toMatch(/arazi ve 4x4 kullanımı net/iu);
  });

  it("clears an explicitly rejected SUV and never keeps it active", () => {
    const initial = { ...createV3ConversationState("reject-suv"), purchaseIntent: "ACTIVE_DISCOVERY" as const };
    const withSuv = applyPreferenceMessage(initial, "1", "SUV olsun");
    const rejected = applyPreferenceMessage({ ...initial, revision: 1, ledger: withSuv.ledger }, "2", "SUV önceliğim değil");
    expect(activeDecisionPreferences(rejected.ledger).filter(item => item.concept === "bodyStyle")).toEqual([]);
  });

  it("explicitly supersedes pick-up with compact hatchback", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const initial = { ...createV3ConversationState("body-contradiction"), purchaseIntent: "ACTIVE_DISCOVERY" as const, askedQuestionKeys: ["primaryUsage", "mixedRoadBody"] };
    const seeded = applyPreferenceMessage(initial, "1", "Pick-up olsun");
    const state = { ...initial, revision: 1, ledger: seeded.ledger };
    const output = await turn(state, "2", "Aslında kompakt hatchback olsun");
    expect(output.message).toMatch(/önceki pick-up tercihini hatchback olarak güncelledim/iu);
    expect(latestActiveLedgerEvent(output.state.ledger, "bodyStyle")).toMatchObject({ normalizedValue: "HATCHBACK", status: "ACTIVE" });
    expect(output.recommendations).toBeUndefined();
  });

  it("binds every hard-filter candidate count to the current ledger revision", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const state = { ...createV3ConversationState("counts"), purchaseIntent: "ACTIVE_DISCOVERY" as const };
    const before = await evaluateV3Catalog(state.ledger);
    const current = (await turn(state, "1", "Kompakt hatchback ve benzinli olsun")).state;
    const after = await evaluateV3Catalog(current.ledger);
    expect(after.variants.length).toBeLessThan(before.variants.length);
    expect(after.candidateIds).toEqual(after.variants.map(item => item.id));
  });

  it("cannot create a single offer from multiple remaining candidates", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const state = { ...createV3ConversationState("no-false-winner"), purchaseIntent: "ACTIVE_DISCOVERY" as const, askedQuestionKeys: ["primaryUsage", "bodyStyle", "fuelType", "urbanEquipment", "familyEquipment", "longDistanceEquipment"], finalBrandModelQuestionAsked: true };
    const output = await turn(state, "1", "Şehir içinde kullanacağım, gövde fark etmez");
    const catalog = await evaluateV3Catalog(output.state.ledger);
    expect(catalog.variants.length).toBeGreaterThan(1);
    expect(output.offerAwaitingConsent).not.toBe(true);
    expect(output.recommendations).toBeUndefined();
  });

  it("replays the same message with the same authoritative outcome", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const state = createV3ConversationState("replay");
    const first = await turn(state, "same", "Şehir içinde araç almak istiyorum");
    const replay = await runV3Turn({ conversationId: state.conversationId, messageId: "same", message: "Şehir içinde araç almak istiyorum", expectedRevision: first.state.revision, state: first.state });
    expect(replay.state).toEqual(first.state);
    expect(replay.recommendations).toBeUndefined();
  });
});
