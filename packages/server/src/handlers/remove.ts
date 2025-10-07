import { CommandContext, Context } from "grammy";
import { Logger } from "pino";
import { UserService, UserWalletNotFoundError } from "../services/user";
import { InvalidEthereumAddressError } from "../services/wallet";
import { UNEXPECTED_ERROR_MESSAGE } from "./misc/constants";

export function getRemoveHandler(logger: Logger, user: UserService) {
  return async (ctx: CommandContext<Context>) => {
    const userId = ctx.from?.id;

    if (!userId) {
      logger.error("No user ID found in the context");
      ctx.reply(UNEXPECTED_ERROR_MESSAGE);
      return;
    }

    const address = ctx.message?.text.split(/\s+/)[1];

    if (!address) {
      ctx.reply("Please provide a wallet address. Usage: /remove <wallet_address>");
      return;
    }

    logger.info({ userId, address }, "Remove command executed");

    try {
      await user.removeWallet(userId, address);
      ctx.reply(`Successfully removed wallet: ${address}`);
    } catch (error) {
      if (error instanceof InvalidEthereumAddressError) {
        ctx.reply("Please provide a valid Ethereum address.");
      } else if (error instanceof UserWalletNotFoundError) {
        ctx.reply(`Wallet ${address} is not associated with your account.`);
      } else {
        logger.error({ error, userId, address }, "Error removing wallet");
        ctx.reply(UNEXPECTED_ERROR_MESSAGE);
      }
    }
  };
}
