import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("POST /api/cars/conversation/v3/archive", () => {
  it("archives a local manual transcript with turn trace", async () => {
    const response = await POST(new Request("http://localhost/api/cars/conversation/v3/archive", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost" }, body: JSON.stringify({ conversationId: "manual-archive-test", messages: [{ id: "u1", role: "user", content: "Dizel kamyonet istiyorum" }, { id: "a1", role: "assistant", content: "Bütçen nedir?", variantCounts: { total: 549, remaining: 9 }, trace: { revision: 1, purchaseIntent: "EXPLICIT", route: "PURCHASE_INTENT_DISCOVERY" } }], finalState: { version: "3.7", revision: 1 } }) }));
    expect(response.status).toBe(200); const result = await response.json() as { archiveId: string };
    const archivePath = path.join(process.cwd(), "evals", "cars-v3", "results", "manual-conversations", `${result.archiveId}.json`);
    try { const archive = JSON.parse(await readFile(archivePath, "utf8")); expect(archive).toMatchObject({ source: "CARS_V3_LOCAL_MANUAL_PILOT", completionReason: "USER_CLICKED_DELETE", conversationId: "manual-archive-test" }); expect(archive.messages[1].trace.revision).toBe(1); }
    finally { await unlink(archivePath); }
  });

  it("does not archive an empty conversation", async () => {
    const response = await POST(new Request("http://localhost/api/cars/conversation/v3/archive", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId: "empty", messages: [] }) }));
    expect(response.status).toBe(400);
  });
});
