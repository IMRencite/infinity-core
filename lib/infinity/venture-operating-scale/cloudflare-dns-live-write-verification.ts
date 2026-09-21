import { randomBytes } from "node:crypto";
import {
  reloadCloudflareDnsTokenFromLocalFile,
  reloadCloudflareRegistrarFromLocalFile,
} from "@/lib/infinity/communication-provider/load-local-env";
import { CloudflareDnsWriteAdapter, dnsContentEqual } from "@/lib/infinity/commercialization/providers/cloudflare/dns-write-adapter";
import { CRE_CLOUDFLARE_DNS_LIVE_WRITE_VERIFICATION_V2, OCCUPANCYNPV_DOMAIN } from "./constants";

export const OCCUPANCYNPV_ZONE_ID = "dbc6bd7446d67b25699aa62c88d9e5a5" as const;
export const DNS_WRITE_PROBE_NAME = `_infinity-dns-write-verification.${OCCUPANCYNPV_DOMAIN}` as const;

export async function executeCreCloudflareDnsLiveWriteVerification(input: {
  fetchImpl?: typeof fetch;
  reloadEnv?: boolean;
} = {}) {
  if (input.reloadEnv !== false) {
    reloadCloudflareRegistrarFromLocalFile();
    reloadCloudflareDnsTokenFromLocalFile();
  }
  const dns = new CloudflareDnsWriteAdapter({ fetchImpl: input.fetchImpl });
  const tokenLoaded = dns.tokenPresent() ? "YES" as const : "NO" as const;
  const accountLoaded = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ? "YES" as const : "NO" as const;
  const token = await dns.verifyToken();
  const zone = await dns.findZone(OCCUPANCYNPV_DOMAIN);
  const zoneFound = zone.exists && (zone.zoneId === OCCUPANCYNPV_ZONE_ID || zone.zoneId !== "UNKNOWN") ? "YES" as const : "NO" as const;
  const dnsRead = token.ok && zone.exists ? "READ_ONLY_VERIFIED" as const : "UNVERIFIED" as const;
  const scope = await dns.inspectTokenScope(zone.zoneId === "UNKNOWN" ? OCCUPANCYNPV_ZONE_ID : zone.zoneId);
  const probeValue = `infinity-dns-write-v2-${randomBytes(6).toString("hex")}`;
  let create: "PASS" | "FAIL" = "FAIL";
  let readback: "PASS" | "FAIL" = "FAIL";
  let deleted: "PASS" | "FAIL" = "FAIL";
  let remaining: "YES" | "NO" = "NO";
  let providerStatus: number | string = zone.httpStatus;
  let providerError: string | number | null = zone.safeError;
  let productionWrites = 0;
  let tempRemaining = 0;

  const finish = (result: "CLOUDFLARE_DNS_WRITE_VERIFIED" | "CLOUDFLARE_DNS_WRITE_FAILED") => {
    const writeVerified = result === "CLOUDFLARE_DNS_WRITE_VERIFIED";
    return {
      mission: CRE_CLOUDFLARE_DNS_LIVE_WRITE_VERIFICATION_V2,
      environment: { generalDnsTokenLoaded: tokenLoaded, accountIdLoaded: accountLoaded },
      zone: {
        name: OCCUPANCYNPV_DOMAIN,
        found: zoneFound,
        status: zone.status,
        dnsRead,
        zoneManagement: writeVerified ? "LIVE_WRITE_VERIFIED" as const : dnsRead === "READ_ONLY_VERIFIED" ? "READ_ONLY_VERIFIED" as const : "UNVERIFIED" as const,
      },
      liveWrite: {
        create,
        readback,
        deleted,
        remaining,
        providerStatus,
        providerError: providerError ?? "NONE",
        probeName: DNS_WRITE_PROBE_NAME,
      },
      capability: {
        dnsWrite: writeVerified ? "LIVE_WRITE_VERIFIED" as const : "UNVERIFIED" as const,
        currentZoneWritable: writeVerified ? "YES" as const : "NO" as const,
        tokenZoneScope: scope.zoneScope,
        zoneLifecycleAuthority: scope.zoneScope === "ALL_ZONES" ? "CONFIGURED" as const : "UNKNOWN" as const,
        futureZoneDnsManagement: scope.zoneScope === "ALL_ZONES" ? "CONFIGURED" as const : "UNKNOWN" as const,
      },
      actions: {
        productionDnsWrites: productionWrites,
        vercelMutations: 0 as const,
        domainPurchases: 0 as const,
        stripeWrites: 0 as const,
        deployments: 0 as const,
        temporaryRecordsRemaining: tempRemaining,
        publiclyLaunched: "NO" as const,
      },
      usedRegistrarToken: dns.usedRegistrarToken,
      nextState: result,
    };
  };

  if (!dns.tokenPresent() || !token.ok || zoneFound !== "YES" || zone.zoneId === "UNKNOWN") {
    return finish("CLOUDFLARE_DNS_WRITE_FAILED");
  }

  const listedBefore = await dns.listRecords(zone.zoneId);
  const leftover = listedBefore.records.filter(
    (row) => row.recordType === "TXT" && row.name.toLowerCase() === DNS_WRITE_PROBE_NAME,
  );
  for (const row of leftover) {
    await dns.deleteRecord(zone.zoneId, row.recordId);
  }

  const created = await dns.createTxtRecord({
    zoneId: zone.zoneId,
    name: DNS_WRITE_PROBE_NAME,
    content: probeValue,
    ttl: 120,
  });
  providerStatus = created.status;
  providerError = created.errorCode ?? created.safeError;
  if (!created.ok) return finish("CLOUDFLARE_DNS_WRITE_FAILED");
  create = "PASS";

  const listed = await dns.listRecords(zone.zoneId);
  const found = listed.records.find(
    (row) =>
      row.recordType === "TXT" &&
      row.name.toLowerCase() === DNS_WRITE_PROBE_NAME &&
      dnsContentEqual((row.content ?? "").replace(/^"|"$/g, ""), probeValue),
  );
  readback = found ? "PASS" : "FAIL";
  if (!found) {
    remaining = "YES";
    tempRemaining = 1;
    if (created.recordId !== "UNKNOWN") {
      const cleanup = await dns.deleteRecord(zone.zoneId, created.recordId);
      if (cleanup.ok) {
        remaining = "NO";
        tempRemaining = 0;
      }
    }
    return finish("CLOUDFLARE_DNS_WRITE_FAILED");
  }

  const removed = await dns.deleteRecord(zone.zoneId, found.recordId);
  providerStatus = removed.status;
  providerError = removed.errorCode ?? removed.safeError ?? providerError;
  deleted = removed.ok ? "PASS" : "FAIL";
  const after = await dns.listRecords(zone.zoneId);
  const stillThere = after.records.some(
    (row) => row.recordType === "TXT" && row.name.toLowerCase() === DNS_WRITE_PROBE_NAME,
  );
  remaining = stillThere ? "YES" : "NO";
  tempRemaining = stillThere ? 1 : 0;
  if (create === "PASS" && readback === "PASS" && deleted === "PASS" && remaining === "NO") {
    return finish("CLOUDFLARE_DNS_WRITE_VERIFIED");
  }
  return finish("CLOUDFLARE_DNS_WRITE_FAILED");
}

export type CloudflareDnsLiveWriteVerificationResult = Awaited<ReturnType<typeof executeCreCloudflareDnsLiveWriteVerification>>;
