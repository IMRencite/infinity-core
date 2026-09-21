import { loadEnvLocal } from "../lib/infinity/market-validation-experiment/live";
import { vercelEconomicGet } from "../lib/infinity/market-validation-experiment/vercel-economic-read";

loadEnvLocal();
const id = "dpl_4yVgtVZ1LU8HqrgJa4oyMCasVWK7";
const dep = await vercelEconomicGet(`/v13/deployments/${id}`);
const ev = await vercelEconomicGet(`/v3/deployments/${id}/events?limit=200&builds=1&direction=backward`);
const depBody = JSON.parse(dep.text) as Record<string, unknown>;
process.stdout.write(
  `${JSON.stringify(
    {
      status: dep.status,
      readyState: depBody.readyState,
      errorCode: depBody.errorCode,
      errorMessage: depBody.errorMessage,
      name: depBody.name,
      url: depBody.url,
    },
    null,
    2,
  )}\n`,
);
process.stdout.write("---EVENTS---\n");
const events = JSON.parse(ev.text) as Array<{ text?: string; type?: string }>;
for (const event of events) {
  if (event.text && /error|Error|Type|fail|Cannot|TS\d+/i.test(event.text)) {
    process.stdout.write(`${event.text}\n`);
  }
}
process.stdout.write("---TAIL---\n");
for (const event of events.slice(-15)) {
  process.stdout.write(`${event.text ?? ""}\n`);
}
