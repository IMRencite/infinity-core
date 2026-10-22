import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadGelatoConfig } from "../commercialization/providers/gelato/config.ts";
import { GELATO_ECOMMERCE_API } from "../commercialization/providers/gelato/ecommerce-preflight.ts";
import { GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID } from "../commercialization/providers/gelato/founder-templates.ts";
import { CLUB_THROTTLE_GELATO_STORE_ID } from "../commercialization/providers/gelato/lot-line-capability-probe-v2-plan.ts";
import { loadServerEnvFromLocalFile } from "../communication-provider/load-local-env.ts";
import { CLUB_THROTTLE_SEVEN_SHIRT_MERCH } from "./club-throttle-canonical-seven-shirt-catalog.ts";
import {
  CLUB_THROTTLE_GELATO_WHITE_TEMPLATE_VARIANT_IDS,
  CLUB_THROTTLE_LAUNCH_SIZE_PROFILE,
} from "./club-throttle-launch-size-profile.ts";
import { auditCanonicalSevenGelatoVariants, fetchGelatoStoreProduct } from "./club-throttle-gelato-variant-audit.ts";
import { CANONICAL_BACK_PLACEHOLDER_NAME } from "./lot-line-candidate3-canonical-slot-probe-execute.ts";
import {
  CLUB_THROTTLE_VARIANT_BINDINGS_REL,
  type GelatoVariantBinding,
} from "./club-throttle-variant-bindings-path.ts";

export const CLUB_THROTTLE_VARIANT_REPLACEMENT_RUN_REL =
  ".infinity/commerce/club-throttle-variant-complete-replacement-run.json" as const;

const BLANK_FRONT_URL =
  "https://club-throttle-3l1ct73vp-infinite-media-resources-imr.vercel.app/commerce-probe-gelato/blank-front-300dpi.png";
const BLANK_TAG_URL =
  "https://club-throttle-3l1ct73vp-infinite-media-resources-imr.vercel.app/commerce-probe-gelato/blank-tag-300dpi.png";

async function verifyUrl(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.status;
  } catch {
    return 0;
  }
}

export async function createMultiSizeHiddenGelatoProduct(input: {
  title: string;
  description: string;
  backUrl: string;
}): Promise<{ productId: string | null; http: number; error: string | null }> {
  const config = loadGelatoConfig();
  if (!config.credentials) throw new Error("GELATO_CREDENTIALS_MISSING");
  const variants = CLUB_THROTTLE_LAUNCH_SIZE_PROFILE.checkout_sizes.map((size) => ({
    templateVariantId: CLUB_THROTTLE_GELATO_WHITE_TEMPLATE_VARIANT_IDS[size],
    imagePlaceholders: [
      { name: "front_art.png", fileUrl: BLANK_FRONT_URL, fitMethod: "meet" },
      { name: CANONICAL_BACK_PLACEHOLDER_NAME, fileUrl: input.backUrl, fitMethod: "meet" },
      { name: "tag-art.png", fileUrl: BLANK_TAG_URL, fitMethod: "meet" },
    ],
  }));
  const createBody = {
    templateId: GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID,
    title: input.title,
    description: input.description,
    isVisibleInTheOnlineStore: false,
    variants,
  };
  const createUrl = `${GELATO_ECOMMERCE_API}/v1/stores/${encodeURIComponent(CLUB_THROTTLE_GELATO_STORE_ID)}/products:create-from-template`;
  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: {
      "X-API-KEY": config.credentials.headerValue(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createBody),
  });
  const createJson = (await createRes.json().catch(() => null)) as Record<string, unknown> | null;
  const err = createRes.ok
    ? null
    : typeof createJson?.message === "string"
      ? createJson.message
      : JSON.stringify(createJson ?? { status: createRes.status }).slice(0, 800);
  return {
    productId: createJson?.id != null ? String(createJson.id) : null,
    http: createRes.status,
    error: err,
  };
}

export async function runClubThrottleVariantCompleteReplacements(input: {
  cwd?: string;
  gelatoWritesAuthorized: boolean;
}): Promise<Record<string, unknown>> {
  const cwd = input.cwd ?? process.cwd();
  loadServerEnvFromLocalFile(cwd);

  const preAudit = await auditCanonicalSevenGelatoVariants(cwd);
  const frontStatus = await verifyUrl(BLANK_FRONT_URL);
  const tagStatus = await verifyUrl(BLANK_TAG_URL);

  const results: Record<string, unknown> = {};
  const bindings: GelatoVariantBinding[] = [];
  let writeCount = 0;

  for (const merch of CLUB_THROTTLE_SEVEN_SHIRT_MERCH) {
    const backUrl = merch.public_asset_url;
    const backStatus = await verifyUrl(backUrl);
    const rowBase = {
      sku: merch.sku,
      slug: merch.slug,
      old_gelato_product_id: merch.gelato_product_id,
      back_url_status: backStatus,
    };

    if (!input.gelatoWritesAuthorized) {
      results[merch.sku] = { ...rowBase, status: "SKIPPED_NO_GELATO_WRITE_AUTH" };
      continue;
    }
    if (backStatus !== 200) {
      results[merch.sku] = { ...rowBase, status: "BACK_URL_UNAVAILABLE" };
      continue;
    }
    if (frontStatus !== 200 || tagStatus !== 200) {
      results[merch.sku] = { ...rowBase, status: "BLANK_PLACEHOLDER_UNAVAILABLE", frontStatus, tagStatus };
      continue;
    }

    const created = await createMultiSizeHiddenGelatoProduct({
      title: `[HIDDEN] Club Throttle — ${merch.title} (multi-size)`,
      description:
        "Hidden variant-complete replacement — same founder-approved production art. Not visible in Gelato online store.",
      backUrl,
    });
    writeCount += 1;
    if (created.http !== 200 || !created.productId) {
      results[merch.sku] = { ...rowBase, status: "GELATO_CREATE_FAILED", http: created.http, error: created.error };
      continue;
    }

    const fetched = await fetchGelatoStoreProduct(created.productId);
    const variantsRaw = Array.isArray(fetched.json?.variants) ? (fetched.json!.variants as Record<string, unknown>[]) : [];
    const variantMap: GelatoVariantBinding["variants"] = {};
    for (const v of variantsRaw) {
      const title = typeof v.title === "string" ? v.title : "";
      const m = title.match(/^(.+?)\s-\s(.+?)\s-/i);
      const size = m ? m[2].trim().toUpperCase() : "";
      const color = m ? m[1].trim().toLowerCase() : "white";
      if (!size) continue;
      variantMap[size] = {
        variant_uid: String(v.id ?? ""),
        color,
        size,
      };
    }

    bindings.push({
      sku: merch.sku,
      gelato_product_id: created.productId,
      superseded_gelato_product_id: merch.gelato_product_id,
      variants: variantMap,
    });

    results[merch.sku] = {
      ...rowBase,
      status: "HIDDEN_MULTI_SIZE_CREATED",
      new_gelato_product_id: created.productId,
      old_product_status: "SUPERSEDED_LINEAGE_VARIANT_INCOMPLETE",
      variant_sizes: Object.keys(variantMap),
      create_http: created.http,
    };
  }

  const out = {
    generated_at: new Date().toISOString(),
    pre_audit_M_ONLY_BLOCKER: preAudit.M_ONLY_BLOCKER,
    gelato_writes: writeCount,
    blank_front_status: frontStatus,
    blank_tag_status: tagStatus,
    launch_sizes: CLUB_THROTTLE_LAUNCH_SIZE_PROFILE.checkout_sizes,
    results,
    bindings,
  };

  mkdirSync(join(cwd, ".infinity/commerce"), { recursive: true });
  writeFileSync(join(cwd, CLUB_THROTTLE_VARIANT_REPLACEMENT_RUN_REL), `${JSON.stringify(out, null, 2)}\n`);
  if (bindings.length === 7) {
    writeFileSync(
      join(cwd, CLUB_THROTTLE_VARIANT_BINDINGS_REL),
      `${JSON.stringify({ generated_at: out.generated_at, bindings, launch_sizes: CLUB_THROTTLE_LAUNCH_SIZE_PROFILE.checkout_sizes }, null, 2)}\n`,
    );
  }

  return out;
}

export function loadClubThrottleVariantBindings(cwd = process.cwd()): {
  bindings: GelatoVariantBinding[];
  launch_sizes: readonly string[];
} | null {
  const path = join(cwd, CLUB_THROTTLE_VARIANT_BINDINGS_REL);
  if (!existsSync(path)) return null;
  const parsed = JSON.parse(readFileSync(path, "utf8")) as {
    bindings?: GelatoVariantBinding[];
    launch_sizes?: string[];
  };
  if (!Array.isArray(parsed.bindings)) return null;
  return {
    bindings: parsed.bindings,
    launch_sizes: parsed.launch_sizes ?? CLUB_THROTTLE_LAUNCH_SIZE_PROFILE.checkout_sizes,
  };
}
