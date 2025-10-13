import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import { MessageService } from "../../services/message";

export const UNEXPECTED_ERROR_MESSAGE = "Something went wrong. Please try again later.";

export function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function baseHandler(
  logger: Logger,
  message: MessageService,
  fn: (userId: number, ctx: CommandContext<Context>) => Promise<void>,
) {
  return async (ctx: CommandContext<Context>) => {
    let userId: number | undefined;

    try {
      userId = ctx.from?.id;

      if (!userId) {
        throw new Error("User ID not found in context");
      }

      await fn(userId, ctx);
    } catch (err) {
      logger.error({ err, userId, message: ctx.message?.text }, "Handler error");

      if (userId) {
        await message.createForUser(UNEXPECTED_ERROR_MESSAGE, userId);
      }
    }
  };
}
