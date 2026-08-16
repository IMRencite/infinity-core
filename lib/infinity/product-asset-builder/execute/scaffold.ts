import type { VentureBlueprintDraft } from "@/lib/infinity/company-builder/types";
import type { VentureSandbox } from "../workspace/sandbox";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "venture";
}

export async function scaffoldBaseApplication(
  sandbox: VentureSandbox,
  blueprint: VentureBlueprintDraft,
): Promise<string[]> {
  const ventureSlug = slugify(blueprint.core.ventureNameWorking);
  const stack = blueprint.technicalArchitecture.recommendedStack;
  const files: string[] = [];

  const packageJson = {
    name: ventureSlug,
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
      test: "vitest run",
    },
    dependencies: {
      next: "16.2.11",
      react: "19.2.4",
      "react-dom": "19.2.4",
    },
    devDependencies: {
      typescript: "^5",
      "@types/node": "^20",
      "@types/react": "^19",
      "@types/react-dom": "^19",
      vitest: "^3.2.4",
    },
  };

  await sandbox.writeTextFile("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
  files.push("package.json");

  await sandbox.writeTextFile(
    "next.config.mjs",
    `/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: false },
  turbopack: { root: import.meta.dirname },
};
export default nextConfig;
`,
  );
  files.push("next.config.mjs");

  await sandbox.writeTextFile(
    "tsconfig.json",
    JSON.stringify(
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
          paths: { "@/*": ["./*"] },
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      },
      null,
      2,
    ) + "\n",
  );
  files.push("tsconfig.json");

  await sandbox.writeTextFile(
    "next-env.d.ts",
    `/// <reference types="next" />
/// <reference types="next/image-types/global" />
`,
  );
  files.push("next-env.d.ts");

  await sandbox.writeTextFile(
    "app/layout.tsx",
    `export const metadata = { title: ${JSON.stringify(blueprint.core.ventureNameWorking)}, description: ${JSON.stringify(blueprint.core.businessSummary.slice(0, 160))} };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
`,
  );
  files.push("app/layout.tsx");

  await sandbox.writeTextFile(
    "app/page.tsx",
    `export default function HomePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>${blueprint.core.ventureNameWorking.replace(/`/g, "")}</h1>
      <p>${blueprint.core.primaryValueProposition.replace(/`/g, "").slice(0, 200)}</p>
    </main>
  );
}
`,
  );
  files.push("app/page.tsx");

  await sandbox.writeTextFile(
    "lib/venture-config.ts",
    `export const ventureConfig = ${JSON.stringify(
      {
        ventureType: blueprint.core.ventureType,
        monetizationModel: blueprint.core.primaryMonetizationModel,
        stack: stack,
        simulationOnly: blueprint.simulationOnly,
      },
      null,
      2,
    )} as const;
`,
  );
  files.push("lib/venture-config.ts");

  await sandbox.writeTextFile(
    "lib/analytics.ts",
    `export type AnalyticsEvent = { name: string; properties?: Record<string, unknown> };
export function trackEvent(event: AnalyticsEvent): void {
  if (process.env.NODE_ENV !== "production") {
    console.info("[analytics]", event.name, event.properties ?? {});
  }
}
export const northStarMetric = ${JSON.stringify(blueprint.analyticsArchitecture.northStarMetric)};
`,
  );
  files.push("lib/analytics.ts");

  return files;
}

export async function writeMonetizationAdapter(
  sandbox: VentureSandbox,
  blueprint: VentureBlueprintDraft,
): Promise<string> {
  const model = blueprint.revenueArchitecture.monetizationModelType;
  const content = `/** Sandbox monetization adapter — no live merchant accounts in PAB V1 */
export type MonetizationMode = "subscription" | "ecommerce" | "lead_gen" | "marketplace" | "affiliate" | "digital_product";

export const monetizationConfig = {
  mode: ${JSON.stringify(model.includes("subscription") ? "subscription" : model.includes("lead") ? "lead_gen" : "subscription")} as MonetizationMode,
  sandbox: true,
  provider: "test_adapter",
  implementationRequirements: ${JSON.stringify(blueprint.revenueArchitecture.implementationRequirements, null, 2)},
};

export async function createCheckoutSession(_input: { priceId: string; customerId?: string }) {
  return { url: "/checkout/sandbox", sessionId: "sandbox_session", sandbox: true };
}

export async function handleWebhook(_payload: unknown) {
  return { ok: true, sandbox: true };
}
`;
  await sandbox.writeTextFile("lib/monetization/index.ts", content);
  return "lib/monetization/index.ts";
}

export async function writeSchemaStub(sandbox: VentureSandbox, blueprint: VentureBlueprintDraft): Promise<string> {
  const entities = blueprint.dataModel.entities.map((e) => ({
    name: e.name,
    fields: e.keyFields,
    sensitivity: e.sensitivity,
  }));
  const content = `-- Conceptual schema (PAB V1 — not applied to production DB)
${entities.map((e) => `-- entity ${e.name}: ${e.fields.join(", ")}`).join("\n")}
`;
  await sandbox.writeTextFile("db/schema.sql", content);
  return "db/schema.sql";
}

export async function writeAuthStub(sandbox: VentureSandbox): Promise<string[]> {
  const files: string[] = [];
  await sandbox.writeTextFile(
    "lib/auth/session.ts",
    `export type Session = { userId: string; role: string };
export function getSession(): Session | null { return null; }
export function requireAuth(): Session { throw new Error("Unauthorized"); }
`,
  );
  files.push("lib/auth/session.ts");
  await sandbox.writeTextFile(
    "middleware.ts",
    `import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
export function middleware(_request: NextRequest) { return NextResponse.next(); }
export const config = { matcher: ["/dashboard/:path*"] };
`,
  );
  files.push("middleware.ts");
  return files;
}

export async function writeFeatureComponent(
  sandbox: VentureSandbox,
  featureName: string,
  description: string,
): Promise<string> {
  const componentName = featureName.replace(/[^a-zA-Z0-9]/g, "") || "Feature";
  const path = `components/features/${componentName}.tsx`;
  await sandbox.writeTextFile(
    path,
    `/** MVP feature: ${featureName} */
export function ${componentName}() {
  return (<section><h2>${featureName.replace(/`/g, "")}</h2><p>${description.replace(/`/g, "").slice(0, 120)}</p></section>);
}
`,
  );
  return path;
}

export async function writeContentAssets(sandbox: VentureSandbox, blueprint: VentureBlueprintDraft): Promise<string[]> {
  const files: string[] = [];
  await sandbox.writeTextFile(
    "content/landing-copy.md",
    `# ${blueprint.core.ventureNameWorking}\n\n${blueprint.core.businessSummary}\n\n## Value\n${blueprint.core.primaryValueProposition}\n`,
  );
  files.push("content/landing-copy.md");
  await sandbox.writeTextFile(
    "content/seo-metadata.json",
    JSON.stringify(
      {
        title: blueprint.core.ventureNameWorking,
        description: blueprint.core.businessSummary.slice(0, 160),
        ogType: "website",
      },
      null,
      2,
    ) + "\n",
  );
  files.push("content/seo-metadata.json");
  return files;
}

export async function writeTests(sandbox: VentureSandbox): Promise<string[]> {
  await sandbox.writeTextFile(
    "vitest.config.mts",
    `import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node" } });
`,
  );
  await sandbox.writeTextFile(
    "__tests__/smoke.test.ts",
    `import { describe, it, expect } from "vitest";
import { ventureConfig } from "../lib/venture-config";
describe("venture smoke", () => {
  it("has venture config", () => { expect(ventureConfig.ventureType).toBeTruthy(); });
});
`,
  );
  return ["vitest.config.mts", "__tests__/smoke.test.ts"];
}
