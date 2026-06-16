import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildWaitlistBookUrl,
  buildWaitlistSlotOpenFlex,
  type WaitlistSlotOpenFlexInput,
} from "@/lib/line/waitlist-flex";
import { formatBookingDate } from "@/lib/line/format";

// Minimal structural view of the flex-bubble parts the tests inspect — lets us
// traverse the LINE flex JSON without `any` (cast through `unknown`).
type FlexAction = { type: string; label: string; uri: string };
type FlexNode = { type: string; contents: FlexNode[]; action: FlexAction };
type FlexBubble = { type: string; footer: FlexNode };

/** Pull the single footer button out of the slot-open bubble. */
function footerButton(
  msg: ReturnType<typeof buildWaitlistSlotOpenFlex>,
): FlexNode {
  return (msg.contents as unknown as FlexBubble).footer.contents[0];
}

const base: WaitlistSlotOpenFlexInput = {
  shopId: "shop-123",
  shopName: "ร้านตัดผมโจ",
  serviceName: "ตัดผมชาย",
  serviceId: "svc-789",
  preferredStaffId: null,
  date: "2026-06-15",
};

describe("buildWaitlistBookUrl", () => {
  // Pin a known origin so URL assertions are stable; the shell env can't leak in.
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://quego.app");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "");
    vi.stubEnv("VERCEL_URL", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("points the path at /shops/{shopId}/book", () => {
    const url = buildWaitlistBookUrl(base);
    expect(new URL(url).pathname).toBe("/shops/shop-123/book");
  });

  it("includes serviceId + date but NO staffId when preferredStaffId is null", () => {
    const url = buildWaitlistBookUrl({ ...base, preferredStaffId: null });
    const params = new URL(url).searchParams;
    expect(params.get("serviceId")).toBe("svc-789");
    expect(params.get("date")).toBe("2026-06-15");
    expect(params.has("staffId")).toBe(false);
  });

  it("adds staffId when preferredStaffId is set", () => {
    const url = buildWaitlistBookUrl({ ...base, preferredStaffId: "staff-42" });
    const params = new URL(url).searchParams;
    expect(params.get("serviceId")).toBe("svc-789");
    expect(params.get("date")).toBe("2026-06-15");
    expect(params.get("staffId")).toBe("staff-42");
  });
});

describe("buildWaitlistSlotOpenFlex", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://quego.app");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "");
    vi.stubEnv("VERCEL_URL", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a flex bubble", () => {
    const msg = buildWaitlistSlotOpenFlex(base);
    expect(msg.type).toBe("flex");
    expect((msg.contents as unknown as FlexBubble).type).toBe("bubble");
  });

  it("carries the shop, service, formatted date and book URL in altText", () => {
    const msg = buildWaitlistSlotOpenFlex(base);
    expect(msg.altText).toContain("🔔 มีคิวว่างแล้ว!");
    expect(msg.altText).toContain(base.shopName);
    expect(msg.altText).toContain(base.serviceName);
    expect(msg.altText).toContain(formatBookingDate(base.date));
    expect(msg.altText).toContain(buildWaitlistBookUrl(base));
  });

  it("footer button is a 📅 จองเลย URI whose uri EQUALS buildWaitlistBookUrl (key invariant)", () => {
    const msg = buildWaitlistSlotOpenFlex(base);
    const button = footerButton(msg);
    expect(button.action.type).toBe("uri");
    expect(button.action.label).toBe("📅 จองเลย");
    expect(button.action.uri).toBe(buildWaitlistBookUrl(base));
  });

  it("keeps the footer uri and book URL in agreement when a staff is preferred", () => {
    const input = { ...base, preferredStaffId: "staff-42" };
    const button = footerButton(buildWaitlistSlotOpenFlex(input));
    expect(button.action.uri).toBe(buildWaitlistBookUrl(input));
    expect(new URL(button.action.uri).searchParams.get("staffId")).toBe(
      "staff-42",
    );
  });
});
