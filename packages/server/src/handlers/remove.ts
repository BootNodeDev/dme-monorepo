import { CommandContext, Context } from "grammy";
import { UserService, UserWalletNotFoundError } from "../services/user";
import { InvalidEthereumAddressError } from "../services/wallet";

const UNEXPECTED_ERROR_MESSAGE = "Something went wrong. Please try again later.";

export function getRemoveHandler(user: UserService) {
  return async (ctx: CommandContext<Context>) => {
    const userId = ctx.from?.id;

    if (!userId) {
      console.error("No user ID found in context");
      ctx.reply(UNEXPECTED_ERROR_MESSAGE);
      return;
    }

    const address = ctx.message?.text.split(/\s+/)[1];

    if (!address) {
      ctx.reply("Please provide a wallet address. Usage: /remove <wallet_address>");
      return;
    }

    try {
      await user.removeWallet(userId, address);
      ctx.reply(`Successfully removed wallet: ${address}`);
    } catch (error) {
      if (error instanceof InvalidEthereumAddressError) {
        ctx.reply("Please provide a valid Ethereum address.");
      } else if (error instanceof UserWalletNotFoundError) {
        ctx.reply(`Wallet ${address} is not associated with your account.`);
      } else {
        console.error("Error removing wallet:", error);
        ctx.reply(UNEXPECTED_ERROR_MESSAGE);
      }
    }
  };
}
