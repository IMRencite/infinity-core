import { loadServerEnvFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { persistVentureDomainRegistry, verifyImrosDomainInfrastructure } from "../lib/infinity/venture-domain-infrastructure";

async function main() {
  loadServerEnvFromLocalFile();
  const verification = await verifyImrosDomainInfrastructure({ persist: true, now: new Date().toISOString() });
  const path = persistVentureDomainRegistry(verification);
  console.log(JSON.stringify({
    persisted: path,
    registrar: verification.record.registrar,
    registrar_kind: verification.record.registrar_kind,
    dns_provider: verification.record.authoritative_dns_provider,
    nameservers: verification.record.nameservers,
    expiry: verification.record.expiry_date,
    lock: verification.record.registrar_lock,
    dnssec: verification.record.dnssec_state,
    public_site: verification.record.public_site_target,
    hq: verification.record.hq_target,
    runtime: verification.record.runtime_target,
    cloudflare_zone: verification.cloudflare_zone,
    email: verification.email,
    gates: {
      registration: verification.gates.registration.result,
      authoritative_dns: verification.gates.authoritative_dns.result,
      cloudflare_zone: verification.gates.cloudflare_zone.result,
      topology: verification.gates.topology.result,
    },
    inventory: verification.inventory.map((row) => ({
      hostname: row.hostname,
      type: row.type,
      target: row.target,
      proxied: row.proxied,
      purpose: row.purpose,
    })),
  }, null, 2));
}

void main();
