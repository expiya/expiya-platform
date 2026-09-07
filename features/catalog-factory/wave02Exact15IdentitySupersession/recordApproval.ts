import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = "outputs/catalog-factory-wave-02-14-exact-identity-supersession-owner-review-01";
const DISPLAY_SUBMISSION = "7f5ee7b49e029ee80b6a7b2bfae008dfb41b8c1f78f4aaadf77f0c5bffed04d8 SHA-256 aday özeti ve 79e74a7b64b61ffd4a9a05bb6392743b2e81b103a668388142ac08751ffbe860 SHA-256 paket özetiyle bağlı WU-CATALOG-FACTORY-WAVE-02-15-EXACT-IDENTITY-SUPERSESSION-01 paketinde, mevcut 80 aktif üyeliğe 14 gerçek semantik exact ürün eklenerek 94 üyelik önerilmesini ve LG GC-B569NLLM gözleminin LG\\_GC\\_B569NLLM\\_TR kimliğine bağlı terminal duplicate olarak üyelik etkisi sıfır kalmasını onaylıyorum; önceki exact-15/95 onayı bu yeni kapsamı karşılamaz ve pointer/runtime/production/deployment/push değişikliği ayrı atomik aktivasyon onayı gerektirir.";
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const sha = (value: unknown) => createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex");

export async function recordWave02Exact14SupersessionApproval(base = process.cwd()) {
  const directory = path.join(base, ROOT), canonical = (await readFile(path.join(directory, "OWNER_APPROVAL_SENTENCE.txt"), "utf8")).trimEnd();
  const manifest = JSON.parse(await readFile(path.join(directory, "OWNER_REVIEW_PACKAGE.json"), "utf8"));
  const normalized = DISPLAY_SUBMISSION.replaceAll("\\_", "_");
  if (normalized !== canonical) throw new Error("NORMALIZED_APPROVAL_SENTENCE_MISMATCH");
  if (sha(normalized) !== manifest.ownerApprovalSentenceDigest || manifest.approvalEligibility !== true) throw new Error("APPROVAL_PACKAGE_BINDING_FAILED");
  const core = {
    schemaVersion: "catalog-factory-supersession-owner-approval-event/v0.1",
    eventId: "CATALOG-FACTORY-EXACT14-SUPERSESSION-OWNER-APPROVAL-01",
    eventType: "OWNER_APPROVAL_GRANTED_FOR_SEPARATE_ATOMIC_SUPERSESSION",
    recordedAt: "2026-09-07T12:00:00.000Z",
    workUnitId: manifest.workUnitId,
    candidateDigest: manifest.candidateDigest,
    packageDigest: manifest.packageDigest,
    canonicalApprovalSentence: canonical,
    canonicalApprovalSentenceDigest: sha(canonical),
    transportNormalization: { applied: true, rule: "MARKDOWN_ESCAPED_UNDERSCORE_TO_LITERAL_UNDERSCORE", submittedDisplaySentence: DISPLAY_SUBMISSION, submittedDisplaySentenceDigest: sha(DISPLAY_SUBMISSION), normalizedSentenceDigest: sha(normalized), semanticTokenBefore: "LG\\_GC\\_B569NLLM\\_TR", canonicalTokenAfter: "LG_GC_B569NLLM_TR" },
    approvedScope: { baselineActive: 80, semanticExactAdditions: 14, proposedMembership: 94, duplicateObservation: "appliances:refrigerator:lg:lg-gc-b569nllm", canonicalExistingIdentity: "LG_GC_B569NLLM_TR", duplicateMembershipEffect: 0 },
    priorAuthority: { exact15ApprovalCoversNewScope: false, exact15OverlayStillSelectedLocally: true, supersessionEffective: false },
    authorizationBoundary: { separateAtomicActivationRequired: true, pointerMutation: false, runtimeMutation: false, productionMutation: false, domainPointerMutation: false, databaseMutation: false, deployment: false, push: false },
  };
  const event = { ...core, eventDigest: sha(core) };
  const eventDirectory = path.join(directory, "governance", "approval-events", event.eventId);
  await mkdir(eventDirectory, { recursive: true });
  await Promise.all([
    writeFile(path.join(eventDirectory, "owner-approval-event.json"), `${stable(event)}\n`),
    writeFile(path.join(eventDirectory, "canonical-approval-sentence.txt"), `${canonical}\n`),
    writeFile(path.join(eventDirectory, "submitted-display-sentence.txt"), `${DISPLAY_SUBMISSION}\n`),
  ]);
  return event;
}

if (process.argv[1]?.endsWith("recordApproval.ts")) recordWave02Exact14SupersessionApproval().then(event => console.log(JSON.stringify({ eventId: event.eventId, eventDigest: event.eventDigest, approvedScope: event.approvedScope, authorizationBoundary: event.authorizationBoundary }, null, 2)));
