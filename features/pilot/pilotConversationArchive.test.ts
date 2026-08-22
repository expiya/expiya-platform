import { describe, expect, it } from "vitest";
import { createPilotArchiveIdentity } from "./pilotConversationArchive";
describe("pilot conversation archive identity", () => {
  it("is deterministic, user-bound and counts payable conversation turns", () => {
    const input = { conversationId: "c", pilotUsername: "pilot-1", messages: [{ id: "u", role: "user" as const, content: "SUV istiyorum" }, { id: "a", role: "assistant" as const, content: "Kullanımınız?" }] };
    expect(createPilotArchiveIdentity(input)).toMatchObject({ userTurnCount: 1, assistantTurnCount: 1, archiveChecksum: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u) });
    expect(createPilotArchiveIdentity(input)).toEqual(createPilotArchiveIdentity(input));
    expect(createPilotArchiveIdentity({ ...input, pilotUsername: "pilot-2" }).archiveChecksum).not.toBe(createPilotArchiveIdentity(input).archiveChecksum);
  });
  it("rejects an empty payable conversation", () => expect(() => createPilotArchiveIdentity({ conversationId: "c", pilotUsername: "pilot", messages: [] })).toThrow("PILOT_ARCHIVE_EMPTY_CONVERSATION"));
});
