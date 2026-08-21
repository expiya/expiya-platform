import { describe, expect, it } from "vitest";

import {
  CARS_CONVERSATION_AVAILABILITY,
  isPublicCarsConversationEnabled,
} from "./carsConversationAvailability";

describe("cars conversation public availability", () => {
  it("keeps production fail-closed while allowing isolated tests", () => {
    expect(isPublicCarsConversationEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(isPublicCarsConversationEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(isPublicCarsConversationEnabled({ NODE_ENV: "production", CARS_CONVERSATION_LOCAL_TESTING: "true" })).toBe(false);
    expect(isPublicCarsConversationEnabled({ NODE_ENV: "development", CARS_CONVERSATION_LOCAL_TESTING: "true" })).toBe(true);
    expect(isPublicCarsConversationEnabled({ NODE_ENV: "development", CARS_CONVERSATION_LOCAL_TESTING: "TRUE" })).toBe(false);
    expect(isPublicCarsConversationEnabled({ NODE_ENV: "test" })).toBe(true);
    expect(CARS_CONVERSATION_AVAILABILITY.reasonCode).toBe("CARS_CONVERSATION_VALIDATION_IN_PROGRESS");
  });
});
