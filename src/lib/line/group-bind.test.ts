import { describe, it, expect } from "vitest";

import {
  buildGroupBindConfirmFlex,
  GROUP_BIND_CONFIRM_DATA,
  GROUP_BIND_KEEP_DATA,
  parseGroupBindPostback,
} from "./group-bind";

describe("parseGroupBindPostback", () => {
  it("round-trips the data the confirm bubble emits", () => {
    expect(parseGroupBindPostback(GROUP_BIND_CONFIRM_DATA)).toBe("confirm");
    expect(parseGroupBindPostback(GROUP_BIND_KEEP_DATA)).toBe("keep");
  });

  it("returns null for booking postbacks and junk", () => {
    expect(parseGroupBindPostback("act=cancel&b=x")).toBeNull();
    expect(parseGroupBindPostback("")).toBeNull();
  });
});

describe("buildGroupBindConfirmFlex", () => {
  it("is a flex message naming the shop, with both postback buttons", () => {
    const m = buildGroupBindConfirmFlex("ร้านทดสอบ");
    expect(m.type).toBe("flex");
    expect(m.altText).toContain("ร้านทดสอบ");
    const json = JSON.stringify(m.contents);
    expect(json).toContain(GROUP_BIND_CONFIRM_DATA);
    expect(json).toContain(GROUP_BIND_KEEP_DATA);
  });
});
