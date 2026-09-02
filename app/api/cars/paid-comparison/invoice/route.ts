import { hashPaidReportAccessToken, readPaidReportAccessCookie } from "@/features/paid-comparison/reportAccess";
import { resolveIsbasiConfig } from "@/features/invoicing/isbasi/config";
import { createIsbasiHttpClient } from "@/features/invoicing/isbasi/httpClient";
import { PostgresPaidReportInvoiceRepository } from "@/features/invoicing/isbasi/invoiceRepository";
import { issuePaidReportInvoice } from "@/features/invoicing/isbasi/issueInvoiceService";
import { getPostgresDatabase } from "@/lib/server/postgres";
import { enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";

const responseHeaders = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

export async function POST(request: Request): Promise<Response> {
  if (!request.headers.get("origin")) {
    return Response.json({ message: "Bu kaynaktan gelen isteğe izin verilmiyor." }, { status: 403, headers: responseHeaders });
  }
  const originError = verifySameOrigin(request);
  if (originError) return originError;
  const limited = await enforceRateLimit(request, { scope: "paid-report-invoice", limit: 5, windowMs: 60 * 60_000 });
  if (limited) return limited;
  try {
    const token = readPaidReportAccessCookie(request);
    if (!token) return Response.json({ message: "Fatura erişimi bulunamadı." }, { status: 404, headers: responseHeaders });
    const customer = await readJsonWithLimit(request, 4_000);
    const config = resolveIsbasiConfig({
      ISBASI_ENV: process.env.ISBASI_ENV,
      ISBASI_API_BASE_URL: process.env.ISBASI_API_BASE_URL,
      ISBASI_API_KEY: process.env.ISBASI_API_KEY,
      ISBASI_USERNAME: process.env.ISBASI_USERNAME,
      ISBASI_PASSWORD: process.env.ISBASI_PASSWORD,
      ISBASI_LIVE_INVOICING_ENABLED: process.env.ISBASI_LIVE_INVOICING_ENABLED,
    });
    const result = await issuePaidReportInvoice({
      accessTokenHash: hashPaidReportAccessToken(token),
      customer,
      repository: new PostgresPaidReportInvoiceRepository(getPostgresDatabase()),
      client: createIsbasiHttpClient(config),
    });
    if (result.status === "ISSUED") return Response.json({ status: "ISSUED", message: "Faturanız oluşturuldu." }, { headers: responseHeaders });
    if (result.status === "REVIEW_REQUIRED") return Response.json({ status: "REVIEW_REQUIRED", message: "Fatura işlemi güvenli incelemeye alındı. Lütfen yeniden göndermeyin." }, { status: 409, headers: responseHeaders });
    return Response.json({ message: "Fatura erişimi bulunamadı." }, { status: 404, headers: responseHeaders });
  } catch (error) {
    if (error instanceof Error && [
      "ISBASI_LIVE_INVOICING_DISABLED", "ISBASI_CREDENTIALS_REQUIRED", "ISBASI_ENV_INVALID",
      "ISBASI_BASE_URL_INVALID", "ISBASI_PROVIDER_ORIGIN_REQUIRED", "ISBASI_LIVE_ORIGIN_REQUIRED",
      "ISBASI_SANDBOX_ORIGIN_REQUIRED",
    ].includes(error.message)) {
      return Response.json({ message: "Fatura hizmeti henüz etkin değil." }, { status: 503, headers: responseHeaders });
    }
    return Response.json({ message: "Fatura bilgileri geçersiz veya işlem kullanılamıyor." }, { status: 400, headers: responseHeaders });
  }
}
