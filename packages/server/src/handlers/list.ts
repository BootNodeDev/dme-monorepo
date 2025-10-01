import { CommandContext, Context } from "grammy";
import { UserService } from "../services/user";
import { UNEXPECTED_ERROR_MESSAGE } from "./common";

export function getListHandler(user: UserService) {
  return async (ctx: CommandContext<Context>) => {
    const userId = ctx.from?.id;

    if (!userId) {
      ctx.reply(UNEXPECTED_ERROR_MESSAGE);
      return;
    }

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
    } catch (error) {
      ctx.reply(UNEXPECTED_ERROR_MESSAGE);
    }
  };
}
