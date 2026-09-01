import type { Metadata } from "next";
import { UsedCarsHeader } from "@/components/used-cars/UsedCarsHeader";

export const metadata: Metadata = {
  title: "Expiya İkinci El | İhtiyacına göre kurumsal stok eşleştirme",
  description: "Bütçe, kullanım biçimi ve ikinci el risk tercihlerini kurumsal satıcı stoklarıyla eşleştiren Expiya ürün katmanı.",
};

export default function UsedCarsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen bg-[#f7f6f1] text-stone-950"><UsedCarsHeader />{children}</div>;
}
