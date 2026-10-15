import { z } from "zod";

import { classifySecretaryMessage } from "@/features/platform/upperSecretary";
import { enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";

const bodySchema = z.object({ message: z.string().trim().min(1).max(1_000) }).strict();

export async function POST(request: Request): Promise<Response> {
  const originFailure = verifySameOrigin(request);
  if (originFailure) return originFailure;
  const rateLimitFailure = await enforceRateLimit(request, { scope: "platform-secretary", limit: 12, windowMs: 60_000 });
  if (rateLimitFailure) return rateLimitFailure;
  try {
    const parsed = bodySchema.safeParse(await readJsonWithLimit(request, 4_096));
    if (!parsed.success) return Response.json({ message: "Mesajınızı kontrol edip yeniden deneyin." }, { status: 400 });
    return Response.json(classifySecretaryMessage(parsed.data.message), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Şu anda yardımcı olamıyorum. Lütfen yeniden deneyin." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
