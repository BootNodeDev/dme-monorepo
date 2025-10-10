import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import { UserService } from "../services/user";
import { formatAddress, getUserIdFromCtx, UNEXPECTED_ERROR_MESSAGE } from "./misc/utils";
import { MessageService } from "../services/message";

export function getListHandler(logger: Logger, message: MessageService, user: UserService) {
  return async (ctx: CommandContext<Context>) => {
    try {
      const userId = getUserIdFromCtx(ctx);

      const userWallets = await user.listWallets(userId);

      if (userWallets.length === 0) {
        await message.createForCtx(
          "You don't have any wallets associated with your account yet.\n\nUse /add <address> to add one.",
          ctx,
        );
        return;
      }

      const walletList = userWallets
        .map((wallet, index) => `${index + 1}. ${formatAddress(wallet)}`)
        .join("\n");

      await message.createForCtx(`Your wallets:\n\n${walletList}`, ctx);
    } catch (error) {
      logger.error({ error, ctx });

      await message.createForCtx(UNEXPECTED_ERROR_MESSAGE, ctx);
    }
  };
}
