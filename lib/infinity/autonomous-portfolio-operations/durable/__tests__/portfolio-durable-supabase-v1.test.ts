import { describe, expect, it } from "vitest";
import {
  createPortfolioDurableSupabase,
  portfolioDurablePostgresConfigured,
} from "../portfolio-durable-supabase-v1";

describe("portfolio durable supabase test isolation", () => {
  it("TEST_TO_PRODUCTION_DB_REGRESSION_QC: refuses live client under NODE_ENV=test even with production-shaped env", () => {
    const env = {
      NODE_ENV: "test",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key-shaped-for-regression",
      PORTFOLIO_DURABLE_USE_LIVE_SUPABASE_IN_TEST: undefined,
    } as NodeJS.ProcessEnv;

    expect(portfolioDurablePostgresConfigured(env)).toBe(true);
    expect(createPortfolioDurableSupabase(env)).toBeNull();
  });

  it("allows explicit opt-in for integration tests only", () => {
    const env = {
      NODE_ENV: "test",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key-shaped-for-regression",
      PORTFOLIO_DURABLE_USE_LIVE_SUPABASE_IN_TEST: "1",
    } as NodeJS.ProcessEnv;

    expect(createPortfolioDurableSupabase(env)).not.toBeNull();
  });
});
