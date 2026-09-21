import "../styles/globals.css";
import { SiteNav } from "../components/site-chrome";

export const metadata = {
  description: "OccupancyNPV compares commercial lease cash flows and NPV so brokers and occupiers can choose the lower-cost deal.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=onpv2", type: "image/x-icon", sizes: "32x32" },
      { url: "/icon?v=onpv2", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=onpv2", sizes: "180x180", type: "image/png" }],
  },
  title: { default: "OccupancyNPV — Lease NPV comparison", template: "%s · OccupancyNPV" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body data-venture-tone="cre">
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
