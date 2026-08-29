import { z } from "zod";

import { getPaidComparisonOptions } from "@/features/paid-comparison/server";
import { enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";

const schema = z.strictObject({ handoff: z.string().min(20).max(300_000) });

export async function POST(request: Request): Promise<Response> {
  const rejected = verifySameOrigin(request);
  if (rejected) return rejected;
  const limited = await enforceRateLimit(request, { scope: "paid-comparison-options", limit: 20, windowMs: 10 * 60_000 });
  if (limited) return limited;
  try {
    const input = schema.parse(await readJsonWithLimit(request, 310_000));
    return Response.json(await getPaidComparisonOptions(input.handoff), {
      headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    });
  } catch (error) {
    const invalid = error instanceof z.ZodError;
    return Response.json({ message: invalid ? "Geçersiz istek." : "Karşılaştırma seçenekleri hazırlanamadı." }, {
      status: invalid ? 400 : 409,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
