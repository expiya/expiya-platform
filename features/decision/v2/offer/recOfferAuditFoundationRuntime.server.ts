import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type FoundationPointer = Readonly<{
  state: "ACTIVE";
  activeFoundationRelease: string;
  payloadChecksum: string;
  manifestChecksum: string;
  cutoverEventId: string;
  cutoverEventChecksum: string;
  sequencePolicyId: "REC_OFFER_AUDIT_SEQUENCE_V1";
  acceptanceSequence: 1;
  revealSequence: 2;
  rollbackTarget: "SAFE_PREDECESSOR_ROUTE_STORE";
}>;

const sha = (text: string) => `sha256:${createHash("sha256").update(text).digest("hex")}`;

export function loadActiveRecOfferAuditFoundation(root = process.cwd()):
  | Readonly<{ status: "ACTIVE"; pointer: FoundationPointer }>
  | Readonly<{ status: "INACTIVE"; reason: string }> {
  const base = join(root, "data/production/rec-offer-audit-foundation");
  const pointerPath = join(base, "active.json");
  if (!existsSync(pointerPath)) return { status: "INACTIVE", reason: "ACTIVE_POINTER_MISSING" };
  try {
    const pointerText = readFileSync(pointerPath, "utf8");
    const pointer = JSON.parse(pointerText) as FoundationPointer;
    if (pointer.state !== "ACTIVE" || pointer.sequencePolicyId !== "REC_OFFER_AUDIT_SEQUENCE_V1" || pointer.acceptanceSequence !== 1 || pointer.revealSequence !== 2) {
      return { status: "INACTIVE", reason: "ACTIVE_POINTER_INVALID" };
    }
    const releaseDir = join(base, "releases", pointer.activeFoundationRelease);
    const payloadPath = join(releaseDir, "policy.json");
    const manifestPath = join(releaseDir, "manifest.json");
    const eventPath = join(base, "governance/cutover-events", pointer.cutoverEventId, "cutover-event.json");
    if (![payloadPath, manifestPath, eventPath].every(existsSync)) return { status: "INACTIVE", reason: "ACTIVE_CHAIN_ARTIFACT_MISSING" };
    const payloadText = readFileSync(payloadPath, "utf8");
    const manifestText = readFileSync(manifestPath, "utf8");
    const eventText = readFileSync(eventPath, "utf8");
    if (sha(payloadText) !== pointer.payloadChecksum || sha(manifestText) !== pointer.manifestChecksum || sha(eventText) !== pointer.cutoverEventChecksum) {
      return { status: "INACTIVE", reason: "ACTIVE_CHAIN_CHECKSUM_MISMATCH" };
    }
    const payload = JSON.parse(payloadText) as Record<string, unknown>;
    const event = JSON.parse(eventText) as Record<string, unknown>;
    if (payload.releaseId !== pointer.activeFoundationRelease || event.cutoverEventId !== pointer.cutoverEventId || event.status !== "CUTOVER_ACTIVE") {
      return { status: "INACTIVE", reason: "ACTIVE_CHAIN_BINDING_INVALID" };
    }
    return { status: "ACTIVE", pointer: Object.freeze(pointer) };
  } catch {
    return { status: "INACTIVE", reason: "ACTIVE_CHAIN_PARSE_FAILED" };
  }
}
