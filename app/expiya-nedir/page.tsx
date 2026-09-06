import type { Metadata } from "next";
import { ExpiyaInfo } from "@/components/platform/ExpiyaInfo";
import { loadActiveCatalogDirectory } from "@/features/platform/catalogDirectory.server";

export const metadata: Metadata = {
  title: "Expiya nedir?",
  description: "Expiya'nın satın alma kararlarını nasıl netleştirdiğini ve bilgi sınırlarını öğrenin.",
};

export default async function ExpiyaInfoPage() {
  return <ExpiyaInfo catalogDirectory={await loadActiveCatalogDirectory()} />;
}
