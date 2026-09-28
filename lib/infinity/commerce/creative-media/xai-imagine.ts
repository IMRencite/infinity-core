import { creativeProviderPresence, routeCreativeProvider, type CreativeIntent } from "./creative-provider-router";
import { classifyXaiImaginePresence, XAI_IMAGINE_PREFERRED_MODEL } from "./xai-imagine-adapter";

export { classifyXaiImaginePresence, XAI_IMAGINE_PREFERRED_MODEL } from "./xai-imagine-adapter";

export function classifyXaiImagineCapability(env: NodeJS.Dict<string> = process.env): {
  xai_text_key: "PRESENT" | "ABSENT";
  imagine_image: "PASS" | "NOT_PROVEN";
  reason: string;
  model: string;
  adapter: "PRESENT";
} {
  const presence = classifyXaiImaginePresence(env);
  if (presence.credential === "ABSENT") {
    return { xai_text_key: "ABSENT", imagine_image: "NOT_PROVEN", reason: "XAI_KEY_ABSENT", model: XAI_IMAGINE_PREFERRED_MODEL, adapter: "PRESENT" };
  }
  return {
    xai_text_key: "PRESENT",
    imagine_image: "NOT_PROVEN",
    reason: "XAI_IMAGE_ADAPTER_READY_RUNTIME_PROOF_REQUIRED",
    model: XAI_IMAGINE_PREFERRED_MODEL,
    adapter: "PRESENT",
  };
}

export function routeClubThrottleCreative(env: NodeJS.Dict<string> = process.env): {
  intent: CreativeIntent;
  provider: "XAI_IMAGINE" | "OPENAI_IMAGE" | "VISUAL_ASSET_BLOCKED";
  xai_imagine: "PRIMARY" | "NOT_PROVEN" | "ABSENT";
} {
  const configured = creativeProviderPresence(env);
  const routed = routeCreativeProvider({ intent: "CLUB_THROTTLE_APPAREL", configured });
  return {
    intent: "CLUB_THROTTLE_APPAREL",
    provider: routed.provider === "XAI_IMAGINE" || routed.provider === "OPENAI_IMAGE" || routed.provider === "VISUAL_ASSET_BLOCKED"
      ? routed.provider
      : "VISUAL_ASSET_BLOCKED",
    xai_imagine: configured.XAI_IMAGINE === "PRESENT" ? "PRIMARY" : "ABSENT",
  };
}
