import { createPaidComparisonPdf, type PaidComparisonPdfInput } from "@/features/paid-comparison/pdfDocument.server";
import { paidComparisonSampleReport } from "@/features/paid-comparison/sampleReport";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const bytes = await createPaidComparisonPdf(paidComparisonSampleReport as PaidComparisonPdfInput);
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(Buffer.from(bytes), { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="expiya-cars-ornek-karsilastirma-raporu.pdf"`,
    "Cache-Control": "public, max-age=3600", "X-Robots-Tag": "noindex, nofollow",
  } });
}
