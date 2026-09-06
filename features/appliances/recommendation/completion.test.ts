import { beforeAll, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { AppliancesCard } from "@/app/appliances/AppliancesConversation";
import { createFileSystemAppliancesArtifactRepository } from "../authority/loader.server";
import { enterAppliancesDepartment } from "../entry.server";
import type { AppliancesConversationState, AppliancesLedgerEvent } from "../contracts";
import { loadRecommendationAuthority, type RecommendationAuthority } from "./current.server";
import { constructRecommendation, evaluateRecommendationChain } from "./construct";
import { authorizeRecommendation } from "./authorize";
import { projectAuthorizedAppliancesCard } from "./projectCard.server";
import { digestRecommendationConstructionPolicy as digest } from "../governance/recommendationConstructionPolicyAuthority";
import { activeCatalogPriceFixture } from "../testing/activeCatalogPriceFixture";

let bundle: RecommendationAuthority, base: AppliancesConversationState;
const now = new Date("2026-09-03T06:00:00Z");
beforeAll(async () => {
  bundle = await loadRecommendationAuthority(process.cwd(), now);
  const entered = await enterAppliancesDepartment({ repository: createFileSystemAppliancesArtifactRepository(process.cwd()), productType: "WASHING_MACHINE", conversationId: "11111111-1111-4111-8111-111111111111", now });
  if (entered.status !== "READY") throw new Error(entered.status); base = entered.state;
  bundle = { ...bundle, price: activeCatalogPriceFixture(bundle.authority) };
});
function state(budget?: number, noise = "NOT_IMPORTANT") {
  const values: [string, unknown][] = [["REMOTE_CONTROL", "NOT_IMPORTANT"], ["DETERGENT_CONVENIENCE", "NOT_IMPORTANT"], ["LOW_NOISE_PRIORITY", noise]];
  if (budget) values.push(["BUDGET_SENSITIVITY", { maximumTry: budget }]);
  return { ...base, ledger: values.map(([conceptId, normalizedValue], i): AppliancesLedgerEvent => ({ eventId: `e${i}`, conceptId, normalizedValue, sourceMessageId: "m", authority: "USER_EXPLICIT", strength: conceptId === "BUDGET_SENSITIVITY" ? "HARD" : "STRONG", status: "ACCEPTED_EXPLICIT", decisionUse: conceptId === "BUDGET_SENSITIVITY" ? "HARD_FILTER" : "SOFT_RANK", confirmationRequired: false, createdRevision: 0, createdAt: now.toISOString() })) };
}
function single() {
  const s = state(23000), chain = evaluateRecommendationChain(bundle, s);
  expect(chain.selection.outcome, JSON.stringify({ evaluation: chain.evaluation.status === "FAILED_CLOSED" ? chain.evaluation : chain.evaluation.projection.counts, planner: chain.planner, sufficiency: chain.sufficiency, selection: chain.selection })).toBe("SELECTED_SINGLE");
  const result = constructRecommendation(bundle, s, chain.selection);
  if (result.status !== "CONSTRUCTED") throw new Error(result.reason);
  return { s, artifact: result.artifact };
}
describe("Appliances recommendation, final authorization and card", () => {
  it("constructs a complete singleton, preserves price unknowns and renders only after authorization", () => {
    const { s, artifact } = single();
    for (const field of bundle.construction.snapshot.payload.artifactContract.requiredFields) expect(artifact).toHaveProperty(field);
    expect(artifact.governedReasons[0]).toContain("kalan tek aday");
    expect(artifact.priceCoverageAndFreshness.budgetUnknownAlternatives.length).toBeGreaterThan(0);
    expect(artifact.warrantyDisclosure.length).toBeGreaterThan(0);
    expect(artifact.dailyLifeInterpretationUnits.length).toBeGreaterThan(0);
    const authorization = authorizeRecommendation(bundle, s, artifact)!;
    expect(authorization).toBeDefined(); expect(authorizeRecommendation(bundle, s, artifact)).toEqual(authorization);
    const card = projectAuthorizedAppliancesCard(bundle, s, artifact, authorization);
    const html = renderToStaticMarkup(createElement(AppliancesCard, { card }));
    expect(html).toContain("CMX 8100"); expect(html).toContain("Fiyatı bilinmeyen"); expect(html).toContain("garanti");
    expect(html).not.toMatch(/checkout|affiliate|satın al/iu);
  });
  it("rejects artifact tampering even with a recalculated hash", () => {
    const { s, artifact } = single();
    const modified = { ...artifact, governedReasons: ["En iyi ürün"] };
    const { deterministicArtifactFingerprint: _ignored, ...core } = modified;
    expect(_ignored).toBeTruthy();
    modified.deterministicArtifactFingerprint = digest(core);
    expect(authorizeRecommendation(bundle, s, modified)).toBeUndefined();
    expect(authorizeRecommendation(bundle, s, undefined)).toBeUndefined();
  });
  it("rejects stale context, expired price, identity and foreign authorization", () => {
    const { s, artifact } = single(); const authorization = authorizeRecommendation(bundle, s, artifact)!;
    expect(authorizeRecommendation(bundle, { ...s, revision: 1 }, artifact)).toBeUndefined();
    expect(authorizeRecommendation({ ...bundle, price: activeCatalogPriceFixture(bundle.authority, "STALE"), now: new Date("2026-09-05") }, s, artifact)).toBeUndefined();
    expect(() => projectAuthorizedAppliancesCard(bundle, s, artifact, { ...authorization, exactProductId: "foreign" })).toThrow("CARD_NOT_AUTHORIZED");
    expect(() => projectAuthorizedAppliancesCard(bundle, { ...s, conversationId: "foreign" }, artifact, authorization)).toThrow("CARD_NOT_AUTHORIZED");
  });
  it("does not manufacture a recommendation while a question remains", () => {
    const chain = evaluateRecommendationChain(bundle, base);
    expect(chain.planner.kind).toBe("ASK");
    expect(constructRecommendation(bundle, base, chain.selection).status).toBe("FAILED_CLOSED");
  });
  it("maps no selection to an honest non-authorized state", () => {
    const s = state(100000), chain = evaluateRecommendationChain(bundle, s);
    expect(chain.selection.outcome).toBe("NO_GOVERNED_SELECTION");
    const result = constructRecommendation(bundle, s, chain.selection);
    expect(result.status).toBe("CONSTRUCTED");
    if (result.status === "CONSTRUCTED") { expect(result.artifact.artifactKind).toBe("NO_RECOMMENDATION_CONSTRUCTIBLE"); expect(authorizeRecommendation(bundle, s, result.artifact)).toBeUndefined(); }
  });
  it("keeps tied/non-dominated selection shapes and fails forged selection closed", () => {
    for (const maximum of [25000, 100000]) {
      const initial = state(maximum, "IMPORTANT");
      const s = maximum === 100000 ? { ...initial, ledger: initial.ledger.map(e => e.conceptId === "REMOTE_CONTROL" ? { ...e, normalizedValue: "WANTED" } : e) } : initial;
      const chain = evaluateRecommendationChain(bundle, s);
      expect(chain.selection.outcome).toBe(maximum === 25000 ? "TIED_TOP_SET" : "NON_DOMINATED_SET");
      const result = constructRecommendation(bundle, s, chain.selection);
      expect(result.status).toBe("CONSTRUCTED");
      if (result.status === "CONSTRUCTED" && result.artifact.selectionOutcome !== "SELECTED_SINGLE") expect(authorizeRecommendation(bundle, s, result.artifact)).toBeUndefined();
      expect(constructRecommendation(bundle, s, { ...chain.selection, deterministicResultFingerprint: "forged" }).status).toBe("FAILED_CLOSED");
    }
  });
});
