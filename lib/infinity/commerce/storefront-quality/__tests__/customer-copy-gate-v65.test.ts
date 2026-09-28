import { describe, expect, it } from "vitest";
import { evaluateCustomerCopyGate } from "../customer-copy-gate";
import { composeClubThrottleStorefrontFiles } from "../../club-throttle-storefront-compose";

describe("CustomerCopyGate", () => {
  it("fails founder-observed operator and test language", () => {
    expect(evaluateCustomerCopyGate("1 product ready to review").result).toBe("FAIL");
    expect(evaluateCustomerCopyGate("Checkout is not open").result).toBe("FAIL");
    expect(evaluateCustomerCopyGate("Color on the floor today").result).toBe("FAIL");
    expect(evaluateCustomerCopyGate("when more garments land").result).toBe("FAIL");
    expect(evaluateCustomerCopyGate("Black · review only").result).toBe("FAIL");
  });

  it("passes composed Club Throttle customer pages", () => {
    const composed = composeClubThrottleStorefrontFiles();
    const pages = composed.files
      .filter((file) => file.path.endsWith("page.tsx") || file.path.endsWith("header.tsx"))
      .map((file) => file.content)
      .join("\n");
    expect(evaluateCustomerCopyGate(pages).result).toBe("PASS");
  });
});
