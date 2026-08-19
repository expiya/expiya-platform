import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const WAVE_DIR = path.join(ROOT, "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-SCALE-WAVE-001");
const SNAPSHOT_ROOT = path.join(ROOT, "data/cars/vehicle_evidence/source_snapshots");
const CAPTURED_AT = "2026-08-19T00:45:00.000+03:00";
const sha = (data: Buffer) => `sha256:${createHash("sha256").update(data).digest("hex")}`;

type Reservation = { sourceId: string; exactVariantId: string; familyId: string; originalUrl: string; sourceType: string; market: string; status: string; capturePolicy: string; sharedAcrossMicroBatches: boolean };

async function main() {
  const registryPath = path.join(WAVE_DIR, "source-id-reservations.json");
  const registry = JSON.parse(await readFile(registryPath, "utf8")) as { policyVersion: string; generatedAt: string; reservations: Reservation[] };
  const captured: Array<Record<string, unknown>> = [];
  for (const reservation of registry.reservations) {
    if (reservation.status !== "RESERVED_NOT_CAPTURED") { captured.push(reservation); continue; }
    const response = await fetch(reservation.originalUrl, { redirect: "follow", headers: { "user-agent": "ExpiyaEvidenceCollector/1.0 (+https://www.expiya.com; immutable official-source research snapshot)" } });
    if (!response.ok) {
      captured.push({ ...reservation, status: "CAPTURE_FAILED", httpStatus: response.status, failureReason: `HTTP_${response.status}` });
      continue;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const extension = contentType.includes("pdf") || reservation.originalUrl.toLowerCase().includes(".pdf") ? "pdf" : "html";
    const dir = path.join(SNAPSHOT_ROOT, reservation.sourceId, "2026-08-19");
    const artifactPath = path.join(dir, `source.${extension}`);
    await mkdir(dir, { recursive: true });
    await writeFile(artifactPath, bytes);
    const result = { ...reservation, status: "CAPTURED_IMMUTABLE", finalUrl: response.url, capturedAt: CAPTURED_AT, artifactReference: path.relative(ROOT, artifactPath), artifactSha256: sha(bytes), byteLength: bytes.byteLength, mimeType: contentType.split(";")[0], httpStatus: response.status, secretPolicy: "NO_SESSION_COOKIE_OR_AUTHORIZATION_CAPTURED;PUBLIC_CLIENT_IDENTIFIERS_MAY_EXIST_ONLY_AS_SOURCE_BYTES" };
    await writeFile(path.join(dir, "metadata.json"), `${JSON.stringify(result, null, 2)}\n`);
    captured.push(result);
  }
  const updated = { ...registry, capturedAt: CAPTURED_AT, reservations: captured };
  await writeFile(registryPath, `${JSON.stringify(updated, null, 2)}\n`);
  const report = { capturedAt: CAPTURED_AT, capturedCount: captured.filter(item => item.status === "CAPTURED_IMMUTABLE").length, failedCount: captured.filter(item => item.status === "CAPTURE_FAILED").length, sources: captured };
  await writeFile(path.join(WAVE_DIR, "source-capture-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  const manifest = JSON.parse(await readFile(path.join(WAVE_DIR, "wave-manifest.json"), "utf8")) as { microBatches: Array<{ microBatchId: string; exactVariantIds: string[]; disposition: string }> };
  const capturedIds = new Set(captured.filter(item => item.status === "CAPTURED_IMMUTABLE").map(item => item.exactVariantId as string));
  const failedIds = new Set(captured.filter(item => item.status === "CAPTURE_FAILED").map(item => item.exactVariantId as string));
  const terminal = manifest.microBatches.filter(batch => batch.disposition !== "COLLECTION_APPROVED" || batch.exactVariantIds.some(id => failedIds.has(id))).map(batch => batch.microBatchId);
  const inProgress = manifest.microBatches.filter(batch => batch.disposition === "COLLECTION_APPROVED" && batch.exactVariantIds.every(id => capturedIds.has(id))).map(batch => batch.microBatchId);
  const notStarted = manifest.microBatches.filter(batch => batch.disposition === "COLLECTION_APPROVED" && !terminal.includes(batch.microBatchId) && !inProgress.includes(batch.microBatchId)).map(batch => batch.microBatchId);
  const checkpointCore = { waveId: "EE-PILOT-002-SCALE-WAVE-001", state: "SAFE_CHECKPOINT_NOT_WAVE_COMPLETION", completedMicroBatches: terminal, inProgressMicroBatches: inProgress, notStartedMicroBatches: notStarted, allocatedSourceIds: captured.map(item => item.sourceId), immutableArtifactChecksums: captured.filter(item => item.status === "CAPTURED_IMMUTABLE").map(item => ({ sourceId: item.sourceId, artifactSha256: item.artifactSha256 })), activePointerChanged: false, decisionEngineEffect: "ZERO", generatedAt: CAPTURED_AT };
  const checkpoint = { ...checkpointCore, safeResumeToken: sha(Buffer.from(JSON.stringify(checkpointCore))) };
  await writeFile(path.join(WAVE_DIR, "checkpoint.json"), `${JSON.stringify(checkpoint, null, 2)}\n`);
  const checksumFiles = ["wave-manifest.json", "source-id-reservations.json", "identity-source-preflight.json", "micro-batch-index.json", "audit-deferred-backlog.json", "source-capture-report.json", "checkpoint.json"];
  const checksums = Object.fromEntries(await Promise.all(checksumFiles.map(async file => [file, sha(await readFile(path.join(WAVE_DIR, file)))])));
  await writeFile(path.join(WAVE_DIR, "checksums.json"), `${JSON.stringify(checksums, null, 2)}\n`);
  console.log(JSON.stringify({ captured: captured.filter(item => item.status === "CAPTURED_IMMUTABLE").length, failed: captured.filter(item => item.status === "CAPTURE_FAILED").length }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
