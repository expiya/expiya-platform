import { readFile, mkdir, writeFile } from "node:fs/promises";
/* eslint-disable @typescript-eslint/no-explicit-any -- bounded migration script reads versioned JSON artifacts */
import path from "node:path";
import { calculateEquipmentSubjectContentFingerprint } from "../features/vehicle-data/equipmentSubjectFingerprint";
import { canonicalize, scaleWaveOwnerManifestChecksum, validateScaleWaveOwnerManifest } from "../features/vehicle-data/equipmentScaleWaveOwnerManifest";
import { authorizationStatementHash } from "../features/vehicle-data/equipmentOwnerGovernance";

const ROOT = process.cwd();
const WAVE = path.join(ROOT, "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-SCALE-WAVE-001");
const R1 = path.join(WAVE, "corrections/EE-PILOT-002-SCALE-WAVE-001-R1");
const OUT = path.join(R1, "owner-governance/EE-OAM-SCALE-WAVE-001-R1-BYD-NISSAN");
const GENERATED = "2026-08-19T08:00:00.000+03:00";
const R1_SHA = "sha256:dc5bdbdf7f9e1e6f1e0dbe3780fa348b8f93ebbb818e00c336b739e600df2224";
const CATALOG_SHA = "sha256:fd5609adcc0ca3fec0f8c9dc4dd1c903ed5514326bd322eacd4decff5a044f0f";
const read = async <T>(file: string) => JSON.parse(await readFile(file, "utf8")) as T;
const json = (value: unknown) => `${JSON.stringify(canonicalize(value), null, 2)}\n`;

async function main() {
  const assertions = (await read<{assertions:any[]}>(path.join(R1, "assertion-successors.json"))).assertions;
  const links = (await read<{trimLinks:any[]}>(path.join(R1, "trim-link-successors.json"))).trimLinks;
  const events = await read<any[]>(path.join(R1, "second-review/independent-review-events.json"));
  const actorRegistry = await read<any>(path.join(ROOT, "data/production/equipment-evidence/governance/actor-registry.json"));
  const attestation = await readFile(path.join(ROOT, "data/production/equipment-evidence/governance/attestations/EQUIPMENT_OWNER_001-v1.txt"), "utf8");
  const actor = actorRegistry.actors.find((item:any) => item.actorId === "EQUIPMENT_OWNER_001");
  const ownerActorValid = actor?.status === "ACTIVE" && actor?.scope === "EQUIPMENT_EVIDENCE_ONLY" && actor?.role === "EQUIPMENT_OWNER_APPROVER" && actor.authorizationStatementHash === authorizationStatementHash(attestation)
    && actor.actorId !== "ACTOR-COLLECTOR-CODEX-CATALOG-001" && actor.actorId !== "ACTOR-REVIEWER-CODEX-EQUIPMENT-001";
  if (!ownerActorValid) throw new Error("OWNER_ACTOR_INVALID");
  const reviewMap = new Map(events.map((event:any) => [`${event.subjectType}:${event.subjectId}`, event]));
  const mappingById = new Map<string,any>();
  for (const batch of ["014", "021"]) {
    const mappings = await read<any>(path.join(WAVE, `micro-batches/EE-PILOT-002-BATCH-${batch}/semantic-mappings.json`));
    for (const mapping of mappings.mappings) mappingById.set(mapping.mappingId, mapping);
  }
  const catalog = await read<any>(path.join(ROOT, "data/production/catalog/releases/v0.55.2/catalog.json"));
  const catalogById = new Map<string, any>(catalog.records.map((record:any) => [record.variant.id, record.variant]));
  const legendBySource:any = {
    "SRC-000092": { pageNumber: 3, standardMeaning: "dot=Standard", negativeMeaning: "dash=Mevcut değil" },
    "SRC-000095": { pageNumber: 13, standardMeaning: "square=Standard", negativeMeaning: "dash=Mevcut değil" },
  };
  const brandOf = (id:string) => id === "6cb56615-37ef-51a8-9202-a73e59d4e14b" ? "BYD" : "Nissan";
  const assertionSubjects = assertions.map((item:any) => {
    const review:any = reviewMap.get(`ASSERTION:${item.assertionId}`); if (!review || review.toState !== "SECOND_REVIEW_PASSED") throw new Error("ASSERTION_NOT_PASSED");
    const mapping = mappingById.get(item.semanticMappingId); if (!mapping) throw new Error("SEMANTIC_MAPPING_MISSING");
    return { subjectType:"ASSERTION", subjectId:item.assertionId, assertionId:item.assertionId, predecessorAssertionId:item.supersedesAssertionId, exactVariantId:item.exactVariantId, brand:brandOf(item.exactVariantId), featureCode:item.featureCode,
      availabilityStatus:item.availabilityStatus, provisionMode:item.provisionMode, evidencePolarity:item.evidencePolarity, marketApplicability:item.market, modelYearApplicability:{from:item.modelYearFrom,to:item.modelYearTo},
      trimApplicability:item.locator.column, powertrainApplicability:item.exactVariantId === "6cb56615-37ef-51a8-9202-a73e59d4e14b" ? "BEV" : "e-POWER",
      sources:[{sourceId:item.source.sourceId,artifactSha256:item.source.artifactSha256}], sourceRowIds:[mapping.sourceRowId], locator:item.locator, legend:legendBySource[item.source.sourceId], semanticMappingIds:[item.semanticMappingId],
      contentFingerprint:item.contentFingerprint, fingerprintPolicy:{policyId:"EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_V1",version:"1.0.0"}, independentReviewEventId:review.eventId,
      supersessionChain:[item.supersedesAssertionId,item.assertionId], evidenceConfidence:item.confidence, conflictState:item.conflictState,
      fingerprintInput:{recordType:"EQUIPMENT_ASSERTION_SEMANTIC_CONTENT",recordVersion:"1.0.0",exactVariantId:item.exactVariantId,featureCode:item.featureCode,availabilityStatus:item.availabilityStatus,provisionMode:item.provisionMode,marketApplicability:item.market,modelYearApplicability:{from:item.modelYearFrom,to:item.modelYearTo},trimApplicability:String(item.canonicalTrimId??"EXACT_VARIANT"),powertrainApplicability:"EXACT_CATALOG_POWERTRAIN",sourceIds:[item.source.sourceId],rawArtifactChecksums:[item.source.artifactSha256],sourceRowIds:[mapping.sourceRowId],locator:item.locator,semanticMappingIds:[mapping.mappingId],packageLinkIds:item.canonicalPackageId?[String(item.canonicalPackageId)]:[],evidenceSemantics:{polarity:item.evidencePolarity,confidence:item.confidence,conflictState:item.conflictState}} };
  }).sort((a:any,b:any)=>a.subjectId.localeCompare(b.subjectId));
  const linkSubjects = links.map((item:any) => {
    const review:any = reviewMap.get(`TRIM_LINK:${item.linkId}`); if (!review || review.toState !== "SECOND_REVIEW_PASSED") throw new Error("TRIM_LINK_NOT_PASSED");
    const isByd = brandOf(item.exactVariantId) === "BYD";
    return { subjectType:"TRIM_LINK", subjectId:item.linkId, trimLinkId:item.linkId, predecessorTrimLinkId:item.supersedesTrimLinkId, exactVariantId:item.exactVariantId, brand:brandOf(item.exactVariantId),
      canonicalModel:isByd?"DOLPHIN":"Qashqai", canonicalTrim:isByd?"Comfort":"Platinum Premium", canonicalTrimId:item.canonicalTrimId,
      powertrain:isByd?"BEV":"e-POWER", transmission:isByd?"Single-speed automatic":"Automatic", marketApplicability:item.market, modelYearApplicability:{from:item.modelYearFrom,to:item.modelYearTo},
      identitySources:[{sourceId:item.sourceId,artifactSha256:assertions.find((x:any)=>x.source.sourceId===item.sourceId)?.source.artifactSha256}], locators:[{kind:"PDF_PAGE",pageNumber:isByd?3:13,column:isByd?"Comfort":"Platinum Premium e-POWER"}],
      contentFingerprint:item.contentFingerprint, fingerprintPolicy:{policyId:"EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_V1",version:"1.0.0"}, independentReviewEventId:review.eventId,
      supersessionChain:[item.supersedesTrimLinkId,item.linkId], fingerprintInput:{recordType:"EQUIPMENT_TRIM_LINK_SEMANTIC_CONTENT",recordVersion:"1.0.0",exactVariantId:item.exactVariantId,canonicalBrand:isByd?"BYD":"Nissan",canonicalModel:isByd?"DOLPHIN":"Qashqai",canonicalTrim:isByd?"Comfort":"Platinum Premium e-POWER",canonicalTrimId:item.canonicalTrimId,powertrain:catalogById.get(item.exactVariantId)?.powertrain??null,transmission:catalogById.get(item.exactVariantId)?.powertrain?.transmission??null,modelYear:item.modelYearFrom,market:item.market,identitySources:[{sourceId:item.sourceId,artifactSha256:assertions.find((x:any)=>x.source.sourceId===item.sourceId)?.source.artifactSha256}],locators:assertions.filter((x:any)=>x.exactVariantId===item.exactVariantId).map((x:any)=>x.locator).sort((a:any,b:any)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),applicability:{from:item.modelYearFrom,to:item.modelYearTo,exactVariantOnly:true}} };
  }).sort((a:any,b:any)=>a.subjectId.localeCompare(b.subjectId));
  const subjects = [...assertionSubjects,...linkSubjects];
  const emptyDistribution = () => ({"STANDARD+INCLUDED":0,"OPTIONAL+FACTORY_OPTION":0,"PACKAGE_DEPENDENT+PACKAGE_OPTION":0,"NOT_AVAILABLE+NOT_OFFERED":0});
  const distribution:any = {BYD:emptyDistribution(),Nissan:emptyDistribution(),total:emptyDistribution()};
  for(const item of assertionSubjects){const key=`${item.availabilityStatus}+${item.provisionMode}`; if(!(key in distribution.total)) throw new Error(`INVALID_AVAILABILITY_PROVISION_COMBINATION:${key}`); distribution[item.brand][key]++; distribution.total[key]++;}
  const payload:any = { manifestId:"EE-OAM-SCALE-WAVE-001-R1-BYD-NISSAN", manifestVersion:"1.0.0", pilotId:"EE-PILOT-002", waveId:"EE-PILOT-002-SCALE-WAVE-001", correctionCycleId:"EE-PILOT-002-SCALE-WAVE-001-R1",
    catalogRelease:"v0.55.2", catalogFingerprint:CATALOG_SHA, r1CycleChecksum:R1_SHA, fingerprintPolicy:{policyId:"EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_V1",version:"1.0.0"}, ownerActorId:"EQUIPMENT_OWNER_001",
    subjectCount:67, assertionCount:65, trimLinkCount:2, distributions:{BYD:{assertions:33,trimLinks:1,availabilityProvision:distribution.BYD},Nissan:{assertions:32,trimLinks:1,availabilityProvision:distribution.Nissan},Volvo:{subjects:0},totalAvailabilityProvision:distribution.total},
    decisionAuthority:"SHADOW_AND_EXPLANATION_DISABLED", canonicalSerializationVersion:"CANONICAL_JSON_SORTED_KEYS_V1", generatedAt:GENERATED, approvalEventsCreated:0, materializationsCreated:0, activePointerChanged:false, decisionEngineEffect:"ZERO", subjects };
  const manifest = {...payload,manifestChecksum:scaleWaveOwnerManifestChecksum(payload)};
  const issues = validateScaleWaveOwnerManifest({manifest,passedReviewEvents:events,ownerActorValid,expectedR1Checksum:R1_SHA,recomputeFingerprint:(value)=>calculateEquipmentSubjectContentFingerprint(value)});
  if(issues.length) throw new Error(`MANIFEST_INVALID:${issues.join(",")}`);
  const features=(brand:string)=>assertionSubjects.filter((x:any)=>x.brand===brand).map((x:any)=>`${x.featureCode} — ${x.availabilityStatus} / ${x.provisionMode}`).sort().join("\n- ");
  const ownerReview = `# BYD / Nissan Equipment Owner Review\n\nManifest: \`${manifest.manifestId}\`  \nChecksum: \`${manifest.manifestChecksum}\`\n\n## BYD DOLPHIN Comfort MY2025\n\n- Exact variant ID: \`6cb56615-37ef-51a8-9202-a73e59d4e14b\`\n- İncelenen assertion: 33; sonuç: 30 STANDARD + INCLUDED, 3 NOT_AVAILABLE + NOT_OFFERED.\n- Kaynak: SRC-000092, resmi Türkiye matrisi; Comfort sütunu, fiziksel PDF sayfa 2–3; legend: nokta=Standard, tire=Mevcut değil.\n- Pozitif evidence: 30; açık negatif exact-cell evidence: 3; inconclusive: 18.\n- ${features("BYD")}\n\n## Nissan Qashqai Platinum Premium e-POWER MY2026\n\n- Exact variant ID: \`90e65f94-6fdb-5eea-ad7e-0b4e18435427\`\n- İncelenen assertion: 32; sonuç: 32 STANDARD + INCLUDED. OPTIONAL ve NOT_AVAILABLE assertion yoktur.\n- Kaynak: SRC-000095, resmi Türkiye matrisi; Platinum Premium e-POWER sütunu, fiziksel PDF sayfa 13; legend: kare=Standard, tire=Mevcut değil.\n- Pozitif evidence: 32; açık negatif evidence: 0; inconclusive: 19.\n- ${features("Nissan")}\n\n## Anlam ve sınırlar\n\nSTANDARD, exact trim matrix hücresi ve legend'e dayanır. OPTIONAL stokta mevcut anlamına gelmez. NOT_AVAILABLE yalnız exact trim hücresindeki açık negatif legend'e dayanır; kaynak sessizliği negatif evidence değildir. Inconclusive özellik yokluk anlamına gelmez. Owner approval independent review yerine geçmez. Decision Engine yetkisi hâlâ kapalıdır ve bu hazırlık active pointer değişikliği değildir.\n\nBu belge approval eventi veya verification materialization üretmez.\n`;
  const approvalText = `EQUIPMENT_OWNER_001 olarak ${manifest.manifestId} kimlikli ve\n${manifest.manifestChecksum} checksum’lı BYD/Nissan Equipment approval manifestini\ninceledim. Manifestteki bağımsız incelemeden geçmiş, henüz production materialization\noluşturulmamış 65 equipment assertion adayı ve 2 trim link için owner approval\nverilmesini ve immutable verification materialization kayıtlarının hazırlanmasını\nonaylıyorum. Assertion’ların yalnız exact varyant, model yılı, Türkiye pazarı, resmî\nmatrix hücresi ve legend kapsamıyla geçerli olduğunu; OPTIONAL kayıtların stokta\nmevcut anlamına gelmediğini, NOT_AVAILABLE kayıtların yalnız açık negatif matrix\nevidence’ına dayandığını ve inconclusive özelliklerin yokluk sayılmadığını kabul\nediyorum. Bu onayın Equipment Decision Engine’e filtreleme, sıralama, soru üretme\nveya kullanıcı açıklaması yetkisi vermediğini kabul ediyorum.\n`;
  const appendix={predecessorAssertionIds:assertionSubjects.map((x:any)=>x.predecessorAssertionId).sort(),predecessorTrimLinkIds:linkSubjects.map((x:any)=>x.predecessorTrimLinkId).sort(),independentReviewEventIds:subjects.map((x:any)=>x.independentReviewEventId).sort(),excluded:{VolvoSubjects:27,inconclusiveLedgerRows:62,catalogAuditBacklogVariants:16,AlpineDeferredVariants:2,sourceInsufficientVariants:3,priorBatchSubjects:"EXCLUDED"}};
  const plan={targetVerifiedAssertions:65,targetVerifiedTrimLinks:2,existing:{verifiedAssertions:47,reviewedAssociations:49,verifiedTrimLinks:4,verifiedAssertionCoverage:2,associationOnlyCoverage:2},future:{verifiedAssertions:112,reviewedAssociations:49,verifiedTrimLinks:6,verifiedAssertionCoverage:4,associationOnlyCoverage:2,uncovered:560,totalCatalog:566},VolvoIncluded:false,decisionAuthority:"SHADOW_AND_EXPLANATION_DISABLED"};
  await mkdir(OUT,{recursive:true}); await writeFile(path.join(OUT,"approval-manifest.json"),json(manifest)); await writeFile(path.join(OUT,"owner-review.md"),ownerReview); await writeFile(path.join(OUT,"owner-approval-text.txt"),approvalText); await writeFile(path.join(OUT,"provenance-appendix.json"),json(appendix)); await writeFile(path.join(OUT,"future-materialization-plan.json"),json(plan));
  console.log(json({manifestId:manifest.manifestId,manifestChecksum:manifest.manifestChecksum,distribution,subjects:subjects.length,output:OUT}));
}
main().catch((error)=>{console.error(error);process.exitCode=1});
