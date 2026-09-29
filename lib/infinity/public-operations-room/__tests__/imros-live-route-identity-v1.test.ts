import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PUBLIC_IMROS_PROJECT } from "@/lib/infinity/hq-production-deployment/contract";

describe("IMROS public operations route identity", () => {
  it("serves LiveOperationsRoom on /public/operations-room", () => {
    const page = readFileSync(join(process.cwd(), "app/public/operations-room/page.tsx"), "utf8");
    expect(page).toContain("CanonicalPublicOperationsExperience");
    const canonical = readFileSync(
      join(process.cwd(), "components/public/operations-room/canonical-public-operations-experience.tsx"),
      "utf8",
    );
    expect(canonical).toContain("LiveOperationsRoom");
    const live = readFileSync(join(process.cwd(), "components/public/operations-room/live-operations-room.tsx"), "utf8");
    expect(live).toContain("trailingBrand={<ImrBrandMark />}");
    expect(PUBLIC_IMROS_PROJECT).toBe("imros-public");
  });
});
