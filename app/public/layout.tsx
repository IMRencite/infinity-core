import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Infinity OS — Autonomous Venture Operating System",
  description:
    "Observe Infinity OS as it researches, builds, launches, and operates ventures. Live public activity is sanitized and never includes private customer, financial, or infrastructure data.",
  robots: { index: true, follow: true },
  icons: { icon: "/icon" },
};

export default function PublicSiteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
