import { describe, expect, it } from "vitest";
import { mapPasswordUpdateError } from "../password-recovery";

describe("mapPasswordUpdateError", () => {
  it("maps same-password errors to a clear reuse message", () => {
    expect(mapPasswordUpdateError("New password should be different from the old password.")).toBe(
      "Please choose a new password that is different from your current password.",
    );
    expect(mapPasswordUpdateError("AuthApiError: same_password")).toContain("different from your current password");
  });

  it("does not map same-password errors to expired link copy", () => {
    const msg = mapPasswordUpdateError("New password should be different from the old password.");
    expect(msg).not.toMatch(/expired|invalid reset link/i);
  });
});
