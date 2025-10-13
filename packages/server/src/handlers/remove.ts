import { Logger } from "pino";
import { z } from "zod";
import { InvalidWalletIndexError, UserService } from "../services/user";
import { formatAddress, baseHandler } from "./misc/utils";
import { MessageService } from "../services/message";

const IndexSchema = z.coerce.number().int().positive();

const REPEATED_INSTRUCTIONS =
  "\n\nUsage: /remove <index>\n\nThe index is the number left to the address shown by the /list command.";

export function getRemoveHandler(logger: Logger, message: MessageService, user: UserService) {
  return baseHandler(logger, message, async (userId, ctx) => {
    let index: number;

    try {
      index = IndexSchema.parse(ctx.message?.text.split(/\s+/)[1]);
    } catch {
      await message.createForUser(
        `The wallet index should be a positive integer.${REPEATED_INSTRUCTIONS}`,
        userId,
      );
      return;
    }

    logger.info({ userId, index }, "Remove command executed");

    try {
      const deleted = await user.removeWallet(userId, index);
      await message.createForUser(`Successfully removed ${formatAddress(deleted)}`, userId);
    } catch (error) {
      if (error instanceof InvalidWalletIndexError) {
        await message.createForUser(
          `No wallet found for the specified index.${REPEATED_INSTRUCTIONS}`,
          userId,
        );
      }

      throw error;
    }
  });
}
