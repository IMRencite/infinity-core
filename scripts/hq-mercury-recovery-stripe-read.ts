import { existsSync, readFileSync } from "node:fs";

const path = ".infinity/financial-truth/snapshot.json";
if (!existsSync(path)) {
  process.stdout.write(`${JSON.stringify({ stripe: null, reason: "NO_CACHE" })}\n`);
  process.exit(0);
}
const snapshot = JSON.parse(readFileSync(path, "utf8")) as {
  stripe?: { connection?: string; available?: number | null; last_verified?: string | null };
  mercury?: { connection?: string; available?: number | null };
};
process.stdout.write(
  `${JSON.stringify(
    {
      stripe_connection: snapshot.stripe?.connection ?? null,
      stripe_available: snapshot.stripe?.available ?? null,
      stripe_last_verified: snapshot.stripe?.last_verified ?? null,
      mercury_connection: snapshot.mercury?.connection ?? null,
      mercury_available: snapshot.mercury?.available ?? null,
    },
    null,
    2,
  )}\n`,
);
