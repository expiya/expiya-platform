import { notFound } from "next/navigation";
import DevPaidComparisonBootstrap from "./DevPaidComparisonBootstrap";

export const metadata = { title: "Yerel karşılaştırma testi | Expiya Cars", robots: { index: false, follow: false } };

export default function DevPaidComparisonTestPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevPaidComparisonBootstrap />;
}
