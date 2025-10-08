import { Bot, Context } from "grammy";
import { ParseMode } from "grammy/types";
import PQueue from "p-queue";
import telegramify from "telegramify-markdown";

export const BASE_OPTIONS = {
  parse_mode: "MarkdownV2" as ParseMode,
  link_preview_options: { is_disabled: true },
};

export type ReplyFn = (ctx: Context, msg: string) => void;

export type SendMessageFn = (chatId: number, msg: string) => void;

export function getLimiter(interval: number, intervalCap: number): PQueue {
  return new PQueue({
    intervalCap,
    interval,
    carryoverIntervalCount: false,
  });
}

export function getReplyFn(limiter: PQueue): ReplyFn {
  return (ctx: Context, msg: string) => {
    limiter.add(() => ctx.reply(telegramify(msg, "remove"), BASE_OPTIONS));
  };
}

export function getSendMessageFn(limiter: PQueue, bot: Bot): SendMessageFn {
  return (chatId: number, msg: string) => {
    limiter.add(() => bot.api.sendMessage(chatId, telegramify(msg, "remove"), BASE_OPTIONS));
  };
}
