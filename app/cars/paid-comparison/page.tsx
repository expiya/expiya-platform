import PaidComparisonFlow from "./PaidComparisonFlow";
import { paidComparisonLegalArtifacts } from "@/features/paid-comparison/legalArtifacts";

export const metadata = {
  title: "3 araç karar doğrulama raporu | Expiya Cars",
  robots: { index: false, follow: false },
};

export default function PaidComparisonPage() {
  return <PaidComparisonFlow checkoutEnabled={process.env.PAID_COMPARISON_CHECKOUT_ENABLED === "true"} legalTexts={{
    preInformation: paidComparisonLegalArtifacts.preInformation.text,
    distanceContract: paidComparisonLegalArtifacts.distanceContract.text,
    immediatePerformance: paidComparisonLegalArtifacts.immediatePerformance.text,
  }} />;
}
