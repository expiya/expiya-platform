import { describe, expect, it } from "vitest";
import { POST } from "./route";

const conversationId = "11111111-1111-4111-8111-111111111111";
const request = (body: unknown) => new Request("https://www.expiya.com/api/platform/p-materiality", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://www.expiya.com" }, body: JSON.stringify(body) });

describe("root P-materiality route", () => {
  it("executes the Television projection and preserves all exact candidates after UNKNOWN", async () => {
    const created = await POST(request({ action: "CREATE", conversationId, messageId: "create", departmentId: "ELECTRONICS", categoryId: "TELEVISION" }));
    expect(created.status).toBe(200);
    const first = await created.json();
    expect(first).toMatchObject({ kind: "ASK", questionKey: "p.electronics.television.display_inches", runtimeConsumption: "EXECUTABLE_MATERIAL_QUESTION", revision: 0 });
    const turned = await POST(request({ action: "TURN", conversationId, messageId: "unknown", expectedRevision: 0, categoryId: "TELEVISION", message: "Henüz bilmiyorum", stateToken: first.stateToken, choice: { questionKey: first.questionKey, values: ["UNKNOWN"] } }));
    expect(turned.status).toBe(200);
    const final = await turned.json();
    expect(final).toMatchObject({ kind: "CLARIFY", questionKey: "NON_DOMINATED_SET", revision: 1, candidatePoolUnchanged: true, yAuthority: "UNCHANGED_NONE_GRANTED" });
    expect(final.candidateSummaries.map((item: { exactProductId: string }) => item.exactProductId).sort()).toEqual([
      "electronics:television:lg:oled55b65la",
      "electronics:television:next:ye-55gfsg8-qled",
      "electronics:television:samsung:qe75qn90fatxtk",
    ]);
  });

  it("honors information-only suppression without a legacy question", async () => {
    const response = await POST(request({ action: "CREATE", conversationId, messageId: "create", departmentId: "APPLIANCES", categoryId: "WASHING_MACHINE" }));
    expect(await response.json()).toMatchObject({ kind: "CLARIFY", artifactReadiness: "INFORMATION_ONLY", runtimeConsumption: "NO_MATERIAL_QUESTION" });
  });

  it("rejects cross-origin requests", async () => {
    const response = await POST(new Request("https://www.expiya.com/api/platform/p-materiality", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://evil.example" }, body: "{}" }));
    expect(response.status).toBe(403);
  });
});
