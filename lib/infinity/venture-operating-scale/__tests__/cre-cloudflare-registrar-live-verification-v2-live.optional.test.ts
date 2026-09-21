import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeCreCloudflareRegistrarLiveVerificationV2Mission } from "..";

const live = process.env.INFINITY_LIVE_COMMERCIALIZATION === "1";

describe.skipIf(!live)("CRE_CLOUDFLARE_REGISTRAR_LIVE_VERIFICATION_V2 live Cloudflare Registrar", () => {
  it("reloads the registrar token and checks the CRE shortlist without purchasing", async () => {
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST = "1";
    process.env.INFINITY_INBOUND_PERSIST = "1";
    const result = await executeCreCloudflareRegistrarLiveVerificationV2Mission({ reloadEnv: true });
    writeFileSync(
      ".infinity/venture-operating-scale/cre-cloudflare-registrar-live-verification-v2-report.json",
      `${JSON.stringify(
        {
          mission: result.mission,
          env: result.env,
          account: result.account,
          registrar: result.registrar,
          capabilities: result.capabilities,
          prerequisites: result.prerequisites,
          checked: result.checked,
          preferred: result.preferred,
          economics: result.economics,
          treasury: result.treasury,
          eag: result.eag,
          purchaseReadiness: result.purchaseReadiness,
          routing: result.routing,
          namecheap: result.namecheap,
          record: {
            domain: result.record.primary_domain,
            history: result.record.domain_history,
            provider: result.record.domain_provider,
            registration: result.record.domain_registration_state,
            dns: result.record.dns_state,
            ssl: result.record.ssl_state,
            launch: result.record.public_launch_state,
            experiment: result.record.current_experiment,
            observer: result.record.inbound_observer_state,
            blocked: result.record.blocked_actions,
          },
          daily: {
            result: result.daily.snapshot.dailyResult,
            next: result.daily.snapshot.nextGovernedWork,
            signals: result.daily.snapshot.learningSignals,
          },
          experiment: result.experiment,
          purchases: result.purchases,
          dnsWrites: result.dnsWrites,
          registrationPosts: result.registrationPosts,
          nextState: result.nextState,
          nextAuthorizations: result.nextAuthorizations,
          hq: result.hqMission,
        },
        null,
        2,
      )}\n`,
    );
    expect(result.purchases).toBe(0);
    expect(result.dnsWrites).toBe(0);
    expect(result.registrationPosts).toBe(0);
    expect(result.experiment.clockRestarted).toBe(false);
    expect(result.experiment.tracked).toBeGreaterThanOrEqual(4);
    expect(result.namecheap).toBe("NAMECHEAP_API_USER_BLOCKED_BY_ADMINISTRATOR");
    expect(JSON.stringify(result)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{12,}/);
  }, 180_000);
});
