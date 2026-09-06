import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";

const messageSchema = z.object({
  id: z.string().min(1).max(100), role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4_000),
  recommendations: z.array(z.object({ id: z.string(), title: z.string(), warning: z.string().optional() })).optional(),
  variantCounts: z.object({ total: z.number().int().nonnegative(), remaining: z.number().int().nonnegative() }).optional(),
  trace: z.unknown().optional(),
});
const schema = z.object({ conversationId: z.string().min(1).max(100), messages: z.array(messageSchema).min(1).max(500), finalState: z.unknown().optional() });

export async function POST(request: Request): Promise<Response> {
  const rejected = verifySameOrigin(request); if (rejected) return rejected;
  try {
    const input = schema.parse(await readJsonWithLimit(request, 2_000_000));
    const completedAt = new Date().toISOString(); const archiveId = `${completedAt.replace(/[:.]/gu, "-")}-${randomUUID()}`;
    const payload = { schemaVersion: 1, source: "CARS_V3_LOCAL_MANUAL_PILOT", completionReason: "USER_CLICKED_DELETE", completedAt, conversationId: input.conversationId, checksum: createHash("sha256").update(JSON.stringify(input.messages)).digest("hex"), messages: input.messages, finalState: input.finalState };
    const directory = path.join(process.cwd(), "evals", "cars-v3", "results", "manual-conversations");
    await mkdir(directory, { recursive: true }); await writeFile(path.join(directory, `${archiveId}.json`), `${JSON.stringify(payload, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    return Response.json({ archived: true, archiveId });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return Response.json({ message: "Görüşme kaydı doğrulanamadı." }, { status: 400 });
    return Response.json({ message: "Görüşme yerel arşive kaydedilemedi." }, { status: 500 });
  }
}
