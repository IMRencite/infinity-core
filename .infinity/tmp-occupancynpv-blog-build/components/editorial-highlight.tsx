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
    <aside className={`ed-highlight ed-highlight--${cls} pv-callout`} data-editorial-highlight={props.kind} data-callout={props.kind}>
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
