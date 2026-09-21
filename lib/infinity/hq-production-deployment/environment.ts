import {
  HQ_FORBIDDEN_PUBLIC_SECRET_PREFIXES,
  HQ_LOCAL_ONLY_ENV,
  HQ_OPTIONAL_PRODUCTION_ENV,
  HQ_PRODUCTION_ENVIRONMENT_GATE,
  HQ_PRODUCTION_ORIGIN,
  HQ_REQUIRED_PRODUCTION_ENV,
  INFINITY_RUNTIME_ORIGIN,
  LOCAL_HQ_ORIGIN,
  type HqNamedGate,
} from "./contract";

export type EnvPresence = {
  key: string;
  present: boolean;
  classification: string;
};

function envPresent(env: NodeJS.Dict<string>, key: string, aliases: readonly string[] = []): boolean {
  if ((env[key] ?? "").trim()) return true;
  return aliases.some((alias) => Boolean((env[alias] ?? "").trim()));
}

export function inventoryHqProductionEnv(env: NodeJS.Dict<string> = process.env): EnvPresence[] {
  const required = HQ_REQUIRED_PRODUCTION_ENV.map((row) => ({
    key: row.key,
    present: envPresent(env, row.key, "aliases" in row ? row.aliases : []),
    classification: row.classification,
  }));
  const optional = HQ_OPTIONAL_PRODUCTION_ENV.map((row) => ({
    key: row.key,
    present: envPresent(env, row.key),
    classification: row.classification,
  }));
  const local = HQ_LOCAL_ONLY_ENV.map((key) => ({
    key,
    present: envPresent(env, key),
    classification: "LOCAL_ONLY",
  }));
  return [...required, ...optional, ...local];
}

export function evaluateHQProductionEnvironmentGate(input: {
  env?: NodeJS.Dict<string>;
  productionUrls?: { hq?: string; runtime?: string };
}): HqNamedGate {
  const env = input.env ?? process.env;
  const reasons: string[] = [];
  for (const row of HQ_REQUIRED_PRODUCTION_ENV) {
    if (!envPresent(env, row.key, "aliases" in row ? row.aliases : [])) {
      reasons.push(`MISSING:${row.key}`);
    }
  }
  for (const key of Object.keys(env)) {
    if (HQ_FORBIDDEN_PUBLIC_SECRET_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      reasons.push(`SECRET_NEXT_PUBLIC:${key}`);
    }
  }
  const hqUrl = (input.productionUrls?.hq ?? env.INFINITY_HQ_PUBLIC_URL ?? env.NEXT_PUBLIC_INFINITY_HQ_URL ?? HQ_PRODUCTION_ORIGIN).trim();
  const runtimeUrl = (input.productionUrls?.runtime ?? env.INFINITY_RUNTIME_URL ?? INFINITY_RUNTIME_ORIGIN).trim();
  if (hqUrl.includes("localhost") || hqUrl === LOCAL_HQ_ORIGIN) reasons.push("LOCALHOST_HQ_URL_IN_PRODUCTION");
  if (/localhost|127\.0\.0\.1/.test(runtimeUrl)) reasons.push("LOCALHOST_RUNTIME_URL");
  if (!/^https:\/\/hq\.imros\.io\/?$/.test(hqUrl) && isProductionLike(env)) {
    reasons.push("HQ_URL_NOT_CANONICAL");
  }
  if (runtimeUrl && !runtimeUrl.startsWith("https://")) reasons.push("RUNTIME_URL_NOT_HTTPS");
  return {
    gate: HQ_PRODUCTION_ENVIRONMENT_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["REQUIRED_VARS_PRESENT"],
  };
}

function isProductionLike(env: NodeJS.Dict<string>): boolean {
  return env.VERCEL === "1" || env.INFINITY_HQ_SURFACE === "1";
}
