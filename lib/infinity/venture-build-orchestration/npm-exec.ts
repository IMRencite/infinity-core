import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function execNpm(
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; maxBuffer?: number },
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync("npm", args, {
    cwd: options.cwd,
    env: options.env,
    shell: process.platform === "win32",
    windowsHide: true,
    maxBuffer: options.maxBuffer ?? 16 * 1024 * 1024,
  });
}
