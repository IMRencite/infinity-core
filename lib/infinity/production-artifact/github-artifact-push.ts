import type { ProductionArtifactFile } from "./types";

export type GithubFetch = (path: string, init?: RequestInit) => Promise<Response>;

export type ArtifactPushResult = {
  commitSha: string;
  branch: string;
  fileCount: number;
  artifactId: string;
  artifactHash: string;
};

export async function pushProductionArtifactToGithub(
  fetchFn: GithubFetch,
  input: {
    repositoryFullName: string;
    branch?: string;
    artifactId: string;
    artifactHash: string;
    files: ProductionArtifactFile[];
  },
): Promise<ArtifactPushResult> {
  const branch = input.branch ?? "main";
  const [owner, repo] = input.repositoryFullName.split("/");
  if (!owner || !repo) throw new Error("invalid_repository_full_name");

  const identityPath = "INFINITY_ARTIFACT_IDENTITY.json";
  const identityContent = JSON.stringify(
    {
      artifact_id: input.artifactId,
      content_hash: input.artifactHash,
      file_count: input.files.length,
    },
    null,
    2,
  );

  const allFiles: ProductionArtifactFile[] = [
    ...input.files,
    {
      relativePath: identityPath,
      contentHash: "",
      byteSize: Buffer.byteLength(identityContent, "utf8"),
      fileMode: "100644",
      contentText: identityContent,
    },
  ];

  const refRes = await fetchFn(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  let baseSha: string | null = null;
  if (refRes.ok) {
    const refBody = (await refRes.json()) as { object: { sha: string } };
    baseSha = refBody.object.sha;
  }

  const treeEntries: Array<{ path: string; mode: string; type: "blob"; sha: string }> = [];
  for (const file of allFiles) {
    const blobRes = await fetchFn(`/repos/${owner}/${repo}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({
        content: file.contentText,
        encoding: "utf-8",
      }),
    });
    if (!blobRes.ok) throw new Error(`github_blob_failed:${file.relativePath}`);
    const blob = (await blobRes.json()) as { sha: string };
    treeEntries.push({
      path: file.relativePath,
      mode: file.fileMode || "100644",
      type: "blob",
      sha: blob.sha,
    });
  }

  const treeRes = await fetchFn(`/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      tree: treeEntries,
      ...(baseSha ? { base_tree: baseSha } : {}),
    }),
  });
  if (!treeRes.ok) throw new Error("github_tree_failed");
  const tree = (await treeRes.json()) as { sha: string };

  const commitRes = await fetchFn(`/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: `Infinity production artifact ${input.artifactId}`,
      tree: tree.sha,
      ...(baseSha ? { parents: [baseSha] } : {}),
    }),
  });
  if (!commitRes.ok) throw new Error("github_commit_failed");
  const commit = (await commitRes.json()) as { sha: string };

  if (baseSha) {
    const updateRef = await fetchFn(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: true }),
    });
    if (!updateRef.ok) throw new Error("github_ref_update_failed");
  } else {
    const createRef = await fetchFn(`/repos/${owner}/${repo}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }),
    });
    if (!createRef.ok) throw new Error("github_ref_create_failed");
  }

  return {
    commitSha: commit.sha,
    branch,
    fileCount: allFiles.length,
    artifactId: input.artifactId,
    artifactHash: input.artifactHash,
  };
}

export async function verifyGithubTreeAgainstManifest(
  fetchFn: GithubFetch,
  input: {
    repositoryFullName: string;
    commitSha: string;
    expectedFileCount: number;
    criticalPaths: string[];
    prohibitedPaths?: string[];
  },
): Promise<{ verified: boolean; details: string[] }> {
  const [owner, repo] = input.repositoryFullName.split("/");
  const details: string[] = [];
  const treeRes = await fetchFn(`/repos/${owner}/${repo}/git/commits/${input.commitSha}`);
  if (!treeRes.ok) {
    return { verified: false, details: ["commit_not_found"] };
  }
  const commit = (await treeRes.json()) as { tree: { sha: string } };
  const walk = async (treeSha: string): Promise<string[]> => {
    const res = await fetchFn(`/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`);
    if (!res.ok) return [];
    const body = (await res.json()) as { tree: Array<{ path: string; type: string }> };
    return body.tree.filter((t) => t.type === "blob").map((t) => t.path);
  };
  const paths = await walk(commit.tree.sha);
  if (paths.length < input.expectedFileCount) {
    details.push("file_count_below_expected");
  }
  for (const critical of input.criticalPaths) {
    if (!paths.includes(critical)) details.push(`missing_critical:${critical}`);
  }
  for (const prohibited of input.prohibitedPaths ?? []) {
    if (paths.some((p) => p === prohibited || p.endsWith(prohibited))) {
      details.push(`prohibited_present:${prohibited}`);
    }
  }
  return { verified: details.length === 0, details };
}
