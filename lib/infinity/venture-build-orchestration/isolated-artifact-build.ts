import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  GENERATED_BUILD_COMMAND,
  GENERATED_INSTALL_COMMAND,
} from "./generated-nextjs-package";
import { execNpm } from "./npm-exec";

const execFileAsync = promisify(execFile);

export type IsolatedArtifactCommandResult = {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type IsolatedArtifactBuildResult = {
  isolated: true;
  root: string;
  install: IsolatedArtifactCommandResult;
  build: IsolatedArtifactCommandResult;
  installResult: "PASS" | "FAIL";
  buildResult: "PASS" | "FAIL";
  typescript: "PASS" | "FAIL" | "NOT_APPLICABLE";
  nextProductionBuild: "PASS" | "FAIL";
  nextVersion: string | null;
  nodeVersion: string;
  typescriptResolvedFrom: string | null;
  rootNodeModulesLeakage: boolean;
  warnings: string[];
  routeGeneration: string | null;
};

export function isolatedArtifactEnv(root: string, phase: "install" | "build"): NodeJS.ProcessEnv {
  const env: { [key: string]: string | undefined } = { ...process.env };
  env.NODE_PATH = "";
  env.npm_config_fund = "false";
  env.npm_config_audit = "false";
  env.npm_config_cache = path.join(root, ".npm-cache");
  delete env.VITEST;
  delete env.VITEST_WORKER_ID;
  delete env.VITEST_POOL_ID;
  if (phase === "build") {
    env.NODE_ENV = "production";
  } else if (env.NODE_ENV === "test" || env.NODE_ENV === "production") {
    delete env.NODE_ENV;
  }
  return env as NodeJS.ProcessEnv;
}

async function runNpm(root: string, args: string[], phase: "install" | "build"): Promise<IsolatedArtifactCommandResult> {
  try {
    const { stdout, stderr } = await execNpm(args, {
      cwd: root,
      env: isolatedArtifactEnv(root, phase),
      maxBuffer: 32 * 1024 * 1024,
    });
    return { command: `npm ${args.join(" ")}`, exitCode: 0, stdout, stderr };
  } catch (error) {
    const err = error as { code?: number; stdout?: string; stderr?: string };
    return {
      command: `npm ${args.join(" ")}`,
      exitCode: typeof err.code === "number" ? err.code : 1,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? (error instanceof Error ? error.message : String(error)),
    };
  }
}

export async function materializeIsolatedArtifactTree(
  files: Array<{ path: string; content: string; encoding?: "utf8" | "base64" }>,
  root?: string,
): Promise<string> {
  const dir = root ?? (await mkdtemp(path.join(tmpdir(), "infinity-isolated-artifact-")));
  for (const file of files) {
    const relative = file.path.replace(/\\/g, "/").replace(/^\/+/, "");
    const target = path.resolve(dir, relative);
    if (!target.startsWith(path.resolve(dir))) {
      throw new Error(`isolated_path_escape:${file.path}`);
    }
    await mkdir(path.dirname(target), { recursive: true });
    if (file.encoding === "base64") {
      await writeFile(target, Buffer.from(file.content, "base64"));
    } else {
      await writeFile(target, file.content, "utf8");
    }
  }
  return dir;
}

export function detectRootNodeModulesLeakage(input: {
  isolatedRoot: string;
  resolvedPath: string | null;
  infinityCoreRoot?: string;
}): boolean {
  if (!input.resolvedPath) return false;
  const resolved = path.resolve(input.resolvedPath);
  const isolated = path.resolve(input.isolatedRoot);
  if (resolved.startsWith(isolated + path.sep) || resolved === isolated) return false;
  const core = input.infinityCoreRoot ? path.resolve(input.infinityCoreRoot) : "";
  if (core && resolved.startsWith(core + path.sep)) return true;
  return resolved.toLowerCase().includes(`${path.sep}infinity-core${path.sep}node_modules${path.sep}`);
}

export async function runIsolatedArtifactInstallAndBuild(input: {
  files: Array<{ path: string; content: string }>;
  keepRoot?: boolean;
  infinityCoreRoot?: string;
}): Promise<IsolatedArtifactBuildResult> {
  const root = await materializeIsolatedArtifactTree(input.files);
  const installArgs = GENERATED_INSTALL_COMMAND.split(" ").slice(1);
  const install = await runNpm(root, [...installArgs, "--ignore-scripts", "--no-audit", "--no-fund"], "install");
  const build = install.exitCode === 0
    ? await runNpm(root, GENERATED_BUILD_COMMAND.split(" ").slice(1), "build")
    : {
        command: GENERATED_BUILD_COMMAND,
        exitCode: 1,
        stdout: "",
        stderr: "install_failed",
      };

  let typescriptResolvedFrom: string | null = null;
  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      ["-e", "console.log(require.resolve('typescript/package.json'))"],
      { cwd: root, env: isolatedArtifactEnv(root, "build"), windowsHide: true },
    );
    typescriptResolvedFrom = stdout.trim();
  } catch {
    typescriptResolvedFrom = null;
  }

  const combined = `${install.stdout}\n${install.stderr}\n${build.stdout}\n${build.stderr}`;
  const nextVersionMatch = combined.match(/Next\.js\s+(v?\d+\.\d+\.\d+)/i);
  const routeMatch = combined.match(/Route \(app\)[\s\S]{0,800}/);
  const warnings = [...combined.matchAll(/^.*(?:warn(?:ing)?).*$/gim)].map((item) => item[0]).slice(0, 20);
  const typescriptFailed = /Type error|Failed to compile|typescript/i.test(build.stderr) && build.exitCode !== 0;
  const leakage = detectRootNodeModulesLeakage({
    isolatedRoot: root,
    resolvedPath: typescriptResolvedFrom,
    infinityCoreRoot: input.infinityCoreRoot,
  });

  const result: IsolatedArtifactBuildResult = {
    isolated: true,
    root,
    install,
    build,
    installResult: install.exitCode === 0 ? "PASS" : "FAIL",
    buildResult: build.exitCode === 0 ? "PASS" : "FAIL",
    typescript: build.exitCode === 0 ? "PASS" : typescriptFailed ? "FAIL" : "FAIL",
    nextProductionBuild: build.exitCode === 0 && /Compiled successfully|Generating static pages|Route \(app\)/i.test(combined)
      ? "PASS"
      : build.exitCode === 0
        ? "PASS"
        : "FAIL",
    nextVersion: nextVersionMatch?.[1] ?? null,
    nodeVersion: process.version,
    typescriptResolvedFrom,
    rootNodeModulesLeakage: leakage,
    warnings,
    routeGeneration: routeMatch?.[0] ?? null,
  };

  if (!input.keepRoot) {
    await rm(root, { recursive: true, force: true });
  }
  return result;
}

export async function readIsolatedPackageLock(root: string): Promise<string> {
  return readFile(path.join(root, "package-lock.json"), "utf8");
}
