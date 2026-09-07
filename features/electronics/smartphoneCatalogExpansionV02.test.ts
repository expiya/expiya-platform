import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.join(process.cwd(), "data/research/electronics/smartphone-amazon-tr-catalog-expansion-02");
const read = (name:string) => JSON.parse(readFileSync(path.join(root,name), "utf8"));

describe("smartphone Türkiye coverage expansion v02", () => {
  it("holds a broad, exact-config, materially diverse candidate catalog", () => {
    const catalog = read("candidate-catalog.json");
    expect(catalog.status).toBe("OWNER_REVIEW_CANDIDATE_NOT_ACTIVE");
    expect(catalog.products.length).toBeGreaterThanOrEqual(30);
    expect(catalog.products.length).toBeLessThanOrEqual(50);
    expect(new Set(catalog.products.map((row:{exactProductId:string})=>row.exactProductId)).size).toBe(catalog.products.length);
    expect(new Set(catalog.products.map((row:{brand:string})=>row.brand)).size).toBeGreaterThanOrEqual(10);
    for (const segment of ["foldable","compact","camera-led","performance","long-battery","durable","budget"])
      expect(catalog.products.some((row:{segments:string[]})=>row.segments.includes(segment)), segment).toBe(true);
  });

  it("keeps unknown and commerce neutral and refuses activation", () => {
    const pack = read("domain-pack.json");
    expect(pack.amazonDiscovery.status).toBe("BLOCKED_NO_DISCOVERY_OR_API_ACCESS");
    expect(pack.personaHierarchy.unknownPolicy).toBe("NEUTRAL_NO_SILENT_DROP");
    expect(pack.personaHierarchy.brandPolicy).toBe("EXPLICIT_ONLY_NO_PRESTIGE_PRIOR");
    expect(pack.invariants).toMatchObject({activePointerMutation:false,activationPerformed:false,deploymentPerformed:false,packageApprovalRequired:true});
    expect(pack.products.every((row:{commerce:{state:string}})=>row.commerce.state==="UNKNOWN_FAIL_CLOSED")).toBe(true);
  });

  it("classifies facets and asks one natural material question per trace turn", () => {
    const pack = read("domain-pack.json");
    expect(new Set(pack.facetClassification.map((row:{classification:string})=>row.classification))).toEqual(new Set(["HARD_CONSTRAINT","MATERIAL_TECHNICAL_DISCRIMINATOR","SOFT_PREFERENCE","VOLATILE_COMMERCE","NON_MATERIAL_BASELINE","UNRELIABLE_FACET"]));
    expect(pack.traces.every((row:{P:{oneQuestionOnly:boolean;text:string;offeredValues:string[]}})=>row.P.oneQuestionOnly && row.P.text.endsWith("?") && row.P.offeredValues.length>1)).toBe(true);
    expect(pack.traces.every((row:{Y:{unknownBehavior:string}})=>row.Y.unknownBehavior==="NEUTRAL_NO_SILENT_DROP")).toBe(true);
  });

  it("binds the immutable owner-review handoff to the exact package and membership", () => {
    const catalog = read("candidate-catalog.json");
    const handoff = read("owner-review-packages/SMARTPHONE-TR-V02-F26713A7/owner-review-handoff.json");
    const packageBytes = readFileSync(path.join(process.cwd(), handoff.package.path));
    expect(`sha256:${createHash("sha256").update(packageBytes).digest("hex")}`).toBe(handoff.package.sha256);
    expect(handoff.membership.exactProductIds).toEqual(catalog.products.map((row:{exactProductId:string})=>row.exactProductId));
    expect(handoff.terminalTotals).toMatchObject({discoveryObservations:0,admittedCandidateProducts:33,rejectedObservations:0,unknownFactCells:65});
    expect(handoff.authorityBoundary).toMatchObject({activePointerMutationAuthorized:false,runtimeMutationAuthorized:false,activationAuthorized:false,deploymentAuthorized:false});
  });

  it("records owner review append-only without granting activation or deployment", () => {
    const eventRoot = path.join(root,"governance/owner-review-events/SMARTPHONE-OAE-F26713A7-20260906");
    const event = JSON.parse(readFileSync(path.join(eventRoot,"owner-review-event.json"),"utf8"));
    const checksums = JSON.parse(readFileSync(path.join(eventRoot,"checksums.json"),"utf8"));
    for (const item of [checksums.subjectPackage,checksums.approvalText,checksums.event]) {
      const bytes = readFileSync(path.join(process.cwd(),item.path));
      expect(`sha256:${createHash("sha256").update(bytes).digest("hex")}`).toBe(item.sha256);
    }
    expect(event).toMatchObject({appendOnly:true,decision:"OWNER_REVIEW_PACKAGE_APPROVED",scope:"OWNER_REVIEW_ONLY"});
    expect(event.authority).toMatchObject({ownerReviewApproved:true,packageRegenerationAuthorized:false,scopeChangeAuthorized:false,activePointerMutationAuthorized:false,runtimeMutationAuthorized:false,activationAuthorized:false,deploymentAuthorized:false});
    const plan = read("governance/atomic-activation-plan.json");
    expect(plan.status).toBe("PLAN_ONLY_NOT_AUTHORIZED_NOT_EXECUTED");
    expect(plan.executed).toBe(false);
  });
});
