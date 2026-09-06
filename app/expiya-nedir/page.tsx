import type { Metadata } from "next";
import { ExpiyaInfo } from "@/components/platform/ExpiyaInfo";

export const metadata: Metadata = {
  title: "Expiya nedir?",
  description: "Expiya'nın satın alma kararlarını nasıl netleştirdiğini ve bilgi sınırlarını öğrenin.",
};

export default function ExpiyaInfoPage() {
  return <ExpiyaInfo />;
}
