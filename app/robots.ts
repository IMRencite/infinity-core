import type { MetadataRoute } from "next";
import { isHqProductionRuntime } from "@/lib/infinity/hq-production-deployment/surface";

export default function robots(): MetadataRoute.Robots {
  if (isHqProductionRuntime() || process.env.INFINITY_HQ_SURFACE === "1") {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }
  return {
    rules: [{ userAgent: "*", allow: "/" }],
  };
}
