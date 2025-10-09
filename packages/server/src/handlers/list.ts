import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import { UserService } from "../services/user";
import { formatAddress, getUserIdFromCtx, UNEXPECTED_ERROR_MESSAGE } from "./misc/utils";
import { Limiter } from "../limiter";

export function getListHandler(logger: Logger, limiter: Limiter, user: UserService) {
  return async (ctx: CommandContext<Context>) => {
    try {
      const userId = getUserIdFromCtx(ctx);

      const userWallets = await user.listWallets(userId);

      if (userWallets.length === 0) {
        limiter.reply(
          ctx,
          "You don't have any wallets associated with your account yet.\n\nUse /add <address> to add one.",
        );
        return;
      }

      const walletList = userWallets
        .map((wallet, index) => `${index + 1}. ${formatAddress(wallet)}`)
        .join("\n");

      limiter.reply(ctx, `Your wallets:\n\n${walletList}`);
    } catch (error) {
      logger.error({ error, ctx });

      limiter.reply(ctx, UNEXPECTED_ERROR_MESSAGE);
    }
  };
}
