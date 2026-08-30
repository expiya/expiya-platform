import { createPaidComparisonPdf, type PaidComparisonPdfInput } from "@/features/paid-comparison/pdfDocument.server";
import { hashPaidReportAccessToken, readPaidReportAccessCookie } from "@/features/paid-comparison/reportAccess";
import { PostgresPaidComparisonReportDocumentRepository } from "@/features/paid-comparison/reportDocumentRepository";
import { DevelopmentIyzicoOrderRepository } from "@/features/payments/iyzico/developmentOrderRepository";
import { getPostgresDatabase } from "@/lib/server/postgres";
import { enforceRateLimit } from "@/lib/security/requestSecurity";

export async function GET(request: Request): Promise<Response> {
  const limited = await enforceRateLimit(request, { scope: "paid-report-pdf", limit: 20, windowMs: 10 * 60_000 });
  if (limited) return limited;
  try {
    const token = readPaidReportAccessCookie(request);
    if (!token) throw new TypeError("PAID_REPORT_ACCESS_REQUIRED");
    const tokenHash = hashPaidReportAccessToken(token);
    const document = DevelopmentIyzicoOrderRepository.findReportDocument(tokenHash)
      ?? await new PostgresPaidComparisonReportDocumentRepository(getPostgresDatabase()).findByAccessTokenHash(tokenHash);
    if (!document) throw new TypeError("PAID_REPORT_NOT_READY");
    const bytes = await createPaidComparisonPdf(document as PaidComparisonPdfInput);
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new Response(Buffer.from(bytes), { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="expiya-cars-3-arac-karsilastirma-raporu.pdf"`,
      "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow",
    } });
  } catch {
    return Response.json({ message: "PDF henüz hazır değil veya erişim bulunamadı." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}
