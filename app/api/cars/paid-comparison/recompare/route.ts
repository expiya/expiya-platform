import { z } from "zod";
import { createDevPaidComparisonHandoff } from "@/features/paid-comparison/devFixture.server";
import { hashPaidReportAccessToken, readPaidReportAccessCookie } from "@/features/paid-comparison/reportAccess";
import { DevelopmentIyzicoOrderRepository } from "@/features/payments/iyzico/developmentOrderRepository";
import { PostgresPaidRecomparisonHandoffRepository } from "@/features/paid-comparison/recomparisonHandoff.server";
import { getPostgresDatabase } from "@/lib/server/postgres";
import { enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";

const schema = z.strictObject({ exactVariantId: z.string().min(1).max(300) });
export async function POST(request: Request): Promise<Response> {
  const rejected = verifySameOrigin(request); if (rejected) return rejected;
  const limited = await enforceRateLimit(request, { scope: "paid-report-recompare", limit: 5, windowMs: 10 * 60_000 }); if (limited) return limited;
  try {
    const input = schema.parse(await readJsonWithLimit(request, 1_000));
    const access = readPaidReportAccessCookie(request); if (!access) throw new TypeError("PAID_REPORT_ACCESS_REQUIRED");
    const accessTokenHash = hashPaidReportAccessToken(access);
    const context = DevelopmentIyzicoOrderRepository.findUnlockedVehicleContext(accessTokenHash, input.exactVariantId);
    const handoff = context ? createDevPaidComparisonHandoff({ exactVariantId: input.exactVariantId, bodyStyle: context.bodyStyle, catalogRelease: context.catalogRelease, catalogFingerprint: context.catalogFingerprint }) : await new PostgresPaidRecomparisonHandoffRepository(getPostgresDatabase()).issue({ accessTokenHash, exactVariantId: input.exactVariantId, now: new Date() });
    return Response.json({ handoff }, { status: 201, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) { return Response.json({ message: error instanceof z.ZodError ? "Araç seçimi geçersiz." : "Yeni karşılaştırma geçişi hazırlanamadı." }, { status: error instanceof z.ZodError ? 400 : 409, headers: { "Cache-Control": "no-store" } }); }
}
