export function siteChromeSource(): string {
  return `import type { ReactNode } from "react";
import Link from "next/link";

export const SITE_NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/resources", label: "Resources" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/suggest-improvement", label: "Suggest an Improvement" },
  { href: "/occupancynpv/app/login", label: "Log In" },
  { href: "/early-access", label: "Request Pilot Access" },
] as const;

export function SiteNav({ current }: { current?: string }) {
  return (
    <nav className="pv-nav" aria-label="Primary">
      <div className="pv-nav-inner">
        <Link className="pv-nav-brand" href="/" aria-label="OccupancyNPV home" data-venture-brand="occupancynpv">
          <span className="pv-nav-logo" aria-hidden="true" data-venture-logo="compact">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="28" height="28">
              <rect width="32" height="32" rx="7" fill="#1d4e78"/>
              <circle cx="16" cy="16" r="8" fill="none" stroke="#ffffff" stroke-width="4.5"/>
            </svg>
          </span>
          <span className="pv-nav-wordmark" data-venture-wordmark="true">OccupancyNPV</span>
        </Link>
        <div className="pv-nav-links">
          {SITE_NAV.map((item) => (
            <Link key={item.href} href={item.href} aria-current={current === item.href ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

export function SiteBreadcrumb({ items }: { items: Array<{ href: string; label: string }> }) {
  return (
    <nav className="pv-breadcrumb" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => (
          <li key={item.href}>
            {index === items.length - 1 ? <span>{item.label}</span> : <Link href={item.href}>{item.label}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function AnswerFirst({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="pv-answer" data-answer-first="true" id="direct-answer">
      <p className="pv-answer-label">{question}</p>
      <p>{answer}</p>
    </div>
  );
}

export function RelatedContent({ items }: { items: Array<{ href: string; label: string }> }) {
  return (
    <div className="pv-related" data-section-type="RELATED_CONTENT">
      {items.map((item) => (
        <p key={item.href} className="pv-surface"><Link href={item.href}>{item.label}</Link></p>
      ))}
    </div>
  );
}

export function AuthorityRefs({ items }: { items: Array<{ href: string; label: string }> }) {
  return (
    <ul className="pv-authority" data-section-type="AUTHORITY_REFERENCES">
      {items.map((item) => (
        <li key={item.href}><a href={item.href} rel="noopener noreferrer">{item.label}</a></li>
      ))}
    </ul>
  );
}

export function JsonLdBlock({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function PageIdentity(props: { route: string; role: string; pattern: string; cluster: string; children?: ReactNode }) {
  return (
    <div data-page-id={props.route} data-page-role={props.role} data-page-pattern={props.pattern} data-topic-cluster={props.cluster}>
      {props.children}
    </div>
  );
}
`;
}

export function siteSchemaModule(schemaByRoute: Record<string, unknown>): string {
  return `export const SITE_SCHEMA: Record<string, unknown> = ${JSON.stringify(schemaByRoute, null, 2)};
`;
}

export function robotsSource(): string {
  return `import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: "/sitemap.xml",
  };
}
`;
}

export function siteLayoutSource(defaultTitle: string): string {
  return `import "../styles/globals.css";
import { SiteNav } from "../components/site-chrome";

export const metadata = {
  title: { default: ${JSON.stringify(defaultTitle)}, template: "%s" },
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
`;
}
