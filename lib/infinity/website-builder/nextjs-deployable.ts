import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DEPLOYABLE_NEXTJS_VERSION } from "@/lib/infinity/production-artifact/nextjs-version-policy";

export { DEPLOYABLE_NEXTJS_VERSION };

export const CONTROLLED_AUTONOMOUS_SITE_TITLE = "Infinity Autonomous Venture System";
export const CONTROLLED_AUTONOMOUS_SITE_SUBTITLE = "Controlled Autonomous Deployment";

export function buildDeployableNextJsPackageJson(slug: string): Record<string, unknown> {
  return {
    name: slug.slice(0, 64) || "infinity-autonomous-nextjs",
    private: true,
    scripts: {
      build: "next build",
      start: "next start",
    },
    dependencies: {
      next: DEPLOYABLE_NEXTJS_VERSION,
      react: "19.0.0",
      "react-dom": "19.0.0",
    },
    devDependencies: {
      "@types/node": "^20",
      "@types/react": "^19",
      typescript: "^5",
    },
  };
}

export function deployableNextJsTsConfigJson(): Record<string, unknown> {
  return {
    compilerOptions: {
      target: "ES2017",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      module: "esnext",
      moduleResolution: "bundler",
      jsx: "preserve",
      incremental: true,
      plugins: [{ name: "next" }],
      esModuleInterop: true,
      resolveJsonModule: true,
      isolatedModules: true,
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
    exclude: ["node_modules"],
  };
}

export const DEPLOYABLE_NEXT_CONFIG = `/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
`;

export const DEPLOYABLE_NEXT_ENV_DTS = `/// <reference types="next" />
/// <reference types="next/image-types/global" />
`;

export function loadPinnedPackageLockJson(): string {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "production-artifact", "fixtures", "minimal-nextjs-app", "package-lock.json");
  return readFileSync(root, "utf8");
}
