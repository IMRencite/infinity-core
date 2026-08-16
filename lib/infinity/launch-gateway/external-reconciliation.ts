import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import {
  GITHUB_TOKEN_ENV,
  VERCEL_TEAM_ID_ENV,
  VERCEL_TOKEN_ENV,
} from "./provider-config";

function normalizeGitHubRepoRef(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https:\/\/github\.com\//, "")
    .replace(/\.git$/, "");
}

export type ExternalResourceReconciliation = {
  github: {
    mode: "REUSE" | "CREATE_REQUIRED" | "BLOCKED";
    repositoryFullName: string | null;
    repoSlug: string | null;
  };
  vercel: {
    mode: "REUSE" | "CREATE_REQUIRED" | "BLOCKED";
    projectId: string | null;
    projectName: string | null;
    gitLinked: boolean | null;
    linkedRepository: string | null;
  };
  linkage: "PASS" | "FAIL" | "NOT_REQUIRED" | "UNKNOWN";
  blockers: string[];
};

async function vercelGet(path: string): Promise<Response | null> {
  const token = process.env[VERCEL_TOKEN_ENV];
  if (!token) return null;
  const teamId = process.env[VERCEL_TEAM_ID_ENV];
  const url = teamId
    ? `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${teamId}`
    : `https://api.vercel.com${path}`;
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
}

export async function reconcileExternalResourcesReadOnly(input: {
  repositoryFullName?: string | null;
  projectName?: string | null;
}): Promise<ExternalResourceReconciliation> {
  const blockers: string[] = [];
  const repositoryFullName = input.repositoryFullName ?? null;
  let repoSlug: string | null = null;
  if (repositoryFullName) {
    const parts = repositoryFullName.split("/");
    repoSlug = parts.length === 2 ? parts[1]! : null;
  }

  let projectId: string | null = null;
  let projectName = input.projectName ?? null;
  let gitLinked: boolean | null = null;
  let linkedRepository: string | null = null;

  if (projectName) {
    const res = await vercelGet(`/v9/projects/${encodeURIComponent(projectName)}`);
    if (res?.ok) {
      const body = (await res.json()) as {
        id?: string;
        name?: string;
        link?: { type?: string; repo?: string; org?: string };
      };
      projectId = body.id ?? null;
      projectName = body.name ?? projectName;
      if (body.link?.org && body.link?.repo) {
        gitLinked = true;
        linkedRepository = `${body.link.org}/${body.link.repo}`;
      } else if (body.link?.repo) {
        gitLinked = true;
        linkedRepository = body.link.repo;
      } else {
        gitLinked = false;
      }
    }
  }

  const githubMode = repositoryFullName ? "REUSE" : "CREATE_REQUIRED";
  const vercelMode = projectId ? "REUSE" : projectName ? "CREATE_REQUIRED" : "CREATE_REQUIRED";

  let linkage: ExternalResourceReconciliation["linkage"] = "NOT_REQUIRED";
  if (repositoryFullName && projectId) {
    const expected = normalizeGitHubRepoRef(repositoryFullName);
    const linked = linkedRepository ? normalizeGitHubRepoRef(linkedRepository) : "";
    if (gitLinked === true && linked === expected) {
      linkage = "PASS";
    } else if (gitLinked === false) {
      linkage = "FAIL";
      blockers.push("vercel_project_missing_github_link");
    } else {
      linkage = "UNKNOWN";
    }
  }

  const ghToken = process.env[GITHUB_TOKEN_ENV];
  if (repositoryFullName && ghToken) {
    const rr = await fetch(`https://api.github.com/repos/${repositoryFullName}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${ghToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!rr.ok) {
      blockers.push("github_repository_not_found_readonly");
    }
  }

  return {
    github: { mode: githubMode, repositoryFullName, repoSlug },
    vercel: { mode: vercelMode, projectId, projectName, gitLinked, linkedRepository },
    linkage,
    blockers,
  };
}

export async function resolveRetry2ReconciliationFromDb(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<{
  repositoryFullName: string | null;
  projectName: string | null;
  priorAssemblyId: string | null;
}> {
  const { data: link } = await admin
    .from("launch_handoff_links")
    .select("repository_full_name, venture_assembly_id")
    .eq("organization_id", organizationId)
    .eq("link_type", "repository_push")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const repositoryFullName = link?.repository_full_name ?? null;
  let projectName: string | null = null;
  if (link?.venture_assembly_id) {
    const { data: actions } = await admin
      .from("external_actions")
      .select("target")
      .eq("organization_id", organizationId)
      .eq("venture_assembly_id", link.venture_assembly_id)
      .eq("action_type", "hosting.create_project")
      .in("execution_status", ["succeeded", "failed"])
      .limit(1);
    projectName = actions?.[0]?.target ?? null;
  }

  return {
    repositoryFullName,
    projectName,
    priorAssemblyId: link?.venture_assembly_id ?? null,
  };
}
