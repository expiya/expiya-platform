import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const DL_CANDIDATE = join(ROOT, "data/production/equipment-daily-life/release-candidates/v1.0.1-catalog-v0.55.4-2026-08-20-candidate");
const DL_RELEASE = join(ROOT, "data/production/equipment-daily-life/releases/v1.0.1-catalog-v0.55.4-2026-08-20");
const AUTH_CANDIDATE = join(ROOT, "data/production/equipment-public-explanation-authority/release-candidates/v0.1.2-catalog-v0.55.4-2026-08-20-candidate");
const AUTH_RELEASE = join(ROOT, "data/production/equipment-public-explanation-authority/releases/v0.1.2-catalog-v0.55.4-2026-08-20");
const MATERIALIZATION = join(ROOT, "data/production/equipment-public-explanation-authority/governance/materializations/EPEA-MAT-59027C9336AFF309281C");
const AUTHORIZATION = join(ROOT, "data/production/equipment-public-explanation-authority/governance/materialization-authorization-events/EPEA-MATAUTH-59027C9336AFF309281C");
const sha = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const read = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;
const sortValue = (value: unknown): unknown => Array.isArray(value) ? value.map(sortValue) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue((value as Record<string, unknown>)[key])])) : value;
const canonical = (value: unknown) => `${JSON.stringify(sortValue(value), null, 2)}\n`;

describe("equipment public explanation immutable production materialization", () => {
  const dailyManifest = read<Record<string, unknown>>(join(DL_RELEASE, "manifest.json"));
  const authorityManifest = read<Record<string, unknown>>(join(AUTH_RELEASE, "manifest.json"));
  const dryRun = read<Record<string, unknown>>(join(MATERIALIZATION, "activation-dry-run.json"));

  it("records checksum-bound materialization authorization after the preparation", () => {
    const event = read<Record<string, unknown>>(join(AUTHORIZATION, "authorization-event.json"));
    const payload = { ...event };
    const authorizationEventChecksum = payload.authorizationEventChecksum;
    delete payload.authorizationEventChecksum;
    delete payload.authorizationEventId;
    expect(sha(canonical(payload))).toBe(authorizationEventChecksum);
    expect(event).toMatchObject({
      authorizationEventId: "EPEA-MATAUTH-59027C9336AFF309281C",
      ownerActorId: "EQUIPMENT_OWNER_001",
      sourceOwnerApprovalEventId: "EPEA-OAE-AD0553D90F8B5E4DA497",
      sourceOwnerApprovalEventChecksum: "sha256:989f27f22b0e1f6f5dde63738570c2d8e578cb34889c450a626df89ee25e2e6c",
      materializationPreparationId: "EPEA-MATPREP-2DEF45CB3F980B81EE2D",
      materializationPreparationChecksum: "sha256:782eed50ccee875e80075f6043e12a90b14a585319d034ebaa9e9ddfa33a69e4",
      activationAuthorized: false, publicIntegrationAuthorized: false, decisionEngineEffectAuthorized: false,
    });
    expect(Number.isFinite(Date.parse(event.authorizedAt as string))).toBe(true);
  });

  it("keeps both production payloads byte-identical to their approved candidates", () => {
    expect(readFileSync(join(DL_RELEASE, "equipment-daily-life.json"))).toEqual(readFileSync(join(DL_CANDIDATE, "equipment-daily-life.json")));
    expect(readFileSync(join(AUTH_RELEASE, "authority.json"))).toEqual(readFileSync(join(AUTH_CANDIDATE, "authority.json")));
    for (const file of ["approved-copy-registry.json", "privacy-retention-policy.json", "public-telemetry-allowlist-policy.json"])
      expect(readFileSync(join(AUTH_RELEASE, file))).toEqual(readFileSync(join(AUTH_CANDIDATE, file)));
  });

  it("materializes 51 features with the approved 46/5 semantic split", () => {
    const payload = read<{ entries: Array<{ featureCode: string }> }>(join(DL_RELEASE, "equipment-daily-life.json"));
    expect(payload.entries).toHaveLength(51);
    expect(new Set(payload.entries.map((entry) => entry.featureCode)).size).toBe(51);
    expect(dailyManifest).toMatchObject({ featureCount: 51, unchangedFeatureCount: 46, legallyCorrectedFeatureCount: 5,
      authority: "EXPLANATION_ONLY", publicRuntimeActivation: false });
  });

  it("materializes exactly 62 positives and three BYD-only negatives for two variants", () => {
    const payload = read<{ pilotExactVariantAllowlist: string[]; authorizedPositiveAssertionIds: string[]; authorizedNegativeAssertionIds: string[]; authorityTypes: string[] }>(join(AUTH_RELEASE, "authority.json"));
    expect(payload.pilotExactVariantAllowlist).toHaveLength(2);
    expect(payload.authorizedPositiveAssertionIds).toHaveLength(62);
    expect(payload.authorizedNegativeAssertionIds).toHaveLength(3);
    expect(payload.authorityTypes).toEqual(["POST_REVEAL_CONFIRMED_EXPLANATION", "DIRECT_QUESTION_VERIFIED_ABSENCE"]);
    expect(authorityManifest).toMatchObject({ verifiedAbsenceScope: "BYD_DOLPHIN_COMFORT_MY2025_ONLY", exactVariantCount: 2,
      confirmedIncludedAssertionCount: 62, verifiedAbsenceCount: 3, publicActivation: false, publicIntegration: false });
  });

  it("binds both exact production releases and every approved policy checksum", () => {
    for (const manifest of [dailyManifest, authorityManifest]) expect(manifest).toMatchObject({
      boundEquipmentDailyLifeRelease: "v1.0.1-catalog-v0.55.4-2026-08-20",
      boundEquipmentDailyLifeChecksum: "sha256:c2f60f9534d9695c36d9f7075cd288eb52a5050d5a43629081a30a38ac937233",
      boundPublicExplanationAuthorityRelease: "v0.1.2-catalog-v0.55.4-2026-08-20",
      boundPublicExplanationAuthorityChecksum: "sha256:c22d1b1dc6357e6e1cea229e1262f23929f13872e3a59e4ec2002d994aa124cd",
      approvedCompositeBindingChecksum: "sha256:59a65a589f1d04507c86ee68a3f573bfd28f8bfee8cce673f9547cfb37916222",
      productionCompositeBindingChecksum: "sha256:34eae64907d0fc62a73f5d2691a12f440f8adbba40a243dff08cfa9509fcc082",
      state: "OWNER_APPROVED_IMMUTABLE_RELEASE", activationPerformed: false, activePointerUpdated: false,
      generatedModuleUpdated: false, publicIntegrationPerformed: false, decisionEngineEffect: "ZERO",
    });
    expect(authorityManifest).toMatchObject({ approvedCopyChecksum: "sha256:f1f5bc7acaf64f1c416d567d484115bd0600c33b6a98f7063ab8047d8ba93357",
      privacyPolicyChecksum: "sha256:58f0bfcca9d2df5275402f1bbe2b2ca320a0bccb1a87804dc708356b29b2ee2d",
      telemetryPolicyChecksum: "sha256:44c2b01de571afcb83749bcbcf315fe2e3e1b3b1ef47b2b0bb51c0ff3c7ef2c7" });
  });

  it("enforces the complete no-claim and decision-neutrality boundary", () => expect(authorityManifest.noClaimBoundary).toEqual({
    outsidePilotVariant: "NO_CLAIM", unknown: "NO_CLAIM", silentAbsence: "NO_CLAIM", associationOnly: "NO_CLAIM",
    legacyProvisionUnresolved: "NO_CLAIM", optionalOrPackageDependent: "NO_PUBLIC_CLAIM", conflict: "NO_CLAIM",
    nonBydNegativeEvidenceCount: 0, nissanVerifiedAbsenceCount: 0, llmCompletionAuthorityCount: 0,
    featureComparisonScoreCount: 0, candidateOrRankingEffectCount: 0,
  }));

  it("verifies every release, authorization and materialization file checksum", () => {
    for (const directory of [DL_RELEASE, AUTH_RELEASE, AUTHORIZATION, MATERIALIZATION]) {
      const checksums = read<Record<string, string>>(join(directory, "checksums.json"));
      for (const [file, expected] of Object.entries(checksums)) expect(sha(readFileSync(join(directory, file))), `${directory}:${file}`).toBe(expected);
    }
  });

  it("has one and only one terminal successor for each approved candidate", () => {
    const roots = [join(ROOT, "data/production/equipment-daily-life/releases"), join(ROOT, "data/production/equipment-public-explanation-authority/releases")];
    const manifests = roots.flatMap((root) => readdirSync(root).map((name) => join(root, name, "manifest.json")).filter(existsSync).map((path) => read<Record<string, unknown>>(path)));
    expect(manifests.filter((manifest) => manifest.sourceCandidateReleaseId === "v1.0.1-catalog-v0.55.4-2026-08-20-candidate")).toHaveLength(1);
    expect(manifests.filter((manifest) => manifest.sourceCandidateReleaseId === "v0.1.2-catalog-v0.55.4-2026-08-20-candidate")).toHaveLength(1);
  });

  it("preserves the materialization-time inactive boundary as immutable history", () => {
    expect(dryRun.currentEquipmentDailyLife).toMatchObject({ releaseId: "v1.0.0-catalog-v0.55.4-2026-08-20",
      pointerChecksum: "sha256:01fbd50694ef6a60b0cd3cebbfce7e21f1586a682ccc2b509b8169c9d53f1ef8",
      generatedModuleChecksum: "sha256:36be5b3755c3dc79f42651df661706913cafbf5b13cbac9933a6065949633020" });
    expect(dryRun.currentPublicExplanationAuthority).toMatchObject({ state: "NO_ACTIVE_POINTER_OR_GENERATED_MODULE", releaseId: null });
    expect(dryRun).toMatchObject({ finalDisposition: "READY_FOR_EXPLICIT_COMPOSITE_ACTIVATION_APPROVAL", activationPerformed: false,
      catalogEquipmentCompatibility: "PASS", publicImportBoundary: "PASS_NO_PUBLIC_IMPORTS", decisionNeutrality: "PASS_ZERO_EFFECT",
      explicitCompositeActivationApprovalRequired: true });
  });

  it("uses a real canonical UTC materialization instant and preserves legal dispositions", () => {
    expect(dailyManifest.materializedAt).toMatch(/^2026-08-20T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
    expect(Date.parse(dailyManifest.materializedAt as string)).toBeGreaterThan(Date.parse("2026-08-20T12:30:18.894Z"));
    for (const manifest of [dailyManifest, authorityManifest]) expect(manifest).toMatchObject({ legalDisposition: "LEGAL_AND_COPY_APPROVED", consentDisposition: "NO_ADDITIONAL_CONSENT_REQUIRED" });
  });
});
