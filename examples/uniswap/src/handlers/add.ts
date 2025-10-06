import { CommandContext, Context } from "grammy";
import { UserService, UserWalletAlreadyExistsError } from "../services/user";
import { InvalidEthereumAddressError, WalletService } from "../services/wallet";
import { UNEXPECTED_ERROR_MESSAGE } from "./misc/constants";

export function getAddHandler(user: UserService, wallet: WalletService) {
  return async (ctx: CommandContext<Context>) => {
    const userId = ctx.from?.id;

    if (!userId) {
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
        ctx.reply(UNEXPECTED_ERROR_MESSAGE);
      }
    }
  };
}
