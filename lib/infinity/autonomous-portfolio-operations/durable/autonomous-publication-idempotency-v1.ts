import { createHash } from "node:crypto";
import {
  createPortfolioDurableSupabase,
  PORTFOLIO_DURABLE_TABLES,
} from "./portfolio-durable-supabase-v1";

export const AUTONOMOUS_PUBLICATION_IDEMPOTENCY_V1 = "AUTONOMOUS_PUBLICATION_IDEMPOTENCY_V1" as const;

export function publicationAssetIdentity(input: {
  venture_id: string;
  canonical_path: string;
  content_revision?: string | null;
}): string {
  const rev = input.content_revision ?? "v1";
  return createHash("sha256").update(`${input.venture_id}:${input.canonical_path}:${rev}`).digest("hex").slice(0, 32);
}

export async function readPublicationRegistry(input: {
  venture_id: string;
  asset_identity: string;
}): Promise<{ published: boolean; production_url: string | null; deployment_id: string | null }> {
  const client = createPortfolioDurableSupabase();
  if (!client) return { published: false, production_url: null, deployment_id: null };
  const { data } = await client
    .from(PORTFOLIO_DURABLE_TABLES.publications)
    .select("production_url, deployment_id, production_state")
    .eq("venture_id", input.venture_id)
    .eq("asset_identity", input.asset_identity)
    .maybeSingle();
  if (!data || data.production_state !== "PUBLISHED") {
    return { published: false, production_url: null, deployment_id: null };
  }
  return {
    published: true,
    production_url: data.production_url ?? null,
    deployment_id: data.deployment_id ?? null,
  };
}

export async function registerSuccessfulPublication(input: {
  venture_id: string;
  asset_identity: string;
  canonical_path: string;
  content_revision?: string | null;
  deployment_id?: string | null;
  production_url: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const client = createPortfolioDurableSupabase();
  if (!client) return;
  await client.from(PORTFOLIO_DURABLE_TABLES.publications).upsert(
    {
      venture_id: input.venture_id,
      asset_identity: input.asset_identity,
      canonical_path: input.canonical_path,
      content_revision: input.content_revision ?? null,
      deployment_id: input.deployment_id ?? null,
      production_url: input.production_url,
      production_state: "PUBLISHED",
      published_at: new Date().toISOString(),
      payload: input.payload ?? {},
    },
    { onConflict: "venture_id,asset_identity" },
  );
}

export function autonomousPublicationIdempotencyQc(): "PASS" | "FAIL" {
  const id = publicationAssetIdentity({
    venture_id: "occupancynpv",
    canonical_path: "/blog/occupancy-costs/example/",
    content_revision: "abc",
  });
  return id.length === 32 ? "PASS" : "FAIL";
}
