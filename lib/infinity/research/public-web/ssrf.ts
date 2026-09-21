import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.google.com",
  "metadata.goog",
  "kubernetes.default.svc",
  "kubernetes.default",
]);

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}

function ipv4InCidr(ip: string, cidr: string): boolean {
  const [base, bitsRaw] = cidr.split("/");
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(base ?? "");
  const bits = Number(bitsRaw);
  if (ipInt == null || baseInt == null || !Number.isInteger(bits)) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

export function isBlockedIpv4(ip: string): boolean {
  return (
    ipv4InCidr(ip, "127.0.0.0/8") ||
    ipv4InCidr(ip, "10.0.0.0/8") ||
    ipv4InCidr(ip, "172.16.0.0/12") ||
    ipv4InCidr(ip, "192.168.0.0/16") ||
    ipv4InCidr(ip, "169.254.0.0/16") ||
    ipv4InCidr(ip, "0.0.0.0/8") ||
    ipv4InCidr(ip, "100.64.0.0/10")
  );
}

export function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;
  if (normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    if (isIP(mapped) === 4) return isBlockedIpv4(mapped);
  }
  return false;
}

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) return true;
  if (host === "0.0.0.0") return true;
  const ipVersion = isIP(host);
  if (ipVersion === 4) return isBlockedIpv4(host);
  if (ipVersion === 6) return isBlockedIpv6(host);
  return false;
}

export function assertPublicHttpUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("SSRF_BLOCKED:invalid_url");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`SSRF_BLOCKED:scheme_${parsed.protocol.replace(":", "")}`);
  }
  if (parsed.username || parsed.password) {
    throw new Error("SSRF_BLOCKED:userinfo");
  }
  if (isBlockedHostname(parsed.hostname)) {
    throw new Error(`SSRF_BLOCKED:host_${parsed.hostname}`);
  }
  return parsed;
}

export async function assertPublicResolvedHost(url: URL): Promise<void> {
  if (isIP(url.hostname)) {
    if (isBlockedHostname(url.hostname)) throw new Error(`SSRF_BLOCKED:literal_ip_${url.hostname}`);
    return;
  }
  const records = await lookup(url.hostname, { all: true, verbatim: true }).catch(() => {
    throw new Error("SSRF_BLOCKED:dns_failed");
  });
  if (records.length === 0) throw new Error("SSRF_BLOCKED:dns_empty");
  for (const record of records) {
    if (record.family === 4 && isBlockedIpv4(record.address)) {
      throw new Error(`SSRF_BLOCKED:resolved_${record.address}`);
    }
    if (record.family === 6 && isBlockedIpv6(record.address)) {
      throw new Error(`SSRF_BLOCKED:resolved_${record.address}`);
    }
  }
}

export async function validatePublicFetchTarget(raw: string): Promise<URL> {
  const url = assertPublicHttpUrl(raw);
  await assertPublicResolvedHost(url);
  return url;
}
