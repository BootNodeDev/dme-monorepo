import { CommandContext, Context } from "grammy";
import {
  UserAlreadyExistsError,
  UserService,
  UserWalletAlreadyExistsError,
} from "../services/user";
import { InvalidEthereumAddressError, WalletService } from "../services/wallet";

const UNEXPECTED_ERROR_MESSAGE = "Something went wrong. Please try again later.";

export function getStartHandler(user: UserService, wallet: WalletService) {
  return async (ctx: CommandContext<Context>) => {
    const userId = ctx.from?.id;

    if (!userId) {
      console.error("No user ID found in context");
      ctx.reply("Something went wrong. Please try again later.");
      return;
    }

    let alreadyExists = false;

    try {
      await user.create(userId);
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        alreadyExists = true;
      } else {
        console.error("Error creating user:", error);
        ctx.reply(UNEXPECTED_ERROR_MESSAGE);
        return;
      }
    }

    const address = ctx.message?.text.split(" ")[1];

    let walletAlreadySubscribed = false;

    if (address) {
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
      } catch (error) {
        if (error instanceof UserWalletAlreadyExistsError) {
          walletAlreadySubscribed = true;
        } else {
          console.error("Error adding wallet to user:", error);
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
