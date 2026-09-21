export const EDITORIAL_HIGHLIGHT_COMPONENT = `"use client";

import type { ReactNode } from "react";

type HighlightKind =
  | "KEY_TAKEAWAY"
  | "WHY_THIS_MATTERS"
  | "DECISION_NOTE"
  | "COMMON_MISTAKE"
  | "WHAT_CHANGES_THE_RESULT"
  | "WHEN_TO_BE_CAREFUL"
  | "FOR_YOUR_ROLE"
  | "FOR_FINANCE_TEAMS"
  | "WHAT_CHANGES"
  | "LIMITATION"
  | "WORKED_EXAMPLE"
  | "FOR_TENANT_REP"
  | "FOR_FINANCE";

export function EditorialHighlight(props: { kind: HighlightKind; title: string; children: ReactNode }) {
  const cls = props.kind.toLowerCase();
  return (
    <aside className={\`ed-highlight ed-highlight--\${cls} pv-callout\`} data-editorial-highlight={props.kind} data-callout={props.kind}>
      <p className="ed-highlight-kicker">{props.title}</p>
      <div className="ed-highlight-body">{props.children}</div>
    </aside>
  );
}

export function KeyTakeaway(props: { children: ReactNode }) {
  return <EditorialHighlight kind="KEY_TAKEAWAY" title="Key takeaway">{props.children}</EditorialHighlight>;
}

export function WhyItMatters(props: { children: ReactNode }) {
  return <EditorialHighlight kind="WHY_THIS_MATTERS" title="Why this matters">{props.children}</EditorialHighlight>;
}

export function DecisionNote(props: { children: ReactNode }) {
  return <EditorialHighlight kind="DECISION_NOTE" title="Decision note">{props.children}</EditorialHighlight>;
}

export function AuthorityQuote(props: { text: string; sourceTitle: string; sourceUrl?: string }) {
  return (
    <figure className="authority-quote" data-authority-quote="true">
      <blockquote>{props.text}</blockquote>
      <figcaption>
        {props.sourceUrl ? <a href={props.sourceUrl}>{props.sourceTitle}</a> : props.sourceTitle}
      </figcaption>
    </figure>
  );
}

export function PullQuote(props: { text: string; sourceTitle: string; sourceUrl?: string }) {
  return <AuthorityQuote text={props.text} sourceTitle={props.sourceTitle} sourceUrl={props.sourceUrl} />;
}
`;

export const SEMANTIC_NAVIGATION_COMPONENT = `"use client";

type Card = {
  title: string;
  description: string;
  href: string;
  icon: string;
  relationship: string;
};

const ICONS: Record<string, string> = {
  question: "M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm.75 13.5h-1.5v-1.5h1.5zm1.54-6.22-.85.87A2.25 2.25 0 0 0 12.75 13h-1.5v-.38a3 3 0 0 1 .88-2.12l1.17-1.18a1.13 1.13 0 1 0-1.9-.8H10a2.63 2.63 0 1 1 4.29 2.08z",
  topic: "M4 6h16v3H4zm0 5h10v3H4zm0 5h16v3H4z",
  compare: "M7 4h3v16H7zm7 4h3v12h-3z",
  cost: "M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm.75 4v1.2a2.25 2.25 0 0 1 1.5 2.1h-1.5a.75.75 0 0 0-.75.75h-1.5A2.25 2.25 0 0 1 12 8.2V7z",
  role: "M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12zm0 1.5c-3.4 0-6.5 1.7-6.5 3.8V19h13v-1.7c0-2.1-3.1-3.8-6.5-3.8z",
  tool: "M4 6h7v5H4zm9 0h7v12h-7zM4 13h7v5H4z",
  deeper: "M12 4v12m0 0-4-4m4 4 4-4M5 19h14",
};

function Icon({ name }: { name: string }) {
  const d = ICONS[name] ?? ICONS.question;
  return (
    <span className="sn-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill={name === "deeper" ? "none" : "currentColor"} stroke={name === "deeper" ? "currentColor" : "none"} strokeWidth={name === "deeper" ? 1.8 : 0}>
        <path d={d} />
      </svg>
    </span>
  );
}

export function SemanticNavigationBlock(props: { variant: string; title: string; cards: Card[] }) {
  return (
    <nav className="sn-block" data-semantic-navigation={props.variant} aria-label={props.title}>
      <div className="sn-block-head">
        <span className="sn-kicker">{props.variant.replaceAll("_", " ")}</span>
        <strong className="sn-title">{props.title}</strong>
      </div>
      <div className="sn-grid">
        {props.cards.map((card) => (
          <a key={card.href} className="sn-card" href={card.href} data-relationship={card.relationship} aria-label={\`\${card.title}. \${card.description}\`}>
            <Icon name={card.icon} />
            <span className="sn-copy">
              <strong>{card.title}</strong>
              <span className="sn-desc">{card.description}</span>
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}
`;
