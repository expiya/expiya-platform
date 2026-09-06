import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadGovernedManualAuthority, projectAuthorizedL9Knowledge, projectPublicAdvisorManualKnowledge } from "./authority.server";

describe("governed manual authority", () => {
  it("resolves and fully validates the active immutable release", async () => {
    const loaded = await loadGovernedManualAuthority();
    expect(loaded.status).toBe("READY");
    if (loaded.status !== "READY") return;
    expect(loaded.authority.activeReleaseId).toBe("APPLIANCES-GOVERNED-EXACT-MANUAL-L9-TR-v0.2");
    expect(loaded.authority.release).toMatchObject({ releaseId: loaded.authority.activeReleaseId, authority: "L9_ADVISOR_ONLY" });
    expect(loaded.authority.release.manuals).toHaveLength(14);
    expect(loaded.authority.release.l9AdvisorKnowledge).toHaveLength(9);
  });

  it("projects only product, category, catalog-release and configuration-compatible L9 knowledge", async () => {
    const loaded = await loadGovernedManualAuthority();
    if (loaded.status !== "READY") throw new Error(loaded.reason);
    const member = loaded.authority.release.members.find(item => item.productId === "BOSCH_WQG24100TR")!;
    const projection = projectAuthorizedL9Knowledge({ release: loaded.authority.release, authorizedProductId: member.productId, categoryId: "DRYER", catalogRelease: member.parentRelease, configurationIdentity: member.configurationIdentity });
    expect(projection).toMatchObject({ readOnly: true, authority: "EXPLAIN_ONLY", status: "AVAILABLE", productId: member.productId, categoryId: "DRYER" });
    expect(projection.knowledge.every(item => item.productId === member.productId && item.categoryId === "DRYER" && item.decisionAuthority === "NONE" && item.candidateEffect === "NONE")).toBe(true);
    expect(projection.forbidden).toEqual(expect.arrayContaining(["CHANGE_QUESTION", "CHANGE_SUFFICIENCY", "CHANGE_RECOMMENDATION", "CHANGE_Y", "CHANGE_COMPARISON", "CHANGE_PRICE", "CLAIM_OFFER", "AUTHORIZE_ACTION"]));
    const publicProjection = projectPublicAdvisorManualKnowledge(projection);
    expect(publicProjection).toMatchObject({ status: "AVAILABLE", entries: [{ topic: "Bakım ve temizlik", sourceLabel: expect.any(String), pageNumber: expect.any(Number) }] });
    expect(JSON.stringify(publicProjection)).not.toMatch(/knowledgeId|manualId|release|digest|EXPLAIN_ONLY/iu);
  });

  it.each([
    ["product", { authorizedProductId: "UNKNOWN" }, "PRODUCT_NOT_IN_RELEASE"],
    ["category", { categoryId: "WASHING_MACHINE" }, "CATEGORY_MISMATCH"],
    ["catalog release", { catalogRelease: "OTHER-RELEASE" }, "CATALOG_RELEASE_MISMATCH"],
    ["configuration", { configurationIdentity: "Other configuration" }, "CONFIGURATION_MISMATCH"],
  ] as const)("rejects cross-%s knowledge binding", async (_label, change, reason) => {
    const loaded = await loadGovernedManualAuthority();
    if (loaded.status !== "READY") throw new Error(loaded.reason);
    const member = loaded.authority.release.members.find(item => item.productId === "BOSCH_WQG24100TR")!;
    const result = projectAuthorizedL9Knowledge({ release: loaded.authority.release, authorizedProductId: member.productId, categoryId: "DRYER", catalogRelease: member.parentRelease, configurationIdentity: member.configurationIdentity, ...change });
    expect(result).toMatchObject({ status: "REJECTED", reason, knowledge: [] });
    expect(projectPublicAdvisorManualKnowledge(result)).toEqual({ status: "NOT_AVAILABLE", entries: [] });
  });

  it("keeps a compatible product with no L9 coverage as honest neutral absence", async () => {
    const loaded = await loadGovernedManualAuthority();
    if (loaded.status !== "READY") throw new Error(loaded.reason);
    const knowledgeIds = new Set(loaded.authority.release.l9AdvisorKnowledge.map(item => item.productId));
    const member = loaded.authority.release.members.find(item => !knowledgeIds.has(item.productId))!;
    const result = projectAuthorizedL9Knowledge({ release: loaded.authority.release, authorizedProductId: member.productId, categoryId: member.categoryId as "WASHING_MACHINE", catalogRelease: member.parentRelease, configurationIdentity: member.configurationIdentity });
    expect(result).toMatchObject({ status: "MISSING", knowledge: [] });
    expect(projectPublicAdvisorManualKnowledge(result)).toEqual({ status: "NOT_AVAILABLE", entries: [] });
  });

  it("fails the manual read path closed when the active pointer digest is tampered", async () => {
    const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "appliances-manual-pointer-"));
    const sourceBase = path.join(process.cwd(), "data/production/appliances/manuals");
    const active = JSON.parse(await readFile(path.join(sourceBase, "active.json"), "utf8"));
    const targetBase = path.join(temporaryRoot, "data/production/appliances/manuals");
    const targetRelease = path.join(targetBase, "releases", active.releaseId);
    await mkdir(targetRelease, { recursive: true });
    await writeFile(path.join(targetBase, "active.json"), `${JSON.stringify({ ...active, manifestSha256: `sha256:${"0".repeat(64)}` }, null, 2)}\n`);
    await writeFile(path.join(targetRelease, "manifest.json"), await readFile(path.join(sourceBase, "releases", active.releaseId, "manifest.json")));
    expect(await loadGovernedManualAuthority(temporaryRoot)).toMatchObject({ status: "FAILED_CLOSED", reason: "MANUAL_MANIFEST_DIGEST_MISMATCH" });
  });
});
