const SECRET_KEY_PATTERN =
  /(api[_-]?key|secret|password|token|authorization|service[_-]?role|private[_-]?key|credential|webhook|jwt|bearer)/i;

const SECRET_PATH_PATTERN = /\.(env|pem|key|p12|pfx)$/i;

const BLOCKED_PATHS = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
]);

export function isSensitiveFieldKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key);
}

export function isSensitiveFilePath(path: string): boolean {
  const base = path.split(/[/\\]/).pop() ?? path;
  if (BLOCKED_PATHS.has(base)) return true;
  return SECRET_PATH_PATTERN.test(base);
}

export function sanitizeOperatorValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[truncated]";
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.includes("service_role") || value.includes("sb_secret_")) return "[redacted]";
    return value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => sanitizeOperatorValue(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveFieldKey(key)) {
      out[key] = "[redacted]";
      continue;
    }
    out[key] = sanitizeOperatorValue(val, depth + 1);
  }
  return out;
}

export function sanitizeOperatorSnapshot<T>(snapshot: T): T {
  return sanitizeOperatorValue(snapshot) as T;
}

export function filterSafeFilePaths(paths: string[]): string[] {
  return paths.filter((p) => !isSensitiveFilePath(p));
}
