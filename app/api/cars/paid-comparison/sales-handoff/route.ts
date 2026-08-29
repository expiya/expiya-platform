import { z } from "zod";
import { hashPaidReportAccessToken, readPaidReportAccessCookie } from "@/features/paid-comparison/reportAccess";
import { PostgresPaidReportSalesHandoffRepository } from "@/features/paid-comparison/salesHandoff.server";
import { getPostgresDatabase } from "@/lib/server/postgres";
import { enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";

const schema = z.strictObject({ exactVariantId: z.string().min(1).max(300), intent: z.enum(["REQUEST_QUOTE", "REQUEST_TEST_DRIVE", "REQUEST_DEALER_CONTACT"]) });

export async function POST(request: Request): Promise<Response> {
  const rejected = verifySameOrigin(request); if (rejected) return rejected;
  const limited = await enforceRateLimit(request, { scope: "paid-report-sales-handoff", limit: 10, windowMs: 10 * 60_000 }); if (limited) return limited;
  try {
    const input = schema.parse(await readJsonWithLimit(request, 2_000));
    const accessToken = readPaidReportAccessCookie(request); if (!accessToken) throw new TypeError("PAID_REPORT_ACCESS_REQUIRED");
    const token = await new PostgresPaidReportSalesHandoffRepository(getPostgresDatabase()).issue({ accessTokenHash: hashPaidReportAccessToken(accessToken), exactVariantId: input.exactVariantId, intent: input.intent, now: new Date() });
    return Response.json({ token, intent: input.intent }, { status: 201, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) {
    return Response.json({ message: error instanceof z.ZodError ? "Geçersiz satış aksiyonu." : "Satış adımı hazırlanamadı." }, { status: error instanceof z.ZodError ? 400 : 409, headers: { "Cache-Control": "no-store" } });
  }
}
