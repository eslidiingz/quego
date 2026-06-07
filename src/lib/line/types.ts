/**
 * Minimal typings for the slice of the LINE Messaging API webhook payload we
 * consume. SRP: inbound event shapes only — outbound message shapes live with
 * the client (client.ts). We type just enough to dispatch safely; any event
 * type we don't model falls through the unknown member and is ignored.
 *
 * Ref: https://developers.line.biz/en/reference/messaging-api/#webhook-event-objects
 */

export type LineSource = {
  type: "user" | "group" | "room";
  userId?: string;
  groupId?: string;
  roomId?: string;
};

export type LineTextMessageContent = {
  type: "text";
  id: string;
  text: string;
};

export type LineMessageEvent = {
  type: "message";
  replyToken: string;
  source: LineSource;
  message: LineTextMessageContent | { type: string; id: string };
};

export type LineFollowEvent = {
  type: "follow";
  replyToken: string;
  source: LineSource;
};

export type LineUnfollowEvent = {
  type: "unfollow";
  source: LineSource;
};

export type LinePostbackEvent = {
  type: "postback";
  replyToken: string;
  source: LineSource;
  postback: { data: string };
};

/** Any event we don't model explicitly is tolerated and ignored. */
export type LineUnknownEvent = { type: string; [key: string]: unknown };

export type LineWebhookEvent =
  | LineMessageEvent
  | LineFollowEvent
  | LineUnfollowEvent
  | LinePostbackEvent
  | LineUnknownEvent;

export type LineWebhookBody = {
  destination?: string;
  events?: LineWebhookEvent[];
};
