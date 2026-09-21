import { occupancyNpvAffiliateProgram } from "@/lib/infinity/affiliate-referral/occupancy";
import { occupancyNpvRecruitmentCategories } from "@/lib/infinity/affiliate-referral/recruitment";

export default function OccupancyNpvAffiliatesPage() {
  const program = occupancyNpvAffiliateProgram();
  const categories = occupancyNpvRecruitmentCategories();
  return (
    <main className="onpv-page onpv-page--dash" data-occupancynpv-affiliate-page="true">
      <p className="onpv-kicker">Affiliate & Referral</p>
      <h1>OccupancyNPV Affiliate Program</h1>
      <p className="onpv-lede">
        OccupancyNPV compares commercial lease cash flows and NPV so tenant-rep brokers and occupiers can choose the lower-cost deal.
        This program lets qualified partners refer commercial real-estate professionals. Capability is live as a program surface.
        Commissions are not activated while economics remain pending.
      </p>

      <section className="onpv-card" data-affiliate-program-state={program.state}>
        <h2>Who this is for</h2>
        <p>
          Commercial real-estate consultants, tenant-rep professionals, CRE educators, newsletters, brokerage professionals,
          property creators, finance and modeling educators, and industry communities. We do not invent contacts or send
          recruitment outreach from this page.
        </p>
        <ul>
          {categories.map((row) => (
            <li key={row.category}>{row.category}</li>
          ))}
        </ul>
      </section>

      <section className="onpv-card">
        <h2>How referrals work</h2>
        <p>
          Approved affiliates receive a unique tracking link and referral code. A click is not a sale. A lead, trial start,
          checkout start, or demo request is not a sale. Commission may accrue only after a verified eligible conversion and a hold period.
        </p>
        <p>Application and approval are required. The current program state is {program.state.replace(/_/g, " ")}.</p>
        <p>Commission structure: {String(program.commission_model).replace(/_/g, " ")} — {String(program.commission)}.</p>
        <p>Payout timing: automatic payout is policy-authorized architecture only. Live payout is disabled until economics, provider, compliance, and cloud runtime requirements pass.</p>
      </section>

      <section className="onpv-card">
        <h2>Disclosure and restrictions</h2>
        <p>Affiliates must disclose the compensated relationship on every promotion.</p>
        <p>False claims, fake reviews, spam, impersonation, misleading discounts, fake urgency, unauthorized brand bidding, unapproved coupons, and unapproved ads are prohibited.</p>
        <p>Affiliates never receive purchaser or customer personal information.</p>
      </section>

      <section className="onpv-card">
        <h2>FAQ</h2>
        <p><strong>Is the program active?</strong> Capability is provisioned. Activation stays gated on eligibility, economics, and payout infrastructure.</p>
        <p><strong>What are the offers?</strong> Professional $290/year and Per-Deal $149 one-time, with a 3-day free trial that does not take a card and does not auto-convert.</p>
        <p><strong>When are commissions paid?</strong> Only after verified conversion, hold period, fraud and compliance checks, and an authorized payout provider. None of those are live during this build.</p>
      </section>

      <p>
        <a className="onpv-btn-primary" href="/occupancynpv/affiliates/apply">Apply</a>
        {" "}
        <a className="onpv-link" href="/occupancynpv/affiliates/terms">Affiliate Terms</a>
        {" "}
        <a className="onpv-link" href="/occupancynpv/affiliates/portal?fixture=qc">Preview portal</a>
        {" "}
        <a className="onpv-link" href="/public/privacy">Privacy</a>
      </p>
      <p className="onpv-lede">Privacy: this page does not collect unnecessary sensitive information and does not publish payout destinations.</p>
    </main>
  );
}
