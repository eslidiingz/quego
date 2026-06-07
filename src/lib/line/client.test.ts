import { describe, it, expect } from "vitest";
import { classifyLineErrorStatus } from "@/lib/line/client";

describe("classifyLineErrorStatus", () => {
  it("maps 429 to over_quota (the metered-drop case)", () => {
    expect(classifyLineErrorStatus(429)).toBe("over_quota");
  });

  it("maps 401/403 to invalid_token", () => {
    expect(classifyLineErrorStatus(401)).toBe("invalid_token");
    expect(classifyLineErrorStatus(403)).toBe("invalid_token");
  });

  it("maps 400 to bad_request", () => {
    expect(classifyLineErrorStatus(400)).toBe("bad_request");
  });

  it("maps any other status to unknown", () => {
    expect(classifyLineErrorStatus(500)).toBe("unknown");
    expect(classifyLineErrorStatus(502)).toBe("unknown");
    expect(classifyLineErrorStatus(200)).toBe("unknown");
  });
});
