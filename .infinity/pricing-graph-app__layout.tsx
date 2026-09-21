import "../styles/globals.css";
import { SiteNav } from "../components/site-chrome";

export const metadata = {
  title: { default: "Compare commercial lease economics — early validation", template: "%s" },
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
