/**
 * The "เปิดร้านให้พร้อมรับจอง" activation checklist, derived from plain booleans.
 *
 * Pure on purpose: the service layer does the reading, this decides what the
 * owner still has to do. That keeps the ordering and progress arithmetic
 * testable in the `node` vitest env, and lets the modal, the dashboard card and
 * any future surface share one source of truth for the copy.
 *
 * Two tiers, and the distinction matters:
 *  - `blocking` steps (services, hours) mean the shop literally cannot take a
 *    booking. These drive the existing focus modal.
 *  - the rest are "you'll get more bookings if you do this" — surfaced, never
 *    nagged about.
 */

export type SetupTaskKey =
  | "services"
  | "hours"
  | "location"
  | "images"
  | "staff";

export type BlockingTaskKey = "services" | "hours";

/** Raw facts the service layer reads from the DB. No I/O happens in here. */
export type SetupFacts = {
  hasService: boolean;
  hasOpenDay: boolean;
  hasLocationPin: boolean;
  hasLogo: boolean;
  hasActiveStaff: boolean;
};

export type SetupTask = {
  key: SetupTaskKey;
  icon: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  /** Blocks bookings entirely. */
  blocking: boolean;
  done: boolean;
};

export type BlockingSetupTask = SetupTask & { key: BlockingTaskKey };

export type SetupChecklist = {
  tasks: SetupTask[];
  doneCount: number;
  total: number;
  /** 0–1, for the progress bar. */
  progress: number;
  complete: boolean;
  /** First outstanding blocker, or null once the shop is bookable. */
  blockingTask: BlockingSetupTask | null;
};

/**
 * Ordered so the two things that make a shop bookable come first, then the
 * discovery wins (pin, photos), then capacity.
 *
 * Every step is provable from the data on purpose: promotion work the system
 * can't verify (putting the QR up, pasting the link into Google Business
 * Profile) lives on /shop/share as a suggestion, not as an activation step an
 * owner has to tick off before the shop counts as open.
 */
const TASKS: readonly (Omit<SetupTask, "done"> & {
  isDone: (f: SetupFacts) => boolean;
})[] = [
  {
    key: "services",
    icon: "stacks",
    title: "เพิ่มบริการอย่างน้อย 1 รายการ",
    description: "ลูกค้าจองคิวไม่ได้เลยจนกว่าร้านจะมีบริการให้เลือก",
    ctaLabel: "เพิ่มบริการ",
    ctaHref: "/shop/services",
    blocking: true,
    isDone: (f) => f.hasService,
  },
  {
    key: "hours",
    icon: "schedule",
    title: "ตั้งเวลาเปิด–ปิดร้าน",
    description: "ระบบสร้างช่วงเวลาให้จองตามเวลาทำการที่ตั้งไว้",
    ctaLabel: "ตั้งเวลาทำการ",
    ctaHref: "/shop/profile?tab=hours",
    blocking: true,
    isDone: (f) => f.hasOpenDay,
  },
  {
    key: "location",
    icon: "location_on",
    title: "ปักหมุดร้านบนแผนที่",
    description: "ไม่ปักหมุด ร้านจะไม่ขึ้นในผลค้นหา “ร้านใกล้ฉัน”",
    ctaLabel: "ปักหมุดร้าน",
    ctaHref: "/shop/profile",
    blocking: false,
    isDone: (f) => f.hasLocationPin,
  },
  {
    key: "images",
    icon: "add_photo_alternate",
    title: "ใส่โลโก้ร้าน",
    description: "รูปคือสิ่งแรกที่ลูกค้าเห็นในหน้าค้นหาร้าน",
    ctaLabel: "เพิ่มรูปร้าน",
    ctaHref: "/shop/profile",
    blocking: false,
    isDone: (f) => f.hasLogo,
  },
  {
    key: "staff",
    icon: "group",
    title: "เพิ่มพนักงาน",
    description: "จำนวนพนักงานกำหนดว่ารับได้กี่คิวพร้อมกัน",
    ctaLabel: "เพิ่มพนักงาน",
    ctaHref: "/shop/staff",
    blocking: false,
    isDone: (f) => f.hasActiveStaff,
  },
];

export function buildSetupChecklist(facts: SetupFacts): SetupChecklist {
  const tasks: SetupTask[] = TASKS.map(({ isDone, ...task }) => ({
    ...task,
    done: isDone(facts),
  }));

  const doneCount = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const blockingTask =
    (tasks.find((t) => t.blocking && !t.done) as BlockingSetupTask | undefined) ??
    null;

  return {
    tasks,
    doneCount,
    total,
    progress: total === 0 ? 1 : doneCount / total,
    complete: doneCount === total,
    blockingTask,
  };
}
