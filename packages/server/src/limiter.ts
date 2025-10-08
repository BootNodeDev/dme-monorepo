import { Bot, Context } from "grammy";
import { ParseMode } from "grammy/types";
import PQueue from "p-queue";
import { Logger } from "pino";
import telegramify from "telegramify-markdown";

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
    private bot: Bot,
  ) {
    this.queue = new PQueue({
      intervalCap,
      interval,
      carryoverIntervalCount: false,
    });
  }

  reply(ctx: Context, msg: string) {
    this.add(() => ctx.reply(telegramify(msg, "remove"), this.BASE_MESSAGE_OPTIONS));
  }

  sendMessage(chatId: number, msg: string, onSuccess: () => void, onError: (error: Error) => void) {
    this.add(() =>
      this.bot.api
        .sendMessage(chatId, telegramify(msg, "remove"), this.BASE_MESSAGE_OPTIONS)
        .then(onSuccess)
        .catch(onError),
    );
  }

  protected add<T>(fn: () => Promise<T>) {
    this.queue.add(fn);

    this.logger.info(
      { queue: { size: this.queue.size, pending: this.queue.pending } },
      "Message added to the dispatch queue",
    );
  }
}
