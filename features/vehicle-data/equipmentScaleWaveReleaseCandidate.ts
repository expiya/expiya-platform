import { scaleWaveOwnerManifestChecksum } from "./equipmentScaleWaveOwnerManifest";
/* eslint-disable @typescript-eslint/no-explicit-any -- validator consumes immutable JSON release artifacts */

export function validateScaleWaveReleaseCandidate(input: {
  manifest: Record<string, any>; approvalEvents: readonly Record<string, any>[];
  assertionMaterializations: readonly Record<string, any>[]; trimMaterializations: readonly Record<string, any>[];
  payload: Record<string, any>; expectedManifestChecksum: string;
}): string[] {
  const issues:string[]=[]; const {manifest}=input;
  const {manifestChecksum,...manifestPayload}=manifest;
  if(manifestChecksum!==input.expectedManifestChecksum||scaleWaveOwnerManifestChecksum(manifestPayload)!==input.expectedManifestChecksum) issues.push("APPROVAL_MANIFEST_CHECKSUM_MISMATCH");
  if(input.approvalEvents.length!==67||new Set(input.approvalEvents.map(x=>`${x.subjectType}:${x.subjectId}`)).size!==67) issues.push("OWNER_APPROVAL_EVENT_COUNT_OR_DUPLICATE_INVALID");
  if(input.assertionMaterializations.length!==65||new Set(input.assertionMaterializations.map(x=>x.sourceAssertionId)).size!==65) issues.push("ASSERTION_MATERIALIZATION_COUNT_OR_DUPLICATE_INVALID");
  if(input.trimMaterializations.length!==2||new Set(input.trimMaterializations.map(x=>x.sourceTrimLinkId)).size!==2) issues.push("TRIM_MATERIALIZATION_COUNT_OR_DUPLICATE_INVALID");
  const negative=input.assertionMaterializations.filter(x=>x.availabilityStatus==="NOT_AVAILABLE");
  if(negative.length!==3||negative.some(x=>x.exactVariantId!=="6cb56615-37ef-51a8-9202-a73e59d4e14b"||x.provisionMode!=="NOT_OFFERED"||x.marketApplicability!=="TR"||x.modelYearApplicability?.from!==2025||!x.locator?.row||!x.locator?.column||!x.legend?.negativeMeaning)) issues.push("NEGATIVE_EVIDENCE_SCOPE_INVALID");
  if(input.assertionMaterializations.filter(x=>x.exactVariantId==="90e65f94-6fdb-5eea-ad7e-0b4e18435427"&&x.availabilityStatus==="NOT_AVAILABLE").length) issues.push("NISSAN_NEGATIVE_EVIDENCE_FORBIDDEN");
  if(input.assertionMaterializations.some(x=>x.verificationState!=="VERIFIED"||x.decisionAuthority!=="SHADOW_AND_EXPLANATION_DISABLED")) issues.push("MATERIALIZATION_AUTHORITY_INVALID");
  if(input.payload.verifiedAssertions?.length!==112||input.payload.reviewedAssociations?.length!==49||input.payload.verifiedTrimLinks?.length!==6||input.payload.projections?.length!==112) issues.push("CUMULATIVE_COUNTS_INVALID");
  if(input.payload.coverage?.verifiedAssertionCoverage?.exactVariantCount!==4||input.payload.coverage?.reviewedAssociationOnlyCoverage?.exactVariantCount!==2||input.payload.coverage?.uncoveredCoverage?.exactVariantCount!==560) issues.push("COVERAGE_TIERS_INVALID");
  if(input.payload.decisionAuthority!=="SHADOW_AND_EXPLANATION_DISABLED"||Object.values(input.payload.decisionControls??{}).some(value=>value===true)) issues.push("DECISION_NEUTRALITY_INVALID");
  return [...new Set(issues)].sort();
}
