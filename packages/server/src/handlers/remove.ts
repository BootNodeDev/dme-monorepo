import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import { z } from "zod";
import { InvalidWalletIndexError, UserService } from "../services/user";
import { formatAddress, getUserIdFromCtx, UNEXPECTED_ERROR_MESSAGE } from "./misc/utils";
import { MessageService } from "../services/message";

const IndexSchema = z.coerce.number().int().positive();

const REPEATED_INSTRUCTIONS =
  "\n\nUsage: /remove <index>\n\nThe index is the number left to the address shown by the /list command.";

export function getRemoveHandler(logger: Logger, message: MessageService, user: UserService) {
  return async (ctx: CommandContext<Context>) => {
    try {
      const userId = getUserIdFromCtx(ctx);

      let index: number;

      try {
        index = IndexSchema.parse(ctx.message?.text.split(/\s+/)[1]);
      } catch {
        await message.createForCtx(
          `The wallet index should be a positive integer.${REPEATED_INSTRUCTIONS}`,
          ctx,
        );
        return;
      }

      logger.info({ userId, index }, "Remove command executed");

      try {
        const deleted = await user.removeWallet(userId, index);
        await message.createForCtx(`Successfully removed ${formatAddress(deleted)}`, ctx);
      } catch (error) {
        if (error instanceof InvalidWalletIndexError) {
          await message.createForCtx(
            `No wallet found for the specified index.${REPEATED_INSTRUCTIONS}`,
            ctx,
          );
        }

        throw error;
      }
    } catch (error) {
      logger.error({ error, ctx });

      await message.createForCtx(UNEXPECTED_ERROR_MESSAGE, ctx);
    }
  };
}
