import { CommandContext, Context } from "grammy";
import { UserService, UserWalletAlreadyExistsError } from "../services/user";
import { InvalidEthereumAddressError, WalletService } from "../services/wallet";

const UNEXPECTED_ERROR_MESSAGE = "Something went wrong. Please try again later.";

export function getAddHandler(user: UserService, wallet: WalletService) {
  return async (ctx: CommandContext<Context>) => {
    const userId = ctx.from?.id;

    if (!userId) {
      console.error("No user ID found in context");
      ctx.reply(UNEXPECTED_ERROR_MESSAGE);
      return;
    }

    const address = ctx.message?.text.split(/\s+/)[1];

    if (!address) {
      ctx.reply("Please provide a wallet address. Usage: /add <wallet_address>");
      return;
    }

    try {
      await wallet.upsert(address);
    } catch (error) {
      if (error instanceof InvalidEthereumAddressError) {
        ctx.reply("Please provide a valid Ethereum address.");
      } else {
        console.error("Error upserting wallet:", error);
        ctx.reply(UNEXPECTED_ERROR_MESSAGE);
      }
      return;
    }

    try {
      await user.addWallet(userId, address);
      ctx.reply(`Successfully added wallet: ${address}`);
    } catch (error) {
      if (error instanceof UserWalletAlreadyExistsError) {
        ctx.reply(`Wallet ${address} is already associated with your account.`);
      } else {
        console.error("Error adding wallet to user:", error);
        ctx.reply(UNEXPECTED_ERROR_MESSAGE);
      }
    }
  };
}
