import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import z from "zod";
import { InvalidWalletIndexError, UserService } from "../services/user";
import { formatAddress, getUserIdFromCtx, UNEXPECTED_ERROR_MESSAGE } from "./misc/utils";
import { Limiter } from "../limiter";

const IndexSchema = z.coerce.number().int().positive();

const REPEATED_INSTRUCTIONS =
  "\n\nUsage: /remove <index>\n\nThe index is the number left to the address shown by the /list command.";

export function getRemoveHandler(logger: Logger, limiter: Limiter, user: UserService) {
  return async (ctx: CommandContext<Context>) => {
    try {
      const userId = getUserIdFromCtx(ctx);

      let index: number;

      try {
        index = IndexSchema.parse(ctx.message?.text.split(/\s+/)[1]);
      } catch {
        limiter.reply(
          ctx,
          `The wallet index should be a positive integer.${REPEATED_INSTRUCTIONS}`,
        );
        return;
      }

      logger.info({ userId, index }, "Remove command executed");

      try {
        const deleted = await user.removeWallet(userId, index);
        limiter.reply(ctx, `Successfully removed ${formatAddress(deleted)}`);
      } catch (error) {
        if (error instanceof InvalidWalletIndexError) {
          limiter.reply(ctx, `No wallet found for the specified index.${REPEATED_INSTRUCTIONS}`);
        }

        throw error;
      }
    } catch (error) {
      logger.error({ error, ctx });

      limiter.reply(ctx, UNEXPECTED_ERROR_MESSAGE);
    }
  };
}
