/* data-composition-repaired="true" */
export const metadata = {
  title: "Privacy Policy",
  description: "What OccupancyNPV collects and how to contact Infinite Media Resources LLC.",
  alternates: { canonical: "/privacy-policy" },
  robots: { index: true, follow: true },
  openGraph: { title: "Privacy Policy", description: "What OccupancyNPV collects and how to contact Infinite Media Resources LLC." },
};

import { Disclosure, PageShell, Section, VentureFooter } from "../ui";

export default function PrivacyPolicyPage() {
  return (
    <PageShell>
      <Section title="Privacy Policy" kicker="Legal">
        <p>This Privacy Policy describes what OccupancyNPV collects at https://occupancynpv.com, including the public site, checkout, and authenticated comparison workspace.</p>
        <h2>Operator</h2>
        <p>OccupancyNPV is operated by Infinite Media Resources LLC.</p>
        <p>1896 Coventry Dr<br />Brunswick, OH 44212<br />United States</p>
        <p>Contact: infinitemediaresources@gmail.com</p>
        <h2>Information we collect</h2>
        <ul>
          <li>Pilot / early-access form fields you submit: name, work email, role, company, team size, deal frequency, pricing interest, lease-workflow confirmation, and pilot interest.</li>
          <li>Account identifiers created when you sign in, including work email.</li>
          <li>DealWorkspace and lease-scenario data you enter in the authenticated product.</li>
          <li>Payment-related identifiers created when OccupancyNPV checkout is used.</li>
          <li>Same-origin site events such as page views, pricing interest selections, and primary-action clicks. These events are used to operate and measure the site. They are not used to invent customer counts or traction.</li>
        </ul>
        <h2>How we use it</h2>
        <p>Submitted and account information is used to operate OccupancyNPV, respond to a request when appropriate, fulfill a paid entitlement, and measure site events. We do not sell this information.</p>
        <h2>What we do not collect here</h2>
        <ul>
          <li>This Privacy Policy page does not itself create an account. Signing in to OccupancyNPV does create a customer account.</li>
          <li>This Privacy Policy page does not itself collect payment card numbers. Checkout may create payment-related identifiers through the payment path.</li>
          <li>This page does not set marketing or tracking cookies.</li>
          <li>This page does not ask for Social Security numbers, bank details, lease files, or other sensitive documents.</li>
        </ul>
        <h2>Processors</h2>
        <ul>
          <li>The hosting provider that serves this public page</li>
          <li>Same-origin form, account, and event ingest on this site</li>
          <li>The payment processor used for OccupancyNPV checkout</li>
        </ul>
        <h2>Retention</h2>
        <p>Account, workspace, fulfillment, and request records are kept to operate the product and respond to a request. They are not used as fabricated traction or customer proof.</p>
        <h2>Contact</h2>
        <p>Questions about this policy may be directed to infinitemediaresources@gmail.com or by mail to Infinite Media Resources LLC, 1896 Coventry Dr, Brunswick, OH 44212, United States.</p>
        <Disclosure>
          This policy reflects actual OccupancyNPV behavior: public pages, customer accounts, persisted product data, and payment-related identifiers when checkout is used.
        </Disclosure>
      </Section>
      <VentureFooter />
    </PageShell>
  );
}
