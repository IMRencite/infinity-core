import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  GENERATED_LOCKFILE_NAME,
  GENERATED_NEXTJS_RUNTIME_DEPENDENCIES,
  GENERATED_NEXTJS_TYPESCRIPT_DEV_DEPENDENCIES,
  parsePackageJson,
} from "./generated-nextjs-package";
import { execNpm } from "./npm-exec";

const FIXTURE_LOCKFILE_PATH = path.join(
  process.cwd(),
  "lib/infinity/venture-build-orchestration/fixtures/generated-nextjs-package-lock.json",
);

export function packageJsonDigest(packageJson: string): string {
  return createHash("sha256").update(packageJson).digest("hex");
}

export function lockfileCacheDir(digest: string): string {
  return path.join(tmpdir(), "infinity-generated-lock-cache", digest);
}

function dependencySetMatchesCanonical(pkg: Record<string, unknown> | null): boolean {
  if (!pkg) return false;
  const deps = (pkg.dependencies ?? {}) as Record<string, unknown>;
  const dev = (pkg.devDependencies ?? {}) as Record<string, unknown>;
  return (
    deps.next === GENERATED_NEXTJS_RUNTIME_DEPENDENCIES.next &&
    deps.react === GENERATED_NEXTJS_RUNTIME_DEPENDENCIES.react &&
    deps["react-dom"] === GENERATED_NEXTJS_RUNTIME_DEPENDENCIES["react-dom"] &&
    dev.typescript === GENERATED_NEXTJS_TYPESCRIPT_DEV_DEPENDENCIES.typescript &&
    dev["@types/node"] === GENERATED_NEXTJS_TYPESCRIPT_DEV_DEPENDENCIES["@types/node"] &&
    dev["@types/react"] === GENERATED_NEXTJS_TYPESCRIPT_DEV_DEPENDENCIES["@types/react"] &&
    dev["@types/react-dom"] === GENERATED_NEXTJS_TYPESCRIPT_DEV_DEPENDENCIES["@types/react-dom"]
  );
}

export async function applyCanonicalGeneratedLockfile(packageJson: string): Promise<string | null> {
  const parsed = parsePackageJson(packageJson);
  if (!dependencySetMatchesCanonical(parsed)) return null;
  const raw = await readFile(FIXTURE_LOCKFILE_PATH, "utf8");
  const lock = JSON.parse(raw) as {
    name?: string;
    packages?: Record<string, { name?: string }>;
  };
  const name = typeof parsed?.name === "string" ? parsed.name : "venture-product";
  lock.name = name;
  if (lock.packages?.[""]) lock.packages[""].name = name;
  return `${JSON.stringify(lock, null, 2)}\n`;
}

export async function synchronizeGeneratedNpmLockfile(packageJson: string): Promise<string> {
  const fromFixture = await applyCanonicalGeneratedLockfile(packageJson);
  if (fromFixture) return fromFixture;

  const digest = packageJsonDigest(packageJson);
  const cacheDir = lockfileCacheDir(digest);
  const cached = path.join(cacheDir, GENERATED_LOCKFILE_NAME);
  try {
    const existing = await readFile(cached, "utf8");
    if (existing.includes('"lockfileVersion": 3') && existing.includes('"node_modules/')) {
      return existing;
    }
  } catch {
    // cache miss
  }

  await mkdir(cacheDir, { recursive: true });
  await writeFile(path.join(cacheDir, "package.json"), packageJson, "utf8");
  await execNpm(
    ["install", "--ignore-scripts", "--package-lock-only", "--no-audit", "--no-fund", "--no-progress"],
    {
      cwd: cacheDir,
      env: {
        ...process.env,
        NODE_PATH: "",
        npm_config_fund: "false",
        npm_config_audit: "false",
      },
    },
  );
  const lockfile = await readFile(cached, "utf8");
  if (!lockfile.includes('"lockfileVersion": 3')) {
    throw new Error("generated_package_lock_invalid");
  }
  return lockfile;
}

export function lockfileDeclaresDependency(lockfile: string, name: string): boolean {
  if (!lockfile.trim()) return false;
  try {
    const parsed = JSON.parse(lockfile) as {
      packages?: Record<string, { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>;
    };
    const root = parsed.packages?.[""];
    const declared = {
      ...(root?.dependencies ?? {}),
      ...(root?.devDependencies ?? {}),
    };
    if (declared[name]) return true;
    return Boolean(parsed.packages?.[`node_modules/${name}`]);
  } catch {
    return lockfile.includes(`node_modules/${name}`);
  }
}
