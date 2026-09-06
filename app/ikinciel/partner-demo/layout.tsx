import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Expiya Partner · Sentetik Demo", template: "%s | Expiya Partner Demo" },
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default function PartnerDemoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div data-security-surface="partner-demo" data-production-auth="disabled">{children}</div>;
}

