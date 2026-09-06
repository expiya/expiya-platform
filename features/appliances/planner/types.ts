import type { AppliancesConversationState } from "../contracts";
import type { AppliancesCandidateEvaluationResult } from "../candidate/types";
import type { PriceProjectionLoadResult, AppliancesAuthoritySnapshot } from "../authority/types";
import type { QuestionPolicyLoadResult } from "../governance/questionPolicyLoader.server";

export const APPLIANCES_QUESTION_SELECTION_POLICY_VERSION="appliances-question-selection/v1" as const;
export interface AppliancesQuestionPlannerInput { readonly authority:AppliancesAuthoritySnapshot;readonly policy:QuestionPolicyLoadResult;readonly state:AppliancesConversationState;readonly evaluation:AppliancesCandidateEvaluationResult;readonly price?:PriceProjectionLoadResult }
export type AppliancesQuestionPlan =
 | {readonly kind:"ASK";readonly questionKey:string;readonly message:string;readonly targetConcept:string;readonly priority:number;readonly answerDomain:Readonly<Record<string,unknown>>;readonly templateRef:string;readonly materiality:{readonly discriminator:string;readonly distinctCandidateValues:number;readonly missingContextCondition:string};readonly contextRevision:number;readonly evaluationFingerprint:string;readonly materialityAuthorityFingerprint:string;readonly questionPolicyId:string;readonly questionPolicyDigest:string;readonly selectionPolicyVersion:typeof APPLIANCES_QUESTION_SELECTION_POLICY_VERSION}
 | {readonly kind:"CLARIFY";readonly questionKey:string;readonly message:string;readonly authoritativeEventId:string;readonly targetConcept:string;readonly contextRevision:number}
 | {readonly kind:"NO_AUTHORIZED_MATERIAL_QUESTION";readonly contextRevision:number;readonly evaluationFingerprint:string;readonly questionPolicyId:string;readonly questionPolicyDigest:string;readonly meaning:"NEUTRAL_PLANNING_ABSENCE"}
 | {readonly kind:"FAILED_CLOSED";readonly reason:"QUESTION_POLICY_AUTHORITY_FAILURE"|"CANDIDATE_EVALUATION_FAILURE"|"CONTEXT_AUTHORITY_MISMATCH"|"CONTEXT_REVISION_MISMATCH"|"EVALUATION_FINGERPRINT_INVALID"|"INVALID_PENDING_CLARIFICATION"|"INVALID_ASKED_QUESTION_STATE"|"UNKNOWN_POLICY_DISCRIMINATOR"|"RUNTIME_POLICY_DIVERGENCE"};
