const LINEAGE_SYMBOLS = [
  "VALIDATION_CANDIDATE_ID",
  "VALIDATION_EXPERIMENT_ID",
  "VALIDATION_ARTIFACT_ID",
] as const;

const SOURCE_EXT = /\.(tsx?|mts|cts|jsx?)$/;

export type GeneratedSourceIntegrityIssue = {
  path: string;
  symbol: string;
  kind: "missing_declaration" | "missing_import" | "undefined_symbol" | "missing_module";
};

function isSource(path: string): boolean {
  return SOURCE_EXT.test(path.replace(/\\/g, "/"));
}

function declares(content: string, symbol: string): boolean {
  return new RegExp(`export const ${symbol}\\s*=`).test(content) || new RegExp(`(?:const|let|var) ${symbol}\\s*=`).test(content);
}

function imports(content: string, symbol: string): boolean {
  return new RegExp(`import\\s*\\{[^}]*\\b${symbol}\\b[^}]*\\}`).test(content);
}

function uses(content: string, symbol: string): boolean {
  return new RegExp(`\\b${symbol}\\b`).test(content);
}

export function inspectGeneratedSourceIntegrity(files: Array<{ path: string; content: string }>): {
  missingImports: GeneratedSourceIntegrityIssue[];
  undefinedSymbols: GeneratedSourceIntegrityIssue[];
  missingModules: GeneratedSourceIntegrityIssue[];
  missingDeclarations: GeneratedSourceIntegrityIssue[];
  missingImportsCount: number;
  undefinedSymbolsCount: number;
  status: "PASS" | "FAIL";
} {
  const byPath = new Map(files.map((file) => [file.path.replace(/\\/g, "/"), file.content]));
  const missingImports: GeneratedSourceIntegrityIssue[] = [];
  const undefinedSymbols: GeneratedSourceIntegrityIssue[] = [];
  const missingModules: GeneratedSourceIntegrityIssue[] = [];
  const missingDeclarations: GeneratedSourceIntegrityIssue[] = [];

  for (const file of files) {
    const path = file.path.replace(/\\/g, "/");
    if (!isSource(path)) continue;
    for (const symbol of LINEAGE_SYMBOLS) {
      if (!uses(file.content, symbol)) continue;
      if (declares(file.content, symbol) || imports(file.content, symbol)) continue;
      const issue = { path, symbol, kind: "undefined_symbol" as const };
      undefinedSymbols.push(issue);
      if (path.endsWith("ingest-client.ts")) {
        missingDeclarations.push({ path, symbol, kind: "missing_declaration" });
      } else {
        missingImports.push({ path, symbol, kind: "missing_import" });
      }
    }
    for (const match of file.content.matchAll(/from\s+["'](\.\.?\/[^"']+)["']/g)) {
      const specifier = match[1];
      if (!/ingest-client/.test(specifier)) continue;
      const resolved = resolveRelative(path, specifier);
      const candidates = [
        resolved,
        `${resolved}.ts`,
        `${resolved}.tsx`,
        `${resolved}.js`,
        `${resolved}/index.ts`,
      ];
      if (!candidates.some((candidate) => byPath.has(candidate))) {
        missingModules.push({
          path,
          symbol: specifier,
          kind: "missing_module",
        });
      }
    }
  }

  const ingest = byPath.get("app/ingest-client.ts") ?? "";
  for (const symbol of LINEAGE_SYMBOLS) {
    if (uses(ingest, symbol) && !declares(ingest, symbol)) {
      if (!missingDeclarations.some((item) => item.symbol === symbol)) {
        missingDeclarations.push({ path: "app/ingest-client.ts", symbol, kind: "missing_declaration" });
      }
    }
  }

  return {
    missingImports,
    undefinedSymbols,
    missingModules,
    missingDeclarations,
    missingImportsCount: missingImports.length,
    undefinedSymbolsCount: undefinedSymbols.length,
    status:
      missingImports.length === 0 &&
      undefinedSymbols.length === 0 &&
      missingDeclarations.length === 0
        ? "PASS"
        : "FAIL",
  };
}

function resolveRelative(fromPath: string, specifier: string): string {
  const fromDir = fromPath.split("/").slice(0, -1);
  const parts = specifier.split("/");
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") fromDir.pop();
    else fromDir.push(part);
  }
  return fromDir.join("/");
}

export function inspectBundleInputContract(files: Array<{ path: string; content: string }>): {
  status: "PASS" | "FAIL";
  missing: string[];
  packageJson: boolean;
  lockfile: boolean;
  tsconfig: boolean;
  nextConfig: boolean;
  sourceFiles: boolean;
  generatedSource: boolean;
  publicAssets: boolean;
  buildCommand: boolean;
  requiredServerEnvNames: string[];
} {
  const paths = new Set(files.map((file) => file.path.replace(/\\/g, "/")));
  const required = ["package.json", "package-lock.json", "tsconfig.json", "app/page.tsx", "app/ingest-client.ts"];
  const missing = required.filter((path) => !paths.has(path));
  const pkgFile = files.find((file) => file.path.replace(/\\/g, "/") === "package.json")?.content ?? "";
  let buildCommand = false;
  try {
    const parsed = JSON.parse(pkgFile) as { scripts?: { build?: string } };
    buildCommand = parsed.scripts?.build === "next build";
  } catch {
    buildCommand = false;
  }
  const envNames = new Set<string>();
  for (const file of files) {
    for (const match of file.content.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) {
      envNames.add(match[1]);
    }
  }
  return {
    status: missing.length === 0 && buildCommand ? "PASS" : "FAIL",
    missing,
    packageJson: paths.has("package.json"),
    lockfile: paths.has("package-lock.json"),
    tsconfig: paths.has("tsconfig.json"),
    nextConfig: [...paths].some((path) => /^next\.config\.(js|mjs|ts|cjs)$/.test(path)),
    sourceFiles: [...paths].some((path) => path.startsWith("app/") && path.endsWith("page.tsx")),
    generatedSource: paths.has("app/ingest-client.ts"),
    publicAssets: [...paths].some((path) => path.startsWith("public/") || path.startsWith("styles/")),
    buildCommand,
    requiredServerEnvNames: [...envNames].sort(),
  };
}
