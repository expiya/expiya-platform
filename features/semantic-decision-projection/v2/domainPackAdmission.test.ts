import { describe, expect, it } from "vitest";
import { evaluateCatalogFactoryReadinessV2, CATALOG_FACTORY_GATE_IDS, type CatalogFactoryGateEvidence } from "./catalogFactoryReadiness";
import { buildRepresentativeQuestionFixtures } from "./fixtures";
import { assertDomainPackPMaterialityAdmission, classifyQuestionAdmission, validateDomainPackPMaterialityAdmission } from "./domainPackAdmission";

const fixture = buildRepresentativeQuestionFixtures()[0]!.good;
const ids = fixture.offerings.map((offering) => offering.exactOfferingId);
const gates = CATALOG_FACTORY_GATE_IDS.map((gateId): CatalogFactoryGateEvidence => ({ gateId, status: "PASS", evidenceKind: gateId === "owner-approval" ? "SIGNED_APPROVAL" : "EXECUTABLE_TEST", evidenceRefs: ["test"], reason: "test" }));
const readiness = evaluateCatalogFactoryReadinessV2({ subjectId: "test", evaluationScope: "PRODUCTION_EXACT_CATALOG", gates });

describe("Domain Pack P-materiality admission", () => {
  it("accepts complete P evidence while keeping Y outside this gate", () => {
    const pOnly = { ...readiness, levels: { ...readiness.levels, Y_READY: { ready: false, blockingGateIds: ["owner-approval" as const] } } };
    const result = validateDomainPackPMaterialityAdmission({
      inventory: { departmentId: "ELECTRONICS", categoryId: fixture.identity.categoryId, authorityBinding: "test", exactOfferingIds: ids },
      candidate: { schemaVersion: "DomainPackPMaterialityAdmission/v1", domainPackId: "test", departmentId: "ELECTRONICS", categoryId: fixture.identity.categoryId, exactOfferingIds: ids, projections: [fixture], readiness: pOnly, authority: { information: "test", p: "test", y: null }, activation: { mode: "ACTIVE_P", atomicWaveId: "wave", approvalDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" } },
    });
    expect(result).toMatchObject({ eligible: true, reasonCodes: [] });
  });

  it("fails closed for incomplete membership, missing approval, or Y authority", () => {
    const result = validateDomainPackPMaterialityAdmission({
      inventory: { departmentId: "ELECTRONICS", categoryId: fixture.identity.categoryId, authorityBinding: "test", exactOfferingIds: ids },
      candidate: { schemaVersion: "DomainPackPMaterialityAdmission/v1", domainPackId: "test", departmentId: "ELECTRONICS", categoryId: fixture.identity.categoryId, exactOfferingIds: ids.slice(1), projections: [fixture], readiness, authority: { information: "test", p: "test", y: "forbidden" }, activation: { mode: "ACTIVE_P", atomicWaveId: "wave", approvalDigest: null } },
    });
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toEqual(expect.arrayContaining(["EXACT_MEMBERSHIP_MISMATCH", "ACTIVE_WITHOUT_DIGEST_BOUND_APPROVAL", "Y_AUTHORITY_NOT_ADMITTED_BY_P_GATE"]));
    expect(() => assertDomainPackPMaterialityAdmission({
      inventory: { departmentId: "ELECTRONICS", categoryId: fixture.identity.categoryId, authorityBinding: "test", exactOfferingIds: ids },
      candidate: { schemaVersion: "DomainPackPMaterialityAdmission/v1", domainPackId: "test", departmentId: "ELECTRONICS", categoryId: fixture.identity.categoryId, exactOfferingIds: ids.slice(1), projections: [fixture], readiness, authority: { information: "test", p: "test", y: "forbidden" }, activation: { mode: "ACTIVE_P", atomicWaveId: "wave", approvalDigest: null } },
    })).toThrow("DOMAIN_PACK_P_MATERIALITY_ADMISSION_FAILED");
  });

  it("suppresses generic zero-effect and predominantly-unknown questions", () => {
    const bad = buildRepresentativeQuestionFixtures()[0]!.bad;
    expect(classifyQuestionAdmission(fixture)).toBe("ASKABLE");
    expect(classifyQuestionAdmission(bad)).toBe("SUPPRESSED");
    const unknownHeavy = { ...fixture, materialQuestion: { ...fixture.materialQuestion, candidateEffectByAnswer: Object.fromEntries(Object.entries(fixture.materialQuestion.candidateEffectByAnswer).map(([answer, effects]) => [answer, effects.map((effect, index) => index === 0 ? effect : { ...effect, uncertainty: "UNKNOWN" as const, effect: "unknownRetain" as const, partition: null, exactKnownMismatch: false, evidenceRefs: [] })])) } };
    expect(classifyQuestionAdmission(unknownHeavy)).toBe("SUPPRESSED");
  });
});
