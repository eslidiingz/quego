import { describe, it, expect } from "vitest";
import {
  generateLinkCode,
  parseLinkCommand,
  LINK_CODE_PREFIX,
} from "@/lib/line/link-code";

describe("generateLinkCode", () => {
  it("produces a LINK- prefixed 8-char code from the safe alphabet", () => {
    const code = generateLinkCode();
    expect(code).toMatch(/^LINK-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    expect(code.startsWith(LINK_CODE_PREFIX)).toBe(true);
  });

  it("never includes visually ambiguous characters (0 O 1 I L)", () => {
    for (let i = 0; i < 50; i += 1) {
      const body = generateLinkCode().slice(LINK_CODE_PREFIX.length);
      expect(body).not.toMatch(/[0O1IL]/);
    }
  });

  it("is effectively unique across many calls", () => {
    const codes = new Set(
      Array.from({ length: 200 }, () => generateLinkCode()),
    );
    expect(codes.size).toBeGreaterThan(190);
  });
});

describe("parseLinkCommand", () => {
  it("extracts a code embedded in Thai free text", () => {
    expect(parseLinkCommand("เชื่อมบัญชี LINK-AB23CD45 ครับ")).toBe(
      "LINK-AB23CD45",
    );
  });

  it("extracts a bare code", () => {
    expect(parseLinkCommand("LINK-AB23CD45")).toBe("LINK-AB23CD45");
  });

  it("normalizes lowercase to uppercase", () => {
    expect(parseLinkCommand("link-ab23cd45")).toBe("LINK-AB23CD45");
  });

  it("returns null when no valid code is present", () => {
    expect(parseLinkCommand("สวัสดีครับ")).toBeNull();
    expect(parseLinkCommand("")).toBeNull();
    expect(parseLinkCommand("LINK-")).toBeNull();
    expect(parseLinkCommand("LINK-SHORT")).toBeNull(); // too short + has O/L
  });
});
