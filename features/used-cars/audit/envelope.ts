import { createHash } from "node:crypto";

export interface UsedCarsAuditEnvelope {
  readonly version: "used-cars-audit/v1";
  readonly eventId: string;
  readonly sequence: number;
  readonly tenantId: string | null;
  readonly actorId: string;
  readonly actorType: "DEALER_USER" | "EXPIYA_USER" | "SYSTEM";
  readonly action: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly occurredAt: string;
  readonly reasonCode: string;
  readonly previousEventHash: string | null;
  readonly eventHash: string;
}

type AuditInput = Omit<UsedCarsAuditEnvelope, "eventHash">;

function canonicalAuditInput(input: AuditInput): string {
  return JSON.stringify([
    input.version, input.eventId, input.sequence, input.tenantId, input.actorId,
    input.actorType, input.action, input.subjectType, input.subjectId,
    input.occurredAt, input.reasonCode, input.previousEventHash,
  ]);
}

export function createAuditEnvelope(input: AuditInput): UsedCarsAuditEnvelope {
  return Object.freeze({ ...input, eventHash: `sha256:${createHash("sha256").update(canonicalAuditInput(input)).digest("hex")}` });
}

export function verifyAuditChain(events: readonly UsedCarsAuditEnvelope[]): boolean {
  let previousHash: string | null = null;
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (event.sequence !== index + 1 || event.previousEventHash !== previousHash) return false;
    const { eventHash, ...input } = event;
    if (createAuditEnvelope(input).eventHash !== eventHash) return false;
    previousHash = eventHash;
  }
  return true;
}

