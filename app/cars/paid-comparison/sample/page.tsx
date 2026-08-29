import PaidReportView from "../report/PaidReportView";
import { paidComparisonSampleReport } from "@/features/paid-comparison/sampleReport";

export const metadata = { title: "Örnek karşılaştırma raporu | Expiya Cars", robots: { index: false, follow: false } };
export default function PaidComparisonSamplePage() { return <PaidReportView initialReport={paidComparisonSampleReport} sample />; }
