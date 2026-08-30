"use client";

import { track } from "@vercel/analytics";

export type AnalyticsSurface = "legacy_recommendations" | "v2_recommendations" | "v3_recommendations";
export type ConversationVersion = "legacy" | "v3";
export type Phase3AnalyticsIntent = "quote" | "test_drive" | "dealer_contact";

type ProductEvent = Readonly<{
  name: "chat_started" | "recommendations_revealed" | "car_card_viewed" | "car_card_opened" | "sales_advisor_started" | "phase3_cta_clicked";
  properties: Readonly<Record<string, string | number>>;
}>;

export const productEvents = {
  chatStarted: (version: ConversationVersion): ProductEvent => ({ name: "chat_started", properties: { version } }),
  recommendationsRevealed: (surface: AnalyticsSurface, count: number): ProductEvent => ({ name: "recommendations_revealed", properties: { surface, count: Math.max(1, Math.min(20, Math.trunc(count))) } }),
  carCardViewed: (surface: AnalyticsSurface, position: number): ProductEvent => ({ name: "car_card_viewed", properties: { surface, position: Math.max(1, Math.min(20, Math.trunc(position))) } }),
  carCardOpened: (surface: AnalyticsSurface, position: number): ProductEvent => ({ name: "car_card_opened", properties: { surface, position: Math.max(1, Math.min(20, Math.trunc(position))) } }),
  salesAdvisorStarted: (): ProductEvent => ({ name: "sales_advisor_started", properties: { surface: "exact_variant" } }),
  phase3CtaClicked: (intent: Phase3AnalyticsIntent): ProductEvent => ({ name: "phase3_cta_clicked", properties: { surface: "sales_advisor", intent } }),
} as const;

export function recordProductEvent(event: ProductEvent): void {
  track(event.name, event.properties);
}

export function recordProductEventOnce(key: string, event: ProductEvent): void {
  try {
    const storageKey = `expiya:analytics:${key}`;
    if (sessionStorage.getItem(storageKey)) return;
    recordProductEvent(event);
    sessionStorage.setItem(storageKey, "1");
  } catch {
    recordProductEvent(event);
  }
}
