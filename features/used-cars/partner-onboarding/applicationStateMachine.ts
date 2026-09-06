export const partnerApplicationStatuses = [
  "DRAFT", "EMAIL_VERIFICATION_PENDING", "READY_TO_SUBMIT", "SUBMITTED",
  "IDENTITY_REVIEW", "DOCUMENT_REVIEW", "ADDITIONAL_INFORMATION_REQUESTED",
  "IETTS_REVIEW", "CONTRACT_PENDING", "APPROVED", "REJECTED_WITH_REASON",
  "ACTIVATION_SENT", "ACTIVATED", "SUSPENDED", "WITHDRAWN", "EXPIRED",
] as const;

export type PartnerApplicationStatus = (typeof partnerApplicationStatuses)[number];
export type PartnerApplicationActor = "APPLICANT" | "EXPIYA_REVIEWER" | "EXPIYA_SYSTEM";

const transitions: Readonly<Record<PartnerApplicationStatus, readonly PartnerApplicationStatus[]>> = Object.freeze({
  DRAFT: ["EMAIL_VERIFICATION_PENDING", "WITHDRAWN", "EXPIRED"],
  EMAIL_VERIFICATION_PENDING: ["READY_TO_SUBMIT", "WITHDRAWN", "EXPIRED"],
  READY_TO_SUBMIT: ["SUBMITTED", "WITHDRAWN", "EXPIRED"],
  SUBMITTED: ["IDENTITY_REVIEW", "WITHDRAWN"],
  IDENTITY_REVIEW: ["DOCUMENT_REVIEW", "ADDITIONAL_INFORMATION_REQUESTED", "REJECTED_WITH_REASON"],
  DOCUMENT_REVIEW: ["ADDITIONAL_INFORMATION_REQUESTED", "IETTS_REVIEW", "REJECTED_WITH_REASON"],
  ADDITIONAL_INFORMATION_REQUESTED: ["SUBMITTED", "WITHDRAWN", "EXPIRED"],
  IETTS_REVIEW: ["CONTRACT_PENDING", "ADDITIONAL_INFORMATION_REQUESTED", "REJECTED_WITH_REASON"],
  CONTRACT_PENDING: ["APPROVED", "ADDITIONAL_INFORMATION_REQUESTED", "REJECTED_WITH_REASON"],
  APPROVED: ["ACTIVATION_SENT", "SUSPENDED"], ACTIVATION_SENT: ["ACTIVATED", "EXPIRED", "SUSPENDED"],
  ACTIVATED: ["SUSPENDED"], SUSPENDED: [], REJECTED_WITH_REASON: [], WITHDRAWN: [], EXPIRED: [],
});

const applicantStatuses = new Set<PartnerApplicationStatus>(["DRAFT", "EMAIL_VERIFICATION_PENDING", "READY_TO_SUBMIT", "ADDITIONAL_INFORMATION_REQUESTED"]);
const systemTransitions = new Set(["DRAFT:EXPIRED", "EMAIL_VERIFICATION_PENDING:EXPIRED", "ADDITIONAL_INFORMATION_REQUESTED:EXPIRED", "ACTIVATION_SENT:EXPIRED"]);

export type ApplicationTransitionDecision =
  | { readonly allowed: true; readonly productionMutationAuthorized: false }
  | { readonly allowed: false; readonly reason: "TRANSITION_NOT_ALLOWED" | "ACTOR_NOT_ALLOWED" | "REASON_REQUIRED"; readonly productionMutationAuthorized: false };

export function evaluateApplicationTransition(input: { readonly from: PartnerApplicationStatus; readonly to: PartnerApplicationStatus; readonly actor: PartnerApplicationActor; readonly reasonCode?: string }): ApplicationTransitionDecision {
  if (!transitions[input.from].includes(input.to)) return { allowed: false, reason: "TRANSITION_NOT_ALLOWED", productionMutationAuthorized: false };
  if ((input.to === "REJECTED_WITH_REASON" || input.to === "SUSPENDED") && !input.reasonCode?.trim()) return { allowed: false, reason: "REASON_REQUIRED", productionMutationAuthorized: false };
  const applicantAllowed = input.to === "WITHDRAWN" || (applicantStatuses.has(input.from) && ["EMAIL_VERIFICATION_PENDING", "READY_TO_SUBMIT", "SUBMITTED"].includes(input.to));
  const systemAllowed = systemTransitions.has(`${input.from}:${input.to}`);
  if ((input.actor === "APPLICANT" && !applicantAllowed) || (input.actor === "EXPIYA_SYSTEM" && !systemAllowed) || (input.actor === "EXPIYA_REVIEWER" && (applicantAllowed || systemAllowed))) {
    return { allowed: false, reason: "ACTOR_NOT_ALLOWED", productionMutationAuthorized: false };
  }
  return { allowed: true, productionMutationAuthorized: false };
}
