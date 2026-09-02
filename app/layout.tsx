import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PrivacyAnalytics } from "@/components/analytics/PrivacyAnalytics";
import "@fontsource/noto-sans/400.css";
import "@fontsource/noto-sans/600.css";
import "@fontsource/noto-sans/700.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.expiya.com"),
  title: "Expiya — Karar Platformu",
  description: "Önemli seçimlerde seçenekleri değerlendirmenize ve kararınızı netleştirmenize yardımcı olan Expiya platformu.",
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <footer className="site-legal-footer border-t border-neutral-200 bg-white px-6 py-6 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300">
          <Link href="/gizlilik" className="font-semibold underline underline-offset-4">
            Gizlilik ve KVKK Aydınlatma Metni
          </Link>
        </footer>
        <PrivacyAnalytics />
      </body>
    </html>
  );
}
