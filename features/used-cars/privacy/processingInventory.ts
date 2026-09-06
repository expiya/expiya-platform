export type ProcessingPurpose = "DEALER_ONBOARDING" | "ACCESS_SECURITY" | "INVENTORY_MANAGEMENT" | "LISTING_PUBLICATION" | "EVIDENCE_MODERATION" | "NEEDS_MATCHING" | "LEAD_HANDOFF" | "FRAUD_PREVENTION" | "BILLING" | "ANALYTICS" | "LIVE_COMMUNICATION" | "AI_ASSISTANCE";
export type LegalBasis = "CONTRACT" | "LEGAL_OBLIGATION" | "LEGITIMATE_INTEREST" | "EXPLICIT_CONSENT" | "CONSENT";
export interface ProcessingActivity {
  readonly activityId: string;
  readonly purpose: ProcessingPurpose;
  readonly dataCategories: readonly string[];
  readonly dataSubjects: readonly ("B2C_USER" | "DEALER_USER" | "DEALER_CONTACT" | "VIDEO_PARTICIPANT")[];
  readonly recipients: readonly string[];
  readonly legalBasis: LegalBasis | null;
  readonly retentionPolicyId: string | null;
  readonly internationalTransferPossible: boolean;
  readonly automatedDecisioning: boolean;
  readonly humanReviewAvailable: boolean;
  readonly productionProcessingAuthorized: false;
}

export const usedCarsProcessingInventoryDraft: readonly ProcessingActivity[] = Object.freeze([
  { activityId: "PA-001", purpose: "DEALER_ONBOARDING", dataCategories: ["company-contact", "registry-document"], dataSubjects: ["DEALER_CONTACT"], recipients: ["EXPIYA_OPS"], legalBasis: null, retentionPolicyId: null, internationalTransferPossible: false, automatedDecisioning: false, humanReviewAvailable: true, productionProcessingAuthorized: false },
  { activityId: "PA-002", purpose: "ACCESS_SECURITY", dataCategories: ["account", "mfa", "security-event"], dataSubjects: ["DEALER_USER"], recipients: ["EXPIYA_SECURITY"], legalBasis: null, retentionPolicyId: null, internationalTransferPossible: true, automatedDecisioning: false, humanReviewAvailable: true, productionProcessingAuthorized: false },
  { activityId: "PA-003", purpose: "INVENTORY_MANAGEMENT", dataCategories: ["vin", "plate", "vehicle-document"], dataSubjects: ["DEALER_USER"], recipients: ["DEALER_TENANT", "EXPIYA_OPS"], legalBasis: null, retentionPolicyId: null, internationalTransferPossible: true, automatedDecisioning: false, humanReviewAvailable: true, productionProcessingAuthorized: false },
  { activityId: "PA-004", purpose: "NEEDS_MATCHING", dataCategories: ["preference", "risk-tolerance", "budget"], dataSubjects: ["B2C_USER"], recipients: ["EXPIYA_DECISION_SERVICE"], legalBasis: null, retentionPolicyId: null, internationalTransferPossible: false, automatedDecisioning: true, humanReviewAvailable: true, productionProcessingAuthorized: false },
  { activityId: "PA-005", purpose: "LEAD_HANDOFF", dataCategories: ["contact", "preference-summary", "consent-receipt"], dataSubjects: ["B2C_USER"], recipients: ["SELECTED_DEALER_BRANCH"], legalBasis: null, retentionPolicyId: null, internationalTransferPossible: false, automatedDecisioning: false, humanReviewAvailable: true, productionProcessingAuthorized: false },
  { activityId: "PA-006", purpose: "FRAUD_PREVENTION", dataCategories: ["identifier-fingerprint", "security-event", "moderation-case"], dataSubjects: ["DEALER_USER", "B2C_USER"], recipients: ["EXPIYA_SECURITY"], legalBasis: null, retentionPolicyId: null, internationalTransferPossible: true, automatedDecisioning: true, humanReviewAvailable: true, productionProcessingAuthorized: false },
  { activityId: "PA-007", purpose: "BILLING", dataCategories: ["invoice", "payment-metadata"], dataSubjects: ["DEALER_CONTACT"], recipients: ["PAYMENT_PROVIDER", "FINANCE"], legalBasis: null, retentionPolicyId: null, internationalTransferPossible: true, automatedDecisioning: false, humanReviewAvailable: true, productionProcessingAuthorized: false },
  { activityId: "PA-008", purpose: "ANALYTICS", dataCategories: ["pseudonymous-event", "aggregate"], dataSubjects: ["B2C_USER", "DEALER_USER"], recipients: ["EXPIYA_ANALYTICS"], legalBasis: null, retentionPolicyId: null, internationalTransferPossible: true, automatedDecisioning: false, humanReviewAvailable: true, productionProcessingAuthorized: false },
  { activityId: "PA-009", purpose: "LIVE_COMMUNICATION", dataCategories: ["contact", "message", "video-session"], dataSubjects: ["B2C_USER", "VIDEO_PARTICIPANT"], recipients: ["SELECTED_DEALER_BRANCH", "CHANNEL_PROVIDER"], legalBasis: null, retentionPolicyId: null, internationalTransferPossible: true, automatedDecisioning: false, humanReviewAvailable: true, productionProcessingAuthorized: false },
  { activityId: "PA-010", purpose: "AI_ASSISTANCE", dataCategories: ["conversation", "vehicle-context", "negotiation-boundary"], dataSubjects: ["B2C_USER", "DEALER_USER"], recipients: ["AI_PROVIDER"], legalBasis: null, retentionPolicyId: null, internationalTransferPossible: true, automatedDecisioning: true, humanReviewAvailable: true, productionProcessingAuthorized: false },
]);

export function assessProcessingInventory(activities: readonly ProcessingActivity[]) {
  const duplicateIds = activities.filter((activity, index) => activities.findIndex((item) => item.activityId === activity.activityId) !== index).map((activity) => activity.activityId);
  const missingLegalBasis = activities.filter((activity) => activity.legalBasis === null).map((activity) => activity.activityId);
  const missingRetention = activities.filter((activity) => activity.retentionPolicyId === null).map((activity) => activity.activityId);
  const unsafeAutomation = activities.filter((activity) => activity.automatedDecisioning && !activity.humanReviewAvailable).map((activity) => activity.activityId);
  return Object.freeze({ ready: duplicateIds.length === 0 && missingLegalBasis.length === 0 && missingRetention.length === 0 && unsafeAutomation.length === 0, duplicateIds: Object.freeze(duplicateIds), missingLegalBasis: Object.freeze(missingLegalBasis), missingRetention: Object.freeze(missingRetention), unsafeAutomation: Object.freeze(unsafeAutomation), productionProcessingAuthorized: false as const });
}
