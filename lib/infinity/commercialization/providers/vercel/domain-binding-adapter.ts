import { createHash } from "node:crypto";
import { VERCEL_TEAM_ID_ENV, VERCEL_TOKEN_ENV } from "@/lib/infinity/launch-gateway/provider-config";
import {
  buildVercelSourceBundleDeploymentBody,
  fileUploadBytes,
  translateFilesToVercelSourceBundle,
  type VercelUploadableSourceFile,
  VERCEL_DEPLOYMENTS_PATH,
  VERCEL_FILES_UPLOAD_PATH,
} from "@/lib/infinity/launch-gateway/adapters/vercel-source-bundle";

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export type VercelRequiredDnsRecord = {
  type: "A" | "AAAA" | "CNAME" | "TXT";
  name: string;
  content: string;
  purpose: "ROUTING" | "VERIFICATION";
};

export class VercelDomainBindingAdapter {
  domainPosts = 0;
  aliasAssigns = 0;
  readHttpCalls = 0;
  sourceUploads = 0;
  deploymentCreates = 0;
  envUpserts = 0;
  private readonly fetchImpl: typeof fetch;
  private readonly token: string | null;
  private readonly teamId: string | null;

  constructor(options: { env?: NodeJS.Dict<string>; fetchImpl?: typeof fetch } = {}) {
    const env = options.env ?? process.env;
    const token = (env[VERCEL_TOKEN_ENV] ?? "").trim();
    const team = (env[VERCEL_TEAM_ID_ENV] ?? "").trim();
    this.token = token.length >= 8 ? token : null;
    this.teamId = team || null;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  tokenPresent(): boolean {
    return Boolean(this.token);
  }

  private url(path: string): string {
    const base = `https://api.vercel.com${path}`;
    if (!this.teamId) return base;
    return `${base}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(this.teamId)}`;
  }

  private async request(
    method: "GET" | "POST" | "PATCH",
    path: string,
    body?: Json,
  ): Promise<{ ok: boolean; status: number; json: Json; safeError: string | null }> {
    if (!this.token) return { ok: false, status: 0, json: {}, safeError: "VERCEL_TOKEN_MISSING" };
    const response = await this.fetchImpl(this.url(path), {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
        ...(method === "GET" ? {} : { "Content-Type": "application/json" }),
      },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    });
    if (method === "GET") this.readHttpCalls += 1;
    let json: Json = {};
    const text = await response.text();
    try {
      json = text ? (JSON.parse(text) as Json) : {};
    } catch {
      json = {};
    }
    const error = asRecord(json.error);
    const message = asString(error.message) ?? (response.ok ? null : `VERCEL_HTTP_${response.status}`);
    return {
      ok: response.ok,
      status: response.status,
      json,
      safeError: message && this.token ? message.split(this.token).join("[REDACTED_VERCEL]") : message,
    };
  }

  async createProject(name: string) {
    const existing = await this.getProject(name);
    if (existing.ok && existing.id !== "UNKNOWN") {
      return {
        ok: true,
        reused: true,
        id: existing.id,
        name: existing.name,
        status: existing.status,
        safeError: null,
      };
    }
    const result = await this.request("POST", "/v10/projects", {
      name,
      framework: "nextjs",
    });
    const body = asRecord(result.json);
    return {
      ok: result.ok,
      reused: false,
      id: asString(body.id) ?? "UNKNOWN",
      name: asString(body.name) ?? name,
      status: result.status,
      safeError: result.safeError,
    };
  }

  async getProject(name: string) {
    const result = await this.request("GET", `/v9/projects/${encodeURIComponent(name)}`);
    const body = asRecord(result.json);
    const targets = asRecord(body.targets);
    const production = asRecord(targets.production);
    return {
      ok: result.ok,
      status: result.status,
      id: asString(body.id) ?? "UNKNOWN",
      name: asString(body.name) ?? name,
      productionDeploymentId: asString(production.id) ?? "NONE",
      productionUrl: asString(production.url) ?? "NONE",
      productionReadyState: asString(production.readyState) ?? "UNKNOWN",
      productionAliases: Array.isArray(production.alias)
        ? production.alias.filter((row): row is string => typeof row === "string")
        : [],
      safeError: result.safeError,
    };
  }

  async listDeployments(project: string, limit = 20) {
    const result = await this.request(
      "GET",
      `/v6/deployments?projectId=${encodeURIComponent(project)}&limit=${encodeURIComponent(String(limit))}`,
    );
    const body = asRecord(result.json);
    const rows = Array.isArray(body.deployments) ? body.deployments : [];
    return {
      ok: result.ok,
      status: result.status,
      deployments: rows.map((row) => {
        const item = asRecord(row);
        return {
          id: asString(item.uid) ?? asString(item.id) ?? "UNKNOWN",
          url: asString(item.url) ?? "UNKNOWN",
          readyState: asString(item.readyState) ?? "UNKNOWN",
          target: asString(item.target) ?? "UNKNOWN",
          aliases: Array.isArray(item.aliases)
            ? item.aliases.filter((alias): alias is string => typeof alias === "string")
            : [],
        };
      }),
      safeError: result.safeError,
    };
  }

  async uploadSourceFile(file: VercelUploadableSourceFile) {
    this.sourceUploads += 1;
    if (!this.token) return { ok: false, status: 0, sha: "", safeError: "VERCEL_TOKEN_MISSING" };
    const bytes = fileUploadBytes(file);
    const sha = createHash("sha1").update(bytes).digest("hex");
    const response = await this.fetchImpl(this.url(VERCEL_FILES_UPLOAD_PATH), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
        "Content-Type": "application/octet-stream",
        "Content-Length": String(bytes.length),
        "x-vercel-digest": sha,
      },
      body: bytes as unknown as BodyInit,
    });
    const text = await response.text();
    const message = response.ok || response.status === 409 ? null : `VERCEL_HTTP_${response.status}`;
    void text;
    return {
      ok: response.ok || response.status === 409,
      status: response.status,
      sha,
      safeError: message && this.token ? message.split(this.token).join("[REDACTED_VERCEL]") : message,
    };
  }

  async createSourceBundleDeployment(input: {
    projectName: string;
    files: VercelUploadableSourceFile[];
    projectSettings?: {
      framework: string | null;
      buildCommand?: string | null;
      installCommand?: string | null;
      outputDirectory?: string | null;
    };
    target?: "staging" | "production";
  }) {
    this.deploymentCreates += 1;
    const body = input.projectSettings
      ? {
          name: input.projectName,
          files: translateFilesToVercelSourceBundle(input.files),
          target: input.target ?? "staging",
          projectSettings: input.projectSettings,
        }
      : buildVercelSourceBundleDeploymentBody({
          projectName: input.projectName,
          files: input.files,
        });
    const result = await this.request("POST", VERCEL_DEPLOYMENTS_PATH, body);
    const created = asRecord(result.json);
    return {
      ok: result.ok,
      status: result.status,
      id: asString(created.id) ?? "UNKNOWN",
      url: asString(created.url) ?? "UNKNOWN",
      readyState: asString(created.readyState) ?? "UNKNOWN",
      safeError: result.safeError,
    };
  }

  async assignDeploymentAlias(deploymentId: string, alias: string) {
    this.aliasAssigns += 1;
    const result = await this.request("POST", `/v2/deployments/${encodeURIComponent(deploymentId)}/aliases`, {
      alias,
    });
    return {
      ok: result.ok || result.status === 409,
      status: result.status,
      alias: asString(asRecord(result.json).alias) ?? alias,
      safeError: result.status === 409 ? null : result.safeError,
    };
  }

  async promoteDeployment(projectId: string, deploymentId: string) {
    this.aliasAssigns += 1;
    const result = await this.request(
      "POST",
      `/v10/projects/${encodeURIComponent(projectId)}/promote/${encodeURIComponent(deploymentId)}`,
    );
    return {
      ok: result.ok || result.status === 409,
      status: result.status,
      safeError: result.status === 409 ? null : result.safeError,
    };
  }

  async upsertProjectEnv(input: { projectId: string; key: string; value: string; target?: string[] }) {
    this.envUpserts += 1;
    const listed = await this.request("GET", `/v9/projects/${encodeURIComponent(input.projectId)}/env`);
    const raw = asRecord(listed.json).envs;
    const envs = Array.isArray(raw) ? raw.map(asRecord) : [];
    const existing = envs.find((row) => asString(row.key) === input.key);
    const target = input.target ?? ["production"];
    if (existing && asString(existing.id)) {
      const patched = await this.request(
        "PATCH",
        `/v9/projects/${encodeURIComponent(input.projectId)}/env/${encodeURIComponent(asString(existing.id)!)}`,
        { value: input.value, type: "encrypted", target },
      );
      return { ok: patched.ok, status: patched.status, action: "updated" as const, safeError: patched.safeError };
    }
    const created = await this.request("POST", `/v10/projects/${encodeURIComponent(input.projectId)}/env`, {
      key: input.key,
      value: input.value,
      type: "encrypted",
      target,
    });
    return {
      ok: created.ok || created.status === 409,
      status: created.status,
      action: "created" as const,
      safeError: created.status === 409 ? null : created.safeError,
    };
  }

  async getDeployment(id: string) {
    const result = await this.request("GET", `/v13/deployments/${encodeURIComponent(id)}`);
    const body = asRecord(result.json);
    const project = asRecord(body.project);
    const aliases = Array.isArray(body.alias)
      ? body.alias.filter((row): row is string => typeof row === "string")
      : [];
    return {
      ok: result.ok,
      status: result.status,
      id: asString(body.id) ?? id,
      projectId: asString(body.projectId) ?? asString(project.id) ?? "UNKNOWN",
      name: asString(body.name) ?? asString(project.name) ?? "UNKNOWN",
      url: asString(body.url) ?? "UNKNOWN",
      readyState: asString(body.readyState) ?? (result.status === 404 ? "MISSING" : "UNKNOWN"),
      aliases,
      safeError: result.safeError,
    };
  }

  async getAlias(alias: string) {
    const result = await this.request("GET", `/v2/aliases/${encodeURIComponent(alias)}`);
    const body = asRecord(result.json);
    return {
      ok: result.ok,
      status: result.status,
      alias: asString(body.alias) ?? alias,
      deploymentId: asString(body.deploymentId) ?? "NONE",
      projectId: asString(body.projectId) ?? "UNKNOWN",
      safeError: result.safeError,
    };
  }

  async ensureProjectDomain(input: {
    project: string;
    domain: string;
    redirect?: string;
  }): Promise<{
    ok: boolean;
    alreadyPresent: boolean;
    status: number;
    verified: boolean | "UNKNOWN";
    verification: VercelRequiredDnsRecord[];
    safeError: string | null;
  }> {
    const existing = await this.getProjectDomain(input.project, input.domain);
    if (existing.ok) {
      if (input.redirect && existing.redirect !== input.redirect) {
        const patched = await this.request("PATCH", `/v9/projects/${encodeURIComponent(input.project)}/domains/${encodeURIComponent(input.domain)}`, {
          redirect: input.redirect,
          redirectStatusCode: 308,
        });
        return {
          ok: patched.ok,
          alreadyPresent: true,
          status: patched.status,
          verified: existing.verified,
          verification: existing.verification,
          safeError: patched.safeError,
        };
      }
      return {
        ok: true,
        alreadyPresent: true,
        status: existing.status,
        verified: existing.verified,
        verification: existing.verification,
        safeError: null,
      };
    }
    return this.addProjectDomain(input);
  }

  async addProjectDomain(input: {
    project: string;
    domain: string;
    redirect?: string;
  }): Promise<{
    ok: boolean;
    alreadyPresent: boolean;
    status: number;
    verified: boolean | "UNKNOWN";
    verification: VercelRequiredDnsRecord[];
    safeError: string | null;
  }> {
    this.domainPosts += 1;
    const result = await this.request("POST", `/v10/projects/${encodeURIComponent(input.project)}/domains`, {
      name: input.domain,
      ...(input.redirect ? { redirect: input.redirect, redirectStatusCode: 308 } : {}),
    });
    const alreadyPresent = result.status === 409;
    const body = asRecord(result.json);
    return {
      ok: result.ok || alreadyPresent,
      alreadyPresent,
      status: result.status,
      verified: typeof body.verified === "boolean" ? body.verified : "UNKNOWN",
      verification: parseVerification(body.verification ?? asRecord(body.domain).verification, input.domain),
      safeError: alreadyPresent ? null : result.safeError,
    };
  }

  async getProjectDomain(project: string, domain: string) {
    const result = await this.request("GET", `/v9/projects/${encodeURIComponent(project)}/domains/${encodeURIComponent(domain)}`);
    const body = asRecord(result.json);
    return {
      ok: result.ok,
      status: result.status,
      name: asString(body.name) ?? domain,
      verified: body.verified === true,
      redirect: asString(body.redirect),
      verification: parseVerification(body.verification, domain),
      safeError: result.safeError,
    };
  }

  async getDomainConfig(domain: string): Promise<{
    ok: boolean;
    status: number;
    misconfigured: boolean | "UNKNOWN";
    records: VercelRequiredDnsRecord[];
    safeError: string | null;
  }> {
    const result = await this.request("GET", `/v6/domains/${encodeURIComponent(domain)}/config`);
    const body = asRecord(result.json);
    return {
      ok: result.ok,
      status: result.status,
      misconfigured: typeof body.misconfigured === "boolean" ? body.misconfigured : "UNKNOWN",
      records: parseConfigRecords(body, domain),
      safeError: result.safeError,
    };
  }
}

function parseVerification(value: unknown, domain: string): VercelRequiredDnsRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const item = asRecord(row);
    const type = String(item.type ?? "").toUpperCase();
    const content = asString(item.value);
    const name = asString(item.domain) ?? domain;
    if ((type === "TXT" || type === "CNAME") && content) {
      return [{ type: type as "TXT" | "CNAME", name, content, purpose: "VERIFICATION" as const }];
    }
    return [];
  });
}

function parseConfigRecords(body: Json, domain: string): VercelRequiredDnsRecord[] {
  const records: VercelRequiredDnsRecord[] = [];
  const cnames = Array.isArray(body.recommendedCNAME) ? body.recommendedCNAME : [];
  const ipv4 = Array.isArray(body.recommendedIPv4) ? body.recommendedIPv4 : [];
  const ipv6 = Array.isArray(body.recommendedIPv6) ? body.recommendedIPv6 : [];
  for (const row of cnames) {
    const content = asString(asRecord(row).value) ?? asString(row);
    if (content) records.push({ type: "CNAME", name: domain, content, purpose: "ROUTING" });
  }
  for (const row of ipv4) {
    const content = asString(asRecord(row).value) ?? asString(row);
    if (content) records.push({ type: "A", name: domain, content, purpose: "ROUTING" });
  }
  for (const row of ipv6) {
    const content = asString(asRecord(row).value) ?? asString(row);
    if (content) records.push({ type: "AAAA", name: domain, content, purpose: "ROUTING" });
  }
  if (records.length === 0 && Array.isArray(body.cnames)) {
    for (const row of body.cnames) {
      const content = asString(row);
      if (content) records.push({ type: "CNAME", name: domain, content, purpose: "ROUTING" });
    }
  }
  if (records.length === 0 && Array.isArray(body.aValues)) {
    for (const row of body.aValues) {
      const content = asString(row);
      if (content) records.push({ type: "A", name: domain, content, purpose: "ROUTING" });
    }
  }
  return records;
}
