import type { StrollerPreferences } from "./decision";
export type BabyOutcome={kind:"ASK"|"RESPOND"|"CLARIFY"|"DECISION_READY"|"UNSUPPORTED";message:string;questionKey?:string;choices?:readonly {value:string;label:string}[];candidates?:readonly {id:string;label:string}[];card?:unknown;contextRevision:number};
export type BabyState={conversationId:string;schemaVersion:"baby-stroller-conversation/v1";revision:number;departmentId:"BABY_AND_CHILD";categoryId:"STROLLER";pinnedCatalogRelease:string;pinnedCatalogDigest:string;pinnedPolicyDigest:string;preferences:StrollerPreferences;askedQuestionKeys:string[];pendingQuestionKey?:string;selectedProductId?:string;lastOutcome?:BabyOutcome;createdAt:string;updatedAt:string};
export type BabyStoredOutcome={conversationId:string;revision:number;state:BabyState;publicOutcome:BabyOutcome};
export type BabyStoredMessage={messageId:string;payloadHash:string;committedRevision:number;outcome:BabyStoredOutcome};
