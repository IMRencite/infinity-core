export const PROVIDER_KEYS = {
  mock: "mock.infinity_v1",
  github: "github.com_v1",
  vercel: "vercel.com_v1",
} as const;

export const GITHUB_LIVE_ENV = "GITHUB_LIVE_ENABLED";
export const VERCEL_LIVE_ENV = "VERCEL_LIVE_ENABLED";
export const LIVE_PROVIDER_TEST_MODE_ENV = "LIVE_PROVIDER_TEST_MODE";

export const GITHUB_TOKEN_ENV = "GITHUB_TOKEN";
export const VERCEL_TOKEN_ENV = "VERCEL_TOKEN";
export const GITHUB_OWNER_ENV = "GITHUB_OWNER";
export const VERCEL_TEAM_ID_ENV = "VERCEL_TEAM_ID";

export type ExecutionMode = "mock" | "simulation" | "live";

export const LIVE_PROVIDER_ACTIONS = [
  "repository.create",
  "repository.push",
  "hosting.create_project",
  "hosting.deploy",
  "hosting.verify_deployment",
] as const;

export type LiveProviderAction = (typeof LIVE_PROVIDER_ACTIONS)[number];

export const LAUNCH_EXECUTE_EXTERNAL_CAPABILITY = "launch.execute_external_action";

export function isGithubLiveEnabled(): boolean {
  const raw = process.env[GITHUB_LIVE_ENV];
  return raw === "true" || raw === "1";
}

export function isVercelLiveEnabled(): boolean {
  const raw = process.env[VERCEL_LIVE_ENV];
  return raw === "true" || raw === "1";
}

export function isLiveProviderTestMode(): boolean {
  const raw = process.env[LIVE_PROVIDER_TEST_MODE_ENV];
  return raw === "true" || raw === "1";
}

export function safeTestResourceName(base: string): string {
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
  if (isLiveProviderTestMode()) {
    return `infinity-test-${slug}`.slice(0, 100);
  }
  return slug.slice(0, 100);
}
