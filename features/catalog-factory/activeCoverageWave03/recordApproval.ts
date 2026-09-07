import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = "outputs/catalog-factory-active-coverage-wave-03-evidence-01";
const DISPLAY = "5d1754fd6b74cccf6e54eb28461fbdae40ca0a849c56918221c8769e9b937d20 SHA-256 özetli WU-CATALOG-FACTORY-ACTIVE-COVERAGE-WAVE-03 owner-review adayında, exact-14/94 aktif tabanı ve inactive next-batch8/102 önerisi ayrı tutularak COMPUTER\\_AUDIO, GAME\\_CONSOLE ve HOME\\_SECURITY\\_CAMERA kategorilerindeki 3 exact ürünün candidate olarak incelenmesini onaylıyorum; P/Y readiness, aktivasyon, pointer/runtime/DB/production/deployment/push yetkisi vermiyorum.";
const CANDIDATE = "5d1754fd6b74cccf6e54eb28461fbdae40ca0a849c56918221c8769e9b937d20";
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const sha = (value: unknown) => createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex");
async function immutable(file: string, content: string) { try { if (await readFile(file, "utf8") !== content) throw new Error(`IMMUTABLE_APPROVAL_CONFLICT:${file}`); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, content, { flag: "wx" }); } }

export async function recordWave03OwnerApproval(root = process.cwd()) {
  const canonical = (await readFile(path.join(root, ROOT, "OWNER_APPROVAL_SENTENCE.txt"), "utf8")).trimEnd(), normalized = DISPLAY.replaceAll("\\_", "_");
  const packet = JSON.parse(await readFile(path.join(root, ROOT, "CANDIDATE_PACKET.json"), "utf8"));
  const candidateCore = { ...packet }; delete candidateCore.candidateDigest;
  if (normalized !== canonical || packet.candidateDigest !== CANDIDATE || sha(candidateCore) !== CANDIDATE || CANDIDATE !== (await readFile(path.join(root, ROOT, "CANDIDATE_PACKET.sha256"), "utf8")).trim().replace("sha256:", "")) throw new Error("WAVE03_APPROVAL_BINDING_MISMATCH");
  if (packet.authority.activeExact14Membership !== 94 || packet.authority.inactiveApprovedNextBatch8Proposal !== 102 || packet.authority.nextBatch8CountedAsActive !== false || packet.candidates.length !== 3 || packet.readiness.P_READY || packet.readiness.Y_READY) throw new Error("WAVE03_APPROVAL_SCOPE_MISMATCH");
  const core = { schemaVersion: "catalog-factory-wave03-owner-approval-event/v1", eventId: "CATALOG-FACTORY-WAVE03-OWNER-APPROVAL-01", eventType: "OWNER_REVIEW_CANDIDATES_APPROVED_ACTIVATION_FORBIDDEN", recordedAt: "2026-09-07T23:30:00.000Z", workUnitId: packet.workUnitId, candidateDigest: CANDIDATE, canonicalApprovalSentence: canonical, canonicalApprovalSentenceDigest: sha(canonical), transportNormalization: { applied: true, rule: "MARKDOWN_ESCAPED_UNDERSCORE_TO_LITERAL_UNDERSCORE", submittedDisplaySentence: DISPLAY, submittedDisplaySentenceDigest: sha(DISPLAY), normalizedSentenceDigest: sha(normalized) }, approvedScope: { activeMembership: 94, inactiveNextBatchProposal: 102, exactCandidates: 3, categories: ["COMPUTER_AUDIO", "GAME_CONSOLE", "HOME_SECURITY_CAMERA"], informationReady: true, pReady: false, yReady: false }, boundary: { activation: false, pointer: false, runtime: false, database: false, production: false, deployment: false, push: false } };
  const event = { ...core, eventDigest: sha(core) }, directory = path.join(root, ROOT, "governance", "approval-events", core.eventId);
  await Promise.all([immutable(path.join(directory, "owner-approval-event.json"), `${stable(event)}\n`), immutable(path.join(directory, "canonical-approval-sentence.txt"), `${canonical}\n`), immutable(path.join(directory, "submitted-display-sentence.txt"), `${DISPLAY}\n`)]); return event;
}

if (process.argv[1]?.endsWith("recordApproval.ts")) recordWave03OwnerApproval().then(event => console.log(JSON.stringify({ eventId: event.eventId, eventDigest: event.eventDigest, approvedScope: event.approvedScope, boundary: event.boundary }, null, 2)));
