import { qcAffiliatePortalFixture } from "@/lib/infinity/affiliate-referral/portal";

export default function OccupancyNpvAffiliatePortalPage() {
  const view = qcAffiliatePortalFixture();
  return (
    <main className="onpv-page onpv-page--dash" data-occupancynpv-affiliate-portal="true" data-affiliate-fixture="qc">
      <p className="onpv-kicker">Affiliate portal</p>
      <h1>OccupancyNPV affiliate portal</h1>
      <p className="onpv-lede">
        Isolated fixture preview. No production affiliate account, referral, commission, or payout is shown.
        Purchaser and customer personal information is never displayed.
      </p>
      <section className="onpv-card">
        <p>Program state: {view.program_state}</p>
        <p>Affiliate ID: {view.affiliate_id}</p>
        <p>Tracking link: {view.tracking_link}</p>
        <p>Referral code: {view.referral_code}</p>
        <p>Clicks: {view.clicks}</p>
        <p>Verified conversions: {view.verified_conversions}</p>
        <p>Pending commissions: {String(view.pending_commissions)}</p>
        <p>Approved commissions: {String(view.approved_commissions)}</p>
        <p>Payable commissions: {String(view.payable_commissions)}</p>
        <p>Paid commissions: {String(view.paid_commissions)}</p>
      </section>
      <section className="onpv-card">
        <h2>Approved assets</h2>
        <ul>{view.approved_assets.map((asset) => <li key={asset}>{asset}</li>)}</ul>
        <h2>Disclosure rules</h2>
        <ul>{view.disclosure_rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
        <h2>Prohibited practices</h2>
        <ul>{view.prohibited_practices.map((rule) => <li key={rule}>{rule}</li>)}</ul>
        <p><a className="onpv-link" href={view.terms_path}>Program terms</a></p>
      </section>
    </main>
  );
}
