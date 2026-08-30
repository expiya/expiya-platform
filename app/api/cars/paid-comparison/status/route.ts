import { hashPaidReportAccessToken, readPaidReportAccessCookie } from "@/features/paid-comparison/reportAccess";
import { PostgresPaidReportStatusRepository } from "@/features/paid-comparison/statusRepository";
import { getPostgresDatabase } from "@/lib/server/postgres";
import { enforceRateLimit } from "@/lib/security/requestSecurity";
import { DevelopmentIyzicoOrderRepository } from "@/features/payments/iyzico/developmentOrderRepository";

export async function GET(request: Request): Promise<Response> {
  const limited = await enforceRateLimit(request, { scope: "paid-report-status", limit: 30, windowMs: 10 * 60_000 });
  if (limited) return limited;
  try {
    const token = readPaidReportAccessCookie(request);
    if (!token) throw new TypeError("PAID_REPORT_ACCESS_REQUIRED");
    const tokenHash = hashPaidReportAccessToken(token);
    const developmentStatus = DevelopmentIyzicoOrderRepository.findStatus(tokenHash);
    const result = developmentStatus
      ? await DevelopmentIyzicoOrderRepository.processQueuedReport(tokenHash)
      : await new PostgresPaidReportStatusRepository(getPostgresDatabase()).findByAccessTokenHash(tokenHash);
    if (!result) throw new TypeError("PAID_REPORT_NOT_FOUND");
    return Response.json(result, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch {
    return Response.json({ message: "Rapor erişimi bulunamadı." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}
