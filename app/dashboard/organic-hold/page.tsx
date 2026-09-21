import { createClient } from "@/lib/supabase/server";
import {
  currentSecondQcHold,
  evaluateHoldActionabilityCheck,
  EXIT_CONDITION_FROZEN_AT,
  exitConditionHash,
  FOUNDER_VISUAL_QUESTION,
} from "@/lib/infinity/organic-growth-engine/blog-os/durable/hold";
import { OrganicHoldDecisionForm } from "./decision-form";

export const dynamic = "force-dynamic";

const CANARY = "https://occupancynpv.com/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/";

export default async function OrganicHoldPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const hold = currentSecondQcHold();
  const actionability = evaluateHoldActionabilityCheck(hold);
  const hash = exitConditionHash();

  return (
    <main style={{ maxWidth: 860, margin: "32px auto", padding: 24 }}>
      <h1>OccupancyNPV publishing hold</h1>
      <p>Founder HQ session is the only approval factor. A runtime secret is not founder approval.</p>
      <p>Authenticated as: {user?.email ?? "session required"}</p>

      <section>
        <h2>Hold</h2>
        <p>State: ACTIVE</p>
        <p>Reason: PAUSED_FOR_SECOND_QC_ESCAPE</p>
        <p>Engineering owner: {hold.engineering_owner}</p>
        <p>Founder decision owner: {hold.founder_decision_owner}</p>
        <p>Due: {hold.due_at}</p>
        <p>Renotify: {hold.renotify_at}</p>
        <p>Exit condition: {hold.exit_condition_version}</p>
        <p>Exit condition frozen: {EXIT_CONDITION_FROZEN_AT()}</p>
        <p>Exit condition hash: {hash}</p>
        <p>Actionability: {actionability.result}</p>
        <p>Founder review: NOT_ACTIONABLE_ENGINEERING_BLOCKED</p>
        <p>Human clock: NOT_STARTED — localhost is not an independent founder factor.</p>
        <p>execute_publish: FALSE</p>
      </section>

      <section>
        <h2>Exact visual residual</h2>
        <p>{FOUNDER_VISUAL_QUESTION}</p>
        <p>
          Live canary: <a href={CANARY}>{CANARY}</a>
        </p>
        <p>Shared component: a.vg-cta inside .pv-cta-panel</p>
        <p>Do not answer “does this look okay?” Answer only whether the remaining CTA text-over-background / spacing / visual treatment defect is resolved at the supplied breakpoints.</p>
      </section>

      <section>
        <h2>Evidence pack</h2>
        <ul>
          <li>Known-bad fixture: rejected by blog-render-qc-v3 ElementLevelContrastGate</li>
          <li>Known-good fixture: accepted</li>
          <li>Automated canary HTTP/content: LIVE_PUBLIC_URL</li>
          <li>Live pixel contrast: HUMAN_REVIEW_REQUIRED</li>
          <li>Takedown path: CODE_ONLY</li>
          <li>PRE_PUBLISH pipeline: wired, not yet run on a live article</li>
          <li>LIVE_POST_PUBLISH pipeline: wired, not yet run on a live article</li>
        </ul>
        <p>Screenshots: .infinity/blog-os/evidence/</p>
      </section>

      {user ? <OrganicHoldDecisionForm /> : <p>Sign in to HQ to CLEAR or KEEP. CLEAR remains blocked until exit evidence is complete.</p>}
    </main>
  );
}
