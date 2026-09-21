import { describe, expect, it } from "vitest";
import { COMMERCIAL_ACTIONS, parseCommercialAction } from "../doctrine";

describe("parseCommercialAction", () => {
  it("accepts every valid CommercialAction", () => {
    for (const action of COMMERCIAL_ACTIONS) {
      expect(parseCommercialAction(action)).toEqual({ ok: true, value: action, raw: action });
    }
  });

  it("rejects an unknown string", () => {
    expect(parseCommercialAction("LAUNCH_THE_MISSILES")).toEqual({
      ok: false,
      value: null,
      raw: "LAUNCH_THE_MISSILES",
      reason: "UNKNOWN_COMMERCIAL_ACTION",
    });
  });

  it("rejects an empty string", () => {
    expect(parseCommercialAction("")).toEqual({
      ok: false,
      value: null,
      raw: "",
      reason: "UNKNOWN_COMMERCIAL_ACTION",
    });
  });

  it("rejects null and undefined", () => {
    expect(parseCommercialAction(null).ok).toBe(false);
    expect(parseCommercialAction(undefined).ok).toBe(false);
    expect(parseCommercialAction(null).reason).toBe("UNKNOWN_COMMERCIAL_ACTION");
    expect(parseCommercialAction(undefined).reason).toBe("UNKNOWN_COMMERCIAL_ACTION");
  });

  it("rejects a legacy serialized non-action without promoting it", () => {
    expect(parseCommercialAction("POSITIVE_INTEREST")).toEqual({
      ok: false,
      value: null,
      raw: "POSITIVE_INTEREST",
      reason: "UNKNOWN_COMMERCIAL_ACTION",
    });
  });
});
