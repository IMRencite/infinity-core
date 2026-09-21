import { createHash } from "node:crypto";
import type { ExecutableVenturePlan, VentureBuildPackage } from "./types";

/**
 * Generation contract version. Included in artifact identity so a repaired
 * build-complete package is a new immutable artifact, not a silent mutation.
 */
export const GENERATED_NEXTJS_ARTIFACT_CONTRACT = "nextjs_ts_validation_grade_footer_v1" as const;

export const GENERATED_PACKAGE_MANAGER = "npm" as const;
export const GENERATED_LOCKFILE_NAME = "package-lock.json" as const;
export const GENERATED_INSTALL_COMMAND = "npm ci" as const;
export const GENERATED_BUILD_COMMAND = "npm run build" as const;
export const GENERATED_NEXT_BUILD_SCRIPT = "next build" as const;

/**
 * Runtime versions follow the Infinity repo's canonical Next.js generation policy.
 */
export const GENERATED_NEXTJS_RUNTIME_DEPENDENCIES = {
  next: "16.2.11",
  react: "19.2.4",
  "react-dom": "19.2.4",
} as const;

/**
 * TypeScript toolchain derived from those runtime versions and the repo policy:
 * Next 16.2.x requires TypeScript 5.x; React 19.2.x requires @types/react 19.x
 * and @types/react-dom 19.x; Node types follow the repo @types/node 20.x line.
 */
export const GENERATED_NEXTJS_TYPESCRIPT_DEV_DEPENDENCIES = {
  typescript: "5.9.3",
  "@types/node": "20.19.43",
  "@types/react": "19.2.17",
  "@types/react-dom": "19.2.3",
} as const;

export const TYPESCRIPT_SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts"] as const;

export function artifactContainsTypeScript(relativePaths: string[]): boolean {
  return relativePaths.some((path) =>
    TYPESCRIPT_SOURCE_EXTENSIONS.some((ext) => path.replace(/\\/g, "/").endsWith(ext)),
  );
}

export function artifactIdFor(plan: ExecutableVenturePlan, pkg: VentureBuildPackage): string {
  return `art_${createHash("sha256")
    .update([plan.planId, pkg.packageId, String(pkg.packageVersion), GENERATED_NEXTJS_ARTIFACT_CONTRACT].join(":"))
    .digest("hex")
    .slice(0, 20)}`;
}

export function parsePackageJson(content: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(content) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function declaredDependencyVersions(pkg: Record<string, unknown> | null): Record<string, string> {
  if (!pkg) return {};
  const deps = (pkg.dependencies ?? {}) as Record<string, unknown>;
  const devDeps = (pkg.devDependencies ?? {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [name, version] of Object.entries({ ...deps, ...devDeps })) {
    if (typeof version === "string" && version.trim()) out[name] = version;
  }
  return out;
}

export function typescriptToolchainRequired(input: {
  relativePaths: string[];
  packageJson?: Record<string, unknown> | null;
}): boolean {
  if (!artifactContainsTypeScript(input.relativePaths)) return false;
  const scripts = input.packageJson?.scripts;
  const build =
    scripts && typeof scripts === "object"
      ? String((scripts as Record<string, unknown>).build ?? "")
      : "";
  return !build || build.includes("next") || build.includes("tsc") || build.includes("build");
}

export function requiredTypescriptDevDependencies(input: {
  relativePaths: string[];
  packageJson?: Record<string, unknown> | null;
}): Record<string, string> {
  if (!typescriptToolchainRequired(input)) return {};
  const declared = declaredDependencyVersions(input.packageJson ?? null);
  const required: Record<string, string> = {
    typescript: GENERATED_NEXTJS_TYPESCRIPT_DEV_DEPENDENCIES.typescript,
    "@types/node": GENERATED_NEXTJS_TYPESCRIPT_DEV_DEPENDENCIES["@types/node"],
    "@types/react": GENERATED_NEXTJS_TYPESCRIPT_DEV_DEPENDENCIES["@types/react"],
  };
  const usesReactDom =
    Boolean(declared["react-dom"]) ||
    input.relativePaths.some((path) => path.replace(/\\/g, "/").endsWith(".tsx"));
  if (usesReactDom) {
    required["@types/react-dom"] = GENERATED_NEXTJS_TYPESCRIPT_DEV_DEPENDENCIES["@types/react-dom"];
  }
  return required;
}

export function buildGeneratedNextJsPackageJson(input: {
  name: string;
  relativePaths: string[];
}): string {
  const typescript = artifactContainsTypeScript(input.relativePaths);
  const pkg: Record<string, unknown> = {
    name: input.name,
    private: true,
    scripts: {
      build: GENERATED_NEXT_BUILD_SCRIPT,
      test: "node --test",
    },
    dependencies: { ...GENERATED_NEXTJS_RUNTIME_DEPENDENCIES },
  };
  if (typescript) {
    pkg.devDependencies = { ...requiredTypescriptDevDependencies({ relativePaths: input.relativePaths }) };
  }
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

export function generatedTsconfigJson(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2017",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "react-jsx",
        incremental: true,
        plugins: [{ name: "next" }],
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
      exclude: ["node_modules"],
    },
    null,
    2,
  )}\n`;
}

export function generatedNextEnvDts(): string {
  return `/// <reference types="next" />
/// <reference types="next/image-types/global" />
`;
}
