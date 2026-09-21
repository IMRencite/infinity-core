import type { Metadata } from "next";
import "./globals.css";
import { hqApplicationMetadata } from "@/lib/infinity/operator-console/hq-brand-context";

export const metadata: Metadata = hqApplicationMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
