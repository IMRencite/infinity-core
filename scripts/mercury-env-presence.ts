import { readFileSync, existsSync } from "node:fs";

const keys = ["MERCURY_ENABLED", "MERCURY_ENV", "MERCURY_API_TOKEN", "MERCURY_BASE_URL", "MERCURY_API_KEY"];
const file = ".env.local";
const text = existsSync(file) ? readFileSync(file, "utf8") : "";
for (const key of keys) {
  const match = text.match(new RegExp(`^${key}\\s*=\\s*(.*)$`, "m"));
  const raw = match ? match[1].trim().replace(/^["']|["']$/g, "") : "";
  const fromProcess = (process.env[key] ?? "").trim();
  const value = raw || fromProcess;
  process.stdout.write(
    `${key}: line=${match ? "yes" : "no"} set=${value.length > 0 ? "yes" : "no"} len=${value.length}\n`,
  );
}
