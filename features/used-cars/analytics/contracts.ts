export type UsedCarsAnalyticsNamespace = "used_b2c" | "used_partner" | "used_ops";

export interface UsedCarsAnalyticsEvent {
  readonly version: "used-cars-analytics/v1";
  readonly namespace: UsedCarsAnalyticsNamespace;
  readonly eventName: string;
  readonly occurredAt: string;
  readonly tenantId?: string;
  readonly listingId?: string;
  readonly attributes: Readonly<Record<string, string | number | boolean | null>>;
}

export const forbiddenUsedCarsAnalyticsKeys = [
  "vin", "plate", "phone", "email", "firstName", "lastName", "rawConversation",
] as const;

export function hasForbiddenAnalyticsAttributes(event: UsedCarsAnalyticsEvent): boolean {
  return forbiddenUsedCarsAnalyticsKeys.some((key) => key in event.attributes);
}

export const organicEventNames = ["organic_impression", "organic_detail_opened", "organic_lead_started"] as const;
export const sponsoredEventNames = ["sponsored_impression", "sponsored_detail_opened"] as const;

export function validateAnalyticsStream(event: UsedCarsAnalyticsEvent): boolean {
  if (hasForbiddenAnalyticsAttributes(event)) return false;
  const organic = (organicEventNames as readonly string[]).includes(event.eventName);
  const sponsored = (sponsoredEventNames as readonly string[]).includes(event.eventName);
  if (organic && ("campaignId" in event.attributes || "planCode" in event.attributes)) return false;
  if (sponsored && (typeof event.attributes.campaignId !== "string" || event.attributes.sponsored !== true)) return false;
  return organic || sponsored || !event.eventName.includes("impression");
}

