import {
  CANONICAL_IMR_BY_LABEL,
  CANONICAL_IMR_URL,
  CANONICAL_INFINITE_OS_URL,
  CANONICAL_INFINITE_OS_VENTURE_LABEL,
} from "./constants";

export type LegalBehaviorFacts = {
  ventureName: string;
  collectsContactForm: boolean;
  collectsEmail: boolean;
  analyticsEvents: boolean;
  cookies: boolean;
  accountCreation: boolean;
  payments: boolean;
  processors: string[];
  legalEntity?: string;
  companyAddress?: string;
  jurisdiction?: string;
  supportEmail?: string;
  privacyOperator?: string;
  termsOperator?: string;
  productBrand?: string;
  productionUrl?: string;
};

export function validationLandingLegalFacts(ventureName: string): LegalBehaviorFacts {
  return {
    ventureName,
    collectsContactForm: true,
    collectsEmail: true,
    analyticsEvents: true,
    cookies: false,
    accountCreation: false,
    payments: false,
    processors: [
      "The hosting provider that serves this public page",
      "Same-origin form and event ingest on this site",
    ],
  };
}

export function fullProductLegalFacts(ventureName: string): LegalBehaviorFacts {
  return {
    ventureName,
    collectsContactForm: false,
    collectsEmail: false,
    analyticsEvents: false,
    cookies: false,
    accountCreation: false,
    payments: false,
    processors: ["The hosting provider that serves this public page"],
  };
}

function privacyContact(facts: LegalBehaviorFacts): string {
  const operator = facts.privacyOperator ?? facts.legalEntity;
  const parts = ["Questions about this policy may be directed"];
  if (facts.supportEmail) parts.push(`to ${facts.supportEmail}`);
  else parts.push("through the same early-access form");
  if (operator) parts.push(`The operator is ${operator}.`);
  if (facts.companyAddress) parts.push(`Mailing address: ${facts.companyAddress}.`);
  if (facts.productBrand && facts.productionUrl) {
    parts.push(`This policy applies to ${facts.productBrand} at ${facts.productionUrl}.`);
  }
  if (!facts.supportEmail && !operator) parts.push(`or through ${CANONICAL_IMR_BY_LABEL}.`);
  return escape(parts.join(" "));
}

function informationalClause(facts: LegalBehaviorFacts): string {
  const brand = facts.productBrand ?? facts.ventureName;
  return `Outputs from ${brand} are informational and analytical. They are not legal advice, tax advice, accounting advice, investment advice, brokerage services, or fiduciary advice. Lease terms and other facts should be independently verified. Users remain responsible for professional review of material business decisions. No attorney review is claimed.`;
}

function termsOperatorClause(facts: LegalBehaviorFacts): string {
  const operator = facts.termsOperator ?? facts.legalEntity;
  if (operator && facts.companyAddress && facts.supportEmail && facts.jurisdiction) {
    return escape(
      `${facts.productBrand ?? facts.ventureName} is operated by ${operator}. Support: ${facts.supportEmail}. Address: ${facts.companyAddress}. These terms are governed by the laws of the State of ${facts.jurisdiction.replace(/^State of\s+/i, "")}.`,
    );
  }
  if (operator) {
    return escape(`${facts.productBrand ?? facts.ventureName} is operated by ${operator}. This is ${CANONICAL_INFINITE_OS_VENTURE_LABEL}.`);
  }
  return `This is ${CANONICAL_INFINITE_OS_VENTURE_LABEL}. Operator attribution: ${CANONICAL_IMR_BY_LABEL}.`;
}

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function privacyPolicySource(facts: LegalBehaviorFacts): string {
  const collects: string[] = [];
  if (facts.collectsContactForm) {
    collects.push(
      "Pilot / early-access form fields you submit: name, work email, role, company, team size, deal frequency, pricing interest, lease-workflow confirmation, and pilot interest.",
    );
  }
  if (facts.collectsEmail) collects.push("Work email addresses submitted through the form.");
  if (facts.analyticsEvents) {
    collects.push(
      "Same-origin validation events such as page views, pricing interest selections, and primary-action clicks. These events are used to measure whether the offer is relevant. They are not used to invent customer counts or traction.",
    );
  }
  if (!collects.length) collects.push("This public page does not collect personal information through forms or accounts.");
  const doesNot = [
    facts.accountCreation ? null : "This page does not create user accounts.",
    facts.payments ? null : "This page does not collect payment card data or process purchases.",
    facts.cookies ? null : "This page does not set marketing or tracking cookies.",
    "This page does not ask for Social Security numbers, bank details, lease files, or other sensitive documents.",
  ].filter(Boolean);
  const processors = facts.processors.map((item) => `<li>${escape(item)}</li>`).join("");
  return `import { Disclosure, PageShell, Section, VentureFooter } from "../ui";

export default function PrivacyPolicyPage() {
  return (
    <PageShell>
      <Section title="Privacy Policy" kicker="Legal">
        <p>This Privacy Policy describes what ${escape(facts.ventureName)} collects on this public validation or early-access site.</p>
        <h2>Information we collect</h2>
        <ul>
          ${collects.map((item) => `<li>${escape(item)}</li>`).join("")}
        </ul>
        <h2>How we use it</h2>
        <p>Submitted information is used only to evaluate whether a focused commercial workflow is useful, to respond to a pilot request when appropriate, and to measure validation events. We do not sell this information.</p>
        <h2>What we do not collect here</h2>
        <ul>
          ${doesNot.map((item) => `<li>${escape(String(item))}</li>`).join("")}
        </ul>
        <h2>Processors</h2>
        <ul>${processors}</ul>
        <h2>Retention</h2>
        <p>Validation submissions and events are retained for the validation window and related analysis. They are not used as fabricated traction or customer proof.</p>
        <h2>Contact</h2>
        <p>${privacyContact(facts)}</p>
        <Disclosure>
          This policy reflects actual behavior of this public page. It does not claim collection, cookies, accounts, or payments that do not occur here.
        </Disclosure>
      </Section>
      <VentureFooter />
    </PageShell>
  );
}
`;
}

export function termsOfServiceSource(facts: LegalBehaviorFacts): string {
  const paymentClause = facts.payments
    ? "This page does not complete a purchase in this validation surface. Any later commercial offer will be described when it exists."
    : "This page does not sell a subscription, collect payment, or complete checkout. Selecting a pricing option indicates interest only.";
  return `import { Disclosure, PageShell, Section, VentureFooter } from "../ui";

export default function TermsOfServicePage() {
  return (
    <PageShell>
      <Section title="Terms of Service" kicker="Legal">
        <p>These terms apply to this public ${escape(facts.ventureName)} validation / early-access page.</p>
        <h2>Pilot and validation status</h2>
        <p>The product described here is a proposed early-access / pilot concept. It is in validation and is not generally available. This page is not a finished commercial product and does not grant a software license beyond viewing this site.</p>
        <h2>No purchase</h2>
        <p>${escape(paymentClause)}</p>
        <h2>No warranties or service levels</h2>
        <p>No warranty, refund rule, uptime commitment, or service level is offered on this page.</p>
        <h2>Informational calculations</h2>
        <p>${escape(informationalClause(facts))}</p>
        <h2>Acceptable use</h2>
        <p>Do not submit Social Security numbers, bank details, lease files, passwords, or payment-card numbers through this page.</p>
        <h2>Operator</h2>
        <p>${termsOperatorClause(facts)}</p>
        <Disclosure>
          These terms do not fabricate subscription rules, refunds, guarantees, medical or financial representations, or venture-specific licensing obligations that have not been configured.
        </Disclosure>
      </Section>
      <VentureFooter />
    </PageShell>
  );
}
`;
}

export function sitemapSource(paths: string[]): string {
  const unique = [...new Set(paths.filter((path) => path.startsWith("/") && !path.includes("/api/")))];
  const entries = unique
    .map((path) => `    { url: ${JSON.stringify(path)}, changeFrequency: "weekly" as const, priority: ${path === "/" ? "1" : "0.6"} }`)
    .join(",\n");
  return `import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
${entries}
  ];
}
`;
}

export function legalFooterDestinations() {
  return {
    infiniteOs: CANONICAL_INFINITE_OS_URL,
    imr: CANONICAL_IMR_URL,
  };
}
