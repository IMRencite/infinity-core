type Card = {
  title: string;
  description: string;
  href: string;
  icon: string;
  relationship: string;
};

const ICONS: Record<string, string> = {
  "question": "M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z",
  "compare": "M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z",
  "topic": "M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z",
  "cost": "M12 3.2A8.8 8.8 0 1 0 20.8 12 8.8 8.8 0 0 0 12 3.2zm.7 13.3h-1.4v-1a3.8 3.8 0 0 1-2.4-1.1l1-1.2a2.6 2.6 0 0 0 1.9.9c.7 0 1.2-.3 1.2-.9s-.6-.8-1.9-1.2-2.6-.8-2.6-2.3 1-2.3 2.4-2.5V6.8h1.4v1a3.4 3.4 0 0 1 2 1l-1 1.2a2.2 2.2 0 0 0-1.6-.7c-.6 0-1 .3-1 1s.6.7 2 1.2 2.6 1 2.6 2.4-1.1 2.4-2.6 2.6z",
  "role": "M12 4a4 4 0 1 1-4 4 4 4 0 0 1 4-4zm0 9c-4.2 0-8 2-8 4.5V21h16v-3.5C20 15 16.2 13 12 13z",
  "tool": "M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 3h7v4h-7z",
  "deeper": "M11 3h2v10h3l-4 5-4-5h3zM5 20h14v2H5z",
  "chart": "M4 19V10h3.2V19zm6.4 0V5h3.2v14zm6.4 0v-7H20v7zM3 20h18v2H3z",
  "document": "M7 2h8l4 4v16H7zm8 1.6V7h3.4z",
  "workflow": "M4 4h6v5H4zm10 6h6v5h-6zM4 15h6v5H4zM10 6.5h4v2h-4zM10 17.5h4v2h-4z"
};

function roleOf(href: string): string {
  if (href.includes("/for/")) return "ROLE";
  if (href.includes("how-it-works") || href.includes("workflow")) return "WORKFLOW";
  if (href.includes("pricing") || href.includes("compare") || href.includes("early-access")) return "TOOL";
  return href.replace(/\/+$/, "").split("/").filter(Boolean).length <= 1 ? "TOPIC" : "QUESTION";
}

function roleLabel(role: string): string {
  if (role === "QUESTION") return "Question";
  if (role === "TOPIC") return "Topic";
  if (role === "WORKFLOW") return "Workflow";
  if (role === "TOOL") return "Tool";
  return "For your role";
}

function Icon({ name }: { name: string }) {
  const d = ICONS[name] ?? ICONS.question;
  return (
    <span className="sn-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d={d} /></svg>
    </span>
  );
}

export function SemanticNavigationBlock(props: { variant: string; title: string; cards: Card[] }) {
  const count = props.cards.length;
  return (
    <nav className="sn-block pv-wide-module" data-semantic-navigation={props.variant} aria-label={props.title}>
      <div className="sn-block-head">
        <span className="sn-kicker">{props.variant.replaceAll("_", " ")}</span>
        <strong className="sn-title">{props.title}</strong>
        <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>
      </div>
      <div className={`sn-grid sn-grid--count-${count}`}>
        {props.cards.map((card) => (
          <a key={card.href} className="sn-card" href={card.href} data-card-role={roleOf(card.href)} data-relationship={card.relationship} aria-label={`${card.title}. ${card.description}`}>
            <Icon name={card.icon} />
            <span className="sn-copy">
              <span className="sn-role">{roleLabel(roleOf(card.href))}</span>
              <strong>{card.title}</strong>
              <span className="sn-desc">{card.description}</span>
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}
