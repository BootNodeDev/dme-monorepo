import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import { UserService } from "../services/user";
import { formatAddress, UNEXPECTED_ERROR_MESSAGE } from "./misc/utils";
import { Limiter } from "../limiter";

export function getListHandler(logger: Logger, limiter: Limiter, user: UserService) {
  return async (ctx: CommandContext<Context>) => {
    const userId = ctx.from?.id;

    if (!userId) {
      logger.error("No user ID found in the context");
      limiter.reply(ctx, UNEXPECTED_ERROR_MESSAGE);
      return;
    }

    logger.info({ userId }, "List command executed");

    try {
      const wallets = await user.listWallets(userId);

      if (wallets.length === 0) {
        limiter.reply(
          ctx,
          "You don't have any wallets associated with your account yet.\n\nUse /add <wallet_address> to add one.",
        );
        return;
      }

      const walletList = wallets
        .map((wallet, index) => `${index + 1}. ${formatAddress(wallet)}`)
        .join("\n");
      limiter.reply(ctx, `Your wallets:\n\n${walletList}`);
    } catch {
      logger.error({ userId }, "Error listing wallets for user");
      limiter.reply(ctx, UNEXPECTED_ERROR_MESSAGE);
    }
  };
}
