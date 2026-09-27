export const HQ_PRODUCTION_DEPLOYMENT = "InfinityHqProductionDeploymentV1" as const;
export const HQ_PRODUCTION_HOST = "hq.imros.io" as const;
export const HQ_PRODUCTION_ORIGIN = "https://hq.imros.io" as const;
export const HQ_VERCEL_PROJECT = "infinity-hq" as const;
export const HQ_VERCEL_PROJECT_ID = "prj_AVa1EK79vagoOB8PEtzWAQZTX0xI" as const;
export const PUBLIC_IMROS_ORIGIN = "https://imros.io" as const;
export const PUBLIC_IMROS_PROJECT = "imros-public" as const;
export const INFINITY_RUNTIME_ORIGIN = "https://infinity-runtime.vercel.app" as const;
export const LOCAL_HQ_ORIGIN = "http://localhost:3000" as const;

export const HQ_PRODUCTION_SESSION_SECURITY_GATE = "HQProductionSessionSecurityGate" as const;
export const HQ_AUTHORIZATION_GATE = "HQAuthorizationGate" as const;
export const HQ_PRIVATE_API_GATE = "HQPrivateAPIGate" as const;
export const HQ_PUBLIC_ISOLATION_GATE = "HQPublicIsolationGate" as const;
export const HQ_PRODUCTION_ENVIRONMENT_GATE = "HQProductionEnvironmentGate" as const;
export const HQ_RUNTIME_CONNECTIVITY_GATE = "HQRuntimeConnectivityGate" as const;
export const HQ_PRODUCTION_PERSISTENCE_GATE = "HQProductionPersistenceGate" as const;
export const FOUNDER_DAILY_REPORT_PRODUCTION_PERSISTENCE_GATE = "FounderDailyReportProductionPersistenceGate" as const;
export const HQ_HTTPS_GATE = "HQHTTPSGate" as const;
export const HQ_SECURITY_HEADERS_GATE = "HQSecurityHeadersGate" as const;
export const HQ_CUSTOM_DOMAIN_GATE = "HQCustomDomainGate" as const;
export const HQ_INDEXATION_PRIVACY_GATE = "HQIndexationPrivacyGate" as const;
export const HQ_PRIVATE_CACHE_GATE = "HQPrivateCacheGate" as const;
export const HQ_PRODUCTION_READINESS_GATE = "HQProductionReadinessGate" as const;
export const HQ_PRODUCTION_SERVER_ERROR_TRUTH_GATE = "HQProductionServerErrorTruthGate" as const;
export const HQ_SERVERLESS_FILESYSTEM_SAFETY_GATE = "HQServerlessFilesystemSafetyGate" as const;
export const HQ_PRODUCTION_ERROR_CORRELATION_GATE = "HQProductionErrorCorrelationGate" as const;
export const HQ_PRODUCTION_SERVER_RUNTIME_GATE = "HQProductionServerRuntimeGate" as const;
export const HQ_DEPENDENCY_ISOLATION_GATE = "HQDependencyIsolationGate" as const;
export const LIVE_DEPLOYMENT_PARITY_GATE = "LiveDeploymentParityGate" as const;
export const HQ_PRODUCTION_AUTH_REDIRECT_GATE = "HQProductionAuthRedirectGate" as const;
export const HQ_LIVE_LOGOUT_GATE = "HQLiveLogoutGate" as const;
export const HQ_PRODUCTION_GOLDEN_PATH_GATE = "HQProductionGoldenPathGate" as const;
export const HQ_HYDRATION_PARITY_GATE = "HQHydrationParityGate" as const;
export const HQ_INITIAL_SNAPSHOT_CONSISTENCY_GATE = "HQInitialSnapshotConsistencyGate" as const;
export const HQ_RENDERED_RUNTIME_INTEGRITY_GATE = "HQRenderedRuntimeIntegrityGate" as const;

export const HQ_AUTH_ROLES = ["FOUNDER", "AUTHORIZED_OPERATOR", "UNAUTHORIZED"] as const;
export type HqAuthRole = (typeof HQ_AUTH_ROLES)[number];

export const HQ_API_CLASSES = ["PUBLIC_SAFE", "HQ_PRIVATE", "RUNTIME_INTERNAL", "LOCAL_ONLY"] as const;
export type HqApiClass = (typeof HQ_API_CLASSES)[number];

export const ENV_CLASSES = ["PUBLIC", "SERVER_PRIVATE", "OPTIONAL", "LOCAL_ONLY", "DEPRECATED"] as const;
export type EnvClass = (typeof ENV_CLASSES)[number];

export const HQ_HEALTH_STATES = ["HEALTHY", "DEGRADED", "UNAVAILABLE", "UNKNOWN"] as const;
export type HqHealthState = (typeof HQ_HEALTH_STATES)[number];

export const HQ_PROOF_LEVELS = ["NOT_PROVEN", "IMPLEMENTATION_PROVEN", "LIVE_SESSION_PROVEN"] as const;
export type HqProofLevel = (typeof HQ_PROOF_LEVELS)[number];

export type HqNamedGate = {
  gate: string;
  result: "PASS" | "FAIL" | "NOT_IMPLEMENTED" | "INTENTIONALLY_OFF" | "NOT_PROVEN";
  reasons: string[];
  proof_level?: HqProofLevel;
};

export const HQ_PUBLIC_AUTH_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/api/auth/callback",
] as const;

export const HQ_PRIVATE_PATH_PREFIXES = [
  "/dashboard",
  "/api/operator-console",
  "/api/hq",
  "/api/hq-copilot",
  "/api/auth/diagnostic",
  "/api/auth/logout",
] as const;

export const HQ_PRIVATE_API_ROUTES = [
  "/api/operator-console/daily-report",
  "/api/operator-console/hq-live-state",
  "/api/operator-console/treasury",
  "/api/operator-console/ventures",
  "/api/operator-console/hq-events",
  "/api/operator-console/favc1-cycle",
  "/api/operator-console/artifacts",
  "/api/hq/production-runtime",
  "/api/hq/ventures",
  "/api/hq-copilot/query",
  "/api/hq-copilot/transcribe",
  "/api/auth/diagnostic",
] as const;

export const HQ_PUBLIC_SAFE_API_ROUTES = [
  "/api/public/operations",
] as const;

export const HQ_RUNTIME_INTERNAL_API_ROUTES = [
  "/api/runtime/tick",
  "/api/runtime/wake",
  "/api/runtime/operating-state",
  "/api/runtime/venture-operating-cycle",
] as const;

export const HQ_REQUIRED_PRODUCTION_ENV = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", classification: "PUBLIC" as const },
  { key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", classification: "PUBLIC" as const, aliases: ["NEXT_PUBLIC_SUPABASE_ANON_KEY"] },
  { key: "SUPABASE_SERVICE_ROLE_KEY", classification: "SERVER_PRIVATE" as const },
  { key: "INFINITY_RUNTIME_URL", classification: "SERVER_PRIVATE" as const },
  { key: "CRON_SECRET", classification: "SERVER_PRIVATE" as const, aliases: ["INFINITY_RUNTIME_TICK_SECRET"] },
] as const;

export const HQ_OPTIONAL_PRODUCTION_ENV = [
  { key: "INFINITY_RUNTIME_WAKE_SECRET", classification: "OPTIONAL" as const },
  { key: "MERCURY_ENABLED", classification: "OPTIONAL" as const },
  { key: "MERCURY_ENV", classification: "OPTIONAL" as const },
  { key: "MERCURY_API_TOKEN", classification: "OPTIONAL" as const },
  { key: "OPENAI_API_KEY", classification: "OPTIONAL" as const },
  { key: "INFINITY_HQ_PUBLIC_URL", classification: "OPTIONAL" as const },
  { key: "FOUNDER_DAILY_REPORT_STORE", classification: "OPTIONAL" as const },
] as const;

export const HQ_LOCAL_ONLY_ENV = [
  "AUTH_DEBUG",
  "NEXT_PUBLIC_AUTH_DEBUG",
  "ASKREVIEW_ISOLATED_PREVIEW",
  "INFINITY_LOCAL_PRODUCTION_SCHEDULER",
] as const;

export const HQ_FORBIDDEN_PUBLIC_SECRET_PREFIXES = [
  "NEXT_PUBLIC_SUPABASE_SERVICE",
  "NEXT_PUBLIC_SERVICE_ROLE",
  "NEXT_PUBLIC_CRON",
  "NEXT_PUBLIC_MERCURY",
  "NEXT_PUBLIC_OPENAI",
  "NEXT_PUBLIC_GMAIL",
  "NEXT_PUBLIC_CLOUDFLARE",
  "NEXT_PUBLIC_VERCEL_TOKEN",
] as const;
