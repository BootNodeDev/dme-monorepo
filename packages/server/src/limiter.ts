import { Bot, Context, SessionFlavor } from "grammy";
import { ParseMode } from "grammy/types";
import PQueue from "p-queue";
import { Logger } from "pino";
import telegramify from "telegramify-markdown";

export const TOP_PRIORITY = 999;
export const LOW_PRIORITY = 1;

export class Limiter {
  private queue: PQueue;

  private BASE_MESSAGE_OPTIONS = {
    parse_mode: "MarkdownV2" as ParseMode,
    link_preview_options: { is_disabled: true },
  };

  constructor(
    private logger: Logger,
    interval: number,
    intervalCap: number,
    private bot: Bot<Context & SessionFlavor<unknown>>,
  ) {
    this.queue = new PQueue({
      intervalCap,
      interval,
      carryoverIntervalCount: false,
    });
  }

  reply(ctx: Context, msg: string) {
    this.add(TOP_PRIORITY, () => ctx.reply(telegramify(msg, "remove"), this.BASE_MESSAGE_OPTIONS));
  }

  sendMessage(chatId: number, msg: string, onSuccess: () => void, onError: (error: Error) => void) {
    this.add(LOW_PRIORITY, () =>
      this.bot.api
        .sendMessage(chatId, telegramify(msg, "remove"), this.BASE_MESSAGE_OPTIONS)
        .then(onSuccess)
        .catch(onError),
    );
  }

  protected add<T>(priority: number, fn: () => Promise<T>): void {
    this.queue.add(fn, { priority });

    this.logger.info(
      { queue: { size: this.queue.size, pending: this.queue.pending } },
      "Message added to the limiter queue",
    );
  }
}
