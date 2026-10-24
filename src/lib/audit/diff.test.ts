import { describe, expect, it } from "vitest";
import { diffFields } from "./diff";

describe("diffFields — audit L6", () => {
  it("records only changed fields with their old and new values", () => {
    expect(
      diffFields(
        { owner_phone: "0811111111", name: "ร้าน A" },
        { owner_phone: "0822222222", name: "ร้าน A" },
      ),
    ).toEqual({ owner_phone: { from: "0811111111", to: "0822222222" } });
  });

  it("treats empty string and null as the same value", () => {
    expect(diffFields({ owner_email: null }, { owner_email: "" })).toEqual({});
    expect(diffFields({ owner_email: "" }, { owner_email: "a@b.co" })).toEqual({
      owner_email: { from: null, to: "a@b.co" },
    });
  });
});
