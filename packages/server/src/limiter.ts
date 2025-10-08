import { Context } from "grammy";
import PQueue from "p-queue";
import telegramify from "telegramify-markdown";

export type ReplyFn = (ctx: Context, msg: string) => void;

export function getLimiter(interval: number, intervalCap: number): PQueue {
  return new PQueue({
    intervalCap,
    interval,
    carryoverIntervalCount: false,
  });
}

export function getReplyFn(limiter: PQueue): ReplyFn {
  return (ctx: Context, msg: string) => {
    limiter.add(() =>
      ctx.reply(telegramify(msg, "remove"), {
        parse_mode: "MarkdownV2",
        link_preview_options: { is_disabled: true },
      }),
    );
  };
}
