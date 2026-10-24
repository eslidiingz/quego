import { afterEach, describe, expect, it, vi } from "vitest";
import { DB_FAILURE_MESSAGE, dbFailure } from "./db-error";

describe("dbFailure — audit L1", () => {
  afterEach(() => vi.restoreAllMocks());

  it("never returns the raw Postgres message, but logs it", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const raw = {
      message: 'duplicate key value violates unique constraint "shop_staff_pkey"',
      code: "23505",
    };
    const result = dbFailure("staff", raw);
    expect(result).toEqual({ ok: false, code: "unknown", message: DB_FAILURE_MESSAGE });
    expect(result.message).not.toContain("constraint");
    expect(log).toHaveBeenCalledWith("[staff] db error:", raw);
  });
});
