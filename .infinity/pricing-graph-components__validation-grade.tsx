"use client";

import type { ReactNode } from "react";

export function PageShell({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <div className="vg-shell" data-venture-tone={tone}>
      {children}
    </div>
  );
}

export function ValidationBadge({ children = "Pilot / early access — in validation, not generally available" }: { children?: ReactNode }) {
  return <p className="vg-badge">{children}</p>;
}

export function Hero({
  title,
  audience,
  problem,
  value,
  cta,
}: {
  title: ReactNode;
  audience: ReactNode;
  problem: ReactNode;
  value: ReactNode;
  cta: ReactNode;
}) {
  return (
    <header className="vg-hero">
      <div className="vg-container">
        <ValidationBadge />
        <h1>{title}</h1>
        <p className="vg-lede">{audience}</p>
        <p>{problem}</p>
        <p>{value}</p>
        <p>{cta}</p>
      </div>
    </header>
  );
}

export function Section({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children: ReactNode;
}) {
  return (
    <section className="vg-section">
      <div className="vg-container">
        {kicker ? <p className="vg-kicker">{kicker}</p> : null}
        <h2>{title}</h2>
        {children}
      </div>
    </section>
  );
}

export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="vg-card-grid">{children}</div>;
}

export function FeatureCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="vg-feature-card">
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  );
}

export function PricingCard({
  title,
  price,
  children,
}: {
  title: string;
  price: string;
  children?: ReactNode;
}) {
  return (
    <article className="vg-pricing-card">
      <h3>{title}</h3>
      <p className="vg-price">{price}</p>
      <p className="vg-muted">{children ?? "Pricing hypothesis — selecting this indicates interest. Payment is not collected."}</p>
    </article>
  );
}

export function PrimaryCTA({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="vg-cta vg-cta--primary" href={href}>
      {children}
    </a>
  );
}

export function FormContainer({ children }: { children: ReactNode }) {
  return <div className="vg-form">{children}</div>;
}

export function Disclosure({ children }: { children: ReactNode }) {
  return <aside className="vg-disclosure">{children}</aside>;
}
