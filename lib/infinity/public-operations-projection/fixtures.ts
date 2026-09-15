import type { InternalPublicObservation } from "./types";

export const MALICIOUS_PRIVATE_FIXTURE = {
  customer_email: "john@example.com",
  customer_phone: "+1 555-0100",
  customer_name: "Jane Doe",
  reply_content: "Please send the contract to john@example.com",
  mercury_balance: 50,
  mercury_account: "Mercury operating account 123456",
  stripe_customer: "cus_9N8private",
  stripe_account: "acct_18h5CjLdvXKx7R7G",
  spend_authority: 5,
  treasury_cash: 50,
  revenue: 1200,
  private_venture: "SecretProject",
  private_mission: "OccupancyNPV First Outbound Validation Campaign",
  api_token: "sk_live_51NotARealSecretValue",
  bearer: "Bearer abc.def.ghi",
  provider_error: "StripeAuthenticationError: invalid API key",
  internal_url: "http://localhost:3000/api/internal/treasury",
  filesystem_path: "C:\\Users\\Antivist\\Desktop\\Infinity\\infinity-core\\.infinity\\state.json",
  pid: "pid: 66556",
  build_id: "BUILD_ID RxLB80EuDqRW-vvQPS6O9",
  commit_hash: "commit 1b1f99a37ad81140f681952f2d4384962eab7f19",
};

export function maliciousPrivateObservation(now = "2026-09-15T01:00:00.000Z"): InternalPublicObservation {
  return {
    now,
    ventures: [
      {
        private_venture_id: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
        private_name: "OccupancyNPV",
        venture_status: "ACTIVE",
        operating_stage: "OPERATING",
        public_launch_state: "YES",
        is_operating: true,
        is_started: true,
        is_fixture: false,
        has_active_artifact: true,
      },
      {
        private_venture_id: "candidate:f1336945-3350-4d08-921e-4dcb5bc77b8e",
        private_name: "AskReview",
        venture_status: "PAUSED",
        operating_stage: "VALIDATING",
        public_launch_state: "NO",
        is_operating: false,
        is_started: true,
        is_fixture: false,
        has_active_artifact: false,
      },
      {
        private_venture_id: "venture:secret-project",
        private_name: "Horizon",
        venture_status: "ACTIVE",
        operating_stage: "BUILDING",
        public_launch_state: "NO",
        is_operating: false,
        is_started: true,
        is_fixture: false,
        has_active_artifact: false,
      },
    ],
    work: [
      {
        work_id: "work:infinity:autonomous-daily-operating-loop-v1",
        work_type: "SYSTEM_ARCHITECTURE",
        status: "COMPLETED",
        title: "Autonomous Daily Operating Loop V1",
        classification: "SYSTEM_INFRASTRUCTURE",
        completed_at: "2026-09-14T00:00:00.000Z",
      },
      {
        work_id: "work:occupancynpv:public-site-build",
        work_type: "BUILD",
        status: "COMPLETED",
        title: "Public site build",
        classification: "VENTURE_PRODUCT",
        completed_at: "2026-09-10T00:00:00.000Z",
      },
      {
        work_id: "work:occupancynpv:public-deploy",
        work_type: "DEPLOYMENT",
        status: "COMPLETED",
        title: "Public deployment",
        classification: "VENTURE_DEPLOYMENT",
        completed_at: "2026-09-10T12:00:00.000Z",
      },
      {
        work_id: "work:test:fixture-mission",
        work_type: "QC",
        status: "COMPLETED",
        title: "QC synthetic fixture",
        classification: "SYSTEM_DIAGNOSTIC",
        completed_at: "2026-09-11T00:00:00.000Z",
      },
      {
        work_id: "work:research:cycle-1",
        work_type: "RESEARCH",
        status: "COMPLETED",
        title: "Research cycle",
        classification: "VENTURE_DELIVERY",
        completed_at: "2026-09-08T00:00:00.000Z",
      },
    ],
    loop: {
      portfolio_state: "IDLE_NO_ACTION",
      last_outcome: "CONTINUE_EXISTING_ACTION",
      last_reason: "EXISTING_GROWTH_CAMPAIGN_CONTINUES_WITHOUT_NEW_MISSION",
      last_completed_mission_id: "work:occupancynpv:first-outbound-validation",
      updated_at: now,
      autonomous_enabled_at: "2026-09-14T00:00:00.000Z",
    },
  };
}

export function idleTruthObservation(now = "2026-09-15T01:00:00.000Z"): InternalPublicObservation {
  return maliciousPrivateObservation(now);
}
