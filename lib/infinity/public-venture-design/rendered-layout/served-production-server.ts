import "server-only";

import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";

export type IsolatedProductionServer = {
  origin: string;
  port: number;
  root: string;
  frameworkRuntime: "next start";
  stop: () => Promise<void>;
};

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

async function waitForHttp(origin: string, timeoutMs = 90_000): Promise<void> {
  const started = Date.now();
  let last = "";
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(origin, { redirect: "manual" });
      if (response.status < 500) return;
      last = `http_${response.status}`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`isolated_production_server_timeout:${last}`);
}

export async function startIsolatedArtifactProductionServer(input: {
  isolatedRoot: string;
  env?: NodeJS.ProcessEnv;
}): Promise<IsolatedProductionServer> {
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const child: ChildProcess = spawn(
    process.execPath,
    [path.join(input.isolatedRoot, "node_modules", "next", "dist", "bin", "next"), "start", "-H", "127.0.0.1", "-p", String(port)],
    {
      cwd: input.isolatedRoot,
      env: {
        ...process.env,
        ...input.env,
        NODE_ENV: "production",
        PORT: String(port),
      },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stderr = "";
  child.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });
  const stop = async () => {
    if (child.exitCode !== null) return;
    child.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
        resolve();
      }, 4000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  };
  try {
    await waitForHttp(origin);
  } catch (error) {
    await stop();
    throw new Error(`${error instanceof Error ? error.message : String(error)}:${stderr.slice(0, 400)}`);
  }
  return {
    origin,
    port,
    root: input.isolatedRoot,
    frameworkRuntime: "next start",
    stop,
  };
}
