import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getLineChannelSecret,
  getLineChannelAccessToken,
  getLineOaBasicId,
  getLineLoginChannelId,
  getLineLoginChannelSecret,
} from "@/lib/line/config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getLineChannelSecret", () => {
  it("returns the LINE_CHANNEL_SECRET value when set", () => {
    vi.stubEnv("LINE_CHANNEL_SECRET", "secret-abc");
    expect(getLineChannelSecret()).toBe("secret-abc");
  });

  it("throws naming LINE_CHANNEL_SECRET when unset", () => {
    vi.stubEnv("LINE_CHANNEL_SECRET", "");
    expect(() => getLineChannelSecret()).toThrow(
      "Missing LINE_CHANNEL_SECRET",
    );
  });
});

describe("getLineChannelAccessToken", () => {
  it("returns the LINE_CHANNEL_ACCESS_TOKEN value when set", () => {
    vi.stubEnv("LINE_CHANNEL_ACCESS_TOKEN", "token-xyz");
    expect(getLineChannelAccessToken()).toBe("token-xyz");
  });

  it("throws naming LINE_CHANNEL_ACCESS_TOKEN when unset", () => {
    vi.stubEnv("LINE_CHANNEL_ACCESS_TOKEN", "");
    expect(() => getLineChannelAccessToken()).toThrow(
      "Missing LINE_CHANNEL_ACCESS_TOKEN",
    );
  });
});

describe("getLineOaBasicId", () => {
  it("returns the NEXT_PUBLIC_LINE_OA_BASIC_ID value when set", () => {
    vi.stubEnv("NEXT_PUBLIC_LINE_OA_BASIC_ID", "@quego");
    expect(getLineOaBasicId()).toBe("@quego");
  });

  it("throws naming NEXT_PUBLIC_LINE_OA_BASIC_ID when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_LINE_OA_BASIC_ID", "");
    expect(() => getLineOaBasicId()).toThrow(
      "Missing NEXT_PUBLIC_LINE_OA_BASIC_ID",
    );
  });
});

describe("getLineLoginChannelId", () => {
  it("returns the LINE_LOGIN_CHANNEL_ID value when set", () => {
    vi.stubEnv("LINE_LOGIN_CHANNEL_ID", "1234567890");
    expect(getLineLoginChannelId()).toBe("1234567890");
  });

  it("throws naming LINE_LOGIN_CHANNEL_ID when unset", () => {
    vi.stubEnv("LINE_LOGIN_CHANNEL_ID", "");
    expect(() => getLineLoginChannelId()).toThrow(
      "Missing LINE_LOGIN_CHANNEL_ID",
    );
  });
});

describe("getLineLoginChannelSecret", () => {
  it("returns the LINE_LOGIN_CHANNEL_SECRET value when set", () => {
    vi.stubEnv("LINE_LOGIN_CHANNEL_SECRET", "login-secret");
    expect(getLineLoginChannelSecret()).toBe("login-secret");
  });

  it("throws naming LINE_LOGIN_CHANNEL_SECRET when unset", () => {
    vi.stubEnv("LINE_LOGIN_CHANNEL_SECRET", "");
    expect(() => getLineLoginChannelSecret()).toThrow(
      "Missing LINE_LOGIN_CHANNEL_SECRET",
    );
  });
});
