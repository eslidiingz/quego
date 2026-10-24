import { describe, it, expect } from "vitest";

import { classifyLineTextCommand, shouldLogInboundMessage } from "./message-commands";

describe("classifyLineTextCommand — in a group/room (inGroup=true)", () => {
  it('routes "เชื่อมร้าน" to the bind command', () => {
    expect(classifyLineTextCommand("เชื่อมร้าน", true)).toBe("group_bind");
  });

  it('accepts the "เชื่อมต่อร้าน" bind alias', () => {
    expect(classifyLineTextCommand("เชื่อมต่อร้าน", true)).toBe("group_bind");
  });

  it('accepts the "/bind" slash command, case-insensitively', () => {
    expect(classifyLineTextCommand("/bind", true)).toBe("group_bind");
    expect(classifyLineTextCommand("/BIND", true)).toBe("group_bind");
  });

  it("ignores surrounding whitespace around the exact command", () => {
    expect(classifyLineTextCommand("  เชื่อมร้าน\n", true)).toBe("group_bind");
  });

  it("does NOT bind when the command is embedded in a longer sentence", () => {
    expect(classifyLineTextCommand("ช่วยเชื่อมร้านให้หน่อย", true)).toBe("none");
    expect(classifyLineTextCommand("เชื่อมร้าน ตอนนี้เลย", true)).toBe("none");
  });

  it('routes the exact unbind commands to group_unbind', () => {
    expect(classifyLineTextCommand("ยกเลิกเชื่อมร้าน", true)).toBe("group_unbind");
    expect(classifyLineTextCommand(" /UNBIND ", true)).toBe("group_unbind");
    expect(classifyLineTextCommand("จะยกเลิกเชื่อมร้านไหม", true)).toBe("none");
  });

  it('routes "/id" to the group-id echo', () => {
    expect(classifyLineTextCommand("/id", true)).toBe("group_id_echo");
    expect(classifyLineTextCommand("/ID", true)).toBe("group_id_echo");
  });

  it('accepts the "groupid" and "group id" echo aliases', () => {
    expect(classifyLineTextCommand("groupid", true)).toBe("group_id_echo");
    expect(classifyLineTextCommand("group id", true)).toBe("group_id_echo");
  });

  it("an exact bind command wins; a mixed sentence falls to the id echo", () => {
    expect(classifyLineTextCommand("/bind", true)).toBe("group_bind");
    expect(classifyLineTextCommand("/bind /id", true)).toBe("group_id_echo");
  });

  it("stays SILENT on normal chatter (the critical group guarantee)", () => {
    expect(classifyLineTextCommand("สวัสดีครับ", true)).toBe("none");
    expect(classifyLineTextCommand("คิวยาวไหม", true)).toBe("none");
    expect(classifyLineTextCommand("", true)).toBe("none");
  });

  it('never falls through to the 1:1 link hint — a bare "เชื่อม" is silent in a group', () => {
    // "เชื่อม" matches the looser 1:1 link pattern, but in a group the bot must
    // NOT reply (it would spam staff conversation). Only the explicit bind
    // command "เชื่อมร้าน" gets a reply.
    expect(classifyLineTextCommand("เชื่อมต่อไวไฟ", true)).toBe("none");
    expect(classifyLineTextCommand("link มาดูกัน", true)).toBe("none");
  });

  it('does not treat a bare "id" (no slash, no "group") as an echo command', () => {
    expect(classifyLineTextCommand("รหัส id ลูกค้า", true)).toBe("none");
  });
});

describe("classifyLineTextCommand — in a 1:1 chat (inGroup=false)", () => {
  it('nudges on a Thai "เชื่อม" link attempt', () => {
    expect(classifyLineTextCommand("เชื่อมบัญชี", false)).toBe("link_hint");
  });

  it('nudges on an English "link" attempt, case-insensitively', () => {
    expect(classifyLineTextCommand("how do I link?", false)).toBe("link_hint");
    expect(classifyLineTextCommand("LINK", false)).toBe("link_hint");
  });

  it('routes "เชื่อมร้าน" to the link hint in 1:1 (NOT bind — bind is group-only)', () => {
    // Same text, opposite context: in a group this binds; in 1:1 it only nudges.
    expect(classifyLineTextCommand("เชื่อมร้าน", false)).toBe("link_hint");
  });

  it('treats the group-only "/bind" command as inert chatter in 1:1', () => {
    expect(classifyLineTextCommand("/bind", false)).toBe("none");
  });

  it("stays silent on unrelated 1:1 messages", () => {
    expect(classifyLineTextCommand("สวัสดี", false)).toBe("none");
    expect(classifyLineTextCommand("ขอจองคิว", false)).toBe("none");
    expect(classifyLineTextCommand("", false)).toBe("none");
  });
});

describe("shouldLogInboundMessage", () => {
  it("skips plain group chatter", () => {
    expect(shouldLogInboundMessage(classifyLineTextCommand("พรุ่งนี้กี่โมง", true), true)).toBe(
      false,
    );
  });

  it("logs group commands", () => {
    expect(shouldLogInboundMessage("group_bind", true)).toBe(true);
    expect(shouldLogInboundMessage("group_unbind", true)).toBe(true);
    expect(shouldLogInboundMessage("group_id_echo", true)).toBe(true);
  });

  it("always logs 1:1 messages", () => {
    expect(shouldLogInboundMessage("none", false)).toBe(true);
    expect(shouldLogInboundMessage("link_hint", false)).toBe(true);
  });
});
