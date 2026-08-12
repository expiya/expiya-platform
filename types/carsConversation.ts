import type { RecommendedCar } from "@/types/recommendation";

export interface CarsConversationMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly recommendations?: readonly RecommendedCar[];
}

export interface PersistedCarsConversation {
  readonly version: 1;
  readonly conversationId: string;
  readonly messages: readonly CarsConversationMessage[];
}

export interface CarsConversationRequest {
  readonly conversationId: string;
  readonly messages: readonly CarsConversationMessage[];
}

export type CarsConversationResponse =
  | {
      readonly kind: "QUESTION";
      readonly message: string;
    }
  | {
      readonly kind: "RECOMMENDATIONS";
      readonly message: string;
      readonly recommendations: readonly RecommendedCar[];
    }
  | {
      readonly kind: "ERROR";
      readonly message: string;
    };
