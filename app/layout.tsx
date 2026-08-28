import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voice QA",
  description: "Evidence-based voice quality assurance for modern support teams.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
