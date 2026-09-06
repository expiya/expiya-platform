import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createFileSystemAppliancesArtifactRepository, loadActiveAppliancesAuthority } from "../authority/loader.server";
import type { AppliancesAuthoritySnapshot } from "../authority/types";
import { loadActiveBoundedAuthority } from "../bounded/authority.server";
import type { AppliancesConversationState, AppliancesLedgerEvent } from "../contracts";
import { evaluateAppliancesCandidates } from "../candidate/evaluate";
import { loadActiveDryerAuthority } from "../dryer/authority.server";
import { enterAppliancesDepartment } from "../entry.server";
import { authorizeRecommendation } from "../recommendation/authorize";
import { constructRecommendation, evaluateRecommendationChain } from "../recommendation/construct";
import { loadRecommendationAuthority } from "../recommendation/current.server";
import { loadActiveRefrigeratorAuthority } from "../refrigerator/authority.server";
import { loadActiveMajorApplianceCatalogCategory } from "../../xpy/catalog/majorApplianceCatalogActivation.server";
import { BLOCKED_TEKA_DISHWASHER_ID, decisionAdoptionBinding, isExpectedDecisionAdoptionBinding, MAJOR_APPLIANCE_DECISION_ADDITIONS, MAJOR_APPLIANCE_DECISION_RELEASES } from "./contract";

const root = process.cwd();
const sha = (raw: string) => createHash("sha256").update(raw).digest("hex");
const now = new Date("2026-09-05T16:00:00+03:00");
const allIds = Object.values(MAJOR_APPLIANCE_DECISION_ADDITIONS).flat();

async function activeWashingMachine() {
  const loaded = await loadActiveAppliancesAuthority({ repository: createFileSystemAppliancesArtifactRepository(root) });
  if (loaded.status !== "READY") throw new Error(loaded.reason);
  const entered = await enterAppliancesDepartment({ repository: createFileSystemAppliancesArtifactRepository(root), productType: "WASHING_MACHINE", conversationId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", now });
  if (entered.status !== "READY") throw new Error(entered.status);
  return { authority: loaded.snapshot, state: entered.state };
}

function event(conceptId: string, normalizedValue: unknown, decisionUse: AppliancesLedgerEvent["decisionUse"] = "SOFT_RANK"): AppliancesLedgerEvent {
  return { eventId: `decision-adoption:${conceptId}`, conceptId, normalizedValue, sourceMessageId: "decision-adoption", authority: "USER_EXPLICIT", strength: decisionUse === "HARD_FILTER" ? "HARD" : "STRONG", status: "ACCEPTED_EXPLICIT", decisionUse, confirmationRequired: false, createdRevision: 1, createdAt: now.toISOString() };
}

describe("approved major-appliance decision adoption", () => {
  it("loads the exact immutable successors and preserves the frozen parents", async () => {
    const [washing, dryer, dishwasher, refrigerator, readOnly] = await Promise.all([
      loadActiveAppliancesAuthority({ repository: createFileSystemAppliancesArtifactRepository(root) }),
      loadActiveDryerAuthority(root),
      loadActiveBoundedAuthority(root, "DISHWASHER"),
      loadActiveRefrigeratorAuthority(root),
      Promise.all((["WASHING_MACHINE", "DRYER", "DISHWASHER", "REFRIGERATOR"] as const).map((category) => loadActiveMajorApplianceCatalogCategory(root, category))),
    ]);
    expect(washing.status).toBe("READY"); expect(dryer.status).toBe("READY"); expect(dishwasher.status).toBe("READY"); expect(refrigerator.status).toBe("READY");
    if (washing.status !== "READY" || dryer.status !== "READY" || dishwasher.status !== "READY" || refrigerator.status !== "READY") return;
    expect([washing.snapshot.releaseVersion, dryer.snapshot.releaseVersion, dishwasher.snapshot.releaseVersion, refrigerator.snapshot.releaseVersion]).toEqual(Object.values(MAJOR_APPLIANCE_DECISION_RELEASES).map((item) => item.successor));
    expect([washing.snapshot.productIds.size, dryer.snapshot.pack.products.length, dishwasher.snapshot.pack.products.length, refrigerator.snapshot.pack.products.length]).toEqual([29, 7, 7, 8]);
    expect(allIds.every((id) => washing.snapshot.productIds.has(id) || dryer.snapshot.pack.products.some((item) => item.productId === id) || dishwasher.snapshot.pack.products.some((item) => item.productId === id) || refrigerator.snapshot.pack.products.some((item) => item.productId === id))).toBe(true);
    expect(dishwasher.snapshot.pack.products.some((item) => item.productId === BLOCKED_TEKA_DISHWASHER_ID)).toBe(false);
    expect(readOnly.every((item) => item.status === "READY")).toBe(true);
    for (const [category, release] of Object.entries(MAJOR_APPLIANCE_DECISION_RELEASES)) {
      const directory = category === "WASHING_MACHINE" ? "washing-machines" : category === "DRYER" ? "dryers" : category === "DISHWASHER" ? "dishwashers" : "refrigerators";
      const file = category === "WASHING_MACHINE" ? "catalog.json" : "domain-pack.json";
      expect(sha(await readFile(path.join(root, "data/production/appliances", directory, "releases", release.parent, file), "utf8"))).toBe(release.parentArtifactSha256);
    }
  });

  it("binds question, sufficiency, selection, construction and authorization to WM v0.2", async () => {
    const bundle = await loadRecommendationAuthority(root, now);
    expect(bundle.authority.releaseVersion).toBe(MAJOR_APPLIANCE_DECISION_RELEASES.WASHING_MACHINE.successor);
    for (const policy of [bundle.sufficiency.snapshot, bundle.selection.snapshot, bundle.construction.snapshot]) expect(policy.payload.bindings.catalog).toEqual({ release: bundle.authority.releaseVersion, releaseDigest: bundle.authority.catalogDigest, membershipDigest: bundle.authority.catalog.membershipDigest, artifactSha256: bundle.authority.manifest.catalogArtifactSha256 });
    expect(bundle.question.snapshot.payload.bindings).toMatchObject({ catalogRelease: bundle.authority.releaseVersion, catalogDigest: bundle.authority.catalogDigest });
    const { state } = await activeWashingMachine();
    const decisionState: AppliancesConversationState = { ...state, revision: 1, ledger: [event("REMOTE_CONTROL", "NOT_IMPORTANT"), event("DETERGENT_CONVENIENCE", "NOT_IMPORTANT"), event("LOW_NOISE_PRIORITY", "NOT_IMPORTANT")], brandConstraintEvents: [{ eventId: "brand-altus", brandId: "altus", brandLabel: "Altus", sourceMessageId: "decision-adoption", sourceText: "Altus", createdRevision: 1, createdAt: now.toISOString(), status: "ACTIVE", authority: "USER_EXPLICIT", decisionUse: "HARD_FILTER", policyId: "APPLIANCES_BRAND_CONSTRAINT_POLICY/v1.0", policyDigest: "decision-adoption-test" }] };
    const chain = evaluateRecommendationChain(bundle, decisionState);
    expect(chain.selection, JSON.stringify({ evaluation: chain.evaluation, planner: chain.planner, sufficiency: chain.sufficiency, selection: chain.selection })).toMatchObject({ outcome: "SELECTED_SINGLE", selectedCandidateId: "appliances:wm:tr:altus:al-cm-101254-d" });
    const constructed = constructRecommendation(bundle, decisionState, chain.selection);
    expect(constructed.status).toBe("CONSTRUCTED");
    if (constructed.status !== "CONSTRUCTED") return;
    expect(constructed.artifact.catalogIdentityAndDigests.release).toBe(MAJOR_APPLIANCE_DECISION_RELEASES.WASHING_MACHINE.successor);
    const authorization = authorizeRecommendation(bundle, decisionState, constructed.artifact);
    expect(authorization).toMatchObject({ exactProductId: "appliances:wm:tr:altus:al-cm-101254-d", catalogRelease: MAJOR_APPLIANCE_DECISION_RELEASES.WASHING_MACHINE.successor });
  });

  it("preserves hard-unknown and old-context fail-closed behavior", async () => {
    const { authority, state } = await activeWashingMachine();
    const oldState = { ...state, pinnedCatalogRelease: MAJOR_APPLIANCE_DECISION_RELEASES.WASHING_MACHINE.parent };
    expect(evaluateAppliancesCandidates({ authority, state: oldState })).toEqual({ status: "FAILED_CLOSED", reason: "CONTEXT_INTEGRITY_FAILURE" });
    const target = MAJOR_APPLIANCE_DECISION_ADDITIONS.WASHING_MACHINE[0];
    const catalog = structuredClone(authority.catalog) as Record<string, unknown>;
    catalog.technicalFacts = (catalog.technicalFacts as Record<string, unknown>[]).map((fact) => fact.productId === target && fact.factKey === "BODY_WIDTH_MM" ? { ...fact, factStatus: "UNKNOWN", value: null, promotedAssertionRefs: [] } : fact);
    const altered = { ...authority, catalog } as AppliancesAuthoritySnapshot;
    const result = evaluateAppliancesCandidates({ authority: altered, state: { ...state, revision: 1, ledger: [event("INSTALLATION_FIT", { maxWidthMm: 700 }, "HARD_FILTER")] } });
    expect(result.status).toBe("READY");
    if (result.status === "READY") expect(result.projection.candidates.find((candidate) => candidate.productId === target)).toMatchObject({ eligibility: "ELIGIBILITY_UNKNOWN", reasons: [expect.objectContaining({ code: "REQUIRED_EVIDENCE_UNKNOWN", result: "UNKNOWN" })] });
  });

  it("keeps commerce-shaped fields outside Y outcome and rejects cross-category bindings", async () => {
    const { authority, state } = await activeWashingMachine();
    const baseline = evaluateAppliancesCandidates({ authority, state });
    const commerceOnly = { ...authority, catalog: { ...authority.catalog, amazon: { asin: "changed", price: 1, seller: "changed", review: "changed" } } } as AppliancesAuthoritySnapshot;
    expect(evaluateAppliancesCandidates({ authority: commerceOnly, state })).toEqual(baseline);
    const wrong = structuredClone(decisionAdoptionBinding("WASHING_MACHINE"));
    (wrong as unknown as { admittedOfferingIds: string[] }).admittedOfferingIds = [...MAJOR_APPLIANCE_DECISION_ADDITIONS.DRYER];
    expect(isExpectedDecisionAdoptionBinding("WASHING_MACHINE", wrong)).toBe(false);
    expect(isExpectedDecisionAdoptionBinding("DRYER", decisionAdoptionBinding("WASHING_MACHINE"))).toBe(false);
  });

  it("keeps the legacy-label Teka refrigerator selectable but non-comparable", async () => {
    const loaded = await loadActiveRefrigeratorAuthority(root);
    expect(loaded.status).toBe("READY");
    if (loaded.status !== "READY") return;
    const product = loaded.snapshot.pack.products.find((item) => item.productId === "appliances:refrigerator:tr:teka:rmf-77920-ss-eu-113430009");
    expect(product).toMatchObject({ runtimeSelectable: true, technicalFacts: { form: "FOUR_DOOR", totalNetLitres: null, grossLitres: 648, freshFoodNetLitres: 455, freezerNetLitres: 182, energyRegime: null, noiseRegime: null } });
  });
});
