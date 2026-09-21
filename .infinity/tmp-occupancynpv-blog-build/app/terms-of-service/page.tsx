/* data-composition-repaired="true" */
export const metadata = {
  title: "Terms of Service",
  description: "Terms for OccupancyNPV, operated by Infinite Media Resources LLC under Ohio law.",
  alternates: { canonical: "/terms-of-service" },
  robots: { index: true, follow: true },
  openGraph: { title: "Terms of Service", description: "Terms for OccupancyNPV, operated by Infinite Media Resources LLC under Ohio law." },
};

import { Disclosure, PageShell, Section, VentureFooter } from "../ui";

export default function TermsOfServicePage() {
  return (
    <PageShell>
      <Section title="Terms of Service" kicker="Legal">
        <p>These terms apply to OccupancyNPV at https://occupancynpv.com, operated by Infinite Media Resources LLC.</p>
        <h2>Product and access</h2>
        <p>OccupancyNPV is a live lease comparison and NPV product operated by Infinite Media Resources LLC. These terms apply to the public site, checkout, and authenticated comparison workspace at https://occupancynpv.com. Viewing a public marketing page does not by itself grant product access.</p>
        <h2>Purchase and checkout</h2>
        <p>This Terms of Service page does not itself process payment. Paid checkout is available through OccupancyNPV pricing for Professional and Per-Deal. If a purchase is completed through verified OccupancyNPV checkout, the commercial terms below apply.</p>
        <h2>Professional</h2>
        <p>Professional is USD 290 per year for one authenticated user. Additional seats and team accounts are not included. Billing is annual. Access continues while the PROFESSIONAL_ACCESS entitlement is ACTIVE and through the provider-verified paid-through date. There is no numerical DealWorkspace cap while that entitlement remains ACTIVE. Workspace creation still requires a valid entitlement, customer ownership, and ordinary system and security constraints.</p>
        <p>Cancellation stops future renewal. After cancellation, access continues through the already-paid billing period. The entitlement expires at that paid-through date. Cancellation does not immediately revoke already-paid access and does not by itself create a prorated refund.</p>
        <h2>Per-Deal</h2>
        <p>Per-Deal is USD 149 one-time for one DealWorkspace for the purchasing customer identity. The ONE_DEAL_WORKSPACE entitlement quantity is 1. The first successful DealWorkspace allocation consumes the entitlement.</p>
        <h2>Refunds</h2>
        <p>Professional initial purchase: eligible within 7 calendar days of the initial purchase if no DealWorkspace has yet been created under that Professional entitlement. After a DealWorkspace is created, the initial purchase is non-refundable, except where applicable law requires otherwise.</p>
        <p>Renewal payments are non-refundable once the renewal has completed, except where applicable law requires otherwise. Cancellation prevents future renewal but does not itself create a refund.</p>
        <p>Per-Deal: eligible within 7 calendar days of purchase if the entitlement remains unused, meaning no DealWorkspace has been allocated. Once the first successful DealWorkspace allocation consumes the entitlement, the purchase is non-refundable, except where applicable law requires otherwise.</p>
        <p>A refund request is assessed as ELIGIBLE, INELIGIBLE, or REVIEW_REQUIRED from this policy and the available evidence. These terms do not authorize an automatic refund.</p>
        <h2>No warranties or service levels</h2>
        <p>No warranty, uptime commitment, or service level is offered.</p>
        <h2>Informational calculations</h2>
        <p>Outputs from OccupancyNPV are informational and analytical. They are not legal advice, tax advice, accounting advice, investment advice, brokerage services, or fiduciary advice. Lease terms and other facts should be independently verified. Users remain responsible for professional review of material business decisions. No attorney review is claimed.</p>
        <h2>Acceptable use</h2>
        <p>Do not submit Social Security numbers, bank details, lease files, passwords, or payment-card numbers through this page.</p>
        <h2>Operator</h2>
        <p>OccupancyNPV is operated by Infinite Media Resources LLC. Support: infinitemediaresources@gmail.com. Address: 1896 Coventry Dr, Brunswick, OH 44212, United States.</p>
        <h2>Governing law</h2>
        <p>These terms are governed by the laws of the State of Ohio, United States.</p>
        <Disclosure>
          These terms state the configured OccupancyNPV access, cancellation, and refund rules. They do not add warranties or service levels.
        </Disclosure>
      </Section>
      <VentureFooter />
    </PageShell>
  );
}
