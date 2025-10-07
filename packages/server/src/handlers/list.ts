import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import { UserService } from "../services/user";
import { UNEXPECTED_ERROR_MESSAGE } from "./misc/constants";

export function getListHandler(logger: Logger, user: UserService) {
  return async (ctx: CommandContext<Context>) => {
    const userId = ctx.from?.id;

    if (!userId) {
      logger.error("No user ID found in the context");
      ctx.reply(UNEXPECTED_ERROR_MESSAGE);
      return;
    }

    logger.info({ userId }, "List command executed");

    try {
      const wallets = await user.listWallets(userId);

      if (wallets.length === 0) {
        ctx.reply(
          "You don't have any wallets associated with your account yet.\nUse /add <wallet_address> to add a wallet.",
        );
        return;
      }

      const walletList = wallets.map((wallet, index) => `${index + 1}. ${wallet}`).join("\n");
      ctx.reply(`Your wallets:\n${walletList}`);
    } catch {
      logger.error({ userId }, "Error listing wallets for user");
      ctx.reply(UNEXPECTED_ERROR_MESSAGE);
    }
  };
}
