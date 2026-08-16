import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import type { ProductionArtifactFile } from "./types";
import type { PackageManager } from "./package-json-validation";
import { inferPackageManager } from "./package-json-validation";

export type CleanRoomCommandResult = {
  ok: boolean;
  exitCode: number | null;
  durationMs: number;
  sanitizedErrors: string[];
  stdoutTail: string;
  stderrTail: string;
};

export type CleanRoomBuildOutcome = {
  install: CleanRoomCommandResult;
  build: CleanRoomCommandResult;
  buildDurationMs: number;
  frameworkDetection: { framework: string; detected: boolean; details: string[] };
  outputSummary: { hasNextOutput: boolean; paths: string[] };
  tempDir: string;
};

function sanitizeOutput(text: string): string {
  return text
    .replace(/ghp_[a-zA-Z0-9]{20,}/g, "[REDACTED]")
    .replace(/sk-[a-zA-Z0-9]{20,}/g, "[REDACTED]")
    .slice(-4000);
}

function runCommand(
  cwd: string,
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<CleanRoomCommandResult> {
  const started = Date.now();
  const isWin = process.platform === "win32";
  const cmd = isWin && !command.includes(".") ? `${command}.cmd` : command;
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...env, CI: env.CI ?? "true" },
      shell: isWin,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => {
      stdout += String(d);
    });
    child.stderr?.on("data", (d) => {
      stderr += String(d);
    });
    child.on("close", (code) => {
      const durationMs = Date.now() - started;
      const combined = sanitizeOutput(`${stderr}\n${stdout}`);
      const sanitizedErrors = combined
        .split("\n")
        .filter((l) => /error|failed|ERR!/i.test(l))
        .slice(-20);
      resolve({
        ok: code === 0,
        exitCode: code,
        durationMs,
        sanitizedErrors,
        stdoutTail: sanitizeOutput(stdout).slice(-1500),
        stderrTail: sanitizeOutput(stderr).slice(-1500),
      });
    });
    child.on("error", (err) => {
      resolve({
        ok: false,
        exitCode: null,
        durationMs: Date.now() - started,
        sanitizedErrors: [err.message],
        stdoutTail: "",
        stderrTail: err.message,
      });
    });
  });
}

function installArgs(packageManager: PackageManager): { cmd: string; args: string[] } {
  if (packageManager === "pnpm") {
    return { cmd: "pnpm", args: ["install", "--frozen-lockfile"] };
  }
  if (packageManager === "yarn") {
    return { cmd: "yarn", args: ["install", "--immutable"] };
  }
  if (packageManager === "npm") {
    return { cmd: "npm", args: ["ci"] };
  }
  return { cmd: "npm", args: ["install"] };
}

function buildArgs(packageManager: PackageManager): { cmd: string; args: string[] } {
  if (packageManager === "pnpm") return { cmd: "pnpm", args: ["run", "build"] };
  if (packageManager === "yarn") return { cmd: "yarn", args: ["run", "build"] };
  return { cmd: "npm", args: ["run", "build"] };
}

export async function writeArtifactToCleanRoom(
  files: ProductionArtifactFile[],
  rootDirectory: string,
): Promise<string> {
  const base = await mkdtemp(join(tmpdir(), "infinity-artifact-"));
  const root = rootDirectory && rootDirectory !== "." ? join(base, rootDirectory) : base;
  await mkdir(root, { recursive: true });
  for (const f of files) {
    const dest = join(base, ...f.relativePath.split("/"));
    await mkdir(join(dest, ".."), { recursive: true });
    await writeFile(dest, f.contentText, "utf8");
  }
  return base;
}

export async function runCleanRoomInstallAndBuild(input: {
  files: ProductionArtifactFile[];
  framework: string;
  rootDirectory?: string;
  skipIfNotNextjs?: boolean;
}): Promise<CleanRoomBuildOutcome> {
  const rootDirectory = input.rootDirectory ?? ".";
  const tempDir = await writeArtifactToCleanRoom(input.files, rootDirectory);
  const paths = input.files.map((f) => f.relativePath);
  const packageManager = inferPackageManager(paths);
  const workDir =
    rootDirectory && rootDirectory !== "." ? join(tempDir, rootDirectory) : tempDir;

  const cleanEnv: Record<string, string | undefined> = { ...process.env };
  delete cleanEnv.VERCEL_TOKEN;
  delete cleanEnv.GITHUB_TOKEN;
  delete cleanEnv.SUPABASE_SERVICE_ROLE_KEY;
  delete cleanEnv.NODE_ENV;

  const installEnv: NodeJS.ProcessEnv = { ...cleanEnv, NODE_ENV: "development" };
  const buildEnv: NodeJS.ProcessEnv = { ...cleanEnv, NODE_ENV: "production", CI: "true" };

  if (input.skipIfNotNextjs && input.framework !== "nextjs") {
    return {
      install: {
        ok: false,
        exitCode: null,
        durationMs: 0,
        sanitizedErrors: ["framework_not_nextjs"],
        stdoutTail: "",
        stderrTail: "",
      },
      build: {
        ok: false,
        exitCode: null,
        durationMs: 0,
        sanitizedErrors: ["framework_not_nextjs"],
        stdoutTail: "",
        stderrTail: "",
      },
      buildDurationMs: 0,
      frameworkDetection: {
        framework: input.framework,
        detected: false,
        details: ["clean_room_skipped_non_nextjs"],
      },
      outputSummary: { hasNextOutput: false, paths: [] },
      tempDir,
    };
  }

  const installSpec = installArgs(packageManager);
  const install = await runCommand(workDir, installSpec.cmd, installSpec.args, installEnv);

  let build: CleanRoomCommandResult = {
    ok: false,
    exitCode: null,
    durationMs: 0,
    sanitizedErrors: install.ok ? [] : ["install_failed_skip_build"],
    stdoutTail: "",
    stderrTail: "",
  };

  if (install.ok) {
    try {
      await rm(join(workDir, ".next"), { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    const buildSpec = buildArgs(packageManager);
    build = await runCommand(workDir, buildSpec.cmd, buildSpec.args, buildEnv);
  }

  const { readdir } = await import("node:fs/promises");
  const outputPaths: string[] = [];
  let hasNextOutput = false;
  try {
    const nextDir = join(workDir, ".next");
    await readdir(nextDir);
    hasNextOutput = true;
    outputPaths.push(".next");
  } catch {
    /* no .next */
  }

  const frameworkDetection = {
    framework: input.framework,
    detected: input.framework === "nextjs" && hasNextOutput,
    details:
      input.framework === "nextjs" && !hasNextOutput && build.ok
        ? ["build_succeeded_without_next_output"]
        : [],
  };

  return {
    install,
    build,
    buildDurationMs: install.durationMs + build.durationMs,
    frameworkDetection,
    outputSummary: { hasNextOutput, paths: outputPaths },
    tempDir,
  };
}

export async function cleanupCleanRoom(tempDir: string): Promise<void> {
  try {
    await rm(tempDir, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
}
