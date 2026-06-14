/**
 * Pure classification of an inbound LINE text message into the command the
 * webhook dispatcher should act on. NO `server-only` import — the routing
 * decision is a pure function of (text, context), so it is unit-testable in
 * isolation, exactly like `parseBookingPostback` sits pure beside its
 * side-effecting dispatcher `handleBookingPostback`. `events.ts` owns the side
 * effects (reply / bind / record); this module owns only the decision.
 *
 * The split matters because the routing has subtle, easy-to-regress rules:
 *  - a group/room must stay SILENT on normal chatter — the 1:1 link hint must
 *    NEVER fire there (it would reply to staff conversation), so only the
 *    explicit "เชื่อมร้าน" bind command or the "/id" group-id echo get a reply;
 *  - bind takes precedence over the id echo;
 *  - in 1:1 the bot nudges only when the text looks like a link attempt.
 *
 * Because "เชื่อมร้าน" matches both the bind pattern and the looser 1:1 link
 * pattern, the same text deliberately routes differently by context — which is
 * exactly the behaviour these tests lock down.
 */

/** The action `handleMessage` should take for an inbound text message. */
export type LineTextCommand =
  | "group_bind" // bind THIS group to the sender's shop ("เชื่อมร้าน")
  | "group_id_echo" // echo the groupId back ("/id") — a join-missed recovery path
  | "link_hint" // 1:1 nudge: linking happens in-app ("เชื่อม" / "link")
  | "none"; // stay silent

/** Owner asks to bind the current group to the shop they own. */
const GROUP_BIND_RE = /เชื่อมร้าน|เชื่อมต่อร้าน|\/bind/i;
/** Recovery path: echo the groupId when the join event was missed. */
const GROUP_ID_ECHO_RE = /groupid|group id|\/id/i;
/** 1:1 only: the message looks like a link attempt, so nudge to the app flow. */
const LINK_HINT_RE = /เชื่อม|link/i;

/**
 * Map a text message to the command the dispatcher should run. `inGroup` is
 * true for a group/room (groupId or roomId present), false for a 1:1 chat — the
 * same text routes differently in each: "เชื่อมร้าน" binds in a group but only
 * nudges in 1:1, and a bare "เชื่อม" stays silent in a group but nudges in 1:1.
 */
export function classifyLineTextCommand(
  text: string,
  inGroup: boolean,
): LineTextCommand {
  if (inGroup) {
    // Bind first — it wins over the id echo when a message matches both.
    if (GROUP_BIND_RE.test(text)) return "group_bind";
    if (GROUP_ID_ECHO_RE.test(text)) return "group_id_echo";
    // Everything else in a group is chatter: stay silent.
    return "none";
  }
  return LINK_HINT_RE.test(text) ? "link_hint" : "none";
}
