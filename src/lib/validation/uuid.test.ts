import { describe, it, expect } from "vitest";
import { isUuid } from "./uuid";

describe("isUuid", () => {
  it("accepts canonical lowercase UUIDs", () => {
    expect(isUuid("061ababe-d581-4dce-a6e9-d0f1b40f3de9")).toBe(true);
  });

  it("accepts uppercase UUIDs (case-insensitive)", () => {
    expect(isUuid("061ABABE-D581-4DCE-A6E9-D0F1B40F3DE9")).toBe(true);
  });

  it("rejects a custom handle that is not UUID-shaped", () => {
    expect(isUuid("tukta-salon")).toBe(false);
    expect(isUuid("hair-cut-061aba")).toBe(false);
  });

  it("rejects malformed or partial UUIDs", () => {
    expect(isUuid("061ababe-d581-4dce-a6e9")).toBe(false); // too short
    expect(isUuid("061ababe-d581-4dce-a6e9-d0f1b40f3de9-extra")).toBe(false);
    expect(isUuid("zzzzzzzz-d581-4dce-a6e9-d0f1b40f3de9")).toBe(false); // non-hex
    expect(isUuid("")).toBe(false);
  });
});
