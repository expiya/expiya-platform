import { createAuditEnvelope, type UsedCarsAuditEnvelope } from "../audit/envelope";

const inputs = [
  { eventId: "demo-audit-1", actorId: "demo-user-stock", actorType: "DEALER_USER" as const, action: "INVENTORY_CREATED", subjectType: "INVENTORY_UNIT", subjectId: "demo-unit-1042", occurredAt: "2026-09-01T09:10:00+03:00", reasonCode: "MANUAL_ENTRY" },
  { eventId: "demo-audit-2", actorId: "demo-user-stock", actorType: "DEALER_USER" as const, action: "PRICE_CHANGED", subjectType: "LISTING_REVISION", subjectId: "demo-rev-0007", occurredAt: "2026-09-01T11:45:00+03:00", reasonCode: "DEALER_PRICE_UPDATE" },
  { eventId: "demo-audit-3", actorId: "demo-moderator-07", actorType: "EXPIYA_USER" as const, action: "CHANGES_REQUESTED", subjectType: "MODERATION_TASK", subjectId: "demo-mod-2084", occurredAt: "2026-09-01T14:22:00+03:00", reasonCode: "DOCUMENT_VERIFICATION_REQUIRED" },
];

export function buildDemoAuditChain(): readonly UsedCarsAuditEnvelope[] {
  const events: UsedCarsAuditEnvelope[] = [];
  inputs.forEach((input,index) => events.push(createAuditEnvelope({ version: "used-cars-audit/v1", sequence: index+1, tenantId: "demo-tenant-marmara", previousEventHash: events.at(-1)?.eventHash ?? null, ...input })));
  return Object.freeze(events);
}

