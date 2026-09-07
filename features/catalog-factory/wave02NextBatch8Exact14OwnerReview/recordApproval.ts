import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = "outputs/catalog-factory-wave-02-next-batch-8-exact14-owner-review-01";
const SENTENCE = "7cddb45db187daf1bc6dbccf8f108b9e649e61307aa84bde89adb2809831902b SHA-256 aday özetiyle bağlı WU-CATALOG-FACTORY-WAVE-02-NEXT-BATCH-8-EXACT14-OWNER-REVIEW-01 paketinde, mevcut exact-14/94 authority korunarak 8 doğrulanmış exact ürünün 102 üyelikli ayrı atomik aktivasyon adayı olarak owner-review onayını veriyorum; 8 CONFLICTED ve 27 UNKNOWN kayıt üyelik dışı kalacak, P/Y readiness ve pointer/runtime/DB/production/deployment/push yetkisi bu onaya dahil olmayacaktır.";
const EXPECTED = { candidate: "7cddb45db187daf1bc6dbccf8f108b9e649e61307aa84bde89adb2809831902b", package: "4beb06df60856bc4a88ebcd284c2e0c361bcbb10d3467b0f7451c6a2fa4b2694" };
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const sha = (value: unknown) => createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex");

async function immutableWrite(file: string, content: string) {
  try { if ((await readFile(file, "utf8")) !== content) throw new Error(`IMMUTABLE_APPROVAL_CONFLICT:${file}`); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, content, { flag: "wx" }); }
}

export async function recordNextBatch8Exact14OwnerApproval(root = process.cwd()) {
  const directory = path.join(root, ROOT), canonical = (await readFile(path.join(directory, "OWNER_APPROVAL_SENTENCE.txt"), "utf8")).trimEnd();
  const packet = JSON.parse(await readFile(path.join(directory, "OWNER_REVIEW_PACKAGE.json"), "utf8"));
  if (canonical !== SENTENCE || sha(canonical) !== packet.ownerApprovalSentenceDigest) throw new Error("OWNER_APPROVAL_SENTENCE_MISMATCH");
  const packageCore = { ...packet }; delete packageCore.packageDigest;
  const candidateCore = { ...packageCore }; for (const key of ["candidateDigest", "approvalEligibility", "ownerApprovalSentence", "ownerApprovalSentenceDigest"]) delete candidateCore[key];
  if (packet.packageDigest !== EXPECTED.package || sha(packageCore) !== EXPECTED.package || packet.candidateDigest !== EXPECTED.candidate || sha(candidateCore) !== EXPECTED.candidate || packet.approvalEligibility !== true) throw new Error("OWNER_APPROVAL_DIGEST_CHAIN_MISMATCH");
  if (packet.totals.before !== 94 || packet.totals.additions !== 8 || packet.totals.proposedAfter !== 102 || packet.totals.conflictedExcluded !== 8 || packet.totals.unknownExcluded !== 27) throw new Error("OWNER_APPROVAL_SCOPE_MISMATCH");
  const core = { schemaVersion: "catalog-factory-next-batch8-exact14-owner-approval-event/v1", eventId: "CATALOG-FACTORY-NEXT-BATCH8-EXACT14-OWNER-APPROVAL-01", eventType: "OWNER_REVIEW_APPROVED_ACTIVATION_STILL_SEPARATE", recordedAt: "2026-09-07T22:00:00.000Z", workUnitId: packet.workUnitId, candidateDigest: EXPECTED.candidate, packageDigest: EXPECTED.package, canonicalApprovalSentence: canonical, canonicalApprovalSentenceDigest: sha(canonical), approvedScope: { currentMembership: 94, exactAdditions: 8, proposedMembership: 102, conflictedExcluded: 8, unknownExcluded: 27, informationReady: true, pReady: false, yReady: false }, authorizationBoundary: { atomicActivationSeparatelyRequired: true, pointerMutation: false, runtimeMutation: false, databaseMutation: false, productionMutation: false, deployment: false, push: false } };
  const event = { ...core, eventDigest: sha(core) }, eventDirectory = path.join(directory, "governance", "approval-events", core.eventId);
  await Promise.all([immutableWrite(path.join(eventDirectory, "owner-approval-event.json"), `${stable(event)}\n`), immutableWrite(path.join(eventDirectory, "canonical-approval-sentence.txt"), `${canonical}\n`)]);
  return event;
}

if (process.argv[1]?.endsWith("recordApproval.ts")) recordNextBatch8Exact14OwnerApproval().then(event => console.log(JSON.stringify({ eventId: event.eventId, eventDigest: event.eventDigest, approvedScope: event.approvedScope, authorizationBoundary: event.authorizationBoundary }, null, 2)));
