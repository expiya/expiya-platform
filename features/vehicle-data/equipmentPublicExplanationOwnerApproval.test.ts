import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const EVENT_ID = "EPEA-OAE-AD0553D90F8B5E4DA497";
const PREPARATION_ID = "EPEA-MATPREP-2DEF45CB3F980B81EE2D";
const GOVERNANCE_ROOT = join(ROOT, "data/production/equipment-public-explanation-authority/governance");
const eventDirectory = join(GOVERNANCE_ROOT, "owner-approval-events", EVENT_ID);
const preparationDirectory = join(GOVERNANCE_ROOT, "materialization-preparations", PREPARATION_ID);
const sha = (bytes: string | Buffer) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const sortValue = (value: unknown): unknown => Array.isArray(value) ? value.map(sortValue) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue((value as Record<string, unknown>)[key])])) : value;
const canonical = (value: unknown) => `${JSON.stringify(sortValue(value), null, 2)}\n`;
const read = <T>(directory: string, file: string): T => JSON.parse(readFileSync(join(directory, file), "utf8")) as T;

describe("equipment public explanation composite owner approval", () => {
  const event = read<Record<string, unknown>>(eventDirectory, "owner-approval-event.json");
  const plan = read<Record<string, unknown>>(preparationDirectory, "materialization-plan.json");

  it("records one checksum-bound append-only owner event for the approved manifest", () => {
    const { eventChecksum, ...payload } = event;
    expect(event).toMatchObject({
      eventId: EVENT_ID,
      eventType: "COMPOSITE_OWNER_APPROVAL_GRANTED",
      ownerActorId: "EQUIPMENT_OWNER_001",
      ownerActorRole: "EQUIPMENT_OWNER_APPROVER",
      ownerActorScope: "EQUIPMENT_EVIDENCE_ONLY",
      manifestId: "EPEA-OAM-034AF597CB25EE09DF8F",
      manifestChecksum: "sha256:cf20aa4f49c5f6bf2959fec9802fc84731f49925162ba2dbf0dd405d4c206f78",
    });
    expect(sha(canonical(payload))).toBe(eventChecksum);
    expect(readdirSync(join(GOVERNANCE_ROOT, "owner-approval-events"))).toEqual([EVENT_ID]);
  });

  it("binds only the approved composite package and bounded pilot scope", () => {
    expect(event).toMatchObject({
      approvedPackage: {
        equipmentDailyLife: {
          release: "v1.0.1-catalog-v0.55.4-2026-08-20-candidate",
          checksum: "sha256:c2f60f9534d9695c36d9f7075cd288eb52a5050d5a43629081a30a38ac937233",
        },
        publicExplanationAuthority: {
          release: "v0.1.2-catalog-v0.55.4-2026-08-20-candidate",
          checksum: "sha256:c22d1b1dc6357e6e1cea229e1262f23929f13872e3a59e4ec2002d994aa124cd",
          compositeBindingChecksum: "sha256:59a65a589f1d04507c86ee68a3f573bfd28f8bfee8cce673f9547cfb37916222",
        },
      },
      pilotScope: { confirmedIncludedCount: 62, verifiedAbsenceCount: 3, otherExactVariantCount: 0 },
      legalDisposition: "LEGAL_AND_COPY_APPROVED",
      consentDisposition: "NO_ADDITIONAL_CONSENT_REQUIRED",
    });
  });

  it("does not grant activation, public integration, commit or deployment authority", () => {
    expect(event).toMatchObject({
      authorizedNextStep: "IMMUTABLE_MATERIALIZATION_PREPARATION_ONLY",
      activePointerChangeAuthorized: false,
      activationAuthorized: false,
      publicIntegrationAuthorized: false,
      routeUiDecisionEngineChangeAuthorized: false,
      deploymentAuthorized: false,
      commitPushAuthorized: false,
      authorityBoundaries: {
        globalFilteringAllowed: false,
        globalRankingAllowed: false,
        equipmentQuestionGenerationAllowed: false,
        candidateOrOfferOrderingImpact: "NONE",
        publicIntegrationPerformed: false,
        activationPerformed: false,
      },
    });
  });

  it("prepares immutable materialization without creating or activating a release", () => {
    const { preparationChecksum, ...payload } = plan;
    expect(sha(canonical(payload))).toBe(preparationChecksum);
    expect(plan).toMatchObject({
      preparationId: PREPARATION_ID,
      sourceOwnerApprovalEventId: EVENT_ID,
      sourceOwnerApprovalEventChecksum: event.eventChecksum,
      materializationPerformed: false,
      productionReleaseCreated: false,
      activationPerformed: false,
      publicIntegrationPerformed: false,
    });
  });

  it("keeps every generated artifact checksum-bound", () => {
    for (const directory of [eventDirectory, preparationDirectory]) {
      const checksums = read<Record<string, string>>(directory, "checksums.json");
      for (const [file, checksum] of Object.entries(checksums)) {
        expect(sha(readFileSync(join(directory, file))), file).toBe(checksum);
      }
    }
  });
});
