import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { digestRecommendationConstructionPolicy, washingMachineRecommendationConstructionPolicyPayloadSchema } from "../features/appliances/governance/recommendationConstructionPolicyAuthority";

type Json = Record<string, unknown>;
const root = process.cwd();
const draftSource = "data/governance/appliances/recommendation-construction-policy/drafts/WASHING_MACHINE_RECOMMENDATION_CONSTRUCTION_POLICY-v0.1.json";
const draft = JSON.parse(readFileSync(path.join(root, draftSource), "utf8")) as Json;
const approvedContent = { ...draft };
for (const key of ["governanceStatus", "lifecycle", "runtimeActive", "createdAt", "creationWorkUnit"]) delete approvedContent[key];
const payload = washingMachineRecommendationConstructionPolicyPayloadSchema.parse({
  ...approvedContent, governanceStatus: "APPROVED", lifecycle: "FROZEN", runtimeActive: true, approvedAt: "2026-09-03T20:30:00+03:00",
  provenance: { draftWorkUnit: "WU-APPL-RECOMMENDATION-CONSTRUCTION-POLICY-01", approvalWorkUnit: "WU-APPL-RECOMMENDATION-CONSTRUCTION-POLICY-APPROVAL-FREEZE-01", approvedBy: "ORGANIZATOR", reviewVerdict: "APPROVED_WITHOUT_SEMANTIC_AMENDMENT", draftSource },
});
const policyDigest = digestRecommendationConstructionPolicy(payload);
const artifact = { envelopeSchemaVersion: "washing-machine-recommendation-construction-policy-artifact/v1", canonicalSerialization: "CANONICAL_JSON_SORTED_KEYS_V1", policyDigest, payload };
const pointer = { schemaVersion: "appliances-recommendation-construction-policy-active-pointer/v1", policyId: payload.policyId, policyDigest, policyFile: "releases/WASHING_MACHINE_RECOMMENDATION_CONSTRUCTION_POLICY-v0.1/policy.json", lifecycle: "ACTIVE" };
const releasePath = path.join(root, "data/production/appliances/recommendation-construction-policy/releases/WASHING_MACHINE_RECOMMENDATION_CONSTRUCTION_POLICY-v0.1/policy.json");
const bytes = `${JSON.stringify(artifact, null, 2)}\n`; mkdirSync(path.dirname(releasePath), { recursive: true });
if (existsSync(releasePath) && readFileSync(releasePath, "utf8") !== bytes) throw new Error("IMMUTABLE_RELEASE_CONFLICT");
if (!existsSync(releasePath)) writeFileSync(releasePath, bytes, { flag: "wx" });
const activePath = path.join(root, "data/production/appliances/recommendation-construction-policy/active.json"); mkdirSync(path.dirname(activePath), { recursive: true }); writeFileSync(activePath, `${JSON.stringify(pointer, null, 2)}\n`);
console.log(JSON.stringify({ policyId: payload.policyId, policyDigest }, null, 2));
