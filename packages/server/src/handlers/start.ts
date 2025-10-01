import { CommandContext, Context } from "grammy";
import {
  UserAlreadyExistsError,
  UserService,
  UserWalletAlreadyExistsError,
} from "../services/user";
import { InvalidEthereumAddressError, WalletService } from "../services/wallet";
import { UNEXPECTED_ERROR_MESSAGE } from "./common";

export function getStartHandler(user: UserService, wallet: WalletService) {
  return async (ctx: CommandContext<Context>) => {
    const userId = ctx.from?.id;

    if (!userId) {
      ctx.reply(UNEXPECTED_ERROR_MESSAGE);
      return;
    }

    let alreadyExists = false;

    try {
      await user.create(userId);
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        alreadyExists = true;
      } else {
        ctx.reply(UNEXPECTED_ERROR_MESSAGE);
        return;
      }
    }

    const address = ctx.message?.text.split(/\s+/)[1];

    let walletAlreadySubscribed = false;

    if (address) {
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
      } catch (error) {
        if (error instanceof UserWalletAlreadyExistsError) {
          walletAlreadySubscribed = true;
        } else {
          ctx.reply(UNEXPECTED_ERROR_MESSAGE);
          return;
        }
      }
    }

    const reply: string[] = [];

    reply.push(alreadyExists ? "Welcome back!" : "Welcome!");

    if (address && !walletAlreadySubscribed) {
      reply.push(`You have successfully subscribed the wallet: ${address}`);
    }

    ctx.reply(reply.join("\n"));
  };
}
