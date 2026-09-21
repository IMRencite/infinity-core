import type { ReactNode } from "react";
import Link from "next/link";

export const SITE_NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/resources", label: "Resources" },
  { href: "/blog", label: "Blog" },
  { href: "/lease-comparison", label: "Compare" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/suggest-improvement", label: "Suggest an Improvement" },
  { href: "/occupancynpv/app/login", label: "Log In" },
] as const;

export function SiteNav({ current }: { current?: string }) {
  return (
    <nav className="pv-nav" aria-label="Primary">
      <div className="pv-nav-inner">
        <Link className="pv-nav-brand" href="/" aria-label="OccupancyNPV home" data-venture-brand="occupancynpv">
          <span className="pv-nav-logo" aria-hidden="true" data-venture-logo="compact"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" role="img" aria-hidden="true">
  <rect width="32" height="32" rx="7" fill="#1d4e78"/>
  <circle cx="16" cy="16" r="8" fill="none" stroke="#ffffff" stroke-width="4.5"/>
</svg></span>
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
    <div className="pv-answer" data-answer-first="true">
      <p className="pv-eyebrow">{question}</p>
      <p>{answer}</p>
    </div>
  );
}

export function RelatedContent({ items }: { items: Array<{ href: string; label: string; description?: string }> }) {
  return (
    <nav className="pv-related-editorial" data-section-type="RELATED_CONTENT" aria-label="Related reading">
      <p className="pv-eyebrow">Keep reading</p>
      <h2>Related questions</h2>
      <p className="pv-related-lead">These pages sit next to this topic. Use them when you need the next definition or a worked compare.</p>
      <ul className="pv-related-grid">
        {items.slice(0, 4).map((item) => (
          <li key={item.href} className="pv-related-card">
            <Link href={item.href}>{item.label}</Link>
            {item.description ? <p>{item.description}</p> : <p>Open this page for the next plain-language step.</p>}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AuthorityRefs({ items }: { items: Array<{ href: string; label: string }> }) {
  return (
    <ol className="pv-authority" data-section-type="AUTHORITY_REFERENCES">
      {items.map((item) => (
        <li key={item.href}><a href={item.href} rel="noopener noreferrer">{item.label}</a></li>
      ))}
    </ol>
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
