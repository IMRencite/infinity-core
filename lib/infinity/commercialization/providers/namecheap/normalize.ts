export type NormalizedRegistrarDomain = {
  providerDomainId: string | null;
  domain: string;
  status: string | null;
  expirationDate: string | null;
  autoRenew: boolean | null;
  nameservers: string[] | null;
  registrarLock: boolean | null;
  provider: "namecheap.com_v1";
  fetchedAt: string;
};

function attr(xml: string, name: string): string | null {
  const match = xml.match(new RegExp(`${name}="([^"]*)"`, "i"));
  const value = match?.[1]?.trim();
  return value ? value : null;
}

function boolAttr(xml: string, name: string): boolean | null {
  const raw = attr(xml, name);
  if (raw == null) return null;
  if (/^(true|yes|1)$/i.test(raw)) return true;
  if (/^(false|no|0)$/i.test(raw)) return false;
  return null;
}

function tagText(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`, "i"));
  const value = match?.[1]?.trim();
  return value ? value : null;
}

function parseNamecheapDate(value: string | null): string | null {
  if (!value) return null;
  const mdy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const month = Number(mdy[1]);
    const day = Number(mdy[2]);
    const year = Number(mdy[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  const iso = Date.parse(value);
  if (Number.isFinite(iso)) return new Date(iso).toISOString();
  return null;
}

export function nextNamecheapPage(currentPage: number, totalItems: number, pageSize: number, maxPages: number): number | null {
  if (currentPage >= maxPages) return null;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (currentPage >= totalPages) return null;
  return currentPage + 1;
}

export function parseNamecheapPaging(xml: string): { totalItems: number; currentPage: number; pageSize: number } {
  const totalItems = Number(tagText(xml, "TotalItems") ?? "0");
  const currentPage = Number(tagText(xml, "CurrentPage") ?? "1");
  const pageSize = Number(tagText(xml, "PageSize") ?? "20");
  return {
    totalItems: Number.isFinite(totalItems) ? totalItems : 0,
    currentPage: Number.isFinite(currentPage) ? currentPage : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 20,
  };
}

export function parseNamecheapDomainList(xml: string, fetchedAt: string): NormalizedRegistrarDomain[] {
  const domains: NormalizedRegistrarDomain[] = [];
  const re = /<Domain\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) {
    const tag = match[0]!;
    const domain = attr(tag, "Name");
    if (!domain) continue;
    domains.push({
      providerDomainId: attr(tag, "ID"),
      domain,
      status: attr(tag, "IsExpired") === "true" ? "EXPIRED" : attr(tag, "Status") ?? "ACTIVE",
      expirationDate: parseNamecheapDate(attr(tag, "Expires")),
      autoRenew: boolAttr(tag, "AutoRenew"),
      nameservers: null,
      registrarLock: boolAttr(tag, "IsLocked"),
      provider: "namecheap.com_v1",
      fetchedAt,
    });
  }
  return domains;
}

export function parseNamecheapDomainInfo(xml: string, fallbackDomain: string, fetchedAt: string): NormalizedRegistrarDomain | null {
  const block = xml.match(/<DomainGetInfoResult\b[\s\S]*?<\/DomainGetInfoResult>/i)?.[0] ?? xml;
  const domain = attr(block, "DomainName") ?? fallbackDomain;
  if (!domain) return null;
  const nameservers = [...block.matchAll(/<Nameserver>([^<]+)<\/Nameserver>/gi)].map((item) => item[1]!.trim()).filter(Boolean);
  return {
    providerDomainId: attr(block, "ID"),
    domain,
    status: attr(block, "Status"),
    expirationDate: parseNamecheapDate(tagText(block, "ExpiredDate") ?? tagText(block, "Expires")),
    autoRenew: boolAttr(block, "AutoRenew"),
    nameservers: nameservers.length > 0 ? nameservers : null,
    registrarLock: boolAttr(block, "IsLocked") ?? (/<IsLocked>true<\/IsLocked>/i.test(block) ? true : /<IsLocked>false<\/IsLocked>/i.test(block) ? false : null),
    provider: "namecheap.com_v1",
    fetchedAt,
  };
}

export function namecheapXmlStatus(xml: string): "OK" | "ERROR" {
  return /Status="ERROR"/i.test(xml) || /<Errors>/i.test(xml) ? "ERROR" : "OK";
}

export function namecheapXmlError(xml: string): { code: string | null; message: string } {
  const match = xml.match(/<Error(?:\s+Number="([^"]*)")?[^>]*>([^<]*)<\/Error>/i);
  return {
    code: match?.[1] ?? null,
    message: match?.[2]?.trim() || "NAMECHEAP_PROVIDER_ERROR",
  };
}

export function earliestExpiration(domains: NormalizedRegistrarDomain[]): string | null {
  const dates = domains.map((item) => item.expirationDate).filter((value): value is string => Boolean(value)).sort();
  return dates[0] ?? null;
}
