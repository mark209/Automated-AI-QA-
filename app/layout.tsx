import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "QA AI Automation", template: "%s | QA AI Automation" },
  description: "Review call quality with evidence-based scoring powered by ARC AI Engine.",
  applicationName: "QA AI Automation",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
