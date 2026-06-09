import { describe, it, expect } from "vitest";
import { formatWaitLabel, formatQueueAheadLabel } from "@/lib/booking/queue-format";

describe("formatWaitLabel", () => {
  it("says there is no queue when the wait is zero", () => {
    expect(formatWaitLabel(0)).toBe("ไม่มีคิวรอ");
  });

  it("renders sub-hour waits in minutes", () => {
    expect(formatWaitLabel(1)).toBe("~1 นาที");
    expect(formatWaitLabel(30)).toBe("~30 นาที");
  });

  it("keeps the minute label at the 59-minute boundary", () => {
    expect(formatWaitLabel(59)).toBe("~59 นาที");
  });

  it("switches to hours at exactly 60 minutes", () => {
    expect(formatWaitLabel(60)).toBe("~1 ชม.");
  });

  it("rounds hour estimates with Math.round", () => {
    expect(formatWaitLabel(89)).toBe("~1 ชม.");
    expect(formatWaitLabel(90)).toBe("~2 ชม.");
    expect(formatWaitLabel(120)).toBe("~2 ชม.");
  });
});

describe("formatQueueAheadLabel", () => {
  it("says you are next when nobody is ahead", () => {
    expect(formatQueueAheadLabel(0)).toBe("คุณคือคิวถัดไป");
  });

  it("treats negative counts the same as zero", () => {
    expect(formatQueueAheadLabel(-3)).toBe("คุณคือคิวถัดไป");
  });

  it("renders the count of bookings ahead when positive", () => {
    expect(formatQueueAheadLabel(1)).toBe("อีก 1 คิวก่อนถึงคุณ");
    expect(formatQueueAheadLabel(5)).toBe("อีก 5 คิวก่อนถึงคุณ");
  });
});
