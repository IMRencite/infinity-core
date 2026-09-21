import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";
import {
  HEAVY_CANONICAL_ENGINE_MARKERS,
  HQ_RUNTIME_GRAPH_PREFIXES,
  PROHIBITED_CLIENT_FILE_MARKERS,
  PROHIBITED_CLIENT_SPECIFIERS,
} from "./contract";

const ROOT = process.cwd();
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mts", ".mjs"];

export type ImportGraphHit = {
  from: string;
  specifier: string;
  resolved: string;
};

function posix(relativePath: string): string {
  return relativePath.split(sep).join("/");
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

export function extractRuntimeSpecifiers(source: string): string[] {
  const stripped = stripComments(source);
  const specs = new Set<string>();
  const fromRe =
    /(?:^|[^\w])(?:export\s+\*\s+from\s+|export\s+\{[\s\S]*?\}\s+from\s+|export\s+type\s+\{[\s\S]*?\}\s+from\s+|import\s+type\s+[\s\S]*?from\s+|import\s+[\s\S]*?from\s+)\s*["']([^"']+)["']/g;
  const dynamicRe = /import\(\s*["']([^"']+)["']\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = fromRe.exec(stripped))) {
    const statement = match[0];
    if (/\bimport\s+type\b/.test(statement) || /\bexport\s+type\b/.test(statement)) continue;
    specs.add(match[1]);
  }
  while ((match = dynamicRe.exec(stripped))) {
    specs.add(match[1]);
  }
  return [...specs];
}

function resolveLocal(fromFile: string, specifier: string): string | null {
  if (specifier.startsWith("@/")) {
    return resolveExisting(join(ROOT, specifier.slice(2)));
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return resolveExisting(join(dirname(fromFile), specifier));
  }
  return null;
}

function resolveExisting(base: string): string | null {
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const ext of EXTENSIONS) {
    const file = `${base}${ext}`;
    if (existsSync(file)) return file;
  }
  for (const ext of EXTENSIONS) {
    const index = join(base, `index${ext}`);
    if (existsSync(index)) return index;
  }
  return null;
}

export function isProhibitedSpecifier(specifier: string): boolean {
  return (PROHIBITED_CLIENT_SPECIFIERS as readonly string[]).includes(specifier);
}

export function isProhibitedFile(filePath: string): boolean {
  const rel = posix(relative(ROOT, filePath));
  return PROHIBITED_CLIENT_FILE_MARKERS.some((marker) => rel.endsWith(marker) || rel.includes(`/${marker}`));
}

export function isHeavyCanonicalEngine(filePath: string): boolean {
  const rel = posix(relative(ROOT, filePath));
  return HEAVY_CANONICAL_ENGINE_MARKERS.some((marker) => rel.includes(marker));
}

function readSource(filePath: string): string {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

export function fileHasUseServer(filePath: string): boolean {
  return /^["']use server["'];?/m.test(readSource(filePath));
}

export function fileHasServerOnlyGuard(filePath: string): boolean {
  return /(?:^|\n)\s*import\s+["']server-only["']/.test(readSource(filePath));
}

export function walkRuntimeGraph(
  entryFiles: string[],
  options: { relativeOnly?: boolean } = {},
): {
  files: string[];
  hits: ImportGraphHit[];
  prohibited: ImportGraphHit[];
  heavyEngineEntries: string[];
} {
  const queue = [...entryFiles.filter((file) => existsSync(file))];
  const seen = new Set<string>();
  const files: string[] = [];
  const hits: ImportGraphHit[] = [];
  const prohibited: ImportGraphHit[] = [];
  const heavyEngineEntries = new Set<string>();

  while (queue.length > 0) {
    const current = queue.pop()!;
    const normalized = posix(current);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    files.push(current);
    if (!EXTENSIONS.includes(extname(current))) continue;
    let source = "";
    try {
      source = readFileSync(current, "utf8");
    } catch {
      continue;
    }
    const isEntry = entryFiles.some((file) => posix(file) === normalized);
    if (!isEntry && /^["']use server["'];?/m.test(source)) {
      continue;
    }
    if (!isEntry && /(?:^|\n)\s*import\s+["']server-only["']/.test(source)) {
      continue;
    }
    for (const specifier of extractRuntimeSpecifiers(source)) {
      if (options.relativeOnly && !specifier.startsWith("./") && !specifier.startsWith("../")) {
        if (isProhibitedSpecifier(specifier)) {
          prohibited.push({ from: posix(relative(ROOT, current)), specifier, resolved: specifier });
        }
        continue;
      }
      if (isProhibitedSpecifier(specifier)) {
        prohibited.push({ from: posix(relative(ROOT, current)), specifier, resolved: specifier });
        continue;
      }
      const resolved = resolveLocal(current, specifier);
      if (!resolved) continue;
      if (fileHasUseServer(resolved)) {
        continue;
      }
      const rel = posix(relative(ROOT, resolved));
      hits.push({ from: posix(relative(ROOT, current)), specifier, resolved: rel });
      if (isProhibitedFile(resolved) || isProhibitedSpecifier(specifier) || fileHasServerOnlyGuard(resolved)) {
        prohibited.push({ from: posix(relative(ROOT, current)), specifier, resolved: rel });
        continue;
      }
      if (isHeavyCanonicalEngine(resolved)) {
        heavyEngineEntries.add(posix(relative(ROOT, current)));
      }
      queue.push(resolved);
    }
  }

  return {
    files,
    hits,
    prohibited,
    heavyEngineEntries: [...heavyEngineEntries],
  };
}

export function listClientComponentFiles(directories: string[] = ["components", "app"]): string[] {
  const found: string[] = [];
  const visit = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        if (name === "node_modules" || name === ".next") continue;
        visit(full);
        continue;
      }
      if (!EXTENSIONS.includes(extname(full))) continue;
      const source = readFileSync(full, "utf8");
      if (/^["']use client["'];?/m.test(source)) found.push(full);
    }
  };
  for (const dir of directories) visit(join(ROOT, dir));
  return found;
}

export function relativeToRoot(filePath: string): string {
  return posix(relative(ROOT, filePath));
}

export function resolveWorkspaceFile(relativePath: string): string {
  return join(ROOT, relativePath);
}

function isHqRuntimeGraphFile(filePath: string): boolean {
  const rel = posix(relative(ROOT, filePath));
  return HQ_RUNTIME_GRAPH_PREFIXES.some((prefix) => rel === prefix || rel.startsWith(prefix));
}

export function findImportCycles(
  entryFiles: string[],
  options: { boundedToHqRuntime?: boolean } = {},
): string[][] {
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const visit = (file: string) => {
    const norm = posix(file);
    if (visited.has(norm)) return;
    if (visiting.has(norm)) {
      const start = stack.indexOf(norm);
      if (start >= 0) cycles.push([...stack.slice(start), norm].map((item) => posix(relative(ROOT, item))));
      return;
    }
    visiting.add(norm);
    stack.push(file);
    if (EXTENSIONS.includes(extname(file))) {
      let source = "";
      try {
        source = readFileSync(file, "utf8");
      } catch {
        source = "";
      }
      for (const specifier of extractRuntimeSpecifiers(source)) {
        const resolved = resolveLocal(file, specifier);
        if (!resolved) continue;
        if (options.boundedToHqRuntime && !isHqRuntimeGraphFile(resolved)) continue;
        visit(resolved);
      }
    }
    stack.pop();
    visiting.delete(norm);
    visited.add(norm);
  };

  for (const entry of entryFiles.filter((file) => existsSync(file))) {
    visit(entry);
  }
  return cycles;
}
