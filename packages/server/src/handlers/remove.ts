import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import z from "zod";
import { InvalidWalletIndexError, UserService } from "../services/user";
import { formatAddress, UNEXPECTED_ERROR_MESSAGE } from "./misc/utils";

const IndexSchema = z.coerce.number().int().positive();

const REPEATED_INSTRUCTIONS =
  "\n\nUsage: /remove <wallet_index>\n\nThe index is the number left to the address shown by the /list command.";

export function getRemoveHandler(logger: Logger, user: UserService) {
  return async (ctx: CommandContext<Context>) => {
    const userId = ctx.from?.id;

    if (!userId) {
      logger.error("No user ID found in the context");
      ctx.reply(UNEXPECTED_ERROR_MESSAGE);
      return;
    }

    let index: number;

    try {
      index = IndexSchema.parse(ctx.message?.text.split(/\s+/)[1]);
    } catch {
      ctx.reply(`Please provide a valid wallet index.${REPEATED_INSTRUCTIONS}`);
      return;
    }

    logger.info({ userId, index }, "Remove command executed");

    try {
      const deleted = await user.removeWallet(userId, index);
      ctx.reply(`Successfully removed ${formatAddress(deleted)}`);
    } catch (error) {
      if (error instanceof InvalidWalletIndexError) {
        ctx.reply(`The wallet index is out of bounds.${REPEATED_INSTRUCTIONS}`);
      } else {
        logger.error({ error, userId, index }, "Error removing wallet");
        ctx.reply(UNEXPECTED_ERROR_MESSAGE);
      }
    }
  };
}
