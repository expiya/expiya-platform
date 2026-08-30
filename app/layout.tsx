import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { PrivacyAnalytics } from "@/components/analytics/PrivacyAnalytics";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Expiya Cars - Sana Uygun Sıfır Aracı Bul",
  description:
    "Expiya Cars, Türkiye'deki sıfır araç seçeneklerini ihtiyaçlarınıza ve bütçenize göre değerlendirerek doğru aracı seçmenize yardımcı olur.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
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
