import { hashPaidReportAccessToken, readPaidReportAccessCookie } from "@/features/paid-comparison/reportAccess";
import { PostgresPaidComparisonReportDocumentRepository } from "@/features/paid-comparison/reportDocumentRepository";
import { getPostgresDatabase } from "@/lib/server/postgres";
import { enforceRateLimit } from "@/lib/security/requestSecurity";

export async function GET(request: Request): Promise<Response> {
  const limited = await enforceRateLimit(request, { scope: "paid-report-document", limit: 30, windowMs: 10 * 60_000 });
  if (limited) return limited;
  try {
    const token = readPaidReportAccessCookie(request);
    if (!token) throw new TypeError("PAID_REPORT_ACCESS_REQUIRED");
    const document = await new PostgresPaidComparisonReportDocumentRepository(getPostgresDatabase()).findByAccessTokenHash(hashPaidReportAccessToken(token));
    if (!document) throw new TypeError("PAID_REPORT_NOT_READY");
    return Response.json(document, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" } });
  } catch {
    return Response.json({ message: "Rapor henüz hazır değil veya erişim bulunamadı." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}
