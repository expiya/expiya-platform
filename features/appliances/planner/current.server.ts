import { loadActiveAppliancesAuthority,loadCurrentPriceProjection,type AppliancesArtifactRepository } from "../authority/loader.server";
import { evaluateAppliancesCandidates } from "../candidate/evaluate";
import type { AppliancesConversationState } from "../contracts";
import { createFileSystemQuestionPolicyRepository,loadActiveWashingMachineQuestionPolicy,type QuestionPolicyArtifactRepository } from "../governance/questionPolicyLoader.server";
import { planAppliancesQuestion } from "./plan";
import type { AppliancesQuestionPlan } from "./types";

export async function planCurrentAppliancesQuestion(input:{readonly artifactRepository:AppliancesArtifactRepository;readonly policyRepository:QuestionPolicyArtifactRepository;readonly state:AppliancesConversationState;readonly now:Date}):Promise<AppliancesQuestionPlan>{const authority=await loadActiveAppliancesAuthority({repository:input.artifactRepository});if(authority.status!=="READY")return{kind:"FAILED_CLOSED",reason:"CONTEXT_AUTHORITY_MISMATCH"};const policy=await loadActiveWashingMachineQuestionPolicy({repository:input.policyRepository,authority:authority.snapshot});const price=await loadCurrentPriceProjection({repository:input.artifactRepository,authority:authority.snapshot,now:input.now});const evaluation=evaluateAppliancesCandidates({authority:authority.snapshot,state:input.state,price});return planAppliancesQuestion({authority:authority.snapshot,policy,state:input.state,evaluation,price});}
export function productionQuestionPolicyRepository(){return createFileSystemQuestionPolicyRepository(process.cwd());}
